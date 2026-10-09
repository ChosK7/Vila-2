import * as THREE from 'three';
import { GameState } from '../types/game';

export interface FacilityNodes {
  wheat: THREE.Vector3;
  wood: THREE.Vector3;
  stone: THREE.Vector3;
  clay: THREE.Vector3;
  villageHall: THREE.Vector3;
  foodStorage: THREE.Vector3;
  mealArea: THREE.Vector3;
  woodStorage: THREE.Vector3;
  stoneStorage: THREE.Vector3;
  clayStorage: THREE.Vector3;
  materialStorage: THREE.Vector3;
  storage: THREE.Vector3;
  campfire: THREE.Vector3;
  buildersite: THREE.Vector3;
  elderDesk: THREE.Vector3;
  guardPost: THREE.Vector3;
}

export type GetNodePosFn = (key: string, fallback: { x: number; z: number }) => THREE.Vector3;

export const DEFAULT_FACILITY_FALLBACKS: Record<string, { x: number; z: number }> = {
  wheat: { x: -6.5, z: 4.0 },
  wood: { x: -6.0, z: -5.5 },
  stone: { x: 6.5, z: -4.5 },
  clay: { x: 7.0, z: 3.5 },
  village_hall: { x: 0, z: 2.2 },
  granary: { x: 0, z: 4.0 },
  cooking_pit: { x: -1.2, z: 1.5 },
  sawmill: { x: -3.8, z: -4.5 },
  stoneworks: { x: 4.2, z: -3.5 },
  pottery_kiln: { x: 4.8, z: 2.5 },
  defaultMaterial: { x: 1.8, z: 0.8 },
  campfireFoodFallback: { x: 0, z: 1.2 },
  campfireMealFallback: { x: 0, z: -0.8 },
  campfire: { x: 0, z: -0.8 },
  buildersite: { x: 3.0, z: 0 },
  elderDesk: { x: -2.2, z: -2.8 },
  guardPost: { x: 5.5, z: 5.0 },
};

/**
 * Resolve e calcula os nós lógicos de instalações, recursos e depósitos da aldeia.
 * Respeita as construções ativas e seus pontos configurados ou posições padrão.
 */
export function createFacilityNodes(
  gameState: GameState,
  getNodePos: GetNodePosFn
): FacilityNodes {
  const hasGranary = (gameState.buildings.granary?.count || 0) > 0;
  const hasCookingPit = (gameState.buildings.cooking_pit?.count || 0) > 0;
  const hasSawmill = (gameState.buildings.sawmill?.count || 0) > 0;
  const hasStoneworks = (gameState.buildings.stoneworks?.count || 0) > 0;
  const hasPotteryKiln = (gameState.buildings.pottery_kiln?.count || 0) > 0;

  const defaultMaterialPos = DEFAULT_FACILITY_FALLBACKS.defaultMaterial;

  return {
    wheat: getNodePos('wheat', DEFAULT_FACILITY_FALLBACKS.wheat),
    wood: getNodePos('wood', DEFAULT_FACILITY_FALLBACKS.wood),
    stone: getNodePos('stone', DEFAULT_FACILITY_FALLBACKS.stone),
    clay: getNodePos('clay', DEFAULT_FACILITY_FALLBACKS.clay),
    villageHall: getNodePos('village_hall', DEFAULT_FACILITY_FALLBACKS.village_hall),
    foodStorage: hasGranary
      ? getNodePos('granary', DEFAULT_FACILITY_FALLBACKS.granary)
      : getNodePos('campfire', DEFAULT_FACILITY_FALLBACKS.campfireFoodFallback),
    mealArea: hasCookingPit
      ? getNodePos('cooking_pit', DEFAULT_FACILITY_FALLBACKS.cooking_pit)
      : getNodePos('campfire', DEFAULT_FACILITY_FALLBACKS.campfireMealFallback),
    woodStorage: hasSawmill
      ? getNodePos('sawmill', DEFAULT_FACILITY_FALLBACKS.sawmill)
      : getNodePos('campfire', defaultMaterialPos),
    stoneStorage: hasStoneworks
      ? getNodePos('stoneworks', DEFAULT_FACILITY_FALLBACKS.stoneworks)
      : getNodePos('campfire', defaultMaterialPos),
    clayStorage: hasPotteryKiln
      ? getNodePos('pottery_kiln', DEFAULT_FACILITY_FALLBACKS.pottery_kiln)
      : getNodePos('campfire', defaultMaterialPos),
    materialStorage: getNodePos('campfire', defaultMaterialPos),
    storage: getNodePos('campfire', DEFAULT_FACILITY_FALLBACKS.campfireFoodFallback),
    campfire: getNodePos('campfire', DEFAULT_FACILITY_FALLBACKS.campfire),
    buildersite: getNodePos('buildersite', DEFAULT_FACILITY_FALLBACKS.buildersite),
    elderDesk: getNodePos('elderDesk', DEFAULT_FACILITY_FALLBACKS.elderDesk),
    guardPost: getNodePos('guardPost', DEFAULT_FACILITY_FALLBACKS.guardPost),
  };
}
