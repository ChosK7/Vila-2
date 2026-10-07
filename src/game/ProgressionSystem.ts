/**
 * ProgressionSystem.ts
 * Sistema de progressão, XP e níveis da Vila Ancestral.
 */

export const MAX_VILLAGE_LEVEL = 10;

/**
 * Tabela de XP necessária para avançar do nível atual para o próximo.
 * Nível 1 -> 2 = 100 XP
 * Nível 2 -> 3 = 150 XP
 * Nível 3 -> 4 = 225 XP
 * Nível 4 -> 5 = 325 XP
 * Nível 5 -> 6 = 450 XP
 * Nível 6 -> 7 = 600 XP
 * Nível 7 -> 8 = 775 XP
 * Nível 8 -> 9 = 975 XP
 * Nível 9 -> 10 = 1200 XP
 * No nível 10 = 0 XP
 */
const XP_TABLE: Record<number, number> = {
  1: 100,
  2: 150,
  3: 225,
  4: 325,
  5: 450,
  6: 600,
  7: 775,
  8: 975,
  9: 1200,
};

/**
 * Retorna o XP necessário para avançar do nível informado para o próximo.
 * Retorna 0 quando no nível máximo (10).
 */
export function getXPRequiredForLevel(level: number): number {
  if (level < 1) return XP_TABLE[1];
  if (level >= MAX_VILLAGE_LEVEL) return 0;
  return XP_TABLE[level] ?? 100;
}

export interface VillageXPResult {
  level: number;
  xp: number;
  xpToNextLevel: number;
  levelsGained: number;
}

/**
 * Função central para adicionar XP à vila.
 * - Nunca permite XP negativo.
 * - Nunca ultrapassa o nível MAX_VILLAGE_LEVEL (10).
 * - Permite subir múltiplos níveis em um único ganho.
 * - Carrega o XP excedente para os níveis seguintes.
 * - No nível 10, zera o XP excedente e não continua acumulando indefinidamente.
 */
export function addVillageXP(
  currentLevel: number,
  currentXP: number,
  amount: number
): VillageXPResult {
  let level = Math.max(1, Math.min(MAX_VILLAGE_LEVEL, currentLevel));
  const cleanXP = Math.max(0, currentXP);

  if (amount <= 0 || level >= MAX_VILLAGE_LEVEL) {
    return {
      level,
      xp: level >= MAX_VILLAGE_LEVEL ? 0 : cleanXP,
      xpToNextLevel: getXPRequiredForLevel(level),
      levelsGained: 0,
    };
  }

  const initialLevel = level;
  let remainingXP = cleanXP + amount;

  while (level < MAX_VILLAGE_LEVEL) {
    const required = getXPRequiredForLevel(level);
    if (required <= 0) break;

    if (remainingXP >= required) {
      remainingXP -= required;
      level += 1;
    } else {
      break;
    }
  }

  if (level >= MAX_VILLAGE_LEVEL) {
    level = MAX_VILLAGE_LEVEL;
    remainingXP = 0;
  }

  return {
    level,
    xp: remainingXP,
    xpToNextLevel: getXPRequiredForLevel(level),
    levelsGained: level - initialLevel,
  };
}

export interface VillageLevelConfig {
  level: number;
  name: string;
  description: string;
}

export const VILLAGE_LEVELS: Record<number, VillageLevelConfig> = {
  1: {
    level: 1,
    name: 'Primeiro Acampamento',
    description: 'Pequeno abrigo inicial ao redor da fogueira com ferramentas rudimentares.',
  },
  2: {
    level: 2,
    name: 'Pequeno Assentamento',
    description: 'Primeiras cabanas erguidas e organização coletiva de colheita e corte.',
  },
  3: {
    level: 3,
    name: 'Aldeia Nascente',
    description: 'Construção de celeiros e divisão estruturada dos trabalhos na comunidade.',
  },
  4: {
    level: 4,
    name: 'Aldeia Estabelecida',
    description: 'Moradias consolidadas, maior segurança e expansão das fontes de recursos.',
  },
  5: {
    level: 5,
    name: 'Comunidade Próspera',
    description: 'Abundância de alimentos, ferramentas refinadas e cultura em evolução.',
  },
  6: {
    level: 6,
    name: 'Centro Tribal',
    description: 'Ponto de referência e liderança para clãs vizinhos da região ancestral.',
  },
  7: {
    level: 7,
    name: 'Grande Aldeia',
    description: 'Grandes estoques, infraestrutura durável e primeiros registros de sabedoria.',
  },
  8: {
    level: 8,
    name: 'Centro Regional',
    description: 'Polo produtivo avançado, domínio de técnicas de alvenaria e fortificação.',
  },
  9: {
    level: 9,
    name: 'Proto-Cidade',
    description: 'Complexo populacional denso, arquitetura planejada e especialização de ofícios.',
  },
  10: {
    level: 10,
    name: 'Cidade Ancestral',
    description: 'Apogeu da civilização primordial, legado histórico e monumentos erguidos.',
  },
};

/**
 * Retorna a configuração de nome e descrição de um nível da vila.
 * Garante sempre retorno válido (clamp entre 1 e 10).
 */
export function getVillageLevelConfig(level: number): VillageLevelConfig {
  const clamped = Math.max(1, Math.min(MAX_VILLAGE_LEVEL, Math.floor(level || 1)));
  return VILLAGE_LEVELS[clamped];
}
