import { Villager } from '../types/game';

export const DEFAULT_WORK_START = 7.0;
export const DEFAULT_WORK_END = 17.0;

/**
 * Converte string no formato "HH:MM" (ex: "07:30") em número decimal de horas (ex: 7.5).
 */
export function timeStringToDecimal(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return DEFAULT_WORK_START;
  }

  const parts = timeStr.split(':');
  if (parts.length < 2) {
    const val = parseFloat(timeStr);
    return isNaN(val) ? DEFAULT_WORK_START : Math.max(0, Math.min(24, val));
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return DEFAULT_WORK_START;
  }

  const decimal = hours + minutes / 60;
  return Math.max(0, Math.min(24, Math.round(decimal * 100) / 100));
}

/**
 * Converte número decimal de horas (ex: 7.5) em string "HH:MM" (ex: "07:30").
 */
export function decimalToTimeString(decimalHour: number): string {
  if (typeof decimalHour !== 'number' || isNaN(decimalHour)) {
    return '07:00';
  }

  // Normaliza dentro do intervalo [0, 24)
  const normalized = ((decimalHour % 24) + 24) % 24;
  let hours = Math.floor(normalized);
  let minutes = Math.round((normalized - hours) * 60);

  if (minutes >= 60) {
    hours = (hours + 1) % 24;
    minutes = 0;
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Determina se a hora atual do jogo está dentro do expediente de trabalho do aldeão.
 * Suporta tanto expedientes diurnos (ex: 06:00 às 17:00) quanto turnos noturnos (ex: 18:00 às 02:00).
 * Se workStart === workEnd, considera sem expediente (retorna false).
 */
export function isWithinWorkSchedule(
  gameHour: number,
  workStart: number,
  workEnd: number
): boolean {
  if (workStart === workEnd) {
    return false;
  }

  if (workStart < workEnd) {
    return gameHour >= workStart && gameHour < workEnd;
  }

  // Turno noturno que cruza a meia-noite (ex: 18:00 até 02:00)
  return gameHour >= workStart || gameHour < workEnd;
}

/**
 * Atualiza o status de trabalho de cada aldeão com base na hora atual do jogo.
 * isWorking = true SOMENTE se:
 * - job !== 'idle'
 * - o horário atual estiver dentro do expediente configurado
 * Caso contrário, isWorking = false.
 */
export function updateVillagerWorkStatus(
  villagers: Villager[],
  gameHour: number
): Villager[] {
  return villagers.map((villager) => {
    const isWorking =
      villager.job !== 'idle' &&
      isWithinWorkSchedule(gameHour, villager.workStart, villager.workEnd);

    if (villager.isWorking === isWorking) {
      return villager;
    }

    return {
      ...villager,
      isWorking,
    };
  });
}
