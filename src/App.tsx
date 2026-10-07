import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, JobType, Villager } from './types/game';
import { INITIAL_STATE, RANDOM_EVENTS } from './data/initialData';
import { ThreeVillageScene } from './three/ThreeVillageScene';
import { ExpandableResourceBar } from './components/ExpandableResourceBar';
import { TaskAssignmentBar } from './components/TaskAssignmentBar';
import { BuildingPanel } from './components/BuildingPanel';
import { TechTreeModal } from './components/TechTreeModal';
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
} from './game/BuildingSystem';
import { advanceSimulationDay } from './game/Simulation';
import { updateVillagerWorkStatus } from './game/ScheduleSystem';
import {
  BookOpen,
  Edit2,
  Hammer,
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
  const [isBuildingDrawerOpen, setIsBuildingDrawerOpen] = useState(false);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);

  // Screen aspect ratio mode: Defaults to 16:9 mobile screen
  const [aspectMode, setAspectMode] = useState<'landscape_16_9' | 'portrait_9_16' | 'fullscreen'>('landscape_16_9');

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

      return {
        ...prev,
        resources: deductVillagerRecruitmentCost(prev.resources),
        villagers: finalizedVillagers,
      };
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

  // Claim Daily Mission Reward
  const handleClaimMissionReward = (missionId: string) => {
    setGameState((prev) => {
      const mission = prev.dailyMissions?.find((m) => m.id === missionId);
      if (!mission || mission.claimed) return prev;

      audio.playFanfare();

      let newXP = (prev.villageXP || 0) + mission.rewardXP;
      let newLevel = prev.villageLevel || 1;
      let nextXP = prev.xpToNextLevel || 100;
      let newUnlockedJobs = [...(prev.unlockedJobs || ['farmer', 'lumberjack', 'quarryman'])];

      // Check level up
      if (newXP >= nextXP) {
        newLevel += 1;
        newXP = newXP - nextXP;
        nextXP = Math.round(nextXP * 1.6);
        // Level up unlocks jobs!
        if (newLevel >= 2 && !newUnlockedJobs.includes('potter')) {
          newUnlockedJobs.push('potter');
        }
        if (newLevel >= 2 && !newUnlockedJobs.includes('elder')) {
          newUnlockedJobs.push('elder');
        }
        if (newLevel >= 3 && !newUnlockedJobs.includes('guard')) {
          newUnlockedJobs.push('guard');
        }
      }

      if (mission.unlockJob && !newUnlockedJobs.includes(mission.unlockJob)) {
        newUnlockedJobs.push(mission.unlockJob);
      }

      // Mark claimed and keep mission state updated
      const updatedMissions = prev.dailyMissions.map((m) => {
        if (m.id === missionId) {
          return { ...m, claimed: true };
        }
        return m;
      });

      return {
        ...prev,
        villageXP: newXP,
        villageLevel: newLevel,
        xpToNextLevel: nextXP,
        unlockedJobs: newUnlockedJobs,
        resources: addKnowledgeReward(prev.resources, mission.rewardKnowledge || 0),
        dailyMissions: updatedMissions,
      };
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
      return {
        ...prev,
        resources: updatedResources,
        buildings: updatedBuildings,
      };
    });
  };

  // Research Tech
  const handleResearchTech = (techId: string) => {
    setGameState((prev) => {
      const tech = prev.technologies[techId];
      if (!tech || tech.unlocked || !canAffordTechResearch(prev.resources.knowledge, tech.cost)) return prev;

      return {
        ...prev,
        resources: deductTechResearchCost(prev.resources, tech.cost),
        technologies: {
          ...prev.technologies,
          [techId]: { ...tech, unlocked: true },
        },
      };
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
        setGameState((prev) => ({
          ...prev,
          ...updates,
          activeEvent: null,
        }));
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
    setGameState((prev) => ({
      ...prev,
      resources: depositGatheredResource(prev.resources, prev.maxStorage, resource, amount),
    }));
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
    <div className="h-screen w-screen overflow-hidden bg-[#18130E] flex flex-col items-center justify-center relative select-none">
      {/* Aspect Ratio Switcher HUD (Discreet & Elegant) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50 flex items-center gap-1 bg-[#2C241E]/90 backdrop-blur-md px-2 py-1 rounded-xl border border-amber-900/40 text-[11px] font-bold text-[#FAF3E7] shadow-xl pointer-events-auto">
        <span className="text-[10px] text-amber-300/80 font-mono hidden sm:inline mr-1">TELA:</span>
        <button
          onClick={() => {
            audio.playWood();
            setAspectMode('landscape_16_9');
          }}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            aspectMode === 'landscape_16_9'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
          title="Celular 16:9 Paisagem (Padrão Widescreen)"
        >
          📱 16:9
        </button>
        <button
          onClick={() => {
            audio.playWood();
            setAspectMode('portrait_9_16');
          }}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            aspectMode === 'portrait_9_16'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
          title="Celular 9:16 Retrato (Vertical)"
        >
          📲 9:16
        </button>
        <button
          onClick={() => {
            audio.playWood();
            setAspectMode('fullscreen');
          }}
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            aspectMode === 'fullscreen'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
          title="Ajustar à Tela Cheia"
        >
          ⛶
        </button>
      </div>

      {/* Mobile Screen Container: Exactly 16:9 for phone */}
      <div
        className={`relative overflow-hidden bg-[#DCE7EB] font-sans selection:bg-[#DEB887] select-none transition-all duration-300 ${
          aspectMode === 'landscape_16_9'
            ? 'w-full max-w-[calc(100vh*16/9)] h-full max-h-[calc(100vw*9/16)] aspect-[16/9] shadow-2xl shadow-black/90 sm:rounded-2xl sm:border-4 border-[#33261D]'
            : aspectMode === 'portrait_9_16'
            ? 'h-full max-h-[calc(100vw*16/9)] w-full max-w-[calc(100vh*9/16)] aspect-[9/16] shadow-2xl shadow-black/90 sm:rounded-3xl sm:border-4 border-[#33261D]'
            : 'w-full h-full'
        }`}
      >
        {/* 1. 3D GAME VIEWPORT (Fills the phone viewport) */}
        <ThreeVillageScene
          gameState={gameState}
          selectedVillagerId={selectedVillagerId}
          onSelectVillager={(v) => setSelectedVillagerId(v ? v.id : null)}
          onVillagerGathers={handleVillagerGathers}
          onUpdateVillagerSchedule={handleUpdateVillagerSchedule}
        />

        {/* 2. TOP SINGLE LINE HEADER */}
        <header className="absolute top-0 left-0 right-0 z-30 h-13 sm:h-14 bg-[#F5EAD9]/95 backdrop-blur-md border-b-3 border-[#33261D] px-2.5 sm:px-4 flex items-center justify-between gap-2 shadow-md">
        {/* Left: Player Name & Season */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Player Name (Clickable / Editable) */}
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
                maxLength={24}
                className="bg-white border-2 border-[#33261D] rounded-lg px-2 py-0.5 text-xs font-display font-black text-[#2C241E] w-32 sm:w-44 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="text-xs bg-[#33261D] text-white px-2 py-0.5 rounded font-bold cursor-pointer"
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
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFFBF5] border-2 border-[#33261D] hover:bg-[#EFE4CE] transition-all cursor-pointer shadow-2xs"
              title="Clique para editar o Nome do Jogador"
            >
              <span className="text-sm">👑</span>
              <div className="text-left">
                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block leading-none">
                  Jogador
                </span>
                <span className="font-display font-black text-xs sm:text-sm text-[#2C241E] leading-tight flex items-center gap-1">
                  {gameState.playerName || 'Líder Tribal'}
                  <Edit2 size={10} className="text-stone-400 group-hover:text-stone-700" />
                </span>
              </div>
            </button>
          )}

          {/* Compact Season & Year Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#FAF3E7] border-2 border-stone-300 px-2.5 py-1 rounded-xl text-xs font-semibold text-stone-700">
            <span>{['🌱', '☀️', '🍂', '❄️'][gameState.seasonIndex]}</span>
            <span className="font-display font-extrabold text-[#78350F]">
              {['Primavera', 'Verão', 'Outono', 'Inverno'][gameState.seasonIndex]}
            </span>
            <span className="text-stone-400">·</span>
            <span className="text-[11px] font-mono font-bold">Ano {gameState.year}</span>
          </div>
        </div>

        {/* Center: Expandable Resource Bar (Expands on click to show hidden resources like Clay, Knowledge, Defense) */}
        <div className="flex items-center justify-center">
          <ExpandableResourceBar
            gameState={gameState}
            isExpanded={isResourceExpanded}
            onToggleExpand={() => setIsResourceExpanded(!isResourceExpanded)}
            rates={rates}
          />
        </div>

        {/* Right: Action Buttons & Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tasks Drawer Toggle Button */}
          <button
            onClick={() => {
              audio.playWood();
              setIsTaskBarExpanded(!isTaskBarExpanded);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border-2 font-display font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isTaskBarExpanded
                ? 'bg-[#33261D] text-white border-[#33261D]'
                : 'bg-[#FFFDF9] text-stone-900 border-[#33261D] hover:bg-[#EBDDC8]'
            }`}
            title="Designar tarefas dos aldeões (+/-)"
          >
            <span className="text-sm">📋</span>
            <span className="hidden sm:inline">Tarefas</span>
            <span className="bg-[#E5B84B] text-[#2C241E] px-1 rounded text-[10px] font-mono font-bold">
              {assignedCount}/{gameState.villagers.length}
            </span>
            {idleCount > 0 && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1 rounded text-[9px] font-bold animate-pulse">
                💤 {idleCount}
              </span>
            )}
          </button>

          {/* Buildings Menu Toggle */}
          <button
            onClick={() => {
              audio.playWood();
              setIsBuildingDrawerOpen(!isBuildingDrawerOpen);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border-2 font-display font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isBuildingDrawerOpen
                ? 'bg-[#33261D] text-white border-[#33261D]'
                : 'bg-[#FFFDF9] text-stone-900 border-[#33261D] hover:bg-[#EBDDC8]'
            }`}
            title="Construções da vila"
          >
            <Hammer size={14} />
            <span className="hidden sm:inline">Construir</span>
          </button>

          {/* Tech Tree Modal Button */}
          <button
            onClick={() => {
              audio.playWood();
              setIsTechTreeOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-[#33261D] bg-[#FFFDF9] font-display font-bold text-xs text-stone-900 hover:bg-[#EBDDC8] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Pesquisas tecnológicas"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Pesquisas</span>
          </button>

          {/* Automatic Celestial Time Cycle (Sun icon in day, Moon icon in night, automatically advancing) */}
          <CelestialTimeCycle
            gameState={gameState}
            onTogglePause={handleTogglePause}
          />

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-[#EFE4CE] transition-colors"
            title={gameState.soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {gameState.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Help */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-[#EFE4CE] transition-colors"
            title="Ajuda e Manual"
          >
            <HelpCircle size={14} />
          </button>

          {/* Reset */}
          <button
            onClick={handleResetGame}
            className="p-1.5 rounded-lg border-2 border-[#33261D] bg-[#FFFBF5] text-stone-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            title="Reiniciar Jogo"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* 3. BOTTOM FLOATING DOCK: Expandable Task Assignment Bar */}
      <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-4 z-20 pointer-events-none">
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
          rates={rates}
        />
      </div>

      {/* 4. FLOATING BUILDINGS MODAL / DRAWER */}
      {isBuildingDrawerOpen && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-[#FFFDF9] border-3 border-[#33261D] rounded-2xl p-4 sm:p-5 max-w-2xl w-full max-h-[82vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔨</span>
                <div>
                  <h3 className="font-display font-black text-base text-stone-900">
                    Obras & Infraestrutura da Vila
                  </h3>
                  <p className="text-xs font-hand font-bold text-stone-600">
                    Construa habitações para acolher mais pessoas, celeiros e fortificações
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBuildingDrawerOpen(false)}
                className="text-stone-500 hover:text-stone-900 px-2.5 py-1 rounded-lg hover:bg-stone-100 font-bold text-xs border border-stone-300 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>
            <BuildingPanel
              gameState={gameState}
              onStartConstruction={(bId) => {
                handleStartConstruction(bId);
                setIsBuildingDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}
      </div>

      {/* 5. MODALS */}
      <TechTreeModal
        isOpen={isTechTreeOpen}
        onClose={() => setIsTechTreeOpen(false)}
        gameState={gameState}
        onResearchTech={handleResearchTech}
      />

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
