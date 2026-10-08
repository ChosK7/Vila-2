import { GameState, Resources, Villager } from '../types/game';
import {
  getVillageProductionMultiplier,
  getVillageResearchMultiplier,
} from './LevelUnlockSystem';

export interface ResourceRates {
  foodNet: number;
  foodProduced: number;
  foodConsumed: number;
  wood: number;
  stone: number;
  clay: number;
  knowledge: number;
}

/**
 * Calcula a taxa de produção e consumo de todos os recursos com base nos
 * aldeões, tecnologias desbloqueadas, edifícios construídos, estação do ano
 * e bônus do nível da vila (LevelUnlockSystem).
 */
export function calculateProductionRates(
  state: Pick<GameState, 'villagers' | 'buildings' | 'technologies' | 'seasonIndex'> & {
    villageLevel?: number;
  }
): ResourceRates {
  const { villagers, buildings, technologies, seasonIndex } = state;
  const villageLevel = state.villageLevel ?? 1;
  const productionMult = getVillageProductionMultiplier(villageLevel);
  const researchMult = getVillageResearchMultiplier(villageLevel);

  const seasons = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
  const season = seasons[seasonIndex] || 'Primavera';

  const sicklesBonus = technologies.curved_sickles?.unlocked ? 0.35 : 0;
  const wellBonus = (buildings.village_well?.count || 0) > 0 ? 0.25 : 0;
  const grindingBonus = (buildings.grain_grinding?.count || 0) > 0 ? 0.2 : 0;
  const longhouseBonus = (buildings.longhouse?.count || 0) > 0 ? 1 : 0;
  const schoolBonus = (buildings.scribal_school?.count || 0) > 0 ? 2 : 1;
  const tabletsBonus = technologies.clay_tablets?.unlocked ? 1 : 0;

  let seasonFarmMultiplier = 1;
  if (season === 'Primavera') seasonFarmMultiplier = 1.25;
  if (season === 'Outono') seasonFarmMultiplier = 1.35;
  if (season === 'Inverno') seasonFarmMultiplier = 0.65;

  let foodProduced = 0;
  let woodProduced = 0;
  let stoneProduced = 0;
  let clayProduced = 0;
  let knowledgeProduced = 0;

  villagers.forEach((v) => {
    const traitMult = v.trait?.multiplier || 1;
    const moraleMult = v.morale >= 80 ? 1.15 : v.morale <= 40 ? 0.8 : 1;

    if (v.job === 'farmer') {
      const base = 6 + longhouseBonus;
      foodProduced += base * (1 + sicklesBonus + wellBonus) * seasonFarmMultiplier * traitMult * moraleMult;
    } else if (v.job === 'lumberjack') {
      const base = 5 + longhouseBonus;
      woodProduced += base * traitMult * moraleMult;
    } else if (v.job === 'quarryman') {
      const base = 4 + longhouseBonus;
      stoneProduced += base * traitMult * moraleMult;
    } else if (v.job === 'potter') {
      const base = 4 + longhouseBonus;
      clayProduced += base * traitMult * moraleMult;
    } else if (v.job === 'elder') {
      const base = 3 + longhouseBonus;
      knowledgeProduced += base * (1 + tabletsBonus) * schoolBonus * traitMult * moraleMult;
    }
  });

  // Aplica multiplicador do nível da vila na produção positiva
  const finalFoodProduced = foodProduced * productionMult;
  const finalWoodProduced = woodProduced * productionMult;
  const finalStoneProduced = stoneProduced * productionMult;
  const finalClayProduced = clayProduced * productionMult;
  const finalKnowledgeProduced = knowledgeProduced * researchMult;

  const foodConsumed = Math.round(villagers.length * (1 - grindingBonus));
  const foodNet = Math.round(finalFoodProduced) - foodConsumed;

  return {
    foodNet,
    foodProduced: Math.round(finalFoodProduced),
    foodConsumed,
    wood: Math.round(finalWoodProduced),
    stone: Math.round(finalStoneProduced),
    clay: Math.round(finalClayProduced),
    knowledge: Math.round(finalKnowledgeProduced),
  };
}

/**
 * Calcula o custo de comida para cada uma das refeições diárias (café, almoço ou jantar).
 */
export function calculateMealFoodCost(villagerCount: number): number {
  return Math.max(1, Math.ceil(villagerCount * 0.34));
}

/**
 * Aplica o processamento de uma refeição coletiva, consumindo comida e ajustando saúde e moral.
 */
export function processMealConsumption(
  currentFood: number,
  villagers: Villager[]
): {
  hasFood: boolean;
  updatedFood: number;
  updatedVillagers: Villager[];
} {
  const foodNeeded = calculateMealFoodCost(villagers.length);
  const hasFood = currentFood >= foodNeeded;
  const updatedFood = Math.max(0, currentFood - (hasFood ? foodNeeded : 0));

  const updatedVillagers = villagers.map((v) => ({
    ...v,
    isFed: hasFood,
    health: hasFood
      ? Math.min(100, (v.health ?? 100) + 4)
      : Math.max(10, (v.health ?? 100) - 10),
    morale: hasFood
      ? Math.min(100, v.morale + 3)
      : Math.max(20, v.morale - 8),
  }));

  return {
    hasFood,
    updatedFood,
    updatedVillagers,
  };
}

/**
 * Calcula a quantidade de lenha necessária para aquecer a fogueira da aldeia na estação.
 */
export function calculateWoodHeatingNeeded(isWinter: boolean): number {
  return isWinter ? 2 : 1;
}

/**
 * Aplica a rotina de encerramento do dia para recursos:
 * - A produção física (food, wood, stone, clay) agora ocorre em TEMPO REAL através das entregas dos aldeões.
 * - O consumo diário de comida (rates.foodConsumed) é deduzido no encerramento do dia.
 * - O consumo de lenha para aquecimento da fogueira e geração de conhecimento continuam diários.
 */
export function applyDailyResourceProduction(
  currentResources: Resources,
  rates: ResourceRates,
  maxStorage: GameState['maxStorage'],
  isWinter: boolean
): {
  newResources: Resources;
  eventNote?: string;
} {
  // Consumo diário de comida pelos aldeões
  const foodConsumed = Math.max(0, rates.foodConsumed);
  const newFood = Math.min(
    maxStorage.food,
    Math.max(0, currentResources.food - foodConsumed)
  );

  // Consumo diário de lenha pela fogueira central
  const woodNeeded = calculateWoodHeatingNeeded(isWinter);
  let newWood = currentResources.wood;
  let eventNote = '';

  if (newWood >= woodNeeded) {
    newWood -= woodNeeded;
  } else {
    newWood = 0;
    eventNote = '❄️ Faltou lenha na fogueira central para aquecimento.';
  }
  newWood = Math.min(maxStorage.wood, Math.max(0, newWood));

  const newStone = Math.min(maxStorage.stone, currentResources.stone);
  const newClay = Math.min(maxStorage.clay, currentResources.clay);
  const newKnowledge = currentResources.knowledge + rates.knowledge;

  return {
    newResources: {
      food: newFood,
      wood: newWood,
      stone: newStone,
      clay: newClay,
      knowledge: newKnowledge,
    },
    eventNote: eventNote || undefined,
  };
}

/**
 * Calcula a quantidade entregue por viagem de um aldeão coletor.
 * Distribui aproximadamente a produção diária calculada por calculateProductionRates()
 * ao longo dos ciclos reais do trabalhador durante o expediente.
 */
export function getWorkerDeliveryAmount(
  villager: Villager,
  state: GameState,
  resource: 'food' | 'wood' | 'stone' | 'clay'
): number {
  const rates = calculateProductionRates(state);

  // Conta quantos trabalhadores ativos existem para a mesma profissão
  const workersInJob = Math.max(
    1,
    state.villagers.filter((v) => v.job === villager.job).length
  );

  let totalDailyForJob = 0;
  if (resource === 'food' && villager.job === 'farmer') {
    totalDailyForJob = rates.foodProduced;
  } else if (resource === 'wood' && villager.job === 'lumberjack') {
    totalDailyForJob = rates.wood;
  } else if (resource === 'stone' && villager.job === 'quarryman') {
    totalDailyForJob = rates.stone;
  } else if (resource === 'clay' && villager.job === 'potter') {
    totalDailyForJob = rates.clay;
  } else {
    return 1;
  }

  // Produção diária esperada para este aldeão específico
  const workerDailyShare = totalDailyForJob / workersInJob;

  // Um expediente completo dura ~10h (ex: 07:00 às 17:00).
  // Em 15 minutos de dia real (900s), 10 horas de expediente equivalem a ~375 segundos reais.
  // Cada ciclo de coleta dura ~15 segundos (5.5s trabalho + caminhadas ida e volta).
  // Portanto, um aldeão faz em média ~25 ciclos de entrega por expediente.
  const estimatedTripsPerDay = 25;

  // Quantidade por entrega com precisão decimal suave (mínimo 0.1 para feedback perceptível)
  const amountPerTrip = Math.max(0.1, Math.round((workerDailyShare / estimatedTripsPerDay) * 100) / 100);
  return amountPerTrip;
}

/**
 * Adiciona recursos coletados respeitando o limite máximo de armazenamento.
 */
export function depositGatheredResource(
  currentResources: Resources,
  maxStorage: GameState['maxStorage'],
  resource: 'food' | 'wood' | 'stone' | 'clay',
  amount: number
): Resources {
  const maxCap = maxStorage[resource];
  const curVal = currentResources[resource];
  if (curVal >= maxCap) return currentResources;
  return {
    ...currentResources,
    [resource]: Math.min(maxCap, curVal + amount),
  };
}

export const RECRUIT_VILLAGER_FOOD_COST = 15;

/**
 * Verifica se há comida suficiente para recrutar um novo aldeão.
 */
export function canAffordVillagerRecruitment(food: number): boolean {
  return food >= RECRUIT_VILLAGER_FOOD_COST;
}

/**
 * Deduz o custo de comida para recrutamento de aldeão.
 */
export function deductVillagerRecruitmentCost(resources: Resources): Resources {
  return {
    ...resources,
    food: Math.max(0, resources.food - RECRUIT_VILLAGER_FOOD_COST),
  };
}

/**
 * Verifica se há conhecimento suficiente para pesquisar uma tecnologia.
 */
export function canAffordTechResearch(knowledge: number, cost: number): boolean {
  return knowledge >= cost;
}

/**
 * Deduz o custo de conhecimento ao pesquisar uma tecnologia.
 */
export function deductTechResearchCost(resources: Resources, cost: number): Resources {
  return {
    ...resources,
    knowledge: Math.max(0, resources.knowledge - cost),
  };
}

/**
 * Adiciona recompensa de conhecimento obtida em missões.
 */
export function addKnowledgeReward(resources: Resources, amount: number): Resources {
  return {
    ...resources,
    knowledge: resources.knowledge + amount,
  };
}

