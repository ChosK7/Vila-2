import { Villager } from '../types/game';

export type VillagerActivity =
  | 'working'
  | 'eating'
  | 'resting'
  | 'socializing'
  | 'sleeping'
  | 'wandering'
  | 'idle';

export interface VillagerDecision {
  activity: VillagerActivity;
  duration: number; // Duração em segundos antes de reavaliar
  targetType: 'workplace' | 'home' | 'campfire' | 'villager' | 'wander';
  targetVillagerId?: string;
  targetOffset?: { x: number; z: number };
}

/**
 * Constantes de rotina diária para a IA dos aldeões
 */
export const NIGHT_SLEEP_START = 21.5; // 21:30
export const NIGHT_SLEEP_END = 5.5;    // 05:30

export const BREAKFAST_START = 5.8;
export const BREAKFAST_END = 6.8;
export const LUNCH_START = 11.8;
export const LUNCH_END = 12.8;
export const DINNER_START = 19.3;
export const DINNER_END = 20.3;

/**
 * Verifica se a hora do jogo está no período noturno de sono (21:30 às 05:30).
 */
export function isNightSleepHours(gameHour: number): boolean {
  const h = ((gameHour % 24) + 24) % 24;
  return h >= NIGHT_SLEEP_START || h < NIGHT_SLEEP_END;
}

/**
 * Verifica se a hora atual coincide com uma das refeições diárias.
 */
export function isMealTime(gameHour: number): boolean {
  const h = ((gameHour % 24) + 24) % 24;
  return (
    (h >= BREAKFAST_START && h < BREAKFAST_END) ||
    (h >= LUNCH_START && h < LUNCH_END) ||
    (h >= DINNER_START && h < DINNER_END)
  );
}

/**
 * Gera um ponto seguro aleatório dentro do perímetro central da vila.
 * Evita atravessar limites do mapa ou caminhar para muito longe.
 */
export function getRandomVillageWanderPoint(): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.2 + Math.random() * 3.8; // Raio entre 1.2m e 5.0m do centro
  return {
    x: Math.round(Math.cos(angle) * radius * 10) / 10,
    z: Math.round(Math.sin(angle) * radius * 10) / 10,
  };
}

/**
 * Duração mínima em segundos para qualquer decisão autônoma,
 * impedindo troca frenética de comportamento a cada frame.
 */
export const MIN_DECISION_DURATION = 4.5;

/**
 * Função principal que calcula a decisão autônoma detalhada do aldeão,
 * incluindo atividade, duração mínima e coordenadas/alvos pretendidos.
 */
export function chooseVillagerDecision(
  villager: Villager,
  gameHour: number,
  allVillagers: Villager[] = []
): VillagerDecision {
  const h = ((gameHour % 24) + 24) % 24;

  // 1. PRIORIDADE: EXPEDIENTE DE TRABALHO
  if (villager.isWorking && villager.job !== 'idle') {
    return {
      activity: 'working',
      duration: Math.max(MIN_DECISION_DURATION, 8.0 + Math.random() * 5.0),
      targetType: 'workplace',
    };
  }

  // 2. PRIORIDADE: REFEIÇÕES DIÁRIAS (se não estiver trabalhando)
  if (isMealTime(h)) {
    return {
      activity: 'eating',
      duration: Math.max(MIN_DECISION_DURATION, 6.0 + Math.random() * 4.0),
      targetType: 'campfire',
    };
  }

  // 3. PRIORIDADE: ROTINA NOTURNA DE SONO (21:30 às 05:30)
  if (isNightSleepHours(h)) {
    return {
      activity: 'sleeping',
      duration: Math.max(MIN_DECISION_DURATION, 10.0 + Math.random() * 6.0),
      targetType: 'home',
    };
  }

  // 4. FORA DO EXPEDIENTE E DESPERTO: IA AUTÔNOMA
  const otherVillagers = allVillagers.filter((v) => v.id !== villager.id);
  const rand = Math.random();

  // 4.1 SOCIALIZAÇÃO (35% de chance se houver outro aldeão na vila)
  if (otherVillagers.length > 0 && rand < 0.35) {
    const partner = otherVillagers[Math.floor(Math.random() * otherVillagers.length)];
    return {
      activity: 'socializing',
      duration: Math.max(MIN_DECISION_DURATION, 6.0 + Math.random() * 4.5),
      targetType: 'villager',
      targetVillagerId: partner.id,
    };
  }

  // 4.2 DESCANSO / RESTING (30% de chance)
  if (rand < 0.65) {
    const restAtHome = Math.random() > 0.6;
    return {
      activity: 'resting',
      duration: Math.max(MIN_DECISION_DURATION, 5.5 + Math.random() * 4.0),
      targetType: restAtHome ? 'home' : 'campfire',
    };
  }

  // 4.3 PASSEIO / WANDERING (20% de chance)
  if (rand < 0.85) {
    return {
      activity: 'wandering',
      duration: Math.max(MIN_DECISION_DURATION, 5.0 + Math.random() * 3.5),
      targetType: 'wander',
      targetOffset: getRandomVillageWanderPoint(),
    };
  }

  // 4.4 IDLE SIMPLES (15% de chance)
  return {
    activity: 'idle',
    duration: Math.max(MIN_DECISION_DURATION, 4.5 + Math.random() * 3.0),
    targetType: 'campfire',
  };
}

/**
 * Função sugerida de IA pura: Retorna o tipo de atividade autônoma escolhida.
 */
export function chooseVillagerActivity(
  villager: Villager,
  gameHour: number,
  allVillagers: Villager[] = []
): VillagerActivity {
  return chooseVillagerDecision(villager, gameHour, allVillagers).activity;
}
