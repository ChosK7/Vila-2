/**
 * GameClock.ts
 *
 * Módulo central de controle do relógio do jogo.
 * REGRA DEFINITIVA: 1 dia completo do jogo (24 horas) dura exatamente 15 minutos reais (900 segundos).
 */

import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { processMealConsumption } from './ResourceSystem';
import { updateVillagerWorkStatus } from './ScheduleSystem';
import { audio } from '../utils/audio';

export const REAL_DAY_DURATION_SECONDS = 900;
export const GAME_HOURS_PER_DAY = 24;
export const TICK_MS = 200;
export const GAME_HOURS_PER_SECOND = GAME_HOURS_PER_DAY / REAL_DAY_DURATION_SECONDS; // 24 / 900 = 0.0266666667
export const STEP_HOURS_PER_TICK = GAME_HOURS_PER_SECOND * (TICK_MS / 1000); // 0.005333333333333333

export const DAYS_PER_SEASON = 20;
export const SEASONS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

// Horários fixos de refeições diárias
export const BREAKFAST_HOUR = 6.0; // Café da manhã ao amanhecer (~06:00)
export const LUNCH_HOUR = 12.0;    // Almoço ao meio-dia (~12:00)
export const DINNER_HOUR = 19.5;   // Jantar ao entardecer/noite (~19:30)

export interface AdvanceGameHourResult {
  nextHour: number;
  wrapped: boolean;
  remainingHour: number;
}

/**
 * Retorna o avanço em horas do jogo por cada tick do timer (200ms).
 */
export function getStepHoursPerTick(): number {
  return STEP_HOURS_PER_TICK;
}

/**
 * Avança a hora do jogo respeitando o ciclo de 24 horas.
 *
 * @param currentHour Hora atual do jogo (0.0 a 24.0)
 * @param step Quantidade opcional de horas a avançar (padrão: STEP_HOURS_PER_TICK)
 * @returns Objeto com nextHour, wrapped (se passou de 24h) e remainingHour (sobra após passar de 24h)
 */
export function advanceGameHour(
  currentHour: number,
  step: number = STEP_HOURS_PER_TICK
): AdvanceGameHourResult {
  const calculatedNext = currentHour + step;

  if (calculatedNext >= GAME_HOURS_PER_DAY) {
    const remainingHour = calculatedNext - GAME_HOURS_PER_DAY;
    return {
      nextHour: remainingHour,
      wrapped: true,
      remainingHour,
    };
  }

  return {
    nextHour: calculatedNext,
    wrapped: false,
    remainingHour: 0,
  };
}

/**
 * Verifica se o avanço entre currentHour e nextHour cruzou algum dos horários de refeição.
 */
export function checkMealCrossing(currentHour: number, nextHour: number) {
  const crossedBreakfast = currentHour < BREAKFAST_HOUR && nextHour >= BREAKFAST_HOUR;
  const crossedLunch = currentHour < LUNCH_HOUR && nextHour >= LUNCH_HOUR;
  const crossedDinner = currentHour < DINNER_HOUR && nextHour >= DINNER_HOUR;
  return {
    crossedBreakfast,
    crossedLunch,
    crossedDinner,
    crossedAnyMeal: crossedBreakfast || crossedLunch || crossedDinner,
  };
}

/**
 * Processa um único tick da simulação do tempo no estado do jogo:
 * - Avança as horas via GameClock
 * - Se completar 24h, dispara o callback de avanço automático do dia
 * - Dispara refeições (café, almoço e jantar) se cruzou os horários
 */
export function processGameTimeTick(
  prev: GameState,
  onDayAdvance: (prev: GameState, remainingHour: number) => GameState
): GameState {
  if (prev.isGameOver || prev.isTimePaused) return prev;

  const currentHour = prev.gameHour ?? 6.0;
  const { nextHour, wrapped, remainingHour } = advanceGameHour(currentHour);

  // Se completou 24h, dispara o avanço automático de turno/dia
  if (wrapped) {
    return onDayAdvance(prev, remainingHour);
  }

  // Verifica eventos de refeição: café da manhã (06:00), almoço (12:00), jantar (19:30)
  const { crossedAnyMeal } = checkMealCrossing(currentHour, nextHour);

  let updatedFood = prev.resources.food;
  let updatedVillagers = prev.villagers;

  if (crossedAnyMeal) {
    const mealResult = processMealConsumption(prev.resources.food, prev.villagers);
    updatedFood = mealResult.updatedFood;
    updatedVillagers = mealResult.updatedVillagers;

    if (mealResult.hasFood) {
      audio.playHarvest();
    } else {
      audio.playAlert();
    }
  }

  // Atualiza estado de trabalho individual de cada aldeão com base na hora e expediente
  updatedVillagers = updateVillagerWorkStatus(updatedVillagers, nextHour);

  return {
    ...prev,
    gameHour: nextHour,
    resources: {
      ...prev.resources,
      food: updatedFood,
    },
    villagers: updatedVillagers,
  };
}

/**
 * Alterna a pausa do tempo do jogo.
 */
export function toggleTimePause(prev: GameState): GameState {
  return {
    ...prev,
    isTimePaused: !prev.isTimePaused,
  };
}

/**
 * Hook centralizado que executa o ciclo de tempo contínuo do jogo.
 * Conecta o timer do GameClock ao estado do React sem poluir o componente principal.
 */
export function useGameClock(
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  onDayAdvance: (prev: GameState, remainingHour: number) => GameState
): void {
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prev) => processGameTimeTick(prev, onDayAdvance));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [setGameState, onDayAdvance]);
}
