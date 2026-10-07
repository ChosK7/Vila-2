import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, JobType, Villager } from './types/game';
import { INITIAL_STATE, RANDOM_EVENTS } from './data/initialData';
import { ThreeVillageScene } from './three/ThreeVillageScene';
import { ExpandableResourceBar } from './components/ExpandableResourceBar';
import { TaskAssignmentBar } from './components/TaskAssignmentBar';
import { CelestialTimeCycle } from './components/CelestialTimeCycle';
import { TurnReportModal } from './components/TurnReportModal';
import { EventModal } from './components/EventModal';
import { HelpModal } from './components/HelpModal';
import { VictoryModal } from './components/VictoryModal';
import { audio } from './utils/audio';
import { useGameClock, toggleTimePause } from './game/GameClock';
import {
  calculateProductionRates,
  depositGatheredResource,
  canAffordVillagerRecruitment,
  deductVillagerRecruitmentCost,
  canAffordTechResearch,
  deductTechResearchCost,
  addKnowledgeReward,
} from './game/ResourceSystem';
import {
  assignVillagerToJob,
  unassignVillagerFromJob,
  applyAutoAssignIdle,
  toggleAutoAssignIdle,
  finalizeRecruitedVillagers,
} from './game/JobSystem';
import {
  calculateHousingCapacity,
  startBuildingConstruction,
  upgradeBuildingLevel,
} from './game/BuildingSystem';
import { advanceSimulationDay } from './game/Simulation';
import { updateVillagerWorkStatus } from './game/ScheduleSystem';
import { addVillageXP, getXPRequiredForLevel, MAX_VILLAGE_LEVEL } from './game/ProgressionSystem';
import {
  applyMissionReward,
  updateMissionProgress,
  generateMissionSet,
  refreshMissions,
} from './game/MissionSystem';
import {
  Edit2,
  HelpCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

const STORAGE_KEY = 'vila_ancestral_save_3d_v2';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeEvent) {
          const canonical = RANDOM_EVENTS.find((e) => e.id === parsed.activeEvent.id);
          parsed.activeEvent = canonical || null;
        }

        // Migração de save antigo para o sistema de progressão da vila
        const vLevel =
          typeof parsed.villageLevel === 'number'
            ? Math.max(1, Math.min(MAX_VILLAGE_LEVEL, parsed.villageLevel))
            : 1;

        parsed.villageLevel = vLevel;

        parsed.villageXP =
          typeof parsed.villageXP === 'number'
            ? Math.max(0, parsed.villageXP)
            : 0;

        parsed.xpToNextLevel = getXPRequiredForLevel(vLevel);

        if (vLevel >= MAX_VILLAGE_LEVEL) {
          parsed.villageXP = 0;
          parsed.xpToNextLevel = 0;
        }

        // Migração e atualização segura das missões
        if (Array.isArray(parsed.dailyMissions) && parsed.dailyMissions.length > 0) {
          parsed.dailyMissions = updateMissionProgress(parsed.dailyMissions, parsed);
        } else {
          parsed.dailyMissions = generateMissionSet(parsed, 3);
        }

        return parsed;
      }
    } catch (e) {
      // fallback
    }
    return INITIAL_STATE;
  });

  // UI Drawer / Modal states
  const [isResourceExpanded, setIsResourceExpanded] = useState(false);
  const [isTaskBarExpanded, setIsTaskBarExpanded] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);

  // Player name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState('');

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) {
      // Ignore
    }
  }, [gameState]);

  // Synchronize audio manager
  useEffect(() => {
    audio.setEnabled(gameState.soundEnabled);
  }, [gameState.soundEnabled]);

  // Production rates calculation via ResourceSystem
  const rates = useMemo(() => calculateProductionRates(gameState), [gameState]);

  // Automatic Day / Turn completion when 24-hour cycle completes
  const executeAutoDayAdvance = useCallback(
    (prev: GameState, remainingHour: number): GameState => {
      audio.playTurn();
      const { nextState, shouldPlayAlert } = advanceSimulationDay(prev, remainingHour, rates);
      if (shouldPlayAlert) {
        audio.playAlert();
      }
      return nextState;
    },
    [rates]
  );

  // AUTOMATIC TIME CYCLE (gerenciado pelo módulo GameClock)
  useGameClock(setGameState, executeAutoDayAdvance);

  // Pause / Resume automatic time
  const handleTogglePause = () => {
    setGameState(toggleTimePause);
  };

  // Add 1 villager to a task
  const handleAddTaskVillager = (job: JobType) => {
    setGameState((prev) => ({
      ...prev,
      villagers: assignVillagerToJob(prev.villagers, job),
    }));
  };

  // Remove 1 villager from a task
  const handleRemoveTaskVillager = (job: JobType) => {
    setGameState((prev) => ({
      ...prev,
      villagers: unassignVillagerFromJob(prev.villagers, job),
    }));
  };

  // Distribute idle villagers immediately to greatest need
  const handleAutoAssignNow = () => {
    audio.playWood();
    setGameState((prev) => applyAutoAssignIdle(prev, rates));
  };

  // Toggle autoAssignIdle
  const handleToggleAutoAssign = () => {
    setGameState(toggleAutoAssignIdle);
  };

  // Recruit new villager (automatically assigned if auto-assign is on)
  const handleRecruitVillager = () => {
    const housingCap = calculateHousingCapacity(gameState.buildings);

    if (gameState.villagers.length >= housingCap || !canAffordVillagerRecruitment(gameState.resources.food)) {
      return;
    }

    audio.playRecruit();

    const names = [
      'Gudea', 'Naram', 'Shulgi', 'Ur-Nammu', 'Rimush', 'Kubi', 'Puabi', 'Tiamat',
      'Gilgamesh', 'Aya', 'Eresh', 'Sin', 'Nanna', 'Lugal', 'Babu', 'Enheduanna'
    ];
    const availableNames = names.filter((n) => !gameState.villagers.some((v) => v.name === n));
    const randomName =
      availableNames.length > 0 ? availableNames[0] : `Aldeão ${gameState.villagers.length + 1}`;
    const colors = ['#8C5A32', '#4A7C8E', '#A66B38', '#5E748B', '#7A9A60', '#B8860B'];
    const hairs: ('spiky' | 'side' | 'wavy' | 'bun')[] = ['spiky', 'side', 'wavy', 'bun'];

    const traits = [
      {
        name: 'Ceifador Veloz',
        description: '+1 Trigo ao trabalhar como agricultor',
        bonusJob: 'farmer' as JobType,
        multiplier: 1.2,
      },
      {
        name: 'Força de Titã',
        description: '+1 Madeira ao derrubar troncos',
        bonusJob: 'lumberjack' as JobType,
        multiplier: 1.2,
      },
      {
        name: 'Olho Mineral',
        description: '+1 Pedra na pedreira',
        bonusJob: 'quarryman' as JobType,
        multiplier: 1.2,
      },
      {
        name: 'Mente Curiosa',
        description: '+1 Conhecimento como Ancião',
        bonusJob: 'elder' as JobType,
        multiplier: 1.2,
      },
      {
        name: 'Espírito Valente',
        description: '+10 de Defesa para a vila',
        bonusJob: 'guard' as JobType,
        multiplier: 1.15,
      },
    ];

    const newVil: Villager = {
      id: `vil-${Date.now()}`,
      name: randomName,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      tunicColor: colors[Math.floor(Math.random() * colors.length)],
      hairStyle: hairs[Math.floor(Math.random() * hairs.length)],
      job: 'idle',
      morale: 85,
      health: 100,
      maxHealth: 100,
      isFed: true,
      workStart: 7.0,
      workEnd: 17.0,
      isWorking: false,
      trait: traits[Math.floor(Math.random() * traits.length)],
    };

    setGameState((prev) => {
      const allVillagers = [...prev.villagers, newVil];
      const finalizedVillagers = finalizeRecruitedVillagers(allVillagers, prev, rates);

      return refreshMissions({
        ...prev,
        resources: deductVillagerRecruitmentCost(prev.resources),
        villagers: finalizedVillagers,
      });
    });
  };

  // Update individual villager work schedule
  const handleUpdateVillagerSchedule = (
    villagerId: string,
    workStart: number,
    workEnd: number
  ) => {
    setGameState((prev) => {
      const updatedVillagers = prev.villagers.map((v) =>
        v.id === villagerId ? { ...v, workStart, workEnd } : v
      );
      return {
        ...prev,
        villagers: updateVillagerWorkStatus(updatedVillagers, prev.gameHour ?? 6.0),
      };
    });
  };

  // Unlock a collection job
  const handleUnlockJob = (job: JobType) => {
    setGameState((prev) => {
      if (prev.unlockedJobs?.includes(job)) return prev;
      audio.playFanfare();
      return {
        ...prev,
        unlockedJobs: [...(prev.unlockedJobs || ['farmer', 'lumberjack', 'quarryman']), job],
      };
    });
  };

  // Claim Daily Mission Reward via MissionSystem
  const handleClaimMissionReward = (missionId: string) => {
    setGameState((prev) => {
      const mission = prev.dailyMissions?.find((m) => m.id === missionId);
      if (!mission || mission.claimed) return prev;

      audio.playFanfare();
      return applyMissionReward(prev, mission);
    });
  };

  // Start construction via BuildingSystem
  const handleStartConstruction = (buildingId: string) => {
    setGameState((prev) => {
      const { success, updatedBuildings, updatedResources } = startBuildingConstruction(
        prev.buildings,
        prev.resources,
        buildingId
      );
      if (!success) return prev;
      return refreshMissions({
        ...prev,
        resources: updatedResources,
        buildings: updatedBuildings,
      });
    });
  };

  // Upgrade building level (ex: Cabana +2 vagas por nível)
  const handleUpgradeBuilding = (buildingId: string) => {
    setGameState((prev) => {
      const result = upgradeBuildingLevel(prev.buildings, prev.resources, buildingId);
      if (!result.success) return prev;
      audio.playBuild();
      return refreshMissions({
        ...prev,
        resources: result.updatedResources,
        buildings: result.updatedBuildings,
      });
    });
  };

  // Research Tech
  const handleResearchTech = (techId: string) => {
    setGameState((prev) => {
      const tech = prev.technologies[techId];
      if (!tech || tech.unlocked || !canAffordTechResearch(prev.resources.knowledge, tech.cost)) return prev;

      return refreshMissions({
        ...prev,
        resources: deductTechResearchCost(prev.resources, tech.cost),
        technologies: {
          ...prev.technologies,
          [techId]: { ...tech, unlocked: true },
        },
      });
    });
  };

  // Resolve Event
  const handleResolveEventOption = (optionIndex: number) => {
    if (!gameState.activeEvent) return;

    // Look up canonical event to guarantee action function exists even if state had been serialized
    const canonicalEvent = RANDOM_EVENTS.find((e) => e.id === gameState.activeEvent?.id);
    const targetOption = canonicalEvent?.options[optionIndex] || gameState.activeEvent.options[optionIndex];

    if (targetOption && typeof targetOption.action === 'function') {
      try {
        const updates = targetOption.action(gameState);
        setGameState((prev) =>
          refreshMissions({
            ...prev,
            ...updates,
            activeEvent: null,
          })
        );
        return;
      } catch (err) {
        console.error('Error executing event action:', err);
      }
    }

    setGameState((prev) => ({ ...prev, activeEvent: null }));
  };

  // Toggle Sound
  const handleToggleSound = () => {
    setGameState((prev) => {
      const nextVal = !prev.soundEnabled;
      audio.setEnabled(nextVal);
      return { ...prev, soundEnabled: nextVal };
    });
  };

  // Reset Game
  const handleResetGame = () => {
    if (window.confirm('Deseja realmente recomeçar a vila com os 2 aldeões iniciais?')) {
      localStorage.removeItem(STORAGE_KEY);
      setGameState(INITIAL_STATE);
    }
  };

  // Real-time small deposit from 3D villager carrying goods to storehouse
  const handleVillagerGathers = (resource: 'food' | 'wood' | 'stone' | 'clay', amount: number) => {
    setGameState((prev) =>
      refreshMissions({
        ...prev,
        resources: depositGatheredResource(prev.resources, prev.maxStorage, resource, amount),
      })
    );
  };

  // Save edited player name
  const savePlayerName = () => {
    const trimmed = tempPlayerName.trim();
    if (trimmed) {
      setGameState((prev) => ({ ...prev, playerName: trimmed }));
    }
    setIsEditingName(false);
  };

  const idleCount = gameState.villagers.filter((v) => v.job === 'idle').length;
  const assignedCount = gameState.villagers.length - idleCount;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#18130E] flex flex-col items-center justify-center relative select-none p-0 sm:p-2">
      {/* Mobile Screen Container: Strictly 9:16 Portrait for Smartphone */}
      <div className="relative overflow-hidden bg-[#DCE7EB] font-sans selection:bg-[#DEB887] select-none h-full max-h-[calc(100vw*16/9)] w-full max-w-[calc(100vh*9/16)] aspect-[9/16] shadow-2xl shadow-black/95 sm:rounded-[2.2rem] sm:border-[5px] border-[#33261D]">
        {/* 1. 3D GAME VIEWPORT (Fills the phone viewport) */}
        <ThreeVillageScene
          gameState={gameState}
          selectedVillagerId={selectedVillagerId}
          onSelectVillager={(v) => setSelectedVillagerId(v ? v.id : null)}
          onVillagerGathers={handleVillagerGathers}
          onUpdateVillagerSchedule={handleUpdateVillagerSchedule}
        />

        {/* 2. TOP MOBILE HEADER (Optimized for 9:16 vertical smartphone screen) */}
        <header className="absolute top-0 left-0 right-0 z-30 bg-[#F5EAD9]/95 backdrop-blur-md border-b-3 border-[#33261D] px-2.5 sm:px-3 py-1.5 flex flex-col gap-1.5 shadow-md">
          {/* Row 1: Player Name, Celestial Time Cycle, Sound & Menu */}
          <div className="flex items-center justify-between gap-1.5">
            {/* Player Name */}
            {isEditingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  savePlayerName();
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={tempPlayerName}
                  onChange={(e) => setTempPlayerName(e.target.value)}
                  onBlur={savePlayerName}
                  autoFocus
                  maxLength={20}
                  className="bg-white border-2 border-[#33261D] rounded-lg px-2 py-0.5 text-xs font-display font-black text-[#2C241E] w-28 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="text-xs bg-[#33261D] text-white px-1.5 py-0.5 rounded font-bold cursor-pointer"
                >
                  ✓
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempPlayerName(gameState.playerName || 'Líder Tribal');
                  setIsEditingName(true);
                }}
                className="group flex items-center gap-1 px-2 py-1 rounded-xl bg-[#FFFBF5] border-2 border-[#33261D] hover:bg-[#EFE4CE] transition-all cursor-pointer shadow-2xs shrink-0"
                title="Clique para editar o Nome do Jogador"
              >
                <span className="text-sm">👑</span>
                <span className="font-display font-black text-xs text-[#2C241E] truncate max-w-[100px] sm:max-w-none">
                  {gameState.playerName || 'Líder Tribal'}
                </span>
                <Edit2 size={9} className="text-stone-400 group-hover:text-stone-700" />
              </button>
            )}

            {/* Celestial Continuous Time Cycle */}
            <div className="shrink-0 flex items-center justify-center">
              <CelestialTimeCycle
                gameState={gameState}
                onTogglePause={handleTogglePause}
              />
            </div>

            {/* Quick Utility Buttons (Sound, Help, Reset) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleSound}
                className="p-1 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-[#EFE4CE] transition-colors"
                title={gameState.soundEnabled ? 'Silenciar som' : 'Ativar som'}
              >
                {gameState.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-1 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-[#EFE4CE] transition-colors"
                title="Manual da Aldeia"
              >
                <HelpCircle size={13} />
              </button>
              <button
                onClick={handleResetGame}
                className="p-1 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                title="Reiniciar Jogo"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Row 2: Symmetrical Resource Bar (Centered across full width) */}
          <div className="pt-1 border-t border-[#33261D]/15 w-full">
            <ExpandableResourceBar
              gameState={gameState}
              isExpanded={isResourceExpanded}
              onToggleExpand={() => setIsResourceExpanded(!isResourceExpanded)}
              rates={rates}
            />
          </div>
        </header>

      {/* 3. FLOATING SHORTCUT ICON: Designar Tarefas, Obras & Pesquisas */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-none">
        <TaskAssignmentBar
          gameState={gameState}
          isOpen={isTaskBarExpanded}
          onToggle={() => setIsTaskBarExpanded(!isTaskBarExpanded)}
          onAddTaskVillager={handleAddTaskVillager}
          onRemoveTaskVillager={handleRemoveTaskVillager}
          onAutoAssignNow={handleAutoAssignNow}
          onToggleAutoAssign={handleToggleAutoAssign}
          onRecruitVillager={handleRecruitVillager}
          onUnlockJob={handleUnlockJob}
          onClaimMissionReward={handleClaimMissionReward}
          onStartConstruction={handleStartConstruction}
          onUpgradeBuilding={handleUpgradeBuilding}
          onResearchTech={handleResearchTech}
          rates={rates}
        />
      </div>
      </div>

      {/* MODALS */}
      <TurnReportModal
        report={gameState.lastTurnReport}
        onClose={() => setGameState((prev) => ({ ...prev, lastTurnReport: null }))}
      />

      <EventModal
        event={gameState.activeEvent}
        gameState={gameState}
        onResolveOption={handleResolveEventOption}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <VictoryModal
        isOpen={gameState.gameWon}
        onClose={() => setGameState((prev) => ({ ...prev, gameWon: false }))}
        onRestart={handleResetGame}
        year={gameState.year}
        villagersCount={gameState.villagers.length}
      />
    </div>
  );
}
