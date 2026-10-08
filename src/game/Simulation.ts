import { DailyMission, GameEvent, GameState, Resources, TurnReport } from '../types/game';
import { ERAS_INFO, RANDOM_EVENTS } from '../data/initialData';
import { applyDailyResourceProduction, ResourceRates } from './ResourceSystem';
import { autoAssignIdleVillagers } from './JobSystem';
import { advanceBuildingsConstruction, calculateStorageCaps } from './BuildingSystem';
import { DAYS_PER_SEASON } from './GameClock';
import { updateVillagerWorkStatus } from './ScheduleSystem';
import { updateMissionProgress, generateMissionSet } from './MissionSystem';

export interface AdvanceDayResult {
  nextState: GameState;
  shouldPlayAlert: boolean;
  completedBuildings: string[];
}

/**
 * Atualiza o progresso das missões diárias com base no novo saldo de recursos e população.
 * Mantido como adaptador retrocompatível que delega para o MissionSystem.
 */
export function updateDailyMissionsProgress(
  missions: DailyMission[],
  resources: Resources,
  villagersCount: number
): DailyMission[] {
  // Cria um estado mínimo para delegar ao MissionSystem
  const dummyState = {
    resources,
    villagers: Array(villagersCount).fill(null),
  } as unknown as GameState;
  return updateMissionProgress(missions, dummyState);
}

/**
 * Função principal de simulação de avanço de um dia/turno completo.
 * Coordena ResourceSystem, BuildingSystem e JobSystem.
 */
export function advanceSimulationDay(
  prevState: GameState,
  remainingHour: number,
  rates: ResourceRates
): AdvanceDayResult {
  const nextTurn = prevState.turn + 1;
  let nextDayOfSeason = (prevState.dayOfSeason ?? 1) + 1;
  let nextSeasonIdx = prevState.seasonIndex;
  let nextYear = prevState.year;

  if (nextDayOfSeason > DAYS_PER_SEASON) {
    nextDayOfSeason = 1;
    nextSeasonIdx += 1;

    if (nextSeasonIdx >= 4) {
      nextSeasonIdx = 0;
      nextYear += 1;
    }
  }

  const seasons = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
  const currentSeasonName = seasons[prevState.seasonIndex];

  // 1. BuildingSystem: Avança obras e recalcula limites de armazenamento
  const buildersCount = prevState.villagers.filter((v) => v.job === 'builder').length;
  const { updatedBuildings, completedBuildings } = advanceBuildingsConstruction(
    prevState.buildings,
    buildersCount
  );
  const maxStorage = calculateStorageCaps(updatedBuildings, prevState.villageLevel ?? 1);

  // 2. ResourceSystem: Aplica produção diária de recursos e aquecimento
  const isWinter = nextSeasonIdx === 3;
  const { newResources, eventNote: woodNote } = applyDailyResourceProduction(
    prevState.resources,
    rates,
    maxStorage,
    isWinter
  );

  // 3. Atualiza progresso das missões diárias
  const simulatedState: GameState = {
    ...prevState,
    resources: newResources,
    buildings: updatedBuildings,
  };
  let updatedMissions = updateMissionProgress(prevState.dailyMissions, simulatedState);

  // Se todas as missões foram reivindicadas, gera novo conjunto
  if (updatedMissions.length === 0 || updatedMissions.every((m) => m.claimed)) {
    updatedMissions = generateMissionSet(simulatedState, 3);
  }

  // 4. JobSystem: Distribui aldeões ociosos se auto-assign estiver ativado
  let updatedVillagers = [...prevState.villagers];
  if (prevState.autoAssignIdle !== false) {
    updatedVillagers = autoAssignIdleVillagers(updatedVillagers, prevState, rates);
  }
  updatedVillagers = updateVillagerWorkStatus(updatedVillagers, remainingHour);

  // 5. Verifica avanço de Era civilizatória
  let nextEra = prevState.currentEra;
  const unlockedCount = Object.values(prevState.technologies).filter(
    (t) => t.era === prevState.currentEra && t.unlocked
  ).length;

  let eraNote = '';
  if (unlockedCount >= 3 && nextEra < 4) {
    nextEra += 1;
    eraNote = `🌟 Sua civilização evoluiu para a ${ERAS_INFO[nextEra].name}!`;
  }

  // 6. Condição de vitória por monumento (Zigurate)
  let gameWon = prevState.gameWon;
  if (updatedBuildings.ziggurat && updatedBuildings.ziggurat.count > 0 && !gameWon) {
    gameWon = true;
  }

  // 7. Sorteio de evento aleatório a cada 3 turnos
  let activeEvent: GameEvent | null = prevState.activeEvent;
  let shouldPlayAlert = false;
  if (!activeEvent && nextTurn % 3 === 0 && Math.random() > 0.3) {
    const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    activeEvent = ev;
    shouldPlayAlert = true;
  }

  const combinedNote = [woodNote, eraNote].filter(Boolean).join(' ');

  // 8. Relatório da estação/turno: contabiliza produção real colhida pelos trabalhadores durante o turno
  const dailyProd = prevState.dailyProduced || { food: 0, wood: 0, stone: 0, clay: 0 };
  const dailyCons = prevState.dailyConsumed || { food: 0 };

  const report: TurnReport = {
    turn: prevState.turn,
    year: prevState.year,
    season: currentSeasonName,
    foodProduced: dailyProd.food,
    foodConsumed: dailyCons.food > 0 ? dailyCons.food : rates.foodConsumed,
    woodProduced: dailyProd.wood,
    stoneProduced: dailyProd.stone,
    clayProduced: dailyProd.clay,
    knowledgeProduced: rates.knowledge,
    completedBuildings,
    populationChange: 0,
    eventNote: combinedNote || undefined,
  };

  const nextState: GameState = {
    ...prevState,
    gameHour: remainingHour,
    turn: nextTurn,
    year: nextYear,
    seasonIndex: nextSeasonIdx,
    dayOfSeason: nextDayOfSeason,
    currentEra: nextEra,
    resources: newResources,
    maxStorage,
    buildings: updatedBuildings,
    villagers: updatedVillagers,
    dailyMissions: updatedMissions,
    // Reinicia contadores diários para o novo turno/estação
    dailyProduced: {
      food: 0,
      wood: 0,
      stone: 0,
      clay: 0,
    },
    dailyConsumed: {
      food: 0,
    },
    activeEvent,
    lastTurnReport: report,
    gameWon,
  };

  return {
    nextState,
    shouldPlayAlert,
    completedBuildings,
  };
}
