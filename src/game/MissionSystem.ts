/**
 * MissionSystem.ts
 * Sistema centralizado e escalável de missões para a Vila Ancestral.
 * Compatível com o ProgressionSystem.
 */

import { DailyMission, GameState, JobType, MissionMetric, MissionType, Resources } from '../types/game';
import { addVillageXP } from './ProgressionSystem';

export interface MissionTemplate {
  id: string;
  type: MissionType;
  metric: MissionMetric;
  targetBuildingId?: string;
  title: string;
  description: string;
  target: number;
  rewardXP: number;
  rewardKnowledge?: number;
  rewardResources?: Partial<Resources>;
  unlockJob?: JobType;
  levelMin: number;
  levelMax?: number;
  repeatable?: boolean;
}

/**
 * Pelo menos 18 templates iniciais categorizados e escalonados por nível.
 */
export const MISSION_TEMPLATES: MissionTemplate[] = [
  // 1. RECURSOS
  {
    id: 'res_food_1',
    type: 'resource',
    metric: 'food',
    title: 'Estoque de Trigo Silvestre',
    description: 'Acumule 20 de Alimento para alimentar seus primeiros caçadores e coletores.',
    target: 20,
    rewardXP: 30,
    rewardKnowledge: 5,
    levelMin: 1,
    levelMax: 2,
    repeatable: true,
  },
  {
    id: 'res_food_2',
    type: 'resource',
    metric: 'food',
    title: 'Celeiro Abundante',
    description: 'Alcance 50 de Alimento para garantir a fartura antes das frentes frias.',
    target: 50,
    rewardXP: 50,
    rewardKnowledge: 10,
    levelMin: 2,
    levelMax: 5,
    repeatable: true,
  },
  {
    id: 'res_wood_1',
    type: 'resource',
    metric: 'wood',
    title: 'Corte de Madeiras da Orla',
    description: 'Derrube troncos e acumule 20 de Madeira para reforçar estacas e a fogueira.',
    target: 20,
    rewardXP: 30,
    rewardResources: { food: 5 },
    levelMin: 1,
    levelMax: 2,
    repeatable: true,
  },
  {
    id: 'res_wood_2',
    type: 'resource',
    metric: 'wood',
    title: 'Reserva Arbórea Nobre',
    description: 'Acumule 60 de Madeira para sustentar obras de casas e estruturas de estocagem.',
    target: 60,
    rewardXP: 60,
    rewardKnowledge: 10,
    levelMin: 2,
    levelMax: 6,
    repeatable: true,
  },
  {
    id: 'res_stone_1',
    type: 'resource',
    metric: 'stone',
    title: 'Extrator de Seixos e Lascas',
    description: 'Extraia e guarde 15 de Pedra para manufaturar primeiras lâminas duras.',
    target: 15,
    rewardXP: 35,
    rewardKnowledge: 5,
    levelMin: 1,
    levelMax: 3,
    repeatable: true,
  },
  {
    id: 'res_clay_1',
    type: 'resource',
    metric: 'clay',
    title: 'Argila das Várzeas',
    description: 'Colete 25 de Argila nos meandros do rio para fornos cerâmicos e tijolos de adobe.',
    target: 25,
    rewardXP: 65,
    rewardKnowledge: 15,
    levelMin: 3,
    levelMax: 8,
    repeatable: true,
  },
  {
    id: 'res_knowledge_1',
    type: 'resource',
    metric: 'knowledge',
    title: 'Sabedoria dos Anciãos',
    description: 'Reúna 30 de Conhecimento ouvindo canções e observando o curso das estrelas.',
    target: 30,
    rewardXP: 50,
    rewardKnowledge: 10,
    levelMin: 2,
    levelMax: 7,
    repeatable: true,
  },

  // 2. CONSTRUÇÃO
  {
    id: 'bld_huts_2',
    type: 'building',
    metric: 'building_count',
    targetBuildingId: 'hut',
    title: 'Assentamento de Cabanas',
    description: 'Tenha pelo menos 2 cabanas concluídas para acolher famílias nômades.',
    target: 2,
    rewardXP: 45,
    rewardResources: { wood: 10 },
    levelMin: 1,
    levelMax: 3,
  },
  {
    id: 'bld_granary',
    type: 'building',
    metric: 'building_count',
    targetBuildingId: 'granary',
    title: 'Silo e Celeiro da Tribo',
    description: 'Construa um celeiro na vila protegendo a subsistência contra o tempo.',
    target: 1,
    rewardXP: 70,
    rewardKnowledge: 15,
    levelMin: 2,
    levelMax: 5,
  },
  {
    id: 'bld_well',
    type: 'building',
    metric: 'building_count',
    targetBuildingId: 'village_well',
    title: 'Obras de Sustento Coletivo',
    description: 'Construa um poço de água fresca na aldeia para o sustento comunitário.',
    target: 1,
    rewardXP: 90,
    rewardKnowledge: 20,
    levelMin: 3,
    levelMax: 7,
  },
  {
    id: 'bld_production',
    type: 'building',
    metric: 'building_count',
    title: 'Engenharia da Vila Estabelecida',
    description: 'Erga ao todo 6 construções concluídas na vila ancestral.',
    target: 6,
    rewardXP: 120,
    rewardKnowledge: 30,
    levelMin: 4,
  },

  // 3. POPULAÇÃO
  {
    id: 'pop_reach_3',
    type: 'population',
    metric: 'population',
    title: 'Primeira Fraternidade',
    description: 'Alcance uma população de 3 valorosos aldeões ativos.',
    target: 3,
    rewardXP: 40,
    rewardResources: { food: 10 },
    levelMin: 1,
    levelMax: 2,
  },
  {
    id: 'pop_reach_5',
    type: 'population',
    metric: 'population',
    title: 'Tribo em Crescimento',
    description: 'Alcance 5 aldeões compartilhando as tarefas diárias da aldeia.',
    target: 5,
    rewardXP: 65,
    rewardKnowledge: 10,
    levelMin: 2,
    levelMax: 4,
  },
  {
    id: 'pop_reach_8',
    type: 'population',
    metric: 'population',
    title: 'Comunidade Próspera de Trabalho',
    description: 'Reúna 8 aldeões integrados na cooperativa de tarefas da vila.',
    target: 8,
    rewardXP: 110,
    rewardKnowledge: 25,
    levelMin: 4,
  },

  // 4. PESQUISA
  {
    id: 'res_tech_1',
    type: 'research',
    metric: 'technology_count',
    title: 'Primeiro Conhecimento Dominado',
    description: 'Desbloqueie 1 tecnologia na árvore de saberes ancestrais.',
    target: 1,
    rewardXP: 40,
    rewardKnowledge: 15,
    levelMin: 1,
    levelMax: 3,
  },
  {
    id: 'res_tech_3',
    type: 'research',
    metric: 'technology_count',
    title: 'Inovações Primitivas',
    description: 'Desbloqueie 3 tecnologias para dominar as forças da natureza.',
    target: 3,
    rewardXP: 75,
    rewardKnowledge: 25,
    levelMin: 2,
    levelMax: 5,
  },
  {
    id: 'res_tech_5',
    type: 'research',
    metric: 'technology_count',
    title: 'Legado Intelectual da Tribo',
    description: 'Desbloqueie 5 tecnologias nos círculos de estudo dos anciãos.',
    target: 5,
    rewardXP: 125,
    rewardKnowledge: 40,
    levelMin: 4,
  },

  // 5. SOBREVIVÊNCIA
  {
    id: 'surv_days_3',
    type: 'survival',
    metric: 'days_survived',
    title: 'Resistência ao Tempo',
    description: 'Sobreviva a 3 dias mantendo a chama da aldeia acesa.',
    target: 3,
    rewardXP: 45,
    rewardResources: { wood: 15 },
    levelMin: 1,
    levelMax: 3,
  },
  {
    id: 'surv_days_10',
    type: 'survival',
    metric: 'days_survived',
    title: 'Pioneiros das Estações',
    description: 'Sobreviva a 10 dias atravessando os ciclos do sol e intempéries.',
    target: 10,
    rewardXP: 100,
    rewardKnowledge: 30,
    levelMin: 3,
  },

  // 6. PROGRESSÃO
  {
    id: 'prog_level_2',
    type: 'progression',
    metric: 'village_level',
    title: 'Evolução do Assentamento',
    description: 'Evolua a vila para o Nível 2 (Pequeno Assentamento).',
    target: 2,
    rewardXP: 100,
    rewardKnowledge: 20,
    levelMin: 1,
    levelMax: 1,
  },
  {
    id: 'prog_level_3',
    type: 'progression',
    metric: 'village_level',
    title: 'Nascimento de uma Aldeia',
    description: 'Eleve a vila para o Nível 3 (Aldeia Nascente).',
    target: 3,
    rewardXP: 130,
    rewardKnowledge: 25,
    levelMin: 2,
    levelMax: 2,
  },
  {
    id: 'prog_level_5',
    type: 'progression',
    metric: 'village_level',
    title: 'Fundação da Comunidade Próspera',
    description: 'Guie a vila até o prestigiado Nível 5 (Comunidade Próspera).',
    target: 5,
    rewardXP: 180,
    rewardKnowledge: 40,
    levelMin: 3,
    levelMax: 4,
  },
];

/**
 * Retorna os templates de missão apropriados para o nível da vila.
 */
export function getAvailableMissionTemplates(villageLevel: number): MissionTemplate[] {
  const level = Math.max(1, villageLevel);
  return MISSION_TEMPLATES.filter((tpl) => {
    if (level < tpl.levelMin) return false;
    if (tpl.levelMax !== undefined && level > tpl.levelMax) return false;
    return true;
  });
}

/**
 * Converte um MissionTemplate em uma DailyMission ativa com progresso inicial computado.
 */
function templateToDailyMission(
  tpl: MissionTemplate,
  state: GameState,
  index: number
): DailyMission {
  // Gera texto de recompensa legível
  const rewardParts: string[] = [`+${tpl.rewardXP} XP`];
  if (tpl.rewardKnowledge && tpl.rewardKnowledge > 0) {
    rewardParts.push(`+${tpl.rewardKnowledge} Conhecimento`);
  }
  if (tpl.rewardResources) {
    if (tpl.rewardResources.food) rewardParts.push(`+${tpl.rewardResources.food} 🌾`);
    if (tpl.rewardResources.wood) rewardParts.push(`+${tpl.rewardResources.wood} 🪵`);
    if (tpl.rewardResources.stone) rewardParts.push(`+${tpl.rewardResources.stone} 🪨`);
    if (tpl.rewardResources.clay) rewardParts.push(`+${tpl.rewardResources.clay} 🧱`);
  }
  if (tpl.unlockJob) {
    rewardParts.push(`Desbloqueia ${tpl.unlockJob}`);
  }

  // Mapeia categoria clássica para compatibilidade retroativa
  let category: DailyMission['category'] = 'food';
  if (tpl.metric === 'wood') category = 'wood';
  else if (tpl.metric === 'stone') category = 'stone';
  else if (tpl.metric === 'clay' || tpl.metric === 'knowledge') category = 'knowledge';
  else if (tpl.metric === 'building_count') category = 'build';
  else if (tpl.metric === 'population') category = 'villagers';
  else if (tpl.metric === 'food') category = 'food';

  const mission: DailyMission = {
    id: `${tpl.id}-${state.turn}-${state.villageLevel}-${index}`,
    title: tpl.title,
    description: tpl.description,
    category,
    type: tpl.type,
    metric: tpl.metric,
    targetBuildingId: tpl.targetBuildingId,
    levelMin: tpl.levelMin,
    levelMax: tpl.levelMax,
    repeatable: tpl.repeatable,
    target: tpl.target,
    progress: 0,
    rewardText: rewardParts.join(', '),
    rewardXP: tpl.rewardXP,
    rewardKnowledge: tpl.rewardKnowledge,
    rewardResources: tpl.rewardResources,
    unlockJob: tpl.unlockJob,
    completed: false,
    claimed: false,
  };

  const currentProg = calculateMissionProgress(mission, state);
  mission.progress = currentProg;
  mission.completed = currentProg >= mission.target;

  return mission;
}

/**
 * Calcula o progresso real de uma missão com base no estado do jogo.
 * Limita sempre a Math.min(target, progresso).
 */
export function calculateMissionProgress(mission: DailyMission, state: GameState): number {
  const norm = normalizeMission(mission);
  let value = 0;

  switch (norm.metric) {
    case 'food':
      value = state.resources?.food ?? 0;
      break;
    case 'wood':
      value = state.resources?.wood ?? 0;
      break;
    case 'stone':
      value = state.resources?.stone ?? 0;
      break;
    case 'clay':
      value = state.resources?.clay ?? 0;
      break;
    case 'knowledge':
      value = state.resources?.knowledge ?? 0;
      break;
    case 'building_count': {
      if (norm.targetBuildingId) {
        value = state.buildings?.[norm.targetBuildingId]?.count ?? 0;
      } else {
        value = Object.values(state.buildings ?? {}).reduce(
          (sum, b) => sum + Math.max(0, b.count || 0),
          0
        );
      }
      break;
    }
    case 'population':
      value = state.villagers?.length ?? 0;
      break;
    case 'technology_count': {
      const unlockedCount = Object.values(state.technologies ?? {}).filter(
        (t) => t.unlocked === true
      ).length;
      value = unlockedCount;
      break;
    }
    case 'days_survived':
      value = Math.max(1, state.turn ?? 1);
      break;
    case 'village_level':
      value = state.villageLevel ?? 1;
      break;
    default: {
      // Fallback para saves antigos baseados exclusivamente em category
      if (mission.category === 'food') value = state.resources?.food ?? 0;
      else if (mission.category === 'wood') value = state.resources?.wood ?? 0;
      else if (mission.category === 'stone') value = state.resources?.stone ?? 0;
      else if (mission.category === 'knowledge') value = state.resources?.knowledge ?? 0;
      else if (mission.category === 'villagers') value = state.villagers?.length ?? 0;
      else if (mission.category === 'build') {
        if (norm.targetBuildingId) {
          const building = state.buildings?.[norm.targetBuildingId];
          value = building?.count ?? 0;
        } else {
          value = Object.values(state.buildings ?? {}).reduce(
            (sum, b) => sum + (b.count > 0 ? b.count : 0),
            0
          );
        }
      }
      break;
    }
  }

  // O progresso não deve regredir se for acumulado
  const finalVal = Math.max(mission.progress || 0, value);
  return Math.min(mission.target, Math.floor(finalVal));
}

/**
 * Normaliza missões antigas vindas de saves sem os campos novos type/metric/levelMin.
 */
export function normalizeMission(m: DailyMission): DailyMission {
  let inferredType: MissionType = m.type || 'resource';
  let inferredMetric: MissionMetric = m.metric || 'food';

  if (!m.type || !m.metric) {
    if (m.category === 'food') {
      inferredType = 'resource';
      inferredMetric = 'food';
    } else if (m.category === 'wood') {
      inferredType = 'resource';
      inferredMetric = 'wood';
    } else if (m.category === 'stone') {
      inferredType = 'resource';
      inferredMetric = 'stone';
    } else if (m.category === 'knowledge') {
      inferredType = 'resource';
      inferredMetric = 'knowledge';
    } else if (m.category === 'build') {
      inferredType = 'building';
      inferredMetric = 'building_count';
    } else if (m.category === 'villagers') {
      inferredType = 'population';
      inferredMetric = 'population';
    }
  }

  return {
    ...m,
    type: inferredType,
    metric: inferredMetric,
    targetBuildingId: m.targetBuildingId,
    levelMin: m.levelMin ?? 1,
  };
}

/**
 * Atualiza o progresso de um conjunto de missões diárias com base no estado atual do jogo.
 * - Recalcula progress
 * - Marca completed = true quando progress >= target
 * - Nunca desmarca claimed
 */
export function updateMissionProgress(
  missions: DailyMission[],
  state: GameState
): DailyMission[] {
  if (!missions || missions.length === 0) return [];

  return missions.map((raw) => {
    const m = normalizeMission(raw);
    if (m.claimed) return m;

    const newProgress = calculateMissionProgress(m, state);
    const isCompleted = newProgress >= m.target;

    return {
      ...m,
      progress: newProgress,
      completed: isCompleted,
    };
  });
}

/**
 * Calcula uma pontuação pseudo-aleatória porém determinística para ordenação de templates.
 * Garante estabilidade de interface, ausência de flicker e total reprodutibilidade.
 */
export function deterministicScore(
  templateId: string,
  turn: number,
  villageLevel: number
): number {
  let score = turn * 31 + villageLevel * 17;
  for (let i = 0; i < templateId.length; i++) {
    score += templateId.charCodeAt(i) * (i + 1);
  }
  return score;
}

/**
 * Helper de conveniência que recebe o GameState atual,
 * recalcula o progresso de todas as missões ativas e retorna um novo GameState atualizado.
 */
export function refreshMissions(state: GameState): GameState {
  return {
    ...state,
    dailyMissions: updateMissionProgress(
      state.dailyMissions || [],
      state
    ),
  };
}

/**
 * Gera um novo conjunto de missões ativas (até `count`, padrão 3).
 * - Evita IDs duplicados
 * - Prioriza templates adequados ao villageLevel
 * - Utiliza templates de diferentes categorias/métricas
 * - Calcula o progresso inicial com base no estado atual
 * - Totalmente determinístico sem Math.random()
 */
export function generateMissionSet(
  state: GameState,
  count: number = 3
): DailyMission[] {
  const villageLevel = state.villageLevel ?? 1;
  const availableTemplates = getAvailableMissionTemplates(villageLevel);

  if (availableTemplates.length === 0) {
    return [];
  }

  // Identifica templates já concluídos recentemente nas missões existentes
  const claimedTemplateBaseIds = new Set(
    (state.dailyMissions || [])
      .filter((m) => m.claimed && !m.repeatable)
      .map((m) => m.id.split('-')[0])
  );

  // Filtra templates que ainda não foram claimed permanentemente (ou são repetíveis)
  let candidateTemplates = availableTemplates.filter(
    (tpl) => tpl.repeatable || !claimedTemplateBaseIds.has(tpl.id)
  );

  if (candidateTemplates.length === 0) {
    candidateTemplates = availableTemplates;
  }

  // Ordenação determinística com base no turn e nível
  const ordered = [...candidateTemplates].sort(
    (a, b) =>
      deterministicScore(a.id, state.turn, villageLevel) -
      deterministicScore(b.id, state.turn, villageLevel)
  );

  const selectedTemplates: MissionTemplate[] = [];
  const chosenTypes = new Set<string>();

  // Primeira passagem: seleciona tipos variados
  for (const tpl of ordered) {
    if (selectedTemplates.length >= count) break;
    if (!chosenTypes.has(tpl.type)) {
      selectedTemplates.push(tpl);
      chosenTypes.add(tpl.type);
    }
  }

  // Segunda passagem: preenche caso ainda falte preencher até `count`
  for (const tpl of ordered) {
    if (selectedTemplates.length >= count) break;
    if (!selectedTemplates.some((s) => s.id === tpl.id)) {
      selectedTemplates.push(tpl);
    }
  }

  return selectedTemplates.map(
    (tpl, index) => templateToDailyMission(tpl, state, index)
  );
}

/**
 * Aplica as recompensas da missão e marca como claimed.
 * Toda recompensa de XP utiliza ProgressionSystem (addVillageXP).
 * Retorna o novo GameState atualizado.
 */
export function applyMissionReward(
  state: GameState,
  mission: DailyMission
): GameState {
  if (mission.claimed) return state;

  const currentLevel = state.villageLevel ?? 1;
  const currentXP = state.villageXP ?? 0;

  // 1. Aplicação de XP via ProgressionSystem
  const xpResult = addVillageXP(currentLevel, currentXP, mission.rewardXP || 0);

  // 2. Recompensas de Conhecimento e Recursos
  const updatedResources: Resources = {
    ...state.resources,
    knowledge: (state.resources.knowledge || 0) + (mission.rewardKnowledge || 0),
    food: (state.resources.food || 0) + (mission.rewardResources?.food || 0),
    wood: (state.resources.wood || 0) + (mission.rewardResources?.wood || 0),
    stone: (state.resources.stone || 0) + (mission.rewardResources?.stone || 0),
    clay: (state.resources.clay || 0) + (mission.rewardResources?.clay || 0),
  };

  // 3. Desbloqueio progressivo de trabalho (se especificado na missão ou por nível)
  const updatedUnlockedJobs = [...(state.unlockedJobs || ['farmer', 'lumberjack', 'quarryman'])];
  if (mission.unlockJob && !updatedUnlockedJobs.includes(mission.unlockJob)) {
    updatedUnlockedJobs.push(mission.unlockJob);
  }
  if (xpResult.level >= 2 && !updatedUnlockedJobs.includes('potter')) {
    updatedUnlockedJobs.push('potter');
  }
  if (xpResult.level >= 2 && !updatedUnlockedJobs.includes('elder')) {
    updatedUnlockedJobs.push('elder');
  }
  if (xpResult.level >= 3 && !updatedUnlockedJobs.includes('guard')) {
    updatedUnlockedJobs.push('guard');
  }

  // 4. Marcação da missão como claimed
  let updatedMissions = (state.dailyMissions || []).map((m) => {
    if (m.id === mission.id) {
      return {
        ...m,
        claimed: true,
        completed: true,
      };
    }
    return m;
  });

  // 5. Se todas as missões foram reivindicadas, gera um novo conjunto
  const allClaimed = updatedMissions.length > 0 && updatedMissions.every((m) => m.claimed);
  if (allClaimed) {
    const tempState: GameState = {
      ...state,
      villageLevel: xpResult.level,
      villageXP: xpResult.xp,
      resources: updatedResources,
      dailyMissions: updatedMissions,
    };
    updatedMissions = generateMissionSet(tempState, 3);
  }

  // 6. Atualização de lastLevelUp se ganhou níveis
  const lastLevelUp =
    xpResult.levelsGained > 0
      ? { oldLevel: currentLevel, newLevel: xpResult.level }
      : state.lastLevelUp;

  let finalState: GameState = {
    ...state,
    villageLevel: xpResult.level,
    villageXP: xpResult.xp,
    xpToNextLevel: xpResult.xpToNextLevel,
    lastLevelUp,
    resources: updatedResources,
    unlockedJobs: updatedUnlockedJobs,
    dailyMissions: updatedMissions,
  };

  if (!allClaimed) {
    finalState = refreshMissions(finalState);
  }

  return finalState;
}
