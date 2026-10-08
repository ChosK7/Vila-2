/**
 * LevelUnlockSystem.ts
 * Sistema centralizado de desbloqueios e recompensas por nível da Vila Ancestral.
 */

import { GameState, JobType } from '../types/game';

export interface VillageLevelReward {
  level: number;
  title: string;
  description: string;
  unlockJobs?: JobType[];
  resourceStorageBonus?: number;
  productionBonus?: number;
  housingBonus?: number;
  researchBonus?: number;
}

export const LEVEL_REWARDS: Record<number, VillageLevelReward> = {
  1: {
    level: 1,
    title: 'Primeiro Acampamento',
    description: 'Pequeno abrigo inicial ao redor da fogueira com ferramentas rudimentares.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman'],
  },
  2: {
    level: 2,
    title: 'Pequeno Assentamento',
    description: 'Primeiras cabanas erguidas e organização coletiva de colheita e corte.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder'],
    resourceStorageBonus: 0.05,
  },
  3: {
    level: 3,
    title: 'Aldeia Nascente',
    description: 'Construção de celeiros e divisão estruturada dos trabalhos na comunidade.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    productionBonus: 0.05,
  },
  4: {
    level: 4,
    title: 'Aldeia Estabelecida',
    description: 'Moradias consolidadas, maior segurança e expansão das fontes de recursos.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    resourceStorageBonus: 0.10,
    housingBonus: 2,
  },
  5: {
    level: 5,
    title: 'Comunidade Próspera',
    description: 'Abundância de alimentos, ferramentas refinadas e cultura em evolução.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    productionBonus: 0.10,
    researchBonus: 0.05,
  },
  6: {
    level: 6,
    title: 'Centro Tribal',
    description: 'Ponto de referência e liderança para clãs vizinhos da região ancestral.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    housingBonus: 4,
    researchBonus: 0.10,
  },
  7: {
    level: 7,
    title: 'Grande Aldeia',
    description: 'Grandes estoques, infraestrutura durável e primeiros registros de sabedoria.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    resourceStorageBonus: 0.15,
    productionBonus: 0.10,
  },
  8: {
    level: 8,
    title: 'Centro Regional',
    description: 'Polo produtivo avançado, domínio de técnicas de alvenaria e fortificação.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    researchBonus: 0.15,
    housingBonus: 6,
  },
  9: {
    level: 9,
    title: 'Proto-Cidade',
    description: 'Complexo populacional denso, arquitetura planejada e especialização de ofícios.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    productionBonus: 0.15,
    resourceStorageBonus: 0.20,
  },
  10: {
    level: 10,
    title: 'Cidade Ancestral',
    description: 'Apogeu da civilização primordial, legado histórico e monumentos erguidos.',
    unlockJobs: ['farmer', 'lumberjack', 'quarryman', 'potter', 'elder', 'guard', 'builder'],
    productionBonus: 0.20,
    researchBonus: 0.20,
    housingBonus: 10,
  },
};

/**
 * Retorna os bônus e dados do nível informado (sempre limitado entre 1 e 10).
 */
export function getLevelReward(level: number): VillageLevelReward {
  const clamped = Math.max(1, Math.min(10, Math.floor(level || 1)));
  return LEVEL_REWARDS[clamped];
}

/**
 * Retorna todos os trabalhos disponíveis desbloqueados ATÉ aquele nível.
 */
export function getJobsUnlockedAtLevel(level: number): JobType[] {
  const reward = getLevelReward(level);
  return reward.unlockJobs ? [...reward.unlockJobs] : ['farmer', 'lumberjack', 'quarryman'];
}

/**
 * Centraliza e sincroniza os desbloqueios de nível no GameState.
 * - consulta state.villageLevel
 * - obtém empregos liberados até o nível atual
 * - mescla com state.unlockedJobs
 * - nunca remove algo já desbloqueado
 * - preserva unlockJob conquistado em missões
 */
export function applyLevelUnlocks(state: GameState): GameState {
  const currentLevel = Math.max(1, Math.min(10, Math.floor(state.villageLevel || 1)));
  const levelJobs = getJobsUnlockedAtLevel(currentLevel);

  const existingJobs: JobType[] = Array.isArray(state.unlockedJobs) && state.unlockedJobs.length > 0
    ? state.unlockedJobs
    : ['farmer', 'lumberjack', 'quarryman'];

  const mergedJobs = Array.from(new Set<JobType>([...existingJobs, ...levelJobs]));

  return {
    ...state,
    unlockedJobs: mergedJobs,
  };
}

/**
 * Retorna o multiplicador de produção geral de recursos materiais (comida, madeira, pedra, argila).
 * Não cumulativo com níveis anteriores: reflete o bônus total configurado para o nível.
 * Ex: nível 1 -> 1.0; nível 3 -> 1.05; nível 7 -> 1.10; nível 10 -> 1.20
 */
export function getVillageProductionMultiplier(level: number): number {
  const reward = getLevelReward(level);
  return 1 + (reward.productionBonus || 0);
}

/**
 * Retorna o multiplicador de geração de pesquisa/conhecimento.
 * Ex: nível 1 -> 1.0; nível 5 -> 1.05; nível 10 -> 1.20
 */
export function getVillageResearchMultiplier(level: number): number {
  const reward = getLevelReward(level);
  return 1 + (reward.researchBonus || 0);
}

/**
 * Retorna o multiplicador de capacidade máxima de armazenamento.
 * Ex: nível 1 -> 1.0; nível 2 -> 1.05; nível 4 -> 1.10; nível 7 -> 1.15; nível 9 -> 1.20
 */
export function getVillageStorageMultiplier(level: number): number {
  const reward = getLevelReward(level);
  return 1 + (reward.resourceStorageBonus || 0);
}

/**
 * Retorna o bônus adicional fixo de capacidade habitacional (vagas para aldeões).
 * Ex: nível 1 -> 0; nível 4 -> +2; nível 6 -> +4; nível 8 -> +6; nível 10 -> +10
 */
export function getVillageHousingBonus(level: number): number {
  const reward = getLevelReward(level);
  return reward.housingBonus || 0;
}
