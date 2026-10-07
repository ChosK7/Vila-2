import { Building, GameState, Resources } from '../types/game';

/**
 * Calcula os limites máximos de armazenamento com base no número de celeiros (granary).
 */
export function calculateStorageCaps(buildings: Record<string, Building>): GameState['maxStorage'] {
  const granariesCount = buildings.granary?.count || 0;
  return {
    food: 120 + granariesCount * 100,
    wood: 120 + granariesCount * 40,
    stone: 100 + granariesCount * 40,
    clay: 100 + granariesCount * 40,
  };
}

/**
 * Calcula o limite populacional/habitacional com base nos edifícios da aldeia.
 * Regra: 2 por cabana no nível 1, +2 a cada novo nível da cabana.
 */
export function calculateHousingCapacity(buildings: Record<string, Building>): number {
  return Object.values(buildings).reduce((acc, b) => {
    if (b.category !== 'housing' || b.count <= 0) return acc;
    if (b.id === 'hut') {
      const hutLevel = Math.max(1, b.level || 1);
      const capPerHut = 2 + (hutLevel - 1) * 2; // = hutLevel * 2
      return acc + capPerHut * b.count;
    }
    return acc + (b.housingCap || 0) * b.count;
  }, 0);
}

/**
 * Retorna o custo de evolução de nível de uma construção (ex: cabana).
 */
export function getBuildingUpgradeCost(building: Building): Partial<Resources> {
  const currentLevel = Math.max(1, building.level || 1);
  const nextLevel = currentLevel + 1;
  if (building.id === 'hut') {
    return {
      wood: 25 * currentLevel,
      stone: 15 * (nextLevel - 1),
    };
  }
  return {
    wood: Math.round((building.cost.wood || 20) * 1.4),
    stone: Math.round((building.cost.stone || 10) * 1.4),
  };
}

/**
 * Evolui imediatamente o nível da construção (ex: Cabana nível +1, +2 vagas por cabana).
 */
export function upgradeBuildingLevel(
  buildings: Record<string, Building>,
  resources: Resources,
  buildingId: string
): {
  success: boolean;
  updatedBuildings: Record<string, Building>;
  updatedResources: Resources;
} {
  const building = buildings[buildingId];
  if (!building) {
    return { success: false, updatedBuildings: buildings, updatedResources: resources };
  }
  const cost = getBuildingUpgradeCost(building);
  if (!canAffordBuilding(resources, cost)) {
    return { success: false, updatedBuildings: buildings, updatedResources: resources };
  }

  const updatedResources = deductBuildingCost(resources, cost);
  const newLevel = Math.max(1, building.level || 1) + 1;
  const newCapPerHut = 2 + (newLevel - 1) * 2;

  const updatedBuildings = {
    ...buildings,
    [buildingId]: {
      ...building,
      level: newLevel,
      housingCap: newCapPerHut,
      benefitsDescription: `${newCapPerHut} vagas (${newCapPerHut} por cabana)`,
    },
  };

  return {
    success: true,
    updatedBuildings,
    updatedResources,
  };
}

/**
 * Avança o andamento das obras ativas com base no número de construtores e guindastes.
 */
export function advanceBuildingsConstruction(
  buildings: Record<string, Building>,
  buildersCount: number
): {
  updatedBuildings: Record<string, Building>;
  completedBuildings: string[];
} {
  const craneMultiplier = (buildings.crane_scaffolding?.count || 0) > 0 ? 2 : 1;
  const constructionSpeed = Math.max(1, buildersCount * craneMultiplier);

  const updatedBuildings: Record<string, Building> = { ...buildings };
  const completedBuildings: string[] = [];

  Object.keys(updatedBuildings).forEach((key) => {
    const b = { ...updatedBuildings[key] };
    if (b.constructionTurnsLeft > 0) {
      b.constructionTurnsLeft = Math.max(0, b.constructionTurnsLeft - constructionSpeed);
      if (b.constructionTurnsLeft === 0) {
        b.count += 1;
        completedBuildings.push(b.name);
      }
      updatedBuildings[key] = b;
    }
  });

  return {
    updatedBuildings,
    completedBuildings,
  };
}

/**
 * Verifica se a aldeia possui recursos suficientes para iniciar a construção de um edifício.
 */
export function canAffordBuilding(resources: Resources, cost: Partial<Resources>): boolean {
  if (cost.wood && resources.wood < cost.wood) return false;
  if (cost.stone && resources.stone < cost.stone) return false;
  if (cost.clay && resources.clay < cost.clay) return false;
  if (cost.knowledge && resources.knowledge < cost.knowledge) return false;
  return true;
}

/**
 * Deduz o custo de construção dos recursos da aldeia.
 */
export function deductBuildingCost(resources: Resources, cost: Partial<Resources>): Resources {
  return {
    food: resources.food,
    wood: Math.max(0, resources.wood - (cost.wood || 0)),
    stone: Math.max(0, resources.stone - (cost.stone || 0)),
    clay: Math.max(0, resources.clay - (cost.clay || 0)),
    knowledge: Math.max(0, resources.knowledge - (cost.knowledge || 0)),
  };
}

/**
 * Inicia uma nova construção colocando-a na fila com constructionTurnsLeft.
 */
export function startBuildingConstruction(
  buildings: Record<string, Building>,
  resources: Resources,
  buildingId: string
): {
  success: boolean;
  updatedBuildings: Record<string, Building>;
  updatedResources: Resources;
} {
  const building = buildings[buildingId];
  if (!building || !canAffordBuilding(resources, building.cost)) {
    return {
      success: false,
      updatedBuildings: buildings,
      updatedResources: resources,
    };
  }

  const updatedResources = deductBuildingCost(resources, building.cost);
  const updatedBuildings = {
    ...buildings,
    [buildingId]: {
      ...building,
      constructionTurnsLeft: building.constructionTurnsTotal,
    },
  };

  return {
    success: true,
    updatedBuildings,
    updatedResources,
  };
}
