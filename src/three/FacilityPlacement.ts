import * as THREE from 'three';

export interface FacilityPosition {
  x: number;
  z: number;
}

export type FacilityPositions = Record<string, FacilityPosition>;

export interface FacilityPlacementResult {
  x: number;
  z: number;
}

export interface FacilityConfig {
  name: string;
  icon: string;
  defaultX: number;
  defaultZ: number;
  description: string;
}

export interface AvailableFacilityItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const FACILITY_STORAGE_KEY = 'vila_ancestral_facility_positions_v1';

export const MAP_BOUNDS = {
  MIN_COORD: -23,
  MAX_COORD: 23,
  PRECISION: 0.1,
} as const;

export const DEFAULT_FACILITY_CONFIGS: Record<string, FacilityConfig> = {
  campfire: { name: 'Fogueira Central & Refeições', icon: '🔥', defaultX: 0, defaultZ: -0.8, description: 'Ponto de encontro onde os aldeões tomam café da manhã, almoçam, jantam e descansam.' },
  wheat: { name: 'Campos de Trigo (Agricultor)', icon: '🌾', defaultX: -6.5, defaultZ: 4.0, description: 'Plantações douradas de trigo ceifadas pelos agricultores.' },
  wood: { name: 'Bosque de Coníferas (Lenhador)', icon: '🪵', defaultX: -6.0, defaultZ: -5.5, description: 'Área florestal onde os lenhadores abatem toras de madeira.' },
  stone: { name: 'Pedreira de Rochas (Pedreiro)', icon: '🪨', defaultX: 6.5, defaultZ: -4.5, description: 'Rochas calcárias e blocos extraídos pelos pedreiros.' },
  clay: { name: 'Margem Fluvial (Oleiro)', icon: '🧱', defaultX: 7.0, defaultZ: 3.5, description: 'Depósitos de argila e oficinas dos oleiros.' },
  buildersite: { name: 'Canteiro de Obras (Construtor)', icon: '🔨', defaultX: 3.0, defaultZ: 0, description: 'Andaimagens e obras ativas erguidas pelos construtores.' },
  elderDesk: { name: 'Mesa de Estudos (Ancião)', icon: '📜', defaultX: -2.2, defaultZ: -2.8, description: 'Altar de pergaminhos e registros do ancião da aldeia.' },
  guardPost: { name: 'Posto de Sentinela (Guarda)', icon: '🛡️', defaultX: 5.5, defaultZ: 5.0, description: 'Guarita de vigia e patrulha armada dos guardas.' },
  shelter_1: { name: 'Cabana 1 (Principal)', icon: '🛖', defaultX: -2.8, defaultZ: -1.8, description: 'Primeira moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_2: { name: 'Cabana 2', icon: '🛖', defaultX: -2.8, defaultZ: 1.8, description: 'Segunda moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_3: { name: 'Cabana 3', icon: '🛖', defaultX: 2.8, defaultZ: -2.0, description: 'Terceira moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_4: { name: 'Cabana 4', icon: '🛖', defaultX: 2.8, defaultZ: 2.0, description: 'Quarta moradia da aldeia (2 vagas base, +2 por nível).' },
  granary: { name: 'Celeiro de Grãos', icon: '🌾', defaultX: 0, defaultZ: 4.0, description: 'Estrutura elevada sobre estacas para estocagem de comida.' },
  village_well: { name: 'Poço Comunitário', icon: '💧', defaultX: 0, defaultZ: -3.8, description: 'Poço de pedra que fornece água potável e irriga os campos.' },
  cooking_pit: { name: 'Cozinha & Refeitório Comunitário', icon: '🍲', defaultX: -1.2, defaultZ: 1.5, description: 'Refeitório onde refeições coletivas garantem vitalidade e ânimo.' },
  sawmill: { name: 'Serraria de Troncos', icon: '🪓', defaultX: -3.8, defaultZ: -4.5, description: 'Serraria artesanal para corte e armazenamento de madeira.' },
  stoneworks: { name: 'Oficina de Cantaria', icon: '🔨', defaultX: 4.2, defaultZ: -3.5, description: 'Oficina onde blocos de pedra são talhados e preparados.' },
  pottery_kiln: { name: 'Olaria & Forno de Argila', icon: '🏺', defaultX: 4.8, defaultZ: 2.5, description: 'Forno e estaleiro de secagem e queima de cerâmica de argila.' },
  longhouse: { name: 'Casa Comunitária Longa', icon: '🏛️', defaultX: 0, defaultZ: -1.0, description: 'Grande salão comunal da Idade do Bronze.' },
  ziggurat: { name: 'O Grande Zigurate', icon: '👑', defaultX: 0, defaultZ: -14.0, description: 'Monumento monumental ancestral e triunfo da civilização.' },
};

/**
 * Returns default initial positions dictionary for all configured facilities.
 */
export function getDefaultFacilityPositions(): FacilityPositions {
  const initial: FacilityPositions = {};
  Object.entries(DEFAULT_FACILITY_CONFIGS).forEach(([id, cfg]) => {
    initial[id] = { x: cfg.defaultX, z: cfg.defaultZ };
  });
  return initial;
}

/**
 * Clamps a 3D coordinate pair within map bounds (-23 to 23) with 0.1 precision.
 */
export function clampFacilityPosition(x: number, z: number): FacilityPlacementResult {
  const clampedX =
    Math.round(Math.max(MAP_BOUNDS.MIN_COORD, Math.min(MAP_BOUNDS.MAX_COORD, x)) * 10) / 10;
  const clampedZ =
    Math.round(Math.max(MAP_BOUNDS.MIN_COORD, Math.min(MAP_BOUNDS.MAX_COORD, z)) * 10) / 10;
  return { x: clampedX, z: clampedZ };
}

/**
 * Finds a facility ID from a raycast intersection with facility group trees.
 */
export function findFacilityFromRaycast(
  raycaster: THREE.Raycaster,
  facilityGroups: Map<string, THREE.Group>
): string | null {
  const facilityRoots: THREE.Object3D[] = [];
  facilityGroups.forEach((grp) => facilityRoots.push(grp));
  const facilityHits = raycaster.intersectObjects(facilityRoots, true);
  if (facilityHits.length > 0) {
    let obj: THREE.Object3D | null = facilityHits[0].object;
    while (obj && !obj.name.startsWith('facility-')) {
      obj = obj.parent;
    }
    if (obj) {
      return obj.name.replace('facility-', '');
    }
  }
  return null;
}

/**
 * Finds the ground intersection for facility repositioning.
 */
export function findPlacementGroundHit(
  raycaster: THREE.Raycaster,
  scene: THREE.Scene
): THREE.Intersection | null {
  const groundHits = raycaster.intersectObjects(scene.children, true);
  return (
    groundHits.find((hit) => hit.object.name === 'ground' || Math.abs(hit.point.y) < 25) || null
  );
}

/**
 * Creates the golden placement ring indicator mesh.
 */
export function createFacilityMoveRing(): THREE.Mesh {
  const moveRingGeo = new THREE.RingGeometry(1.4, 1.8, 32);
  const moveRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const moveRing = new THREE.Mesh(moveRingGeo, moveRingMat);
  moveRing.rotation.x = -Math.PI / 2;
  moveRing.visible = false;
  return moveRing;
}

/**
 * Updates the move ring mesh position and conforms to terrain elevation.
 */
export function updateMoveRingPosition(
  ring: THREE.Mesh,
  x: number,
  z: number,
  getTerrainHeight: (x: number, z: number) => number
): void {
  const y = getTerrainHeight(x, z);
  ring.position.set(x, y + 0.06, z);
  ring.visible = true;
}
