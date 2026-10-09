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

export const CAMERA_LIMITS = {
  MIN_RADIUS: 5,
  MAX_RADIUS: 32,
  MIN_PHI: 0.2,
  MAX_PHI: Math.PI / 2.1,
  PAN_SPEED: 0.015,
  ROTATION_SPEED: 0.007,
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
 * Recomputes camera position in 3D world space based on spherical orbit angles and target.
 */
export function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  orbit: CameraOrbitState
): void {
  const { theta, phi, radius } = orbit;
  const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
  const y = target.y + radius * Math.cos(phi);
  const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

  camera.position.set(x, y, z);
  camera.lookAt(target);
}

/**
 * Rotates orbital camera angles based on pointer delta.
 */
export function rotateCamera(
  orbit: CameraOrbitState,
  dx: number,
  dy: number
): void {
  orbit.theta -= dx * CAMERA_LIMITS.ROTATION_SPEED;
  orbit.phi = Math.max(
    CAMERA_LIMITS.MIN_PHI,
    Math.min(CAMERA_LIMITS.MAX_PHI, orbit.phi - dy * CAMERA_LIMITS.ROTATION_SPEED)
  );
}

/**
 * Pans camera target position on ground plane aligned with view orientation.
 */
export function panCamera(
  target: THREE.Vector3,
  orbit: CameraOrbitState,
  dx: number,
  dy: number
): void {
  const angle = orbit.theta;
  const panSpeed = CAMERA_LIMITS.PAN_SPEED;
  target.x -= (Math.cos(angle) * dx - Math.sin(angle) * dy) * panSpeed;
  target.z -= (Math.sin(angle) * dx + Math.cos(angle) * dy) * panSpeed;
}

/**
 * Zooms camera in or out based on scroll wheel delta with clamp limits.
 */
export function zoomCamera(
  orbit: CameraOrbitState,
  deltaY: number
): void {
  orbit.radius = Math.max(
    CAMERA_LIMITS.MIN_RADIUS,
    Math.min(CAMERA_LIMITS.MAX_RADIUS, orbit.radius + deltaY * 0.02)
  );
}

/**
 * Adjusts camera radius directly by a given delta (used for pinch zoom on touch devices).
 */
export function zoomCameraByDelta(
  orbit: CameraOrbitState,
  deltaRadius: number
): void {
  orbit.radius = Math.max(
    CAMERA_LIMITS.MIN_RADIUS,
    Math.min(CAMERA_LIMITS.MAX_RADIUS, orbit.radius + deltaRadius)
  );
}

/**
 * Applies a camera viewpoint preset focusing on specific village facilities.
 */
export function applyCameraPreset(
  preset: CameraPreset,
  orbit: CameraOrbitState,
  target: THREE.Vector3,
  facilityPositions: Record<string, { x: number; z: number }>,
  getTerrainHeight: (x: number, z: number) => number
): void {
  if (preset === 'overview') {
    orbit.theta = Math.PI / 4;
    orbit.phi = Math.PI / 3.2;
    orbit.radius = 16;
    target.set(0, 0.8, 0);
  } else if (preset === 'fields') {
    const p = facilityPositions['wheat'] || { x: -6.5, z: 4.0 };
    orbit.theta = Math.PI / 1.8;
    orbit.phi = Math.PI / 3.4;
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'forest') {
    const p = facilityPositions['wood'] || { x: -6.0, z: -5.5 };
    orbit.theta = Math.PI * 0.75;
    orbit.phi = Math.PI / 3.3;
    orbit.radius = 11;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'quarry') {
    const p = facilityPositions['stone'] || { x: 6.5, z: -4.5 };
    orbit.theta = -Math.PI / 3;
    orbit.phi = Math.PI / 3.4;
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'clay') {
    const p = facilityPositions['clay'] || { x: 7.0, z: 3.5 };
    orbit.theta = -Math.PI * 0.65;
    orbit.phi = Math.PI / 3.3;
    orbit.radius = 10;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'builder') {
    const p = facilityPositions['buildersite'] || { x: 3.0, z: 0 };
    orbit.theta = -Math.PI / 5;
    orbit.phi = Math.PI / 3.2;
    orbit.radius = 9;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  } else if (preset === 'camp') {
    const p = facilityPositions['campfire'] || { x: 0, z: -0.8 };
    orbit.theta = 0;
    orbit.phi = Math.PI / 3.0;
    orbit.radius = 8;
    target.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
  }
}

/**
 * Smoothly interpolates the camera lookAt target towards an active villager position.
 */
export function updateFollowCamera(
  target: THREE.Vector3,
  villagerPosition: THREE.Vector3,
  lerpFactor: number = 0.08
): void {
  target.lerp(villagerPosition.clone().add(new THREE.Vector3(0, 0.8, 0)), lerpFactor);
}
