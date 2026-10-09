import * as THREE from 'three';
import { GameState } from '../types/game';
import {
  createCookingPitMesh,
  createGranaryMesh,
  createHutMesh,
  createLonghouseMesh,
  createPotteryKilnMesh,
  createSawmillMesh,
  createStoneDwellingMesh,
  createStoneworksMesh,
  createVillageHallMesh,
  createWellMesh,
  createZigguratMesh,
} from './buildingMeshes';

export interface SceneBuildingsContext {
  buildingsGroup: THREE.Group;
  facilityGroups: Map<string, THREE.Group>;
  gameState: GameState;
  facilityPositions: Record<string, { x: number; z: number }>;
  getTerrainHeight: (x: number, z: number) => number;
}

export const BUILDING_FACILITY_IDS = [
  'village_hall',
  'shelter_1',
  'shelter_2',
  'shelter_3',
  'shelter_4',
  'granary',
  'village_well',
  'cooking_pit',
  'sawmill',
  'stoneworks',
  'pottery_kiln',
  'longhouse',
  'ziggurat',
] as const;

export const BUILDING_FALLBACK_POSITIONS: Record<string, { x: number; z: number }> = {
  village_hall: { x: 0, z: 2.2 },
  shelter_1: { x: -2.8, z: -1.8 },
  shelter_2: { x: -2.8, z: 1.8 },
  shelter_3: { x: 2.8, z: -2.0 },
  shelter_4: { x: 2.8, z: 2.0 },
  granary: { x: 0, z: 4.0 },
  village_well: { x: 0, z: -3.8 },
  cooking_pit: { x: -1.2, z: 1.5 },
  sawmill: { x: -3.8, z: -4.5 },
  stoneworks: { x: 4.2, z: -3.5 },
  pottery_kiln: { x: 4.8, z: 2.5 },
  longhouse: { x: 0, z: -1.0 },
  ziggurat: { x: 0, z: -14.0 },
};

/**
 * Synchronizes building meshes in the 3D scene according to game state, counts, levels, and facility positions.
 */
export function syncSceneBuildings(context: SceneBuildingsContext): void {
  const { buildingsGroup, facilityGroups, gameState, facilityPositions, getTerrainHeight } = context;

  // Clear existing building meshes
  while (buildingsGroup.children.length > 0) {
    buildingsGroup.remove(buildingsGroup.children[0]);
  }

  // Remove stale facility groups references for constructible buildings
  BUILDING_FACILITY_IDS.forEach((id) => {
    facilityGroups.delete(id);
  });

  const { buildings, zigguratStagesCompleted } = gameState;

  const registerBuilding = (id: string, mesh: THREE.Group, fallbackPos: { x: number; z: number }) => {
    const p = facilityPositions[id] || fallbackPos;
    const y = getTerrainHeight(p.x, p.z);
    mesh.position.set(p.x, y, p.z);
    mesh.name = `facility-${id}`;
    buildingsGroup.add(mesh);
    facilityGroups.set(id, mesh);
  };

  // Village Hall (Sede da Vila / Depósito Geral Central)
  if ((buildings.village_hall?.count || 0) > 0) {
    registerBuilding(
      'village_hall',
      createVillageHallMesh(),
      BUILDING_FALLBACK_POSITIONS.village_hall
    );
  }

  // Starter or built huts with visual level
  const hutsCount = Math.max(1, buildings.hut?.count || 1);
  const hutLevel = Math.max(1, buildings.hut?.level || 1);
  const stoneDwellingsCount = buildings.stone_dwelling?.count || 0;

  // Main starter shelter (Cabana 1)
  if (stoneDwellingsCount > 0) {
    registerBuilding('shelter_1', createStoneDwellingMesh(), BUILDING_FALLBACK_POSITIONS.shelter_1);
  } else {
    registerBuilding('shelter_1', createHutMesh(hutLevel), BUILDING_FALLBACK_POSITIONS.shelter_1);
  }

  // Additional houses (Cabanas 2, 3, 4)
  if (hutsCount > 1 || stoneDwellingsCount > 1) {
    const hut2 = stoneDwellingsCount > 1 ? createStoneDwellingMesh() : createHutMesh(hutLevel);
    registerBuilding('shelter_2', hut2, BUILDING_FALLBACK_POSITIONS.shelter_2);
  }
  if (hutsCount > 2 || stoneDwellingsCount > 2) {
    const hut3 = stoneDwellingsCount > 2 ? createStoneDwellingMesh() : createHutMesh(hutLevel);
    registerBuilding('shelter_3', hut3, BUILDING_FALLBACK_POSITIONS.shelter_3);
  }
  if (hutsCount > 3) {
    registerBuilding('shelter_4', createHutMesh(hutLevel), BUILDING_FALLBACK_POSITIONS.shelter_4);
  }

  // Granary
  if ((buildings.granary?.count || 0) > 0) {
    registerBuilding('granary', createGranaryMesh(), BUILDING_FALLBACK_POSITIONS.granary);
  }

  // Well
  if ((buildings.village_well?.count || 0) > 0) {
    registerBuilding('village_well', createWellMesh(), BUILDING_FALLBACK_POSITIONS.village_well);
  }

  // Cooking Pit / Kitchen & Canteen
  if ((buildings.cooking_pit?.count || 0) > 0) {
    registerBuilding('cooking_pit', createCookingPitMesh(), BUILDING_FALLBACK_POSITIONS.cooking_pit);
  }

  // Sawmill
  if ((buildings.sawmill?.count || 0) > 0) {
    registerBuilding('sawmill', createSawmillMesh(), BUILDING_FALLBACK_POSITIONS.sawmill);
  }

  // Stoneworks
  if ((buildings.stoneworks?.count || 0) > 0) {
    registerBuilding('stoneworks', createStoneworksMesh(), BUILDING_FALLBACK_POSITIONS.stoneworks);
  }

  // Pottery Kiln
  if ((buildings.pottery_kiln?.count || 0) > 0) {
    registerBuilding('pottery_kiln', createPotteryKilnMesh(), BUILDING_FALLBACK_POSITIONS.pottery_kiln);
  }

  // Longhouse
  if ((buildings.longhouse?.count || 0) > 0) {
    registerBuilding('longhouse', createLonghouseMesh(), BUILDING_FALLBACK_POSITIONS.longhouse);
  }

  // Ziggurat Monument
  if ((buildings.ziggurat?.count || 0) > 0 || zigguratStagesCompleted > 0) {
    registerBuilding(
      'ziggurat',
      createZigguratMesh(Math.max(1, zigguratStagesCompleted)),
      BUILDING_FALLBACK_POSITIONS.ziggurat
    );
  }
}
