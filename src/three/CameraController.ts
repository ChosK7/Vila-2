import * as THREE from 'three';

export interface CameraOrbitState {
  theta: number;
  phi: number;
  radius: number;
}

export interface CameraTargetPosition {
  x: number;
  y: number;
  z: number;
}

export type CameraPreset =
  | 'overview'
  | 'fields'
  | 'camp'
  | 'quarry'
  | 'forest'
  | 'clay'
  | 'builder';

export interface CameraPresetConfig {
  id: CameraPreset;
  label: string;
  shortLabel: string;
  icon: string;
}

export interface CameraControllerContext {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  orbit: CameraOrbitState;
  getTerrainHeight: (x: number, z: number) => number;
  facilityPositions: Record<string, { x: number; z: number }>;
}

export type CameraDetailLevel = 'NEAR' | 'MID' | 'FAR';

export interface CameraExpansionConfig {
  level: number;
  minRadius: number;
  maxRadius: number;
  panHalfExtent: number;
}

export const CAMERA_EXPANSION_CONFIGS: readonly CameraExpansionConfig[] = [
  {
    level: 0,
    minRadius: 6.5,
    maxRadius: 18,
    panHalfExtent: 8,
  },
  {
    level: 1,
    minRadius: 6.5,
    maxRadius: 22,
    panHalfExtent: 12,
  },
  {
    level: 2,
    minRadius: 6.5,
    maxRadius: 27,
    panHalfExtent: 17,
  },
  {
    level: 3,
    minRadius: 6.5,
    maxRadius: 33,
    panHalfExtent: 23,
  },
  {
    level: 4,
    minRadius: 6.5,
    maxRadius: 40,
    panHalfExtent: 30,
  },
] as const;

export const CAMERA_LIMITS = {
  FIXED_THETA: Math.PI / 4,
  FIXED_PHI: Math.PI / 3.2,
  MIN_RADIUS: 6.5,
  PAN_SPEED: 0.015,
} as const;

export const CAMERA_PRESETS: readonly CameraPresetConfig[] = [
  { id: 'overview', label: 'Visão Geral', shortLabel: 'Geral', icon: '🎯' },
  { id: 'camp', label: 'Centro & Fogueira', shortLabel: 'Centro', icon: '🛖' },
  { id: 'fields', label: 'Campos de Trigo', shortLabel: 'Trigo', icon: '🌾' },
  { id: 'forest', label: 'Floresta de Madeira', shortLabel: 'Floresta', icon: '🪵' },
  { id: 'quarry', label: 'Pedreira de Rocha', shortLabel: 'Pedreira', icon: '🪨' },
  { id: 'clay', label: 'Margem de Argila', shortLabel: 'Argila', icon: '🧱' },
  { id: 'builder', label: 'Canteiro de Obras', shortLabel: 'Obras', icon: '🔨' },
] as const;

/**
 * Trava rigidamente os ângulos orbital da câmera nos valores fixos isométricos/estratégicos.
 */
export function lockCameraAngles(orbit: CameraOrbitState): void {
  orbit.theta = CAMERA_LIMITS.FIXED_THETA;
  orbit.phi = CAMERA_LIMITS.FIXED_PHI;
}

/**
 * Normaliza o nível de expansão do mapa entre os limites suportados (0 a 4).
 */
export function normalizeMapExpansionLevel(level: number): number {
  return Math.max(0, Math.min(CAMERA_EXPANSION_CONFIGS.length - 1, Math.floor(level)));
}

/**
 * Obtém a configuração de raio e limites de pan para o nível especificado.
 */
export function getCameraExpansionConfig(level: number): CameraExpansionConfig {
  const normalized = normalizeMapExpansionLevel(level);
  return CAMERA_EXPANSION_CONFIGS[normalized];
}

/**
 * Limita as coordenadas horizontais do alvo da câmera (X e Z) conforme o panHalfExtent da expansão.
 * Preserva a coordenada vertical Y intacta.
 */
export function clampCameraTarget(
  target: THREE.Vector3,
  expansionLevel: number = 0
): void {
  const config = getCameraExpansionConfig(expansionLevel);
  const extent = config.panHalfExtent;
  target.x = Math.max(-extent, Math.min(extent, target.x));
  target.z = Math.max(-extent, Math.min(extent, target.z));
}

/**
 * Limita o raio de zoom aos parâmetros minRadius e maxRadius da expansão atual e garante ângulos fixos.
 */
export function clampCameraZoom(
  orbit: CameraOrbitState,
  expansionLevel: number = 0
): void {
  lockCameraAngles(orbit);
  const config = getCameraExpansionConfig(expansionLevel);
  orbit.radius = Math.max(config.minRadius, Math.min(config.maxRadius, orbit.radius));
}

/**
 * Recalcula a posição da câmera no espaço 3D mantendo ângulos fixos e olhando para o alvo.
 */
export function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  orbit: CameraOrbitState
): void {
  lockCameraAngles(orbit);
  const { theta, phi, radius } = orbit;
  const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
  const y = target.y + radius * Math.cos(phi);
  const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

  camera.position.set(x, y, z);
  camera.lookAt(target);
}

/**
 * Função mantida para compatibilidade de assinatura, não realiza rotação e assegura ângulos fixos.
 */
export function rotateCamera(
  orbit: CameraOrbitState,
  _dx?: number,
  _dy?: number
): void {
  lockCameraAngles(orbit);
}

/**
 * Translada (pan) o ponto focal da câmera no plano do solo de acordo com o arrasto do ponteiro/touch,
 * respeitando os limites da expansão atual do mapa.
 */
export function panCamera(
  target: THREE.Vector3,
  orbit: CameraOrbitState,
  dx: number,
  dy: number,
  expansionLevel: number = 0
): void {
  lockCameraAngles(orbit);
  const angle = CAMERA_LIMITS.FIXED_THETA;
  const panSpeed = CAMERA_LIMITS.PAN_SPEED;
  target.x -= (Math.cos(angle) * dx - Math.sin(angle) * dy) * panSpeed;
  target.z -= (Math.sin(angle) * dx + Math.cos(angle) * dy) * panSpeed;
  clampCameraTarget(target, expansionLevel);
}

/**
 * Ajusta o zoom através do scroll da roda do mouse com limites da expansão territorial.
 */
export function zoomCamera(
  orbit: CameraOrbitState,
  deltaY: number,
  expansionLevel: number = 0
): void {
  const config = getCameraExpansionConfig(expansionLevel);
  orbit.radius = Math.max(
    config.minRadius,
    Math.min(config.maxRadius, orbit.radius + deltaY * 0.02)
  );
  lockCameraAngles(orbit);
}

/**
 * Ajusta o raio da câmera diretamente por um delta (usado no pinch-zoom em telas de toque).
 */
export function zoomCameraByDelta(
  orbit: CameraOrbitState,
  deltaRadius: number,
  expansionLevel: number = 0
): void {
  const config = getCameraExpansionConfig(expansionLevel);
  orbit.radius = Math.max(
    config.minRadius,
    Math.min(config.maxRadius, orbit.radius + deltaRadius)
  );
  lockCameraAngles(orbit);
}

/**
 * Foca a câmera em uma área da vila sem alterar os ângulos theta e phi, respeitando limites de alvo e raio.
 */
export function applyCameraPreset(
  preset: CameraPreset,
  orbit: CameraOrbitState,
  target: THREE.Vector3,
  facilityPositions: Record<string, { x: number; z: number }>,
  getTerrainHeight: (x: number, z: number) => number,
  expansionLevel: number = 0
): void {
  lockCameraAngles(orbit);

  if (preset === 'overview') {
    orbit.radius = 16;
    target.set(0, 0.8, 0);
  } else if (preset === 'fields') {
    const p = facilityPositions['wheat'] || { x: -6.5, z: 4.0 };
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'forest') {
    const p = facilityPositions['wood'] || { x: -6.0, z: -5.5 };
    orbit.radius = 11;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'quarry') {
    const p = facilityPositions['stone'] || { x: 6.5, z: -4.5 };
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'clay') {
    const p = facilityPositions['clay'] || { x: 7.0, z: 3.5 };
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'builder') {
    const p = facilityPositions['buildersite'] || { x: 3.0, z: 0 };
    orbit.radius = 9;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'camp') {
    const p = facilityPositions['campfire'] || { x: 0, z: -0.8 };
    orbit.radius = 8;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  }

  clampCameraTarget(target, expansionLevel);
  clampCameraZoom(orbit, expansionLevel);
}

/**
 * Retorna a classificação de nível de detalhe (NEAR, MID, FAR) baseada na distância percentual do raio atual.
 */
export function getCameraDetailLevel(
  orbit: CameraOrbitState,
  expansionLevel: number = 0
): CameraDetailLevel {
  const config = getCameraExpansionConfig(expansionLevel);
  const range = config.maxRadius - config.minRadius;
  if (range <= 0) return 'NEAR';

  const progress = Math.max(0, Math.min(1, (orbit.radius - config.minRadius) / range));
  if (progress <= 0.42) {
    return 'NEAR';
  } else if (progress <= 0.75) {
    return 'MID';
  }
  return 'FAR';
}

/**
 * Suavemente interpola o ponto focal da câmera em direção a um aldeão selecionado.
 */
export function updateFollowCamera(
  target: THREE.Vector3,
  villagerPosition: THREE.Vector3,
  lerpFactor: number = 0.08
): void {
  target.lerp(villagerPosition.clone().add(new THREE.Vector3(0, 0.8, 0)), lerpFactor);
}
