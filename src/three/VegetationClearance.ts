import * as THREE from 'three';

export interface ClearanceArea {
  x: number;
  z: number;
  radius: number;
}

/**
 * Retorna o raio de desobstrução de vegetação rasteira para cada tipo de edifício/instalação.
 */
export function getBuildingClearanceRadius(id: string): number {
  switch (id) {
    case 'village_hall':
      return 2.5;
    case 'shelter_1':
    case 'shelter_2':
    case 'shelter_3':
    case 'shelter_4':
    case 'hut':
    case 'stone_dwelling':
      return 1.8;
    case 'granary':
      return 1.7;
    case 'village_well':
      return 1.4;
    case 'cooking_pit':
      return 1.8;
    case 'sawmill':
      return 2.3;
    case 'stoneworks':
      return 2.3;
    case 'pottery_kiln':
      return 2.1;
    case 'longhouse':
      return 2.9;
    case 'ziggurat':
      return 4.2;
    default:
      return 1.8;
  }
}

/**
 * Aplica desobstrução visual de vegetação baixa/decorativa sob áreas ocupadas por construções.
 * Ajusta a propriedade 'visible' de cada tufo/arbusto no undergrowthGroup sem remover do grafo de cena.
 */
export function applyBuildingVegetationClearance(
  undergrowthGroup: THREE.Group | null | undefined,
  areas: ClearanceArea[]
): void {
  if (!undergrowthGroup || !undergrowthGroup.children) return;

  const worldPos = new THREE.Vector3();

  undergrowthGroup.children.forEach((child) => {
    child.getWorldPosition(worldPos);
    const cx = worldPos.x;
    const cz = worldPos.z;

    let isUnderBuilding = false;
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const dx = cx - area.x;
      const dz = cz - area.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < area.radius * area.radius) {
        isUnderBuilding = true;
        break;
      }
    }

    child.visible = !isUnderBuilding;
  });
}
