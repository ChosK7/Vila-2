import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, JobType, Villager } from '../types/game';
import { CharacterRig, createCharacterMesh, setupToolForJob } from './characterMesh';
import { getCelestialTimeInfo, DailyRoutine } from '../utils/timeCycle';
import {
  createBuilderSiteMesh,
  createCampfireMesh,
  createClayPitMesh,
  createCookingPitMesh,
  createElderDeskMesh,
  createGranaryMesh,
  createGuardPostMesh,
  createHutMesh,
  createLonghouseMesh,
  createPotteryKilnMesh,
  createRockQuarryMesh,
  createSawmillMesh,
  createStoneDwellingMesh,
  createStoneworksMesh,
  createTreeMesh,
  createWellMesh,
  createWheatPatchMesh,
  createZigguratMesh,
} from './buildingMeshes';
import { audio } from '../utils/audio';
import {
  getTerrainHeight,
  createBorderForestGroup,
  createUndergrowthVegetationGroup,
} from './environmentMeshes';
import {
  Compass,
  Eye,
  Maximize2,
  RotateCcw,
  User,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  ChevronDown,
} from 'lucide-react';
import { decimalToTimeString, timeStringToDecimal } from '../game/ScheduleSystem';
import { chooseVillagerDecision, chooseVillagerActivity, VillagerActivity } from '../game/VillagerAI';
import { getWorkerDeliveryAmount } from '../game/ResourceSystem';

interface ThreeVillageSceneProps {
  gameState: GameState;
  selectedVillagerId: string | null;
  onSelectVillager: (villager: Villager | null) => void;
  onVillagerGathers?: (resource: 'food' | 'wood' | 'stone' | 'clay', amount: number) => void;
  onUpdateVillagerSchedule?: (villagerId: string, workStart: number, workEnd: number) => void;
}

export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn';

export const TIME_OF_DAY_INFO: Record<
  TimeOfDay,
  { name: string; icon: string; description: string }
> = {
  day: { name: 'Dia Pleno', icon: '☀️', description: 'Sol radiante e céu azul no vale fértil' },
  sunset: { name: 'Pôr do Sol', icon: '🌇', description: 'Crepúsculo âmbar e sombras longas' },
  night: { name: 'Noite Sombria', icon: '🌙', description: 'Tons azulados, céu estrelado e fogueira viva' },
  dawn: { name: 'Alvorada', icon: '🌅', description: 'Primeiros raios de sol e orvalho matinal' },
};

interface LightingPreset {
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  groundColor: THREE.Color;
  campfireLightIntensity: number;
  starsOpacity: number;
  moonOpacity: number;
}

const LIGHTING_PRESETS: Record<TimeOfDay, LightingPreset> = {
  day: {
    skyColor: new THREE.Color(0xdce7eb),
    fogColor: new THREE.Color(0xdce7eb),
    fogDensity: 0.022,
    ambientColor: new THREE.Color(0xfef3c7),
    ambientIntensity: 0.95,
    sunColor: new THREE.Color(0xffedd5),
    sunIntensity: 1.65,
    sunPos: new THREE.Vector3(15, 25, 15),
    groundColor: new THREE.Color(0xdec69a),
    campfireLightIntensity: 1.2,
    starsOpacity: 0.0,
    moonOpacity: 0.0,
  },
  sunset: {
    skyColor: new THREE.Color(0xeb8e55),
    fogColor: new THREE.Color(0xf5a575),
    fogDensity: 0.024,
    ambientColor: new THREE.Color(0xfde047),
    ambientIntensity: 0.65,
    sunColor: new THREE.Color(0xf97316),
    sunIntensity: 1.35,
    sunPos: new THREE.Vector3(26, 11, -12),
    groundColor: new THREE.Color(0xd9a26c),
    campfireLightIntensity: 2.2,
    starsOpacity: 0.25,
    moonOpacity: 0.35,
  },
  night: {
    // tons azulados e sombrios de noite
    skyColor: new THREE.Color(0x0f172a),
    fogColor: new THREE.Color(0x1e293b),
    fogDensity: 0.028,
    ambientColor: new THREE.Color(0x172554),
    ambientIntensity: 0.32,
    sunColor: new THREE.Color(0x60a5fa), // luar azulado límpido
    sunIntensity: 0.38,
    sunPos: new THREE.Vector3(-18, 26, -18),
    groundColor: new THREE.Color(0x55493d),
    campfireLightIntensity: 3.8, // fogueira brilhando intensamente no escuro!
    starsOpacity: 0.92,
    moonOpacity: 1.0,
  },
  dawn: {
    skyColor: new THREE.Color(0xc084fc),
    fogColor: new THREE.Color(0xedd5f5),
    fogDensity: 0.024,
    ambientColor: new THREE.Color(0xfef3c7),
    ambientIntensity: 0.72,
    sunColor: new THREE.Color(0xfde047),
    sunIntensity: 1.25,
    sunPos: new THREE.Vector3(-22, 12, 16),
    groundColor: new THREE.Color(0xcbb88b),
    campfireLightIntensity: 1.6,
    starsOpacity: 0.15,
    moonOpacity: 0.15,
  },
};

export type IdleActionType =
  | 'sway'
  | 'look_around'
  | 'sit'
  | 'warm_hands'
  | 'scratch_head';

interface VillagerAgent {
  villager: Villager;
  rig: CharacterRig;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  state:
    | 'walking_to_resource'
    | 'working'
    | 'carrying_to_storage'
    | 'idle'
    | 'eating_meal'
    | 'sleeping'
    | 'socializing'
    | 'wandering'
    | 'resting';
  currentActivity: VillagerActivity;
  activityTimer: number;
  activityDuration: number;
  socialPartnerId?: string;
  workTimer: number;
  workDuration: number;
  speed: number;
  idleAction: IdleActionType;
  idleTimer: number;
  idleDuration: number;
  idleSitTransition: number;
  idleLookAngle: number;
  idleSeed: number;
}

export const DEFAULT_FACILITY_CONFIGS: Record<
  string,
  { name: string; icon: string; defaultX: number; defaultZ: number; description: string }
> = {
  campfire: { name: 'Fogueira Central & Refeições', icon: '🔥', defaultX: 0, defaultZ: -0.8, description: 'Ponto de encontro onde os aldeões tomam café da manhã, almoçam, jantam e descansam.' },
  wheat: { name: 'Campos de Trigo (Agricultor)', icon: '🌾', defaultX: -6.5, defaultZ: 4.0, description: 'Plantações douradas de trigo ceifadas pelos agricultores.' },
  wood: { name: 'Bosque de Coníferas (Lenhador)', icon: '🪵', defaultX: -6.0, defaultZ: -5.5, description: 'Área florestal onde os lenhadores abatem toras de madeira.' },
  stone: { name: 'Pedreira de Rochas (Pedreiro)', icon: '🪨', defaultX: 6.5, defaultZ: -4.5, description: 'Rochas calcárias e blocos extraídos pelos pedreiros.' },
  clay: { name: 'Margem Fluvial (Oleiro)', icon: '🧱', defaultX: 7.0, defaultZ: 3.5, description: 'Depósitos de argila e oficinas dos oleiros.' },
  buildersite: { name: 'Canteiro de Obras (Construtor)', icon: '🔨', defaultX: 3.0, defaultZ: 0, description: 'Andaimagens e obras ativas erguidas pelos construtores.' },
  elderDesk: { name: 'Mesa de Estudos (Ancião)', icon: '📜', defaultX: -2.2, defaultZ: -2.8, description: 'Altar de pergaminhos e registros do ancião da aldeia.' },
  guardPost: { name: 'Posto de Sentinela (Guarda)', icon: '🛡️', defaultX: 5.5, defaultZ: 5.0, description: 'Guarita de vigia e patrulha armada dos guardas.' },
  shelter_1: { name: 'Cabana 1 (Principal)', icon: '🛖', defaultX: -2.8, defaultZ: -1.8, description: 'Primeira moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_2: { name: 'Cabana 2', icon: '🛖', defaultX: -2.8, defaultZ: 1.8, description: 'Segunda moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_3: { name: 'Cabana 3', icon: '🛖', defaultX: 2.8, defaultZ: -2.0, description: 'Terceira moradia da aldeia (2 vagas base, +2 por nível).' },
  shelter_4: { name: 'Cabana 4', icon: '🛖', defaultX: 2.8, defaultZ: 2.0, description: 'Quarta moradia da aldeia (2 vagas base, +2 por nível).' },
  granary: { name: 'Celeiro de Grãos', icon: '🌾', defaultX: 0, defaultZ: 4.0, description: 'Estrutura elevada sobre estacas para estocagem de comida.' },
  village_well: { name: 'Poço Comunitário', icon: '💧', defaultX: 0, defaultZ: -3.8, description: 'Poço de pedra que fornece água potável e irriga os campos.' },
  cooking_pit: { name: 'Cozinha & Refeitório Comunitário', icon: '🍲', defaultX: -1.2, defaultZ: 1.5, description: 'Refeitório onde refeições coletivas garantem vitalidade e ânimo.' },
  sawmill: { name: 'Serraria de Troncos', icon: '🪓', defaultX: -3.8, defaultZ: -4.5, description: 'Serraria artesanal para corte e armazenamento de madeira.' },
  stoneworks: { name: 'Oficina de Cantaria', icon: '🔨', defaultX: 4.2, defaultZ: -3.5, description: 'Oficina onde blocos de pedra são talhados e preparados.' },
  pottery_kiln: { name: 'Olaria & Forno de Argila', icon: '🏺', defaultX: 4.8, defaultZ: 2.5, description: 'Forno e estaleiro de secagem e queima de cerâmica de argila.' },
  longhouse: { name: 'Casa Comunitária Longa', icon: '🏛️', defaultX: 0, defaultZ: -1.0, description: 'Grande salão comunal da Idade do Bronze.' },
  ziggurat: { name: 'O Grande Zigurate', icon: '👑', defaultX: 0, defaultZ: -14.0, description: 'Monumento monumental ancestral e triunfo da civilização.' },
};

const FACILITY_STORAGE_KEY = 'vila_ancestral_facility_positions_v1';

export const ThreeVillageScene: React.FC<ThreeVillageSceneProps> = ({
  gameState,
  selectedVillagerId,
  onSelectVillager,
  onVillagerGathers,
  onUpdateVillagerSchedule,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Facility Placement State & Storage
  const [facilityPositions, setFacilityPositions] = useState<Record<string, { x: number; z: number }>>(() => {
    try {
      const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const initial: Record<string, { x: number; z: number }> = {};
    Object.entries(DEFAULT_FACILITY_CONFIGS).forEach(([id, cfg]) => {
      initial[id] = { x: cfg.defaultX, z: cfg.defaultZ };
    });
    return initial;
  });

  const facilityPositionsRef = useRef(facilityPositions);
  useEffect(() => {
    facilityPositionsRef.current = facilityPositions;
    try {
      localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(facilityPositions));
    } catch (e) {}
  }, [facilityPositions]);

  // Move Facility Mode states
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [movingFacilityId, setMovingFacilityId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>('wheat');
  const [moveToast, setMoveToast] = useState<string | null>(null);

  const facilityGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const moveRingRef = useRef<THREE.Mesh | null>(null);
  const undergrowthGroupRef = useRef<THREE.Group | null>(null);

  // Available facilities for reorganization based on default nodes + player buildings
  const availableFacilities = useMemo(() => {
    const list: Array<{ id: string; name: string; icon: string; description: string }> = [
      { id: 'wheat', name: 'Trigo', icon: '🌾', description: DEFAULT_FACILITY_CONFIGS.wheat.description },
      { id: 'wood', name: 'Bosque', icon: '🪵', description: DEFAULT_FACILITY_CONFIGS.wood.description },
      { id: 'stone', name: 'Pedreira', icon: '🪨', description: DEFAULT_FACILITY_CONFIGS.stone.description },
      { id: 'clay', name: 'Argila', icon: '🧱', description: DEFAULT_FACILITY_CONFIGS.clay.description },
      { id: 'buildersite', name: 'Obras', icon: '🔨', description: DEFAULT_FACILITY_CONFIGS.buildersite.description },
      { id: 'elderDesk', name: 'Ancião', icon: '📜', description: DEFAULT_FACILITY_CONFIGS.elderDesk.description },
      { id: 'guardPost', name: 'Guarda', icon: '🛡️', description: DEFAULT_FACILITY_CONFIGS.guardPost.description },
      { id: 'campfire', name: 'Fogueira', icon: '🔥', description: DEFAULT_FACILITY_CONFIGS.campfire.description },
    ];

    const { buildings, zigguratStagesCompleted } = gameState;
    const huts = buildings.hut?.count || 1;
    const stone = buildings.stone_dwelling?.count || 0;

    list.push({ id: 'shelter_1', name: 'Cabana 1', icon: '🛖', description: 'Primeira moradia da aldeia' });
    if (huts > 1 || stone > 1) {
      list.push({ id: 'shelter_2', name: 'Cabana 2', icon: '🛖', description: 'Segunda moradia' });
    }
    if (huts > 2 || stone > 2) {
      list.push({ id: 'shelter_3', name: 'Cabana 3', icon: '🛖', description: 'Terceira moradia' });
    }
    if (huts > 3) {
      list.push({ id: 'shelter_4', name: 'Cabana 4', icon: '🛖', description: 'Quarta moradia' });
    }
    if ((buildings.granary?.count || 0) > 0) {
      list.push({ id: 'granary', name: 'Celeiro', icon: '🌾', description: 'Celeiro de estocagem de grãos' });
    }
    if ((buildings.village_well?.count || 0) > 0) {
      list.push({ id: 'village_well', name: 'Poço', icon: '💧', description: 'Poço comunitário de água potável' });
    }
    if ((buildings.longhouse?.count || 0) > 0) {
      list.push({ id: 'longhouse', name: 'Casa Longa', icon: '🏛️', description: 'Grande salão comunal' });
    }
    if ((buildings.ziggurat?.count || 0) > 0 || zigguratStagesCompleted > 0) {
      list.push({ id: 'ziggurat', name: 'Zigurate', icon: '👑', description: 'Monumento sagrado ancestral' });
    }

    return list;
  }, [gameState.buildings, gameState.zigguratStagesCompleted]);

  // Reset facility positions to default
  const handleResetFacilityPositions = () => {
    const initial: Record<string, { x: number; z: number }> = {};
    Object.entries(DEFAULT_FACILITY_CONFIGS).forEach(([id, cfg]) => {
      initial[id] = { x: cfg.defaultX, z: cfg.defaultZ };
    });
    setFacilityPositions(initial);
    try {
      localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}
    audio.playBuild();
    setMoveToast('✓ Posições restauradas para a configuração original da aldeia!');
  };

  // Auto-dismiss move toast
  useEffect(() => {
    if (!moveToast) return;
    const t = setTimeout(() => setMoveToast(null), 3500);
    return () => clearTimeout(t);
  }, [moveToast]);

  // Synchronize Move Ring indicator position with terrain height
  useEffect(() => {
    if (!moveRingRef.current) return;
    if (isMoveMode && selectedFacilityId) {
      const p = facilityPositions[selectedFacilityId];
      if (p) {
        const y = getTerrainHeight(p.x, p.z);
        moveRingRef.current.position.set(p.x, y + 0.06, p.z);
        moveRingRef.current.visible = true;
      }
    } else {
      moveRingRef.current.visible = false;
    }
  }, [isMoveMode, selectedFacilityId, facilityPositions]);

  // Helper to obtain dynamic node position with terrain elevation
  const getNodePos = (key: string, fallback: { x: number; z: number }): THREE.Vector3 => {
    const p = facilityPositions[key] || fallback;
    const y = getTerrainHeight(p.x, p.z);
    return new THREE.Vector3(p.x, y, p.z);
  };

  // Camera state refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const camAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 14 });
  const camTargetRef = useRef(new THREE.Vector3(0, 0.8, 0));
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isRightClickRef = useRef(false);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const agentsRef = useRef<Map<string, VillagerAgent>>(new Map());
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const campfireGroupRef = useRef<THREE.Group | null>(null);

  // Atmospheric Lighting & Day/Night Transition Refs
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const starsPointsRef = useRef<THREE.Points | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const currentSkyColorRef = useRef<THREE.Color>(new THREE.Color(0xdce7eb));
  const currentFogColorRef = useRef<THREE.Color>(new THREE.Color(0xdce7eb));

  // Time of Day State driven directly by continuous gameState.gameHour
  const [timeOfDayOverride, setTimeOfDayOverride] = useState<'auto' | TimeOfDay>('auto');

  const effectiveTimeOfDay: TimeOfDay = useMemo(() => {
    if (timeOfDayOverride !== 'auto') return timeOfDayOverride;
    const hour = gameState.gameHour ?? 6.0;
    // 05:30 - 08:00 -> Alvorada / Amanhecer
    if (hour >= 5.5 && hour < 8.0) return 'dawn';
    // 08:00 - 17.5 -> Dia Pleno
    if (hour >= 8.0 && hour < 17.5) return 'day';
    // 17.5 - 19.5 -> Pôr do Sol / Entardecer
    if (hour >= 17.5 && hour < 19.5) return 'sunset';
    // 19.5 - 05.30 -> Noite Sombria
    return 'night';
  }, [gameState.gameHour, timeOfDayOverride]);

  const currentRoutine = useMemo(() => {
    return getCelestialTimeInfo(gameState.gameHour ?? 6.0).routine;
  }, [gameState.gameHour]);

  const prevRoutineRef = useRef<DailyRoutine>(currentRoutine);

  const effectiveTimeOfDayRef = useRef<TimeOfDay>(effectiveTimeOfDay);
  useEffect(() => {
    effectiveTimeOfDayRef.current = effectiveTimeOfDay;
  }, [effectiveTimeOfDay]);

  const onVillagerGathersRef = useRef(onVillagerGathers);
  useEffect(() => {
    onVillagerGathersRef.current = onVillagerGathers;
  }, [onVillagerGathers]);

  // Touch state
  const touchStartDistRef = useRef<number | null>(null);

  // Follow camera mode
  const [followVillager, setFollowVillager] = useState(false);

  // Camera presets menu state
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [activeCameraPreset, setActiveCameraPreset] = useState<string>('overview');

  const gameStatePausedRef = useRef(gameState.isTimePaused ?? false);
  useEffect(() => {
    gameStatePausedRef.current = gameState.isTimePaused ?? false;
  }, [gameState.isTimePaused]);

  // Synchronized gameStateRef to avoid stale state in Three.js animation/render loop
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Resource nodes positions dynamically linked to facility positions and built structures
  const hasGranary = (gameState.buildings.granary?.count || 0) > 0;
  const hasCookingPit = (gameState.buildings.cooking_pit?.count || 0) > 0;
  const hasSawmill = (gameState.buildings.sawmill?.count || 0) > 0;
  const hasStoneworks = (gameState.buildings.stoneworks?.count || 0) > 0;
  const hasPotteryKiln = (gameState.buildings.pottery_kiln?.count || 0) > 0;

  const defaultMaterialPos = { x: 1.8, z: 0.8 };

  const RESOURCE_NODES = useMemo(() => ({
    wheat: getNodePos('wheat', { x: -6.5, z: 4.0 }),
    wood: getNodePos('wood', { x: -6.0, z: -5.5 }),
    stone: getNodePos('stone', { x: 6.5, z: -4.5 }),
    clay: getNodePos('clay', { x: 7.0, z: 3.5 }),
    foodStorage: hasGranary
      ? getNodePos('granary', { x: 0, z: 4.0 })
      : getNodePos('campfire', { x: 0, z: 1.2 }),
    mealArea: hasCookingPit
      ? getNodePos('cooking_pit', { x: -1.2, z: 1.5 })
      : getNodePos('campfire', { x: 0, z: -0.8 }),
    woodStorage: hasSawmill
      ? getNodePos('sawmill', { x: -3.8, z: -4.5 })
      : getNodePos('campfire', defaultMaterialPos),
    stoneStorage: hasStoneworks
      ? getNodePos('stoneworks', { x: 4.2, z: -3.5 })
      : getNodePos('campfire', defaultMaterialPos),
    clayStorage: hasPotteryKiln
      ? getNodePos('pottery_kiln', { x: 4.8, z: 2.5 })
      : getNodePos('campfire', defaultMaterialPos),
    materialStorage: getNodePos('campfire', defaultMaterialPos),
    storage: getNodePos('campfire', { x: 0, z: 1.2 }),
    campfire: getNodePos('campfire', { x: 0, z: -0.8 }),
    buildersite: getNodePos('buildersite', { x: 3.0, z: 0 }),
    elderDesk: getNodePos('elderDesk', { x: -2.2, z: -2.8 }),
    guardPost: getNodePos('guardPost', { x: 5.5, z: 5.0 }),
  }), [
    facilityPositions,
    gameState.buildings.granary?.count,
    gameState.buildings.cooking_pit?.count,
    gameState.buildings.sawmill?.count,
    gameState.buildings.stoneworks?.count,
    gameState.buildings.pottery_kiln?.count,
    hasGranary,
    hasCookingPit,
    hasSawmill,
    hasStoneworks,
    hasPotteryKiln,
  ]);

  const resourceNodesRef = useRef(RESOURCE_NODES);
  useEffect(() => {
    resourceNodesRef.current = RESOURCE_NODES;
  }, [RESOURCE_NODES]);

  // Synchronize 3D facility groups whenever facilityPositions updates
  useEffect(() => {
    facilityGroupsRef.current.forEach((group, id) => {
      const p = facilityPositions[id];
      if (p) {
        const y = getTerrainHeight(p.x, p.z);
        group.position.set(p.x, y, p.z);
      }
    });
  }, [facilityPositions]);

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xdce7eb);
    scene.fog = new THREE.FogExp2(0xdce7eb, 0.022);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfef3c7, 0.9);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Ground Plane with 3D organic irregularities & undulating terrain
    const groundGeo = new THREE.PlaneGeometry(76, 76, 96, 96);
    const posAttr = groundGeo.attributes.position;
    const colors: number[] = [];

    // Precompute vertex heights and organic earthy tints
    const colLush = new THREE.Color(0x6b8f36); // fertile farm and forest grass
    const colDry = new THREE.Color(0xc4a162); // steppe savanna warm ochre
    const colDirt = new THREE.Color(0xbfa070); // trodden village soil
    const colClay = new THREE.Color(0xb5784c); // riverbank clay and moist silt
    const colStone = new THREE.Color(0x948877); // stony ridge grey

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const worldX = vx;
      const worldZ = -vy;
      const height = getTerrainHeight(worldX, worldZ);
      posAttr.setZ(i, height);

      // Vertex color blending based on region
      const dist = Math.hypot(worldX, worldZ);
      const vColor = new THREE.Color();

      if (dist < 4.5) {
        // Village center trodden earth
        vColor.copy(colDirt);
      } else if (worldX > 4.5 && worldZ > 1.0) {
        // Riverbank and clay pit area
        vColor.copy(colClay).lerp(colDirt, 0.35);
      } else if (worldX < -3.0 && worldZ > -2.0) {
        // Wheat field & agricultural pasture
        vColor.copy(colLush);
      } else if (worldX > 4.0 && worldZ < -2.0) {
        // Quarry stone rise
        vColor.copy(colStone);
      } else if (dist > 18.0) {
        // Perimeter foothills and outer steppe
        vColor.copy(colDry).lerp(colLush, 0.3);
      } else {
        // Mixed savanna steppe
        vColor.copy(colDry);
      }

      // Subtle organic noise variation in brightness
      const brightness = 0.94 + ((i * 13) % 17) * 0.007;
      vColor.multiplyScalar(brightness);
      colors.push(vColor.r, vColor.g, vColor.b);
    }
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    groundMatRef.current = groundMat;

    // 1. Varied Trees around the map borders / horizon (Conifers, Acacias, Oaks, Poplars, Birches, Cypresses, Willows)
    const borderForest = createBorderForestGroup();
    scene.add(borderForest);

    // 2. Low Ground Vegetation (Wild grass, chamomile, red poppies, lavender, ferns, shrubs, pebbles)
    const undergrowth = createUndergrowthVegetationGroup();
    scene.add(undergrowth);
    undergrowthGroupRef.current = undergrowth;

    // 3. Move Facility Placement Indicator Ring
    const moveRingGeo = new THREE.RingGeometry(1.4, 1.8, 32);
    const moveRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const moveRing = new THREE.Mesh(moveRingGeo, moveRingMat);
    moveRing.rotation.x = -Math.PI / 2;
    moveRing.visible = false;
    scene.add(moveRing);
    moveRingRef.current = moveRing;

    // Night Celestial Features: Stars dome and Glowing Moon
    const starCount = 380;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 36 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.15); // upper sky hemisphere
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.name = 'night_stars';
    scene.add(stars);
    starsPointsRef.current = stars;

    // Stylized glowing Moon in night sky
    const moonGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-22, 28, -20);
    moon.name = 'night_moon';
    scene.add(moon);
    moonMeshRef.current = moon;

    // Pathways conforming to undulating terrain heights
    const createConformingPath = (length: number, width: number, angle: number) => {
      const pGeo = new THREE.PlaneGeometry(width, length, 2, 24);
      const pAttr = pGeo.attributes.position;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      for (let i = 0; i < pAttr.count; i++) {
        const lx = pAttr.getX(i);
        const ly = pAttr.getY(i);
        const wx = lx * cosA - ly * sinA;
        const wz = -(lx * sinA + ly * cosA);
        pAttr.setZ(i, getTerrainHeight(wx, wz) + 0.025);
      }
      pGeo.computeVertexNormals();
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xc2a674,
        roughness: 0.96,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.rotation.x = -Math.PI / 2;
      pMesh.rotation.z = angle;
      pMesh.receiveShadow = true;
      return pMesh;
    };

    const path1 = createConformingPath(20, 1.6, Math.PI / 4);
    scene.add(path1);
    const path2 = createConformingPath(20, 1.6, -Math.PI / 4);
    scene.add(path2);

    // Permanent Nature Nodes / Facilities
    // 1. Wheat Patches (Agricultural Farm area)
    const wheatPos = facilityPositionsRef.current['wheat'] || { x: -6.5, z: 4.0 };
    const wheatGroup = new THREE.Group();
    wheatGroup.position.set(wheatPos.x, getTerrainHeight(wheatPos.x, wheatPos.z), wheatPos.z);
    wheatGroup.add(createWheatPatchMesh());
    const wheatPatch2 = createWheatPatchMesh();
    wheatPatch2.position.set(2.5, 0, -1.0);
    wheatGroup.add(wheatPatch2);
    wheatGroup.name = 'facility-wheat';
    scene.add(wheatGroup);
    facilityGroupsRef.current.set('wheat', wheatGroup);

    // 2. Tree Grove (Lumberjack area)
    const woodPos = facilityPositionsRef.current['wood'] || { x: -6.0, z: -5.5 };
    const forestGroup = new THREE.Group();
    forestGroup.position.set(woodPos.x, getTerrainHeight(woodPos.x, woodPos.z), woodPos.z);
    forestGroup.add(createTreeMesh());
    const tree2 = createTreeMesh();
    tree2.position.set(1.6, 0, 1.2);
    forestGroup.add(tree2);
    const tree3 = createTreeMesh();
    tree3.position.set(-1.8, 0, 1.5);
    forestGroup.add(tree3);
    const tree4 = createTreeMesh();
    tree4.position.set(0.5, 0, -2.0);
    forestGroup.add(tree4);
    forestGroup.name = 'facility-wood';
    scene.add(forestGroup);
    facilityGroupsRef.current.set('wood', forestGroup);

    // 3. Stone Quarry (Rocks area)
    const stonePos = facilityPositionsRef.current['stone'] || { x: 6.5, z: -4.5 };
    const quarryGroup = new THREE.Group();
    quarryGroup.position.set(stonePos.x, getTerrainHeight(stonePos.x, stonePos.z), stonePos.z);
    quarryGroup.add(createRockQuarryMesh());
    quarryGroup.name = 'facility-stone';
    scene.add(quarryGroup);
    facilityGroupsRef.current.set('stone', quarryGroup);

    // 4. Central Campfire
    const campPos = facilityPositionsRef.current['campfire'] || { x: 0, z: -0.8 };
    const campfire = createCampfireMesh();
    campfire.position.set(campPos.x, getTerrainHeight(campPos.x, campPos.z), campPos.z);
    campfire.name = 'facility-campfire';
    campfireGroupRef.current = campfire;
    scene.add(campfire);
    facilityGroupsRef.current.set('campfire', campfire);

    // 5. Clay Pit (Oleiro / potter area)
    const clayPos = facilityPositionsRef.current['clay'] || { x: 7.0, z: 3.5 };
    const clayGroup = createClayPitMesh();
    clayGroup.position.set(clayPos.x, getTerrainHeight(clayPos.x, clayPos.z), clayPos.z);
    clayGroup.name = 'facility-clay';
    scene.add(clayGroup);
    facilityGroupsRef.current.set('clay', clayGroup);

    // 6. Active Builder Site (Construtor / builder area)
    const builderPos = facilityPositionsRef.current['buildersite'] || { x: 3.0, z: 0 };
    const builderGroup = createBuilderSiteMesh();
    builderGroup.position.set(builderPos.x, getTerrainHeight(builderPos.x, builderPos.z), builderPos.z);
    builderGroup.name = 'facility-buildersite';
    scene.add(builderGroup);
    facilityGroupsRef.current.set('buildersite', builderGroup);

    // 7. Elder Study Altar & Table (Ancião / elder research area)
    const elderPos = facilityPositionsRef.current['elderDesk'] || { x: -2.2, z: -2.8 };
    const elderGroup = createElderDeskMesh();
    elderGroup.position.set(elderPos.x, getTerrainHeight(elderPos.x, elderPos.z), elderPos.z);
    elderGroup.name = 'facility-elderDesk';
    scene.add(elderGroup);
    facilityGroupsRef.current.set('elderDesk', elderGroup);

    // 8. Guard Watchposts (Guarda / guard perimeter posts)
    const guardPos = facilityPositionsRef.current['guardPost'] || { x: 5.5, z: 5.0 };
    const guardPost1 = createGuardPostMesh();
    guardPost1.position.set(guardPos.x, getTerrainHeight(guardPos.x, guardPos.z), guardPos.z);
    guardPost1.name = 'facility-guardPost';
    scene.add(guardPost1);
    facilityGroupsRef.current.set('guardPost', guardPost1);

    const guardPost2 = createGuardPostMesh();
    guardPost2.position.set(-guardPos.x, getTerrainHeight(-guardPos.x, guardPos.z), guardPos.z);
    guardPost2.name = 'guard_node_2';
    scene.add(guardPost2);

    // Buildings container group
    const buildingsGroup = new THREE.Group();
    buildingsGroupRef.current = buildingsGroup;
    scene.add(buildingsGroup);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);

    // Animation Loop
    let animId: number;
    const timer = new THREE.Timer();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      timer.update();
      const delta = timer.getDelta();
      const time = timer.getElapsed();

      // Campfire flicker animation
      if (campfireGroupRef.current) {
        const flame = campfireGroupRef.current.getObjectByName('flame');
        const innerFlame = campfireGroupRef.current.getObjectByName('innerFlame');
        if (flame) {
          flame.scale.y = 1 + Math.sin(time * 12) * 0.18;
          flame.rotation.y = time * 2;
        }
        if (innerFlame) {
          innerFlame.scale.y = 1 + Math.cos(time * 15) * 0.22;
        }
      }

      // Smooth Atmospheric Lighting & Day/Night Transition
      const targetTimeOfDay = effectiveTimeOfDayRef.current;
      const targetPreset = LIGHTING_PRESETS[targetTimeOfDay];

      if (targetPreset) {
        // Lerp Sky background color smoothly
        currentSkyColorRef.current.lerp(targetPreset.skyColor, 0.04);
        scene.background = currentSkyColorRef.current;

        // Lerp Fog color and density smoothly
        if (scene.fog && scene.fog instanceof THREE.FogExp2) {
          currentFogColorRef.current.lerp(targetPreset.fogColor, 0.04);
          scene.fog.color.copy(currentFogColorRef.current);
          scene.fog.density = THREE.MathUtils.lerp(
            scene.fog.density,
            targetPreset.fogDensity,
            0.04
          );
        }

        // Lerp Ambient Light color and intensity
        if (ambientLightRef.current) {
          ambientLightRef.current.color.lerp(targetPreset.ambientColor, 0.04);
          ambientLightRef.current.intensity = THREE.MathUtils.lerp(
            ambientLightRef.current.intensity,
            targetPreset.ambientIntensity,
            0.04
          );
        }

        // Lerp Directional Light (Sun/Moon) color, intensity, and orbit position
        if (dirLightRef.current) {
          dirLightRef.current.color.lerp(targetPreset.sunColor, 0.04);
          dirLightRef.current.intensity = THREE.MathUtils.lerp(
            dirLightRef.current.intensity,
            targetPreset.sunIntensity,
            0.04
          );

          // Calculate continuous sun/moon position in the sky based on gameHour
          const h = ((gameState.gameHour ?? 6.0) % 24 + 24) % 24;
          let celestialPos = targetPreset.sunPos;
          if (h >= 5.5 && h < 19.5) {
            // Daytime sun arc: rises in east, reaches peak at noon (12:00), sets in west
            const sunProgress = (h - 5.5) / 14.0;
            const sunAngle = sunProgress * Math.PI;
            const sunX = -Math.cos(sunAngle) * 26;
            const sunY = Math.max(3, Math.sin(sunAngle) * 28);
            const sunZ = 12 - sunProgress * 6;
            celestialPos = new THREE.Vector3(sunX, sunY, sunZ);
          } else {
            // Nighttime moon arc
            const nightH = h >= 19.5 ? h - 19.5 : h + 4.5;
            const moonProgress = nightH / 10.0;
            const moonAngle = moonProgress * Math.PI;
            const moonX = -Math.cos(moonAngle) * 24;
            const moonY = Math.max(4, Math.sin(moonAngle) * 26);
            const moonZ = -14;
            celestialPos = new THREE.Vector3(moonX, moonY, moonZ);
          }
          dirLightRef.current.position.lerp(celestialPos, 0.03);
        }

        // Lerp Ground plane tint
        if (groundMatRef.current) {
          groundMatRef.current.color.lerp(targetPreset.groundColor, 0.04);
        }

        // Stars celestial rotation and smooth fade in/out
        if (starsPointsRef.current) {
          starsPointsRef.current.rotation.y = time * 0.003;
          const starsMat = starsPointsRef.current.material as THREE.PointsMaterial;
          starsMat.opacity = THREE.MathUtils.lerp(
            starsMat.opacity,
            targetPreset.starsOpacity,
            0.04
          );
          starsPointsRef.current.visible = starsMat.opacity > 0.01;
        }

        // Moon smooth fade in/out and celestial arc
        if (moonMeshRef.current) {
          const moonMat = moonMeshRef.current.material as THREE.MeshBasicMaterial;
          moonMat.opacity = THREE.MathUtils.lerp(
            moonMat.opacity,
            targetPreset.moonOpacity,
            0.04
          );
          moonMeshRef.current.visible = moonMat.opacity > 0.01;
          const h = ((gameState.gameHour ?? 6.0) % 24 + 24) % 24;
          const nightH = h >= 19.5 ? h - 19.5 : h + 4.5;
          const moonProgress = nightH / 10.0;
          const moonAngle = moonProgress * Math.PI;
          moonMeshRef.current.position.x = -Math.cos(moonAngle) * 26;
          moonMeshRef.current.position.y = Math.sin(moonAngle) * 28 + 4;
          moonMeshRef.current.position.z = -20;
        }

        // Campfire PointLight: extra warm amber illumination and flicker at night!
        if (campfireGroupRef.current) {
          const campfireLight = campfireGroupRef.current.getObjectByName(
            'campfirePointLight'
          ) as THREE.PointLight;
          if (campfireLight) {
            const flicker = Math.sin(time * 15) * 0.35 + Math.cos(time * 23) * 0.15;
            const targetCampfireIntensity = targetPreset.campfireLightIntensity + flicker;
            campfireLight.intensity = THREE.MathUtils.lerp(
              campfireLight.intensity,
              targetCampfireIntensity,
              0.08
            );
          }
        }
      }

      // Update 3D Villagers movement and animations (freezes simulation when paused)
      if (!gameStatePausedRef.current) {
        updateVillagersAnimation(delta, time);
      }

      // Camera Follow logic if enabled
      if (followVillager && selectedVillagerId && cameraRef.current) {
        const agent = agentsRef.current.get(selectedVillagerId);
        if (agent) {
          camTargetRef.current.lerp(agent.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0.08);
          updateCameraPosition();
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      timer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Helper to recompute camera position based on angles
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = camAngleRef.current;
    const target = camTargetRef.current;

    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  };

  // 2. Synchronize Buildings in 3D Scene
  useEffect(() => {
    if (!buildingsGroupRef.current) return;
    const bg = buildingsGroupRef.current;

    // Clear old building meshes
    while (bg.children.length > 0) {
      bg.remove(bg.children[0]);
    }

    // Clear building keys from facilityGroupsRef
    ['shelter_1', 'shelter_2', 'shelter_3', 'shelter_4', 'granary', 'village_well', 'longhouse', 'ziggurat'].forEach((id) => {
      facilityGroupsRef.current.delete(id);
    });

    const { buildings, zigguratStagesCompleted } = gameState;

    const registerBuilding = (id: string, mesh: THREE.Group, fallbackPos: { x: number; z: number }) => {
      const p = facilityPositions[id] || fallbackPos;
      const y = getTerrainHeight(p.x, p.z);
      mesh.position.set(p.x, y, p.z);
      mesh.name = `facility-${id}`;
      bg.add(mesh);
      facilityGroupsRef.current.set(id, mesh);
    };

    // Starter or built huts with visual level
    const hutsCount = Math.max(1, buildings.hut?.count || 1);
    const hutLevel = Math.max(1, buildings.hut?.level || 1);
    const stoneDwellingsCount = buildings.stone_dwelling?.count || 0;

    // Main starter shelter (Cabana 1)
    if (stoneDwellingsCount > 0) {
      registerBuilding('shelter_1', createStoneDwellingMesh(), { x: -2.8, z: -1.8 });
    } else {
      registerBuilding('shelter_1', createHutMesh(hutLevel), { x: -2.8, z: -1.8 });
    }

    // Additional houses (Cabanas 2, 3, 4)
    if (hutsCount > 1 || stoneDwellingsCount > 1) {
      const hut2 = stoneDwellingsCount > 1 ? createStoneDwellingMesh() : createHutMesh(hutLevel);
      registerBuilding('shelter_2', hut2, { x: -2.8, z: 1.8 });
    }
    if (hutsCount > 2 || stoneDwellingsCount > 2) {
      const hut3 = stoneDwellingsCount > 2 ? createStoneDwellingMesh() : createHutMesh(hutLevel);
      registerBuilding('shelter_3', hut3, { x: 2.8, z: -2.0 });
    }
    if (hutsCount > 3) {
      registerBuilding('shelter_4', createHutMesh(hutLevel), { x: 2.8, z: 2.0 });
    }

    // Granary
    if ((buildings.granary?.count || 0) > 0) {
      registerBuilding('granary', createGranaryMesh(), { x: 0, z: 4.0 });
    }

    // Well
    if ((buildings.village_well?.count || 0) > 0) {
      registerBuilding('village_well', createWellMesh(), { x: 0, z: -3.8 });
    }

    // Longhouse
    if ((buildings.longhouse?.count || 0) > 0) {
      registerBuilding('longhouse', createLonghouseMesh(), { x: 0, z: -1.0 });
    }

    // Ziggurat Monument
    if ((buildings.ziggurat?.count || 0) > 0 || zigguratStagesCompleted > 0) {
      registerBuilding('ziggurat', createZigguratMesh(Math.max(1, zigguratStagesCompleted)), { x: 0, z: -14.0 });
    }
  }, [gameState.buildings, gameState.zigguratStagesCompleted, facilityPositions]);

  // 3. Synchronize 3D Villagers
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const currentAgents = agentsRef.current;

    // Existing IDs
    const currentIds = new Set(gameState.villagers.map((v) => v.id));

    // Remove deleted agents
    currentAgents.forEach((agent, id) => {
      if (!currentIds.has(id)) {
        scene.remove(agent.rig.root);
        currentAgents.delete(id);
      }
    });

    // Add or update agents
    gameState.villagers.forEach((villager, index) => {
      let agent = currentAgents.get(villager.id);

      if (!agent) {
        const rig = createCharacterMesh(villager);
        // Starting positions near campfire for the first two villagers
        const startX = index === 0 ? -1.0 : 1.0;
        const startZ = index === 0 ? -0.5 : 0.5;
        const initialPos = new THREE.Vector3(startX, 0, startZ);

        rig.root.position.copy(initialPos);
        scene.add(rig.root);

        // Deterministic workDuration based on villager.id (4.0 to 7.0 seconds)
        let idHash = 0;
        for (let i = 0; i < villager.id.length; i++) {
          idHash = (idHash * 31 + villager.id.charCodeAt(i)) & 0x7fffffff;
        }
        const workDuration = 4.0 + (idHash % 301) / 100; // 4.00s to 7.00s

        agent = {
          villager,
          rig,
          pos: initialPos,
          target: initialPos.clone(),
          state: 'idle',
          currentActivity: 'idle',
          activityTimer: 0,
          activityDuration: 6.0,
          workTimer: 0,
          workDuration,
          speed: 1.8,
          idleAction: (index % 2 === 0 ? 'sway' : 'look_around') as IdleActionType,
          idleTimer: Math.random() * 2,
          idleDuration: 4.5 + Math.random() * 3.5,
          idleSitTransition: 0,
          idleLookAngle: (Math.random() - 0.5) * 1.2,
          idleSeed: index * 2.17 + Math.random() * 5,
        };
        agent.speed = 2.1;
        currentAgents.set(villager.id, agent);
        // Direct movement to assigned workplace or common area depending on work schedule
        assignAgentJobBehavior(agent, villager.job, false);
      } else {
        const jobChanged = agent.villager.job !== villager.job;
        const workStatusChanged = agent.villager.isWorking !== villager.isWorking;
        if (jobChanged) {
          setupToolForJob(agent.rig.toolSlot, villager.job);
        }
        agent.villager = villager;

        // If job changed or work status changed (starts/ends work schedule), immediately update behavior!
        // REGRA: Se o trabalhador estiver carregando recursos para o depósito ('carrying_to_storage'),
        // NÃO interrompe a viagem no meio; ele conclui a entrega no depósito antes de retornar à vila.
        if (jobChanged || (workStatusChanged && agent.state !== 'carrying_to_storage')) {
          assignAgentJobBehavior(agent, villager.job, false);
        }
      }
    });
  }, [gameState.villagers]);

  // Synchronize 3D villagers when routine changes (e.g. dawn breakfast, noon lunch, evening dinner)
  useEffect(() => {
    if (prevRoutineRef.current !== currentRoutine) {
      prevRoutineRef.current = currentRoutine;
      agentsRef.current.forEach((agent) => {
        if (agent.state !== 'carrying_to_storage') {
          assignAgentJobBehavior(agent, agent.villager.job);
        }
      });
    }
  }, [currentRoutine]);

  // Helper para ocultar todos os fardos/materiais carregados pelo aldeão
  const hideAllCarriedMeshes = (rig: CharacterRig) => {
    rig.wheatCarry.visible = false;
    rig.woodCarry.visible = false;
    rig.stoneCarry.visible = false;
    rig.clayCarry.visible = false;
  };

  const assignAgentJobBehavior = (
    agent: VillagerAgent,
    job: JobType,
    forceWork: boolean = false
  ) => {
    // Tomada de decisão centralizada na IA Autônoma (VillagerAI.ts)
    const decision = chooseVillagerDecision(
      agent.villager,
      gameState.gameHour ?? 6.0,
      gameState.villagers
    );

    agent.currentActivity = decision.activity;
    agent.activityDuration = decision.duration;
    agent.activityTimer = 0;
    agent.socialPartnerId = decision.targetVillagerId;

    // 1. TRABALHO (working): Prioridade durante o expediente
    if (decision.activity === 'working') {
      agent.rig.mealBowl.visible = false;
      agent.rig.toolSlot.visible = true;
      setupToolForJob(agent.rig.toolSlot, job);

      if (job === 'farmer') {
        agent.target = RESOURCE_NODES.wheat.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2)
        );
      } else if (job === 'lumberjack') {
        agent.target = RESOURCE_NODES.wood.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2)
        );
      } else if (job === 'quarryman') {
        agent.target = RESOURCE_NODES.stone.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8)
        );
      } else if (job === 'potter') {
        agent.target = RESOURCE_NODES.clay.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8)
        );
      } else if (job === 'builder') {
        agent.target = RESOURCE_NODES.buildersite.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)
        );
      } else if (job === 'guard') {
        const side = Math.random() > 0.5 ? 1 : -1;
        agent.target = new THREE.Vector3(5.2 * side, 0, 5.0 + (Math.random() - 0.5) * 1.5);
      } else if (job === 'elder') {
        agent.target = RESOURCE_NODES.elderDesk.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)
        );
      } else {
        agent.target = RESOURCE_NODES.campfire.clone();
      }

      agent.state = 'walking_to_resource';
      hideAllCarriedMeshes(agent.rig);
      return;
    }

    // Atividades fora do expediente: ferramenta guardada
    agent.rig.toolSlot.visible = false;
    hideAllCarriedMeshes(agent.rig);

    // 2. REFEIÇÃO (eating): café, almoço ou jantar
    if (decision.activity === 'eating') {
      const agentKeys = Array.from(agentsRef.current.keys());
      const idx = agentKeys.indexOf(agent.villager.id);
      const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
      const radius = 1.45 + Math.sin(angle * 4) * 0.25;
      agent.target = RESOURCE_NODES.campfire.clone().add(
        new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      );
      agent.state = 'eating_meal';
      agent.rig.mealBowl.visible = true;
      return;
    }

    agent.rig.mealBowl.visible = false;

    // 3. REPOUSO NOTURNO (sleeping): 21:30 às 05:30 nas cabanas da aldeia
    // Regra: 2 por cabana no nível 1, +2 a cada novo nível da cabana
    if (decision.activity === 'sleeping') {
      const allVillagers = gameState.villagers;
      const villagerIdx = allVillagers.findIndex((v) => v.id === agent.villager.id);
      const safeIdx = villagerIdx >= 0 ? villagerIdx : 0;

      // Capacidade por cabana: 2 na base + 2 por nível adicional
      const hutLevel = Math.max(1, gameState.buildings.hut?.level || 1);
      const capacityPerHut = 2 + (hutLevel - 1) * 2; // = hutLevel * 2

      // Cabanas disponíveis na vila
      const hutsCount = Math.max(1, gameState.buildings.hut?.count || 1);
      const availableShelters: { key: string; fallback: { x: number; z: number } }[] = [
        { key: 'shelter_1', fallback: { x: -2.8, z: -1.8 } },
      ];
      if (hutsCount >= 2 || (gameState.buildings.stone_dwelling?.count || 0) >= 1) {
        availableShelters.push({ key: 'shelter_2', fallback: { x: -2.8, z: 1.8 } });
      }
      if (hutsCount >= 3 || (gameState.buildings.stone_dwelling?.count || 0) >= 2) {
        availableShelters.push({ key: 'shelter_3', fallback: { x: 2.8, z: -2.0 } });
      }
      if (hutsCount >= 4) {
        availableShelters.push({ key: 'shelter_4', fallback: { x: 2.8, z: 2.0 } });
      }

      // Distribuição: acomoda até capacityPerHut na Cabana 1, depois Cabana 2, etc.
      const targetHutIndex = Math.min(
        Math.floor(safeIdx / capacityPerHut),
        availableShelters.length - 1
      );
      const chosenShelter = availableShelters[targetHutIndex];
      const slotInHut = safeIdx % capacityPerHut;

      const shelterPos = getNodePos(chosenShelter.key, chosenShelter.fallback);

      // Posiciona os aldeões em seus respectivos leitos dentro/ao redor da cabana
      const angle = (slotInHut / capacityPerHut) * Math.PI * 2;
      const bedRadius = 0.65 + (slotInHut % 2) * 0.16;
      agent.target = shelterPos.clone().add(
        new THREE.Vector3(Math.cos(angle) * bedRadius, 0, Math.sin(angle) * bedRadius)
      );
      agent.state = 'sleeping';
      return;
    }

    // 4. SOCIALIZAÇÃO (socializing): caminha até outro aldeão para interagir
    if (decision.activity === 'socializing' && decision.targetVillagerId) {
      const partner = agentsRef.current.get(decision.targetVillagerId);
      if (partner) {
        const offsetAngle = Math.random() * Math.PI * 2;
        agent.target = partner.pos.clone().add(
          new THREE.Vector3(Math.cos(offsetAngle) * 1.25, 0, Math.sin(offsetAngle) * 1.25)
        );
        agent.state = 'socializing';
        return;
      }
    }

    // 5. PASSEIO / WANDERING (wandering): caminha pela área central da aldeia
    if (decision.activity === 'wandering' && decision.targetOffset) {
      agent.target = new THREE.Vector3(
        decision.targetOffset.x,
        getTerrainHeight(decision.targetOffset.x, decision.targetOffset.z),
        decision.targetOffset.z
      );
      agent.state = 'wandering';
      return;
    }

    // 6. DESCANSO (resting): perto da fogueira, cabana ou centro
    if (decision.activity === 'resting') {
      const agentKeys = Array.from(agentsRef.current.keys());
      const idx = agentKeys.indexOf(agent.villager.id);
      const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
      const radius = 1.9 + (idx % 3) * 0.45;
      agent.target = RESOURCE_NODES.campfire.clone().add(
        new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      );
      agent.state = 'resting';
      agent.idleAction = Math.random() > 0.5 ? 'sit' : 'warm_hands';
      return;
    }

    // 7. IDLE (idle): observação calma na vila
    const agentKeys = Array.from(agentsRef.current.keys());
    const idx = agentKeys.indexOf(agent.villager.id);
    const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
    const radius = 2.2 + (idx % 3) * 0.4;
    agent.target = RESOURCE_NODES.campfire.clone().add(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    );
    agent.state = 'idle';
  };

  // Synchronize villager pathing whenever facilities are moved
  useEffect(() => {
    agentsRef.current.forEach((agent) => {
      assignAgentJobBehavior(agent, agent.villager.job, false);
    });
  }, [facilityPositions]);

  // 4. Update Villagers Animation Frame Loop
  const updateVillagersAnimation = (delta: number, time: number) => {
    agentsRef.current.forEach((agent) => {
      const { rig, pos, target } = agent;
      const isSelected = selectedVillagerId === agent.villager.id;

      // Distance to target
      const dist = pos.distanceTo(target);
      const isMoving = dist > 0.25;

      if (isMoving) {
        // Move towards target
        const dir = target.clone().sub(pos).normalize();
        pos.x += dir.x * agent.speed * delta;
        pos.z += dir.z * agent.speed * delta;
        pos.y = getTerrainHeight(pos.x, pos.z);
        rig.root.position.copy(pos);

        // Rotate smoothly towards movement direction
        const targetRotation = Math.atan2(dir.x, dir.z);
        rig.root.rotation.y = THREE.MathUtils.lerp(rig.root.rotation.y, targetRotation, 0.15);

        // Walking Leg & Arm Swing (Morphe stickman cartoon stride)
        // Recover from sitting if was sitting
        agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0, 0.2);
        rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.2);
        rig.head.rotation.set(0, 0, 0);
        rig.body.rotation.set(0, 0, 0);

        const walkFreq = 9;
        const swing = Math.sin(time * walkFreq) * 0.55;
        rig.leftLeg.rotation.x = swing;
        rig.rightLeg.rotation.x = -swing;
        rig.leftArm.rotation.x = -swing * 0.7;
        rig.rightArm.rotation.x = swing * 0.7;
        rig.leftArm.rotation.z = 0;
        rig.rightArm.rotation.z = 0;
        rig.head.position.y = 1.35 + Math.abs(Math.sin(time * walkFreq)) * 0.04;
      } else {
        // Idle / Working pose
        rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.2);
        rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.2);

        // Reavaliação periódica de atividades autônomas fora do expediente
        if (
          agent.state !== 'working' &&
          agent.state !== 'carrying_to_storage' &&
          agent.state !== 'walking_to_resource'
        ) {
          agent.activityTimer += delta;
          if (agent.activityTimer >= agent.activityDuration) {
            agent.activityTimer = 0;
            assignAgentJobBehavior(agent, agent.villager.job, false);
            return;
          }
        }

        // Working behaviors
        if (agent.state === 'working') {
          // Se o expediente encerrou, interrompe a animação de trabalho e retorna à vila
          if (!agent.villager.isWorking) {
            assignAgentJobBehavior(agent, agent.villager.job, false);
            return;
          }

          // Recover to standing height when working
          agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0, 0.2);
          rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.2);
          rig.head.rotation.set(0, 0, 0);

          agent.workTimer += delta;

          // Action specific animations
          if (agent.villager.job === 'farmer') {
            // Sickle Reaping Motion (bent down swinging sickle)
            rig.body.rotation.x = 0.25;
            rig.rightArm.rotation.x = Math.sin(time * 6) * 0.8 + 0.4;
            rig.leftArm.rotation.x = 0.3;
          } else if (agent.villager.job === 'lumberjack') {
            // Axe chopping motion
            rig.rightArm.rotation.x = Math.sin(time * 5) * 1.1;
            rig.leftArm.rotation.x = Math.sin(time * 5) * 0.9;
          } else if (agent.villager.job === 'quarryman' || agent.villager.job === 'builder') {
            // Hammering / chisel motion
            rig.rightArm.rotation.x = Math.sin(time * 8) * 0.7;
          } else if (agent.villager.job === 'guard') {
            // Standing at attention, glancing around
            rig.head.rotation.y = Math.sin(time * 1.5) * 0.35;
          } else if (agent.villager.job === 'elder') {
            // Studying tablet
            rig.body.rotation.x = 0.15;
            rig.rightArm.rotation.x = 0.5 + Math.sin(time * 4) * 0.1;
          }

          // Finish work cycle: carry resources back to storehouse!
          const requiredDuration = agent.workDuration || 4.5;
          if (agent.workTimer >= requiredDuration) {
            agent.workTimer = 0;
            hideAllCarriedMeshes(agent.rig);
            if (agent.villager.job === 'farmer') {
              agent.rig.wheatCarry.visible = true;
              agent.target = RESOURCE_NODES.foodStorage.clone();
              agent.state = 'carrying_to_storage';
              audio.playHarvest();
            } else if (agent.villager.job === 'lumberjack') {
              agent.rig.woodCarry.visible = true;
              agent.target = RESOURCE_NODES.materialStorage.clone();
              agent.state = 'carrying_to_storage';
              audio.playWood();
            } else if (agent.villager.job === 'quarryman') {
              agent.rig.stoneCarry.visible = true;
              agent.target = RESOURCE_NODES.materialStorage.clone();
              agent.state = 'carrying_to_storage';
              audio.playStone();
            } else if (agent.villager.job === 'potter') {
              agent.rig.clayCarry.visible = true;
              agent.target = RESOURCE_NODES.materialStorage.clone();
              agent.state = 'carrying_to_storage';
              audio.playWood();
            } else {
              // Stay working or roam slightly
              agent.workTimer = 0;
            }
          }
        } else if (agent.state === 'carrying_to_storage') {
          // Reached storehouse (foodStorage ou materialStorage)
          hideAllCarriedMeshes(agent.rig);
          rig.body.rotation.x = 0;

          // Deposit to storage in real-time com balanceamento por getWorkerDeliveryAmount
          if (agent.villager.job === 'farmer') {
            const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'food');
            onVillagerGathersRef.current?.('food', amount);
            audio.playHarvest();
          } else if (agent.villager.job === 'lumberjack') {
            const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'wood');
            onVillagerGathersRef.current?.('wood', amount);
            audio.playWood();
          } else if (agent.villager.job === 'quarryman') {
            const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'stone');
            onVillagerGathersRef.current?.('stone', amount);
            audio.playStone();
          } else if (agent.villager.job === 'potter') {
            const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'clay');
            onVillagerGathersRef.current?.('clay', amount);
            audio.playWood();
          }

          // Return to assigned resource area (ou rotina fora de expediente se o turno terminou durante o trajeto)
          assignAgentJobBehavior(agent, agent.villager.job, false);
        } else if (agent.state === 'walking_to_resource') {
          // Se o expediente encerrou no trajeto, retorna à vila
          if (!agent.villager.isWorking) {
            assignAgentJobBehavior(agent, agent.villager.job, false);
            return;
          }
          // Reached resource node -> begin working!
          agent.state = 'working';
          agent.workTimer = 0;
          hideAllCarriedMeshes(agent.rig);
        } else if (agent.state === 'eating_meal') {
          // =========================================================================
          // REFEIÇÃO COLETIVA: Café ao amanhecer, Almoço ao meio-dia, Jantar à noite
          // =========================================================================
          rig.mealBowl.visible = true;
          rig.toolSlot.visible = false;
          hideAllCarriedMeshes(rig);

          // Sentar confortavelmente ao redor da fogueira
          agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 1.0, 0.08);
          rig.root.position.y = -0.42 * agent.idleSitTransition;
          rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, Math.PI / 2.2, 0.08);
          rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, Math.PI / 2.2, 0.08);
          rig.leftLeg.rotation.z = -0.12 * agent.idleSitTransition;
          rig.rightLeg.rotation.z = 0.12 * agent.idleSitTransition;

          // Segurar tigela com a mão esquerda
          rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.72, 0.1);
          rig.leftArm.rotation.z = -0.15;

          // Mão direita leva o alimento à boca ciclicamente
          const eatCycle = Math.sin(time * 3.2 + agent.idleSeed);
          rig.rightArm.rotation.x = THREE.MathUtils.lerp(
            rig.rightArm.rotation.x,
            0.75 + eatCycle * 0.45,
            0.15
          );
          rig.rightArm.rotation.z = 0.18;

          // Cabeça saboreia com movimentos suaves
          rig.head.rotation.x = THREE.MathUtils.lerp(
            rig.head.rotation.x,
            0.12 - (eatCycle > 0 ? 0.08 : -0.05),
            0.1
          );
          rig.head.rotation.y = THREE.MathUtils.lerp(
            rig.head.rotation.y,
            Math.sin(time * 0.8 + agent.idleSeed) * 0.15,
            0.05
          );
          rig.head.position.y = 1.35 + Math.sin(time * 2.2) * 0.02;
        } else if (agent.state === 'sleeping') {
          // =========================================================================
          // DESCANSO NOTURNO
          // =========================================================================
          rig.mealBowl.visible = false;
          rig.toolSlot.visible = false;
          hideAllCarriedMeshes(rig);

          agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 1.0, 0.08);
          rig.root.position.y = -0.42 * agent.idleSitTransition;
          rig.leftLeg.rotation.x = Math.PI / 2.2;
          rig.rightLeg.rotation.x = Math.PI / 2.2;
          rig.leftArm.rotation.x = 0.58;
          rig.rightArm.rotation.x = 0.58;
          rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.25, 0.08);
          rig.head.position.y = 1.32 + Math.sin(time * 1.4 + agent.idleSeed) * 0.02;
        } else if (agent.state === 'socializing') {
          // =========================================================================
          // SOCIALIZAÇÃO AUTÔNOMA: Aldeões conversam e gesticulam amigavelmente
          // =========================================================================
          rig.mealBowl.visible = false;
          rig.toolSlot.visible = false;
          hideAllCarriedMeshes(rig);

          if (agent.socialPartnerId) {
            const partner = agentsRef.current.get(agent.socialPartnerId);
            if (partner) {
              const partnerDir = partner.pos.clone().sub(agent.pos).normalize();
              const targetAngle = Math.atan2(partnerDir.x, partnerDir.z);
              rig.root.rotation.y = THREE.MathUtils.lerp(rig.root.rotation.y, targetAngle, 0.1);
            }
          }
          agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0, 0.1);
          rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
          rig.leftLeg.rotation.set(0, 0, 0);
          rig.rightLeg.rotation.set(0, 0, 0);

          const talkCycle = Math.sin(time * 3.6 + agent.idleSeed);
          rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.42 + talkCycle * 0.28, 0.12);
          rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.25, 0.1);
          rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.18, 0.1);
          rig.leftArm.rotation.z = -0.14;

          rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, Math.sin(time * 2.8 + agent.idleSeed) * 0.08, 0.1);
          rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, Math.sin(time * 1.2 + agent.idleSeed) * 0.1, 0.08);
          rig.head.position.y = 1.35 + Math.sin(time * 2.0) * 0.02;
        } else if (agent.state === 'wandering') {
          // =========================================================================
          // PASSEIO AUTÔNOMO: Observação atenta da paisagem e da vila
          // =========================================================================
          rig.mealBowl.visible = false;
          rig.toolSlot.visible = false;
          hideAllCarriedMeshes(rig);

          agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0, 0.1);
          rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
          rig.leftLeg.rotation.set(0, 0, 0);
          rig.rightLeg.rotation.set(0, 0, 0);

          const lookAngle = Math.sin(time * 0.9 + agent.idleSeed) * 0.45;
          rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, lookAngle, 0.08);
          rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.06, 0.08);
          rig.body.rotation.y = rig.head.rotation.y * 0.3;
          rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.05, 0.1);
          rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.05, 0.1);
        } else if (agent.state === 'resting') {
          // =========================================================================
          // DESCANSO AUTÔNOMO: Perto da fogueira ou cabana
          // =========================================================================
          rig.mealBowl.visible = false;
          rig.toolSlot.visible = false;
          hideAllCarriedMeshes(rig);

          if (agent.idleAction === 'warm_hands') {
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0.0, 0.1);
            rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
            rig.leftLeg.rotation.set(0, 0, 0);
            rig.rightLeg.rotation.set(0, 0, 0);

            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.82 + Math.sin(time * 2.5) * 0.02, 0.1);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.82 + Math.sin(time * 2.5) * 0.02, 0.1);
            rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, -0.16 + Math.sin(time * 6) * 0.025, 0.1);
            rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.16 - Math.sin(time * 6) * 0.025, 0.1);
            rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0.12, 0.08);
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.14, 0.08);
          } else {
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 1.0, 0.08);
            rig.root.position.y = -0.42 * agent.idleSitTransition;
            rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, Math.PI / 2.2, 0.08);
            rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, Math.PI / 2.2, 0.08);
            rig.leftLeg.rotation.z = -0.15 * agent.idleSitTransition;
            rig.rightLeg.rotation.z = 0.15 * agent.idleSitTransition;
            rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, -0.06, 0.08);
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.62, 0.08);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.62, 0.08);
            rig.head.position.y = 1.35 + Math.sin(time * 2.0 + agent.idleSeed) * 0.025;
          }
        } else {
          // =========================================================================
          // IDLE CYCLES SYSTEM: Sway, Look Around, Sit, Warm Hands, Scratch Head
          // =========================================================================
          agent.idleTimer += delta;

          // Transition to next idle activity
          if (agent.idleTimer >= agent.idleDuration) {
            agent.idleTimer = 0;
            agent.idleDuration = 4.5 + Math.random() * 4.0;

            const distToFire = pos.distanceTo(RESOURCE_NODES.campfire);
            const rand = Math.random();

            if (distToFire < 3.2) {
              if (rand < 0.35) {
                agent.idleAction = 'sit';
              } else if (rand < 0.60) {
                agent.idleAction = 'warm_hands';
              } else if (rand < 0.80) {
                agent.idleAction = 'look_around';
                agent.idleLookAngle = (Math.random() - 0.5) * 1.3;
              } else {
                agent.idleAction = 'sway';
              }
            } else {
              if (rand < 0.35) {
                agent.idleAction = 'look_around';
                agent.idleLookAngle = (Math.random() - 0.5) * 1.4;
              } else if (rand < 0.65) {
                agent.idleAction = 'sway';
              } else if (rand < 0.82) {
                agent.idleAction = 'scratch_head';
              } else {
                agent.idleAction = 'sit';
              }
            }
          }

          // Execute current idle animation behavior
          if (agent.idleAction === 'sit') {
            // Smoothly sit down on the ground
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 1.0, 0.08);
            rig.root.position.y = -0.42 * agent.idleSitTransition;

            // Fold legs forward in seated pose
            rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, Math.PI / 2.2, 0.08);
            rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, Math.PI / 2.2, 0.08);
            rig.leftLeg.rotation.z = -0.15 * agent.idleSitTransition;
            rig.rightLeg.rotation.z = 0.15 * agent.idleSitTransition;

            // Relaxed torso posture
            rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, -0.06, 0.08);
            rig.body.rotation.y = THREE.MathUtils.lerp(rig.body.rotation.y, 0, 0.1);
            rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.1);

            // Arms resting peacefully on lap/knees
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(
              rig.leftArm.rotation.x,
              0.62 + Math.sin(time * 1.5 + agent.idleSeed) * 0.02,
              0.08
            );
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(
              rig.rightArm.rotation.x,
              0.62 + Math.sin(time * 1.5 + agent.idleSeed) * 0.02,
              0.08
            );
            rig.leftArm.rotation.z = -0.12 * agent.idleSitTransition;
            rig.rightArm.rotation.z = 0.12 * agent.idleSitTransition;

            // Head breathing bob and subtle gaze
            rig.head.position.y = 1.35 + Math.sin(time * 2.0 + agent.idleSeed) * 0.025;
            rig.head.rotation.y = THREE.MathUtils.lerp(
              rig.head.rotation.y,
              Math.sin(time * 0.8 + agent.idleSeed) * 0.15,
              0.05
            );
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.08, 0.08);
            rig.head.rotation.z = THREE.MathUtils.lerp(rig.head.rotation.z, 0, 0.08);
          } else if (agent.idleAction === 'sway') {
            // Standing gentle body sway and rhythmic breathing
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0.0, 0.1);
            rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
            rig.leftLeg.rotation.set(0, 0, 0);
            rig.rightLeg.rotation.set(0, 0, 0);

            // Weight shifting from left to right foot
            const swayZ = Math.sin(time * 1.3 + agent.idleSeed) * 0.045;
            rig.body.rotation.z = swayZ;
            rig.body.rotation.y = THREE.MathUtils.lerp(rig.body.rotation.y, 0, 0.1);
            rig.body.rotation.x = THREE.MathUtils.lerp(
              rig.body.rotation.x,
              Math.sin(time * 1.8 + agent.idleSeed) * 0.03,
              0.1
            );

            // Head balances with slight counter-tilt and gentle breathing
            rig.head.position.y = 1.35 + Math.sin(time * 2.2 + agent.idleSeed) * 0.03;
            rig.head.rotation.z = -swayZ * 0.6;
            rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, 0, 0.08);
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0, 0.08);

            // Arms dangle and sway naturally with body weight
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.06, 0.1);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.06, 0.1);
            rig.leftArm.rotation.z = swayZ * 1.2 - 0.05;
            rig.rightArm.rotation.z = swayZ * 1.2 + 0.05;
          } else if (agent.idleAction === 'look_around') {
            // Standing looking around curiously
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0.0, 0.1);
            rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
            rig.leftLeg.rotation.set(0, 0, 0);
            rig.rightLeg.rotation.set(0, 0, 0);

            const p = agent.idleTimer / agent.idleDuration;
            let lookAngle = agent.idleLookAngle;
            let pitch = 0.04;
            if (p < 0.4) {
              lookAngle = agent.idleLookAngle;
            } else if (p < 0.65) {
              lookAngle = 0;
              pitch = -0.16; // glances up towards the clouds
            } else {
              lookAngle = -agent.idleLookAngle * 0.85;
            }

            rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, lookAngle, 0.07);
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, pitch, 0.07);
            rig.head.rotation.z = THREE.MathUtils.lerp(rig.head.rotation.z, Math.sin(time * 2.0) * 0.03, 0.07);
            rig.head.position.y = 1.35 + Math.sin(time * 2.0 + agent.idleSeed) * 0.02;

            // Torso turns slightly with head
            rig.body.rotation.y = rig.head.rotation.y * 0.28;
            rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0, 0.1);
            rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.1);

            // One hand on hip in thoughtful observer pose
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.32, 0.08);
            rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, -0.22, 0.08);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.04, 0.08);
            rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.06, 0.08);
          } else if (agent.idleAction === 'warm_hands') {
            // Warming hands near the campfire heat
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0.0, 0.1);
            rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
            rig.leftLeg.rotation.set(0, 0, 0);
            rig.rightLeg.rotation.set(0, 0, 0);

            // Arms extended toward fire with subtle rubbing
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.82 + Math.sin(time * 2.5) * 0.02, 0.1);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.82 + Math.sin(time * 2.5) * 0.02, 0.1);
            rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, -0.16 + Math.sin(time * 6) * 0.025, 0.1);
            rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.16 - Math.sin(time * 6) * 0.025, 0.1);

            // Gentle forward torso lean into warmth
            rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0.12, 0.08);
            rig.body.rotation.y = THREE.MathUtils.lerp(rig.body.rotation.y, 0, 0.08);
            rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.08);

            // Head looking warmly forward/down
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.14, 0.08);
            rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, 0, 0.08);
            rig.head.position.y = 1.35 + Math.sin(time * 2.2) * 0.02;
          } else if (agent.idleAction === 'scratch_head') {
            // Pondering: right hand scratches head, body relaxed
            agent.idleSitTransition = THREE.MathUtils.lerp(agent.idleSitTransition, 0.0, 0.1);
            rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0, 0.1);
            rig.leftLeg.rotation.set(0, 0, 0);
            rig.rightLeg.rotation.set(0, 0, 0);

            rig.rightArm.rotation.x = THREE.MathUtils.lerp(
              rig.rightArm.rotation.x,
              -2.05 + Math.sin(time * 7 + agent.idleSeed) * 0.07,
              0.12
            );
            rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.42, 0.12);
            rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.05, 0.1);
            rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, -0.06, 0.1);

            // Head tilts into the hand
            rig.head.rotation.z = THREE.MathUtils.lerp(rig.head.rotation.z, -0.14, 0.1);
            rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, 0.12, 0.1);
            rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.06, 0.1);
            rig.head.position.y = 1.35 + Math.sin(time * 2.2 + agent.idleSeed) * 0.02;
            rig.body.rotation.set(0, 0, 0);
          }
        }
      }

      // Ensure feet stay firmly planted on undulating terrain height
      const currentGroundY = getTerrainHeight(pos.x, pos.z);
      pos.y = currentGroundY;
      const sitOffset = agent.idleSitTransition ? 0.42 * agent.idleSitTransition : 0;
      rig.root.position.set(pos.x, currentGroundY - sitOffset, pos.z);

      // Highlight selected villager with subtle head scale pulse
      if (isSelected) {
        rig.head.scale.setScalar(1.08 + Math.sin(time * 5) * 0.04);
      } else {
        rig.head.scale.setScalar(1.0);
      }
    });
  };

  // 5. Mouse / Touch Orbit Controls & Raycasting Selection
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isRightClickRef.current = e.button === 2;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (isRightClickRef.current) {
      // Pan camera target
      const panSpeed = 0.015;
      const angle = camAngleRef.current.theta;
      camTargetRef.current.x -= (Math.cos(angle) * dx - Math.sin(angle) * dy) * panSpeed;
      camTargetRef.current.z -= (Math.sin(angle) * dx + Math.cos(angle) * dy) * panSpeed;
    } else {
      // Rotate camera
      camAngleRef.current.theta -= dx * 0.007;
      camAngleRef.current.phi = Math.max(
        0.2,
        Math.min(Math.PI / 2.1, camAngleRef.current.phi - dy * 0.007)
      );
    }
    updateCameraPosition();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    camAngleRef.current.radius = Math.max(
      5,
      Math.min(32, camAngleRef.current.radius + e.deltaY * 0.02)
    );
    updateCameraPosition();
  };

  // Touch Support (Single touch rotate, pinch zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      camAngleRef.current.theta -= dx * 0.007;
      camAngleRef.current.phi = Math.max(
        0.2,
        Math.min(Math.PI / 2.1, camAngleRef.current.phi - dy * 0.007)
      );
      updateCameraPosition();
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const pinchDelta = touchStartDistRef.current - currentDist;
      touchStartDistRef.current = currentDist;

      camAngleRef.current.radius = Math.max(
        5,
        Math.min(32, camAngleRef.current.radius + pinchDelta * 0.05)
      );
      updateCameraPosition();
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  // Click on 3D objects (Raycasting)
  const handleClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) return;
    if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // =========================================================================
    // MOVE FACILITY MODE
    // =========================================================================
    if (isMoveMode) {
      // 1. First check if clicked on any facility or building in the scene to select it
      const facilityRoots: THREE.Object3D[] = [];
      facilityGroupsRef.current.forEach((grp) => facilityRoots.push(grp));
      const facilityHits = raycaster.intersectObjects(facilityRoots, true);
      if (facilityHits.length > 0) {
        let obj: THREE.Object3D | null = facilityHits[0].object;
        while (obj && !obj.name.startsWith('facility-')) {
          obj = obj.parent;
        }
        if (obj) {
          const clickedId = obj.name.replace('facility-', '');
          setSelectedFacilityId(clickedId);
          audio.playWood();
          const cfg = DEFAULT_FACILITY_CONFIGS[clickedId];
          setMoveToast(`Selecionado: ${cfg?.name || clickedId}. Clique no solo para reposicionar.`);
          return;
        }
      }

      // 2. If a facility is already selected, clicking on the ground moves it!
      if (selectedFacilityId) {
        const groundHits = raycaster.intersectObjects(sceneRef.current.children, true);
        const groundHit = groundHits.find(
          (hit) => hit.object.name === 'ground' || Math.abs(hit.point.y) < 25
        );
        if (groundHit) {
          const newX = Math.round(Math.max(-23, Math.min(23, groundHit.point.x)) * 10) / 10;
          const newZ = Math.round(Math.max(-23, Math.min(23, groundHit.point.z)) * 10) / 10;

          setFacilityPositions((prev) => ({
            ...prev,
            [selectedFacilityId]: { x: newX, z: newZ },
          }));

          audio.playStone();
          const cfg = DEFAULT_FACILITY_CONFIGS[selectedFacilityId];
          setMoveToast(`✓ ${cfg?.name || selectedFacilityId} movido para (${newX}, ${newZ})!`);
          return;
        }
      }
      return;
    }

    // Raycast character roots
    const characterObjects: THREE.Object3D[] = [];
    agentsRef.current.forEach((agent) => {
      characterObjects.push(agent.rig.root);
    });

    const intersects = raycaster.intersectObjects(characterObjects, true);
    if (intersects.length > 0) {
      // Find which villager was clicked
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.name.startsWith('character-')) {
        obj = obj.parent;
      }
      if (obj) {
        const id = obj.name.replace('character-', '');
        const clickedVillager = gameState.villagers.find((v) => v.id === id);
        if (clickedVillager) {
          audio.playWood();
          onSelectVillager(clickedVillager);
          return;
        }
      }
    }

    // Raycast ground / nodes if a villager is already selected to command them!
    if (selectedVillagerId) {
      const groundIntersects = raycaster.intersectObjects(sceneRef.current.children, true);
      const groundHit = groundIntersects.find(
        (hit) => hit.object.name === 'ground' || hit.point.y < 0.2
      );

      if (groundHit) {
        const agent = agentsRef.current.get(selectedVillagerId);
        if (agent) {
          agent.target.copy(groundHit.point);
          agent.target.y = getTerrainHeight(groundHit.point.x, groundHit.point.z);
          agent.state = 'walking_to_resource';
          audio.playWood();
        }
      }
    }
  };

  // Camera presets focused on task areas (tracking dynamic facility coordinates)
  const resetCamera = (
    preset: 'overview' | 'fields' | 'camp' | 'quarry' | 'forest' | 'clay' | 'builder'
  ) => {
    if (preset === 'overview') {
      camAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 16 };
      camTargetRef.current.set(0, 0.8, 0);
    } else if (preset === 'fields') {
      const p = facilityPositionsRef.current['wheat'] || { x: -6.5, z: 4.0 };
      camAngleRef.current = { theta: Math.PI / 1.8, phi: Math.PI / 3.4, radius: 10 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    } else if (preset === 'forest') {
      const p = facilityPositionsRef.current['wood'] || { x: -6.0, z: -5.5 };
      camAngleRef.current = { theta: Math.PI * 0.75, phi: Math.PI / 3.3, radius: 11 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    } else if (preset === 'quarry') {
      const p = facilityPositionsRef.current['stone'] || { x: 6.5, z: -4.5 };
      camAngleRef.current = { theta: -Math.PI / 3, phi: Math.PI / 3.4, radius: 10 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    } else if (preset === 'clay') {
      const p = facilityPositionsRef.current['clay'] || { x: 7.0, z: 3.5 };
      camAngleRef.current = { theta: -Math.PI * 0.65, phi: Math.PI / 3.3, radius: 10 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    } else if (preset === 'builder') {
      const p = facilityPositionsRef.current['buildersite'] || { x: 3.0, z: 0 };
      camAngleRef.current = { theta: -Math.PI / 5, phi: Math.PI / 3.2, radius: 9 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    } else if (preset === 'camp') {
      const p = facilityPositionsRef.current['campfire'] || { x: 0, z: -0.8 };
      camAngleRef.current = { theta: 0, phi: Math.PI / 3.0, radius: 8 };
      camTargetRef.current.set(p.x, getTerrainHeight(p.x, p.z) + 0.8, p.z);
    }
    updateCameraPosition();
  };

  const CAMERA_PRESETS = [
    { id: 'overview', label: 'Visão Geral', shortLabel: 'Geral', icon: '🎯' },
    { id: 'camp', label: 'Centro & Fogueira', shortLabel: 'Centro', icon: '🛖' },
    { id: 'fields', label: 'Campos de Trigo', shortLabel: 'Trigo', icon: '🌾' },
    { id: 'forest', label: 'Floresta de Madeira', shortLabel: 'Floresta', icon: '🪵' },
    { id: 'quarry', label: 'Pedreira de Rocha', shortLabel: 'Pedreira', icon: '🪨' },
    { id: 'clay', label: 'Margem de Argila', shortLabel: 'Argila', icon: '🧱' },
    { id: 'builder', label: 'Canteiro de Obras', shortLabel: 'Obras', icon: '🔨' },
  ] as const;

  const selectedVillager = gameState.villagers.find((v) => v.id === selectedVillagerId);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#DCE7EB] cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D View Controls Toolbar (Organized and compact, positioned below top header) */}
      <div className="absolute top-[6.2rem] right-2 sm:right-3.5 z-20 flex items-center gap-1.5 pointer-events-auto">
        {/* Camera Preset Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => {
              audio.playWood();
              setIsCameraMenuOpen(!isCameraMenuOpen);
            }}
            className="px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-[#33261D] bg-[#FDFBF7]/95 backdrop-blur-xs hover:bg-[#EFE4CE] text-stone-800 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Selecionar ponto de vista da câmera 3D"
          >
            <span>🎥</span>
            <span className="text-[11px] font-bold">
              {CAMERA_PRESETS.find((p) => p.id === activeCameraPreset)?.shortLabel || 'Visão'}
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isCameraMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isCameraMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#FDFBF7] border-2 border-[#33261D] rounded-xl p-1 shadow-xl flex flex-col gap-0.5 z-30 animate-in fade-in slide-in-from-top-1">
              {CAMERA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    audio.playWood();
                    setActiveCameraPreset(p.id);
                    resetCamera(p.id as any);
                    setIsCameraMenuOpen(false);
                  }}
                  className={`w-full px-2 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors text-left cursor-pointer ${
                    activeCameraPreset === p.id
                      ? 'bg-amber-100 text-amber-950 font-black'
                      : 'text-stone-800 hover:bg-[#EFE4CE]'
                  }`}
                >
                  <span className="text-sm">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Follow Villager button */}
        {selectedVillagerId && (
          <button
            onClick={() => setFollowVillager(!followVillager)}
            className={`px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-[#33261D] flex items-center gap-1 shadow-md transition-all cursor-pointer ${
              followVillager
                ? 'bg-[#E5B84B] text-[#2C241E] ring-2 ring-stone-900 font-black'
                : 'bg-[#FDFBF7]/95 hover:bg-[#EFE4CE] text-stone-700'
            }`}
            title="Seguir o aldeão selecionado com a câmera"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Seguir</span>
          </button>
        )}

        {/* Move Facility Mode Toggle Button */}
        <button
          onClick={() => {
            const next = !isMoveMode;
            setIsMoveMode(next);
            if (next && !selectedFacilityId) {
              setSelectedFacilityId('wheat');
            }
            audio.playWood();
          }}
          className={`px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-[#33261D] flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
            isMoveMode
              ? 'bg-amber-400 text-stone-950 ring-2 ring-stone-900 font-extrabold shadow-sm'
              : 'bg-[#FDFBF7]/95 hover:bg-[#EFE4CE] text-stone-700'
          }`}
          title="Reorganizar instalações e edifícios da vila no terreno"
        >
          <Move size={13} />
          <span className="hidden sm:inline">{isMoveMode ? 'Mover Ativo' : 'Mover'}</span>
          <span className="sm:hidden">{isMoveMode ? 'Ativo' : 'Mover'}</span>
        </button>
      </div>

      {/* Move Facility Floating Toolbar */}
      {isMoveMode && (
        <div className="absolute top-[6.2rem] left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl bg-[#FDFBF7]/95 backdrop-blur-md border-3 border-[#33261D] rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-top-3 pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-200 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏗️</span>
              <div>
                <h3 className="font-hand font-extrabold text-sm sm:text-base text-stone-900 leading-tight">
                  Reorganizar Instalações da Vila
                </h3>
                <p className="text-[11px] text-amber-900 font-bold">
                  {selectedFacilityId
                    ? `Selecionado: ${DEFAULT_FACILITY_CONFIGS[selectedFacilityId]?.name || selectedFacilityId}. Clique no solo 3D para reposicionar.`
                    : 'Selecione uma instalação abaixo ou clique no cenário 3D.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={handleResetFacilityPositions}
                className="px-2 py-1 text-[11px] font-bold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Restaurar posições originais da aldeia"
              >
                <RotateCcw size={12} />
                <span>Padrão</span>
              </button>
              <button
                onClick={() => setIsMoveMode(false)}
                className="px-3 py-1 text-xs font-extrabold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} />
                <span>Concluir</span>
              </button>
            </div>
          </div>

          {/* Facility Chips Selection List */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {availableFacilities.map((fac) => {
              const isSelected = selectedFacilityId === fac.id;
              const currentPos = facilityPositions[fac.id];
              return (
                <button
                  key={fac.id}
                  onClick={() => {
                    setSelectedFacilityId(fac.id);
                    audio.playWood();
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 ring-2 ring-stone-900 shadow-xs font-extrabold scale-105'
                      : 'bg-stone-100 hover:bg-[#EFE4CE] text-stone-800 border border-stone-300/80'
                  }`}
                  title={`${fac.description}${currentPos ? ` (X: ${currentPos.x}, Z: ${currentPos.z})` : ''}`}
                >
                  <span>{fac.icon}</span>
                  <span>{fac.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between border-t border-stone-200/80 pt-1.5">
            <span className="italic">
              💡 Os aldeões atualizarão automaticamente suas rotas para o novo local!
            </span>
            {selectedFacilityId && facilityPositions[selectedFacilityId] && (
              <span className="font-mono text-[10px] text-stone-500 font-bold">
                X: {facilityPositions[selectedFacilityId].x} | Z: {facilityPositions[selectedFacilityId].z}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {moveToast && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-30 bg-[#2C241E]/95 backdrop-blur-xs text-[#FAF3E7] border border-amber-400/60 px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>✨</span>
          <span>{moveToast}</span>
        </div>
      )}

      {/* Selected Character 3D Inspector Card */}
      {selectedVillager && (() => {
        const selectedAgent = agentsRef.current.get(selectedVillager.id);
        const currentActivity = selectedAgent?.currentActivity || (selectedVillager.isWorking ? 'working' : 'idle');

        return (
        <div className="absolute top-[6.2rem] left-2.5 sm:left-4 z-20 bg-[#FDFBF7] border-3 border-[#33261D] rounded-2xl p-3 shadow-xl max-w-xs max-h-[calc(100%-7.5rem)] overflow-y-auto animate-in fade-in slide-in-from-top-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 border-b-2 border-stone-200 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-[#33261D] flex items-center justify-center relative shadow-xs"
                style={{ backgroundColor: selectedVillager.tunicColor }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white border border-[#33261D]"></div>
              </div>
              <div>
                <h4 className="font-hand font-extrabold text-base text-stone-900 leading-tight">
                  {selectedVillager.name}
                </h4>
                <p className="text-[11px] text-amber-900 font-bold">
                  Ofício: {selectedVillager.job.toUpperCase()}
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectVillager(null)}
              className="text-stone-400 hover:text-stone-700 font-bold text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Health & Alimentation Status */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700 flex items-center gap-1">
                ❤️ Vida:
              </span>
              <span className="font-mono font-bold text-stone-900">
                {selectedVillager.health ?? 100}/100
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (selectedVillager.health ?? 100) > 50
                    ? 'bg-emerald-500'
                    : (selectedVillager.health ?? 100) > 25
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${selectedVillager.health ?? 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-stone-600">Alimentação:</span>
              <span
                className={`font-bold ${
                  selectedVillager.isFed !== false ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {selectedVillager.isFed !== false ? '🍞 Saciado' : '⚠️ Com Fome (-20 HP/turno)'}
              </span>
            </div>

            {/* Current Autonomous Activity */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/80">
              <span className="text-stone-600">Ação Autônoma:</span>
              <span className="font-extrabold text-amber-900 flex items-center gap-1">
                {currentActivity === 'working' && '🔨 Trabalhando'}
                {currentActivity === 'eating' && '🥣 Fazendo refeição'}
                {currentActivity === 'sleeping' && (() => {
                  const hutLvl = Math.max(1, gameState.buildings.hut?.level || 1);
                  const cap = 2 + (hutLvl - 1) * 2;
                  const vIdx = Math.max(0, gameState.villagers.findIndex((v) => v.id === selectedVillager.id));
                  const hutNum = Math.floor(vIdx / cap) + 1;
                  const bedNum = (vIdx % cap) + 1;
                  return `😴 Dormindo na Cabana ${hutNum} (Leito ${bedNum}/${cap})`;
                })()}
                {currentActivity === 'socializing' && '💬 Conversando'}
                {currentActivity === 'wandering' && '🚶 Passeando'}
                {currentActivity === 'resting' && '🧘 Descansando'}
                {currentActivity === 'idle' && '🌿 Observando a vila'}
              </span>
            </div>

            {/* Current Daily Routine / Meal Status */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/80">
              <span className="text-stone-600">Período Solar:</span>
              <span className="font-extrabold text-amber-900 flex items-center gap-1">
                <span>{getCelestialTimeInfo(gameState.gameHour ?? 6.0).routineIcon}</span>
                <span>{getCelestialTimeInfo(gameState.gameHour ?? 6.0).routineTitle}</span>
              </span>
            </div>
          </div>

          {/* Horário Individual de Trabalho */}
          <div className="border-t border-stone-200/90 pt-2 mb-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-stone-800 flex items-center gap-1">
                ⏱️ Horário de trabalho
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  selectedVillager.job === 'idle'
                    ? 'bg-stone-100 text-stone-500 border border-stone-200'
                    : selectedVillager.isWorking
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {selectedVillager.job === 'idle'
                  ? '💤 Ocioso'
                  : selectedVillager.isWorking
                  ? '🔨 Em Expediente'
                  : '☕ Fora do Expediente'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#F8F5EE] p-2 rounded-xl border border-stone-300/80">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                  Início:
                </label>
                <input
                  type="time"
                  value={decimalToTimeString(selectedVillager.workStart ?? 7.0)}
                  onChange={(e) => {
                    const newStart = timeStringToDecimal(e.target.value);
                    onUpdateVillagerSchedule?.(
                      selectedVillager.id,
                      newStart,
                      selectedVillager.workEnd ?? 17.0
                    );
                  }}
                  className="w-full bg-white border-2 border-stone-300 hover:border-amber-500 focus:border-amber-600 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-900 focus:outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                  Fim:
                </label>
                <input
                  type="time"
                  value={decimalToTimeString(selectedVillager.workEnd ?? 17.0)}
                  onChange={(e) => {
                    const newEnd = timeStringToDecimal(e.target.value);
                    onUpdateVillagerSchedule?.(
                      selectedVillager.id,
                      selectedVillager.workStart ?? 7.0,
                      newEnd
                    );
                  }}
                  className="w-full bg-white border-2 border-stone-300 hover:border-amber-500 focus:border-amber-600 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-900 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <p className="text-[10px] text-stone-500 mt-1 leading-tight">
              {selectedVillager.workStart === selectedVillager.workEnd
                ? '⚠️ Início igual ao fim: sem expediente de trabalho.'
                : selectedVillager.workStart > selectedVillager.workEnd
                ? '🌙 Turno noturno ativo (passa pela madrugada).'
                : '☀️ Turno diurno ativo.'}
            </p>
          </div>

          <p className="text-xs text-stone-600 mb-2">
            Perk: <strong className="text-stone-800">{selectedVillager.trait.name}</strong> ({selectedVillager.trait.description})
          </p>

          <p className="text-[11px] text-stone-500 italic">
            💡 Dica: Clique no chão 3D para ordenar este aldeão a se mover para aquele ponto!
          </p>
        </div>
        );
      })()}

      {/* Controls helper hint in corner */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#FDFBF7]/85 backdrop-blur-xs border-2 border-[#33261D] px-3 py-1.5 rounded-xl text-[11px] font-medium text-stone-700 shadow-sm pointer-events-none flex items-center gap-2">
        <span>🖱️ Arraste para girar</span>
        <span>·</span>
        <span>📜 Zoom</span>
        <span>·</span>
        <span>🎯 Clique nos aldeões</span>
        <span>·</span>
        <span>🏗️ Mova instalações</span>
      </div>
    </div>
  );
};
