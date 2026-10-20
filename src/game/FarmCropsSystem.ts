import { GameState, FarmState } from '../types/game';

export interface FarmActionResult {
  success: boolean;
  message: string;
  newState: GameState;
  rewardFood?: number;
  rewardXP?: number;
}

/**
 * Retorna o estado da plantação garantindo valores padrões caso inexistente.
 */
export function getFarmState(state: GameState): FarmState {
  if (state.farm) return state.farm;
  return {
    stage: 'growing',
    health: 90,
    watered: true,
    tended: true,
    fertilized: false,
    growthProgress: 60,
  };
}

/**
 * 1. Função Plantar (Semeia uma nova safra na fazenda)
 * Requer que a plantação anterior tenha sido colhida ou esteja vazia/pronta para semeadura.
 * Custa um pequeno punhado de sementes (2 de alimento) se o celeiro tiver, ou gratuito se estiver zerado.
 */
export function plantCrops(state: GameState): FarmActionResult {
  const currentFarm = getFarmState(state);

  if (currentFarm.stage === 'growing') {
    return {
      success: false,
      message: 'Os campos já estão semeados e em crescimento vigoroso!',
      newState: state,
    };
  }

  if (currentFarm.stage === 'ready') {
    return {
      success: false,
      message: 'A colheita atual está madura e pronta! Colha os grãos antes de plantar novamente.',
      newState: state,
    };
  }

  // Semeia nova safra
  const seedCost = state.resources.food >= 2 ? 2 : 0;
  const newResources = {
    ...state.resources,
    food: Math.max(0, state.resources.food - seedCost),
  };

  const newFarm: FarmState = {
    stage: 'growing',
    health: 100,
    watered: true,
    tended: true,
    fertilized: false,
    growthProgress: 15,
  };

  const xpGain = 10;
  const newXP = (state.villageXP || 0) + xpGain;

  return {
    success: true,
    message: '🌱 Nova safra de grãos ancestrais semeada com sucesso nos campos da fazenda (+10 XP)!',
    rewardXP: xpGain,
    newState: {
      ...state,
      resources: newResources,
      farm: newFarm,
      villageXP: newXP,
    },
  };
}

/**
 * 2. Função Cuidar da Plantação (Irrigação, capina, proteção contra pragas)
 * Revitaliza a saúde da plantação, acelera o crescimento e garante colheita farta.
 */
export function tendCrops(state: GameState): FarmActionResult {
  const currentFarm = getFarmState(state);

  if (currentFarm.stage === 'seeded') {
    return {
      success: false,
      message: 'A plantação foi recém-semeada. Aguarde o desabrochar dos primeiros brotos!',
      newState: state,
    };
  }

  if (currentFarm.stage === 'ready') {
    return {
      success: false,
      message: 'O trigo já atingiu maturação máxima dourada! Proceda com a colheita.',
      newState: state,
    };
  }

  // Cuidar da plantação: restaura saúde para 100%, avança progresso e marca como cuidada
  const progressBoost = 25;
  const newProgress = Math.min(100, (currentFarm.growthProgress || 0) + progressBoost);
  const isNowReady = newProgress >= 100;

  const newFarm: FarmState = {
    ...currentFarm,
    health: 100,
    watered: true,
    tended: true,
    fertilized: true,
    growthProgress: newProgress,
    stage: isNowReady ? 'ready' : 'growing',
  };

  const xpGain = 15;
  const newXP = (state.villageXP || 0) + xpGain;

  return {
    success: true,
    message: isNowReady
      ? '🌾 Você cuidou dos campos com dedicação! O trigo amadureceu e está pronto para a colheita (+15 XP)!'
      : `💧 Campos regados e ervas daninhas limpas! Progresso da safra: ${newProgress}% (+15 XP).`,
    rewardXP: xpGain,
    newState: {
      ...state,
      farm: newFarm,
      villageXP: newXP,
    },
  };
}

/**
 * 3. Função Colheita (Ceifa dos campos de trigo com cálculo de rendimento e armazenamento)
 */
export function harvestCrops(state: GameState): FarmActionResult {
  const currentFarm = getFarmState(state);

  if (currentFarm.stage !== 'ready' && (currentFarm.growthProgress || 0) < 95) {
    return {
      success: false,
      message: `A plantação ainda está crescendo (${Math.round(currentFarm.growthProgress || 0)}%). Cuide dela ou aguarde a maturação dourada!`,
      newState: state,
    };
  }

  // Cálculo da colheita com bônus de ferramentas e saúde da plantação
  const farmersCount = state.villagers.filter((v) => v.job === 'farmer').length;
  const baseHarvest = 18 + farmersCount * 6;
  const healthBonus = (currentFarm.health || 100) / 100;
  const techBonus = state.technologies.curved_sickles?.unlocked ? 1.35 : 1.0;
  const wellBonus = (state.buildings.village_well?.count || 0) > 0 ? 1.25 : 1.0;

  const totalYield = Math.round(baseHarvest * healthBonus * techBonus * wellBonus);

  // Limite de armazenamento
  const currentFood = state.resources.food || 0;
  const maxCap = state.maxStorage?.food || 100;
  const actualAdded = Math.min(totalYield, Math.max(0, maxCap - currentFood));
  const newFood = currentFood + actualAdded;

  // Sistema de Plantio Automático: Nova safra é imediatamente semeada e cuidada
  const newFarm: FarmState = {
    stage: 'growing',
    health: 100,
    watered: true,
    tended: true,
    fertilized: true,
    growthProgress: 20,
    lastHarvestYield: actualAdded,
  };

  const xpGain = 25;
  const newXP = (state.villageXP || 0) + xpGain;

  return {
    success: true,
    message: `🎉 Colheita concluída! +${actualAdded} alimentos guardados no celeiro. Nova safra semeada automaticamente (+${xpGain} XP)!`,
    rewardFood: actualAdded,
    rewardXP: xpGain,
    newState: {
      ...state,
      resources: {
        ...state.resources,
        food: newFood,
      },
      farm: newFarm,
      villageXP: newXP,
    },
  };
}
