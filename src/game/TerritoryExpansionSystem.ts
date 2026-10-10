import type { GameState } from '../types/game';

export const MAX_MAP_EXPANSION_LEVEL = 4;

export interface TerritoryExpansionConfig {
  level: number;
  name: string;
  requiredVillageLevel: number;
  buildHalfExtent: number;
  cameraPanHalfExtent: number;
  cameraMaxRadius: number;
}

export const TERRITORY_EXPANSION_CONFIGS: readonly TerritoryExpansionConfig[] = [
  {
    level: 0,
    name: 'Núcleo da Aldeia',
    requiredVillageLevel: 1,
    buildHalfExtent: 8,
    cameraPanHalfExtent: 8,
    cameraMaxRadius: 18,
  },
  {
    level: 1,
    name: 'Primeira Expansão',
    requiredVillageLevel: 2,
    buildHalfExtent: 12,
    cameraPanHalfExtent: 12,
    cameraMaxRadius: 22,
  },
  {
    level: 2,
    name: 'Terras Externas',
    requiredVillageLevel: 3,
    buildHalfExtent: 17,
    cameraPanHalfExtent: 17,
    cameraMaxRadius: 27,
  },
  {
    level: 3,
    name: 'Domínio da Vila',
    requiredVillageLevel: 5,
    buildHalfExtent: 23,
    cameraPanHalfExtent: 23,
    cameraMaxRadius: 33,
  },
  {
    level: 4,
    name: 'Grande Território',
    requiredVillageLevel: 7,
    buildHalfExtent: 30,
    cameraPanHalfExtent: 30,
    cameraMaxRadius: 40,
  },
] as const;

/**
 * Normaliza o nível de expansão do mapa entre os limites válidos (0 a 4).
 */
export function normalizeMapExpansionLevel(level: number): number {
  if (typeof level !== 'number' || isNaN(level)) return 0;
  return Math.max(0, Math.min(MAX_MAP_EXPANSION_LEVEL, Math.floor(level)));
}

/**
 * Obtém a configuração de território para o nível informado.
 */
export function getTerritoryExpansionConfig(level: number): TerritoryExpansionConfig {
  const normalized = normalizeMapExpansionLevel(level);
  return TERRITORY_EXPANSION_CONFIGS[normalized];
}

/**
 * Verifica se a vila cumpre os requisitos para desbloquear a expansão informada.
 * Regras:
 * - target deve ser exatamente o nível seguinte (mapExpansionLevel + 1)
 * - villageLevel deve atingir requiredVillageLevel daquela expansão
 * - não ultrapassar o nível máximo (MAX_MAP_EXPANSION_LEVEL)
 */
export function canUnlockTerritoryExpansion(
  state: GameState,
  targetExpansionLevel: number
): boolean {
  const currentLevel = normalizeMapExpansionLevel(state.mapExpansionLevel ?? 0);
  if (targetExpansionLevel !== currentLevel + 1) {
    return false;
  }
  if (targetExpansionLevel > MAX_MAP_EXPANSION_LEVEL) {
    return false;
  }
  const config = getTerritoryExpansionConfig(targetExpansionLevel);
  return (state.villageLevel ?? 1) >= config.requiredVillageLevel;
}

/**
 * Aplica a próxima expansão territorial se for elegível.
 * Retorna novo GameState com mapExpansionLevel incrementado em 1, ou o state original se inelegível.
 */
export function unlockNextTerritoryExpansion(state: GameState): GameState {
  const nextLevel = normalizeMapExpansionLevel(state.mapExpansionLevel ?? 0) + 1;
  if (!canUnlockTerritoryExpansion(state, nextLevel)) {
    return state;
  }
  return {
    ...state,
    mapExpansionLevel: nextLevel,
  };
}
