import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, JobType, Villager, Building } from '../types/game';
import { CharacterRig, createCharacterMesh, setupToolForJob } from './characterMesh';
import { getCelestialTimeInfo, DailyRoutine } from '../utils/timeCycle';
import {
  createBuilderSiteMesh,
  createCampfireMesh,
  createClayPitMesh,
  createElderDeskMesh,
  createGuardPostMesh,
  createRockQuarryMesh,
  createTreeMesh,
  createWheatPatchMesh,
} from './buildingMeshes';
import { syncSceneBuildings, BUILDING_FALLBACK_POSITIONS } from './SceneBuildings';
import { audio } from '../utils/audio';
import {
  getTerrainHeight,
  createBorderForestGroup,
  createUndergrowthVegetationGroup,
} from './environmentMeshes';
import {
  applyBuildingVegetationClearance,
  getBuildingClearanceRadius,
  ClearanceArea,
} from './VegetationClearance';
import { calculateHousingCapacity } from '../game/BuildingSystem';
import { BuildingInteractionPanel } from '../components/BuildingInteractionPanel';
import {
  Eye,
  ChevronDown,
} from 'lucide-react';
import { decimalToTimeString, timeStringToDecimal } from '../game/ScheduleSystem';
import { createFacilityNodes, DEFAULT_FACILITY_FALLBACKS } from '../simulation/FacilityRouting';
import {
  VillagerAgent,
  IdleActionType,
  VillagerRuntimeContext,
  assignAgentJobBehavior,
  updateVillagersAnimation,
} from '../simulation/VillagerRuntime';
import {
  CameraOrbitState,
  CameraPreset,
  CAMERA_PRESETS,
  updateCameraPosition,
  rotateCamera,
  panCamera,
  zoomCamera,
  zoomCameraByDelta,
  applyCameraPreset,
  updateFollowCamera,
} from './CameraController';
import {
  DEFAULT_FACILITY_CONFIGS,
  FACILITY_STORAGE_KEY,
  getDefaultFacilityPositions,
  clampFacilityPosition,
  findFacilityFromRaycast,
  findPlacementGroundHit,
  createFacilityMoveRing,
  updateMoveRingPosition,
} from './FacilityPlacement';
import {
  FacilityPlacementControls,
} from '../components/FacilityPlacementControls';
import {
  TimeOfDay,
  TIME_OF_DAY_INFO,
  resolveTimeOfDay,
  createSceneLighting,
  createNightStars,
  createNightMoon,
  updateLightingForTimeOfDay,
} from './LightingDayCycle';

export { DEFAULT_FACILITY_CONFIGS };
export type { VillagerAgent, IdleActionType, TimeOfDay };
export { TIME_OF_DAY_INFO };

function resolveBuildingKey(targetId: string, buildings: Record<string, Building>): string {
  if (targetId.startsWith('shelter_')) {
    return (buildings.stone_dwelling?.count || 0) > 0 ? 'stone_dwelling' : 'hut';
  }
  return targetId;
}

interface ThreeVillageSceneProps {
  gameState: GameState;
  selectedVillagerId: string | null;
  onSelectVillager: (villager: Villager | null) => void;
  onVillagerGathers?: (resource: 'food' | 'wood' | 'stone' | 'clay', amount: number) => void;
  onUpdateVillagerSchedule?: (villagerId: string, workStart: number, workEnd: number) => void;
  onDemolishBuilding?: (buildingId: string) => void;
}

export const ThreeVillageScene: React.FC<ThreeVillageSceneProps> = ({
  gameState,
  selectedVillagerId,
  onSelectVillager,
  onVillagerGathers,
  onUpdateVillagerSchedule,
  onDemolishBuilding,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Facility Placement State & Storage
  const [facilityPositions, setFacilityPositions] = useState<Record<string, { x: number; z: number }>>(() => {
    try {
      const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getDefaultFacilityPositions();
  });

  const facilityPositionsRef = useRef(facilityPositions);
  useEffect(() => {
    facilityPositionsRef.current = facilityPositions;
    try {
      localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(facilityPositions));
    } catch (e) {}
  }, [facilityPositions]);

  // Move Facility Mode & Direct Building Selection states
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>('wheat');
  const [moveToast, setMoveToast] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const facilityGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const moveRingRef = useRef<THREE.Mesh | null>(null);
  const undergrowthGroupRef = useRef<THREE.Group | null>(null);

  // Available facilities for reorganization based on default nodes + player buildings
  const availableFacilities = useMemo(() => {
    const list: Array<{ id: string; name: string; icon: string; description: string }> = [
      { id: 'village_hall', name: 'Sede da Vila', icon: '🏛️', description: DEFAULT_FACILITY_CONFIGS.village_hall.description },
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
    if ((buildings.cooking_pit?.count || 0) > 0) {
      list.push({ id: 'cooking_pit', name: 'Refeitório', icon: '🍲', description: DEFAULT_FACILITY_CONFIGS.cooking_pit?.description || 'Refeitório comunitário' });
    }
    if ((buildings.sawmill?.count || 0) > 0) {
      list.push({ id: 'sawmill', name: 'Serraria', icon: '🪓', description: DEFAULT_FACILITY_CONFIGS.sawmill?.description || 'Serraria de madeira' });
    }
    if ((buildings.stoneworks?.count || 0) > 0) {
      list.push({ id: 'stoneworks', name: 'Cantaria', icon: '🔨', description: DEFAULT_FACILITY_CONFIGS.stoneworks?.description || 'Oficina de pedreiro' });
    }
    if ((buildings.pottery_kiln?.count || 0) > 0) {
      list.push({ id: 'pottery_kiln', name: 'Olaria', icon: '🏺', description: DEFAULT_FACILITY_CONFIGS.pottery_kiln?.description || 'Forno de cerâmica' });
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
    const initial = getDefaultFacilityPositions();
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

  // Synchronize Move/Selection Ring indicator position with terrain height
  useEffect(() => {
    if (!moveRingRef.current) return;
    const activeTargetId = isMoveMode ? selectedFacilityId : selectedBuildingId;
    if (activeTargetId) {
      const p = facilityPositions[activeTargetId] || BUILDING_FALLBACK_POSITIONS[activeTargetId];
      if (p) {
        updateMoveRingPosition(moveRingRef.current, p.x, p.z, getTerrainHeight);
      }
    } else {
      moveRingRef.current.visible = false;
    }
  }, [isMoveMode, selectedFacilityId, selectedBuildingId, facilityPositions]);

  // Helper to obtain dynamic node position with terrain elevation
  const getNodePos = (key: string, fallback: { x: number; z: number }): THREE.Vector3 => {
    const p = facilityPositionsRef.current[key] || fallback;
    const y = getTerrainHeight(p.x, p.z);
    return new THREE.Vector3(p.x, y, p.z);
  };

  // Camera state refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const camAngleRef = useRef<CameraOrbitState>({ theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 14 });
  const camTargetRef = useRef(new THREE.Vector3(0, 0.8, 0));
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isRightClickRef = useRef(false);

  // Click-and-hold (long-press) state to unlock Move Mode directly on built structures
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTargetFacilityIdRef = useRef<string | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const getFacilityAtScreenPoint = (clientX: number, clientY: number): string | null => {
    if (!mountRef.current || !cameraRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    return findFacilityFromRaycast(raycaster, facilityGroupsRef.current);
  };

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

  const effectiveTimeOfDay: TimeOfDay = useMemo(
    () => resolveTimeOfDay(gameState.gameHour ?? 6.0, timeOfDayOverride),
    [gameState.gameHour, timeOfDayOverride]
  );

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
  const followVillagerRef = useRef(followVillager);
  useEffect(() => {
    followVillagerRef.current = followVillager;
  }, [followVillager]);

  // Camera presets menu state
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset>('overview');

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
  const RESOURCE_NODES = useMemo(() => {
    return createFacilityNodes(gameState, getNodePos);
  }, [
    facilityPositions,
    gameState.buildings.village_hall?.count,
    gameState.buildings.granary?.count,
    gameState.buildings.cooking_pit?.count,
    gameState.buildings.sawmill?.count,
    gameState.buildings.stoneworks?.count,
    gameState.buildings.pottery_kiln?.count,
  ]);

  const resourceNodesRef = useRef(RESOURCE_NODES);
  useEffect(() => {
    resourceNodesRef.current = RESOURCE_NODES;
  }, [RESOURCE_NODES]);

  const selectedVillagerIdRef = useRef(selectedVillagerId);
  useEffect(() => {
    selectedVillagerIdRef.current = selectedVillagerId;
  }, [selectedVillagerId]);

  const getRuntimeContext = (): VillagerRuntimeContext => ({
    gameState: gameStateRef.current,
    facilityNodes: resourceNodesRef.current,
    getTerrainHeight,
    getNodePos,
    audio,
    onVillagerGathers: onVillagerGathersRef.current,
    selectedVillagerId: selectedVillagerIdRef.current,
  });

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
    updateCameraPosition(camera, camTargetRef.current, camAngleRef.current);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Lights
    const { ambientLight, directionalLight: dirLight } = createSceneLighting();
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;
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
    const moveRing = createFacilityMoveRing();
    scene.add(moveRing);
    moveRingRef.current = moveRing;

    // Night Celestial Features: Stars dome and Glowing Moon
    const stars = createNightStars();
    scene.add(stars);
    starsPointsRef.current = stars;

    // Stylized glowing Moon in night sky
    const moon = createNightMoon();
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
      const campfireLight = (campfireGroupRef.current?.getObjectByName(
        'campfirePointLight'
      ) as THREE.PointLight | null) ?? null;

      updateLightingForTimeOfDay(
        effectiveTimeOfDayRef.current,
        {
          scene,
          ambientLight: ambientLightRef.current,
          directionalLight: dirLightRef.current,
          groundMaterial: groundMatRef.current,
          stars: starsPointsRef.current,
          moon: moonMeshRef.current,
          campfireLight,
          currentSkyColor: currentSkyColorRef.current,
          currentFogColor: currentFogColorRef.current,
          gameHour: gameStateRef.current.gameHour,
        },
        time
      );

      // Update 3D Villagers movement and animations (freezes simulation when paused)
      if (!gameStatePausedRef.current) {
        updateVillagersAnimation(agentsRef.current, delta, time, getRuntimeContext());
      }

      // Camera Follow logic if enabled (using refs to eliminate stale state)
      if (
        followVillagerRef.current &&
        selectedVillagerIdRef.current &&
        cameraRef.current
      ) {
        const agent = agentsRef.current.get(selectedVillagerIdRef.current);
        if (agent) {
          updateFollowCamera(camTargetRef.current, agent.pos);
          updateCameraPosition(
            cameraRef.current,
            camTargetRef.current,
            camAngleRef.current
          );
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

  // 2. Synchronize Buildings in 3D Scene
  useEffect(() => {
    if (!buildingsGroupRef.current) return;
    syncSceneBuildings({
      buildingsGroup: buildingsGroupRef.current,
      facilityGroups: facilityGroupsRef.current,
      gameState,
      facilityPositions,
      getTerrainHeight,
    });
  }, [gameState.buildings, gameState.zigguratStagesCompleted, facilityPositions]);

  // 2.1 Visually clear undergrowth vegetation beneath all active buildings and facilities
  useEffect(() => {
    if (!undergrowthGroupRef.current) return;

    const clearanceAreas: ClearanceArea[] = [];

    // Permanent facilities
    const facilityKeys = [
      'village_hall',
      'campfire',
      'wheat',
      'wood',
      'stone',
      'clay',
      'buildersite',
      'elderDesk',
      'guardPost',
    ];

    facilityKeys.forEach((key) => {
      const p = facilityPositions[key] || BUILDING_FALLBACK_POSITIONS[key] || DEFAULT_FACILITY_FALLBACKS[key];
      if (p) {
        clearanceAreas.push({
          x: p.x,
          z: p.z,
          radius: getBuildingClearanceRadius(key),
        });
      }
    });

    // Built shelters / huts
    const { buildings, zigguratStagesCompleted } = gameState;
    const hutsCount = Math.max(1, buildings.hut?.count || 1);
    const stoneDwellings = buildings.stone_dwelling?.count || 0;

    if (hutsCount >= 1 || stoneDwellings >= 1) {
      const p = facilityPositions['shelter_1'] || BUILDING_FALLBACK_POSITIONS['shelter_1'];
      if (p) clearanceAreas.push({ x: p.x, z: p.z, radius: getBuildingClearanceRadius('shelter_1') });
    }
    if (hutsCount >= 2 || stoneDwellings >= 2) {
      const p = facilityPositions['shelter_2'] || BUILDING_FALLBACK_POSITIONS['shelter_2'];
      if (p) clearanceAreas.push({ x: p.x, z: p.z, radius: getBuildingClearanceRadius('shelter_2') });
    }
    if (hutsCount >= 3 || stoneDwellings >= 3) {
      const p = facilityPositions['shelter_3'] || BUILDING_FALLBACK_POSITIONS['shelter_3'];
      if (p) clearanceAreas.push({ x: p.x, z: p.z, radius: getBuildingClearanceRadius('shelter_3') });
    }
    if (hutsCount >= 4) {
      const p = facilityPositions['shelter_4'] || BUILDING_FALLBACK_POSITIONS['shelter_4'];
      if (p) clearanceAreas.push({ x: p.x, z: p.z, radius: getBuildingClearanceRadius('shelter_4') });
    }

    const otherBuildings = [
      'granary',
      'village_well',
      'cooking_pit',
      'sawmill',
      'stoneworks',
      'pottery_kiln',
      'longhouse',
    ];
    otherBuildings.forEach((bId) => {
      if ((buildings[bId]?.count || 0) > 0) {
        const p = facilityPositions[bId] || BUILDING_FALLBACK_POSITIONS[bId];
        if (p) {
          clearanceAreas.push({
            x: p.x,
            z: p.z,
            radius: getBuildingClearanceRadius(bId),
          });
        }
      }
    });

    if ((buildings.ziggurat?.count || 0) > 0 || zigguratStagesCompleted > 0) {
      const p = facilityPositions['ziggurat'] || BUILDING_FALLBACK_POSITIONS['ziggurat'];
      if (p) {
        clearanceAreas.push({
          x: p.x,
          z: p.z,
          radius: getBuildingClearanceRadius('ziggurat'),
        });
      }
    }

    applyBuildingVegetationClearance(undergrowthGroupRef.current, clearanceAreas);
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
        assignAgentJobBehavior(agent, villager.job, getRuntimeContext(), currentAgents, false);
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
          assignAgentJobBehavior(agent, villager.job, getRuntimeContext(), currentAgents, false);
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
          assignAgentJobBehavior(agent, agent.villager.job, getRuntimeContext(), agentsRef.current);
        }
      });
    }
  }, [currentRoutine]);

  // Synchronize villager pathing whenever facilities are moved
  useEffect(() => {
    agentsRef.current.forEach((agent) => {
      assignAgentJobBehavior(agent, agent.villager.job, getRuntimeContext(), agentsRef.current, false);
    });
  }, [facilityPositions]);

  // 5. Mouse / Touch Orbit Controls & Raycasting Selection
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isRightClickRef.current = e.button === 2;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressTriggeredRef.current = false;

    // Left click on a facility initiates click-and-hold (long-press) to unlock move mode
    if (e.button === 0 && !isMoveMode) {
      const facilityId = getFacilityAtScreenPoint(e.clientX, e.clientY);
      if (facilityId) {
        longPressTargetFacilityIdRef.current = facilityId;
        longPressStartPosRef.current = { x: e.clientX, y: e.clientY };

        longPressTimerRef.current = window.setTimeout(() => {
          const targetId = longPressTargetFacilityIdRef.current;
          if (targetId && !hasDraggedRef.current) {
            isLongPressTriggeredRef.current = true;
            isDraggingRef.current = false;
            audio.playStone();
            setIsMoveMode(true);
            setSelectedFacilityId(targetId);
            setSelectedBuildingId(null);
            onSelectVillager(null);
            const cfg = DEFAULT_FACILITY_CONFIGS[targetId];
            setMoveToast(`🏗️ Modo Mover liberado: ${cfg?.name || targetId}! Clique no solo para reposicionar.`);
          }
        }, 400);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (longPressStartPosRef.current && longPressTimerRef.current) {
      const dist = Math.hypot(
        e.clientX - longPressStartPosRef.current.x,
        e.clientY - longPressStartPosRef.current.y
      );
      if (dist > 6) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressTargetFacilityIdRef.current = null;
      }
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (isRightClickRef.current) {
      panCamera(camTargetRef.current, camAngleRef.current, dx, dy);
    } else {
      rotateCamera(camAngleRef.current, dx, dy);
    }
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, camTargetRef.current, camAngleRef.current);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTargetFacilityIdRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomCamera(camAngleRef.current, e.deltaY);
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, camTargetRef.current, camAngleRef.current);
    }
  };

  // Touch Support (Single touch rotate / hold to move, pinch zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressTriggeredRef.current = false;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };

      if (!isMoveMode) {
        const facilityId = getFacilityAtScreenPoint(touch.clientX, touch.clientY);
        if (facilityId) {
          longPressTargetFacilityIdRef.current = facilityId;
          longPressStartPosRef.current = { x: touch.clientX, y: touch.clientY };

          longPressTimerRef.current = window.setTimeout(() => {
            const targetId = longPressTargetFacilityIdRef.current;
            if (targetId && !hasDraggedRef.current) {
              isLongPressTriggeredRef.current = true;
              isDraggingRef.current = false;
              audio.playStone();
              setIsMoveMode(true);
              setSelectedFacilityId(targetId);
              setSelectedBuildingId(null);
              onSelectVillager(null);
              const cfg = DEFAULT_FACILITY_CONFIGS[targetId];
              setMoveToast(`🏗️ Modo Mover liberado: ${cfg?.name || targetId}! Toque no solo para reposicionar.`);
            }
          }, 400);
        }
      }
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressTargetFacilityIdRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (longPressStartPosRef.current && longPressTimerRef.current) {
        const dist = Math.hypot(
          touch.clientX - longPressStartPosRef.current.x,
          touch.clientY - longPressStartPosRef.current.y
        );
        if (dist > 6) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          longPressTargetFacilityIdRef.current = null;
        }
      }

      if (isDraggingRef.current) {
        const dx = touch.clientX - dragStartRef.current.x;
        const dy = touch.clientY - dragStartRef.current.y;
        if (Math.hypot(dx, dy) > 4) {
          hasDraggedRef.current = true;
        }
        dragStartRef.current = { x: touch.clientX, y: touch.clientY };

        rotateCamera(camAngleRef.current, dx, dy);
        if (cameraRef.current) {
          updateCameraPosition(cameraRef.current, camTargetRef.current, camAngleRef.current);
        }
      }
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const pinchDelta = touchStartDistRef.current - currentDist;
      touchStartDistRef.current = currentDist;

      zoomCameraByDelta(camAngleRef.current, pinchDelta * 0.05);
      if (cameraRef.current) {
        updateCameraPosition(cameraRef.current, camTargetRef.current, camAngleRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTargetFacilityIdRef.current = null;
  };

  // Click on 3D objects (Raycasting)
  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
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
      const clickedFacilityId = findFacilityFromRaycast(raycaster, facilityGroupsRef.current);
      if (clickedFacilityId) {
        setSelectedFacilityId(clickedFacilityId);
        audio.playWood();
        const cfg = DEFAULT_FACILITY_CONFIGS[clickedFacilityId];
        setMoveToast(`Selecionado: ${cfg?.name || clickedFacilityId}. Clique no solo para reposicionar.`);
        return;
      }

      // 2. If a facility is already selected, clicking on the ground moves it!
      if (selectedFacilityId) {
        const groundHit = findPlacementGroundHit(raycaster, sceneRef.current);
        if (groundHit) {
          const { x: newX, z: newZ } = clampFacilityPosition(groundHit.point.x, groundHit.point.z);

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
          setSelectedBuildingId(null);
          onSelectVillager(clickedVillager);
          return;
        }
      }
    }

    // 2. Direct click on buildings or village facilities
    const clickedFacilityId = findFacilityFromRaycast(raycaster, facilityGroupsRef.current);
    if (clickedFacilityId) {
      audio.playWood();
      onSelectVillager(null);
      setSelectedBuildingId(clickedFacilityId);
      return;
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
    } else if (selectedBuildingId) {
      // Deselect building when clicking empty ground
      setSelectedBuildingId(null);
    }
  };

  // Camera presets focused on task areas (tracking dynamic facility coordinates)
  const resetCamera = (preset: CameraPreset) => {
    applyCameraPreset(
      preset,
      camAngleRef.current,
      camTargetRef.current,
      facilityPositionsRef.current,
      getTerrainHeight
    );
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, camTargetRef.current, camAngleRef.current);
    }
  };

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
                    resetCamera(p.id);
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
      </div>

      {/* Move Facility Floating Toolbar & Toast */}
      <FacilityPlacementControls
        isMoveMode={isMoveMode}
        onCloseMoveMode={() => setIsMoveMode(false)}
        selectedFacilityId={selectedFacilityId}
        onSelectFacility={(id) => {
          setSelectedFacilityId(id);
          audio.playWood();
        }}
        availableFacilities={availableFacilities}
        facilityPositions={facilityPositions}
        facilityConfigs={DEFAULT_FACILITY_CONFIGS}
        moveToast={moveToast}
        onResetPositions={handleResetFacilityPositions}
      />

      {/* Selected Building / Facility Interaction Panel */}
      {selectedBuildingId && !isMoveMode && (() => {
        const buildingKey = resolveBuildingKey(selectedBuildingId, gameState.buildings);
        const building = gameState.buildings[buildingKey] || null;
        const cfg = DEFAULT_FACILITY_CONFIGS[selectedBuildingId] || {
          name: building?.name || selectedBuildingId,
          icon: '🏛️',
          description: building?.description || 'Instalação da aldeia',
        };

        const isPermanent =
          selectedBuildingId === 'village_hall' ||
          selectedBuildingId === 'ziggurat' ||
          [
            'campfire',
            'wheat',
            'wood',
            'stone',
            'clay',
            'buildersite',
            'elderDesk',
            'guardPost',
          ].includes(selectedBuildingId);

        let canDemolish = false;
        let demolishReason: string | undefined;

        if (selectedBuildingId === 'village_hall') {
          demolishReason = 'A Sede da Vila é o centro administrativo permanente.';
        } else if (selectedBuildingId === 'ziggurat') {
          demolishReason = 'Monumentos ancestrais não podem ser demolidos.';
        } else if (isPermanent) {
          demolishReason = 'Instalações permanentes da aldeia não podem ser demolidas.';
        } else if (!building || building.count <= 0) {
          demolishReason = 'Construção ainda não erguida.';
        } else if (building.constructionTurnsLeft > 0) {
          demolishReason = 'Construção em andamento.';
        } else if (building.category === 'housing') {
          const testBuildings = {
            ...gameState.buildings,
            [buildingKey]: {
              ...building,
              count: building.count - 1,
            },
          };
          const resultingCap = calculateHousingCapacity(testBuildings, gameState.villageLevel ?? 1);
          if (resultingCap < gameState.villagers.length) {
            demolishReason = `Não há moradias suficientes (${resultingCap} vagas para ${gameState.villagers.length} aldeões).`;
          } else {
            canDemolish = true;
          }
        } else {
          canDemolish = true;
        }

        return (
          <BuildingInteractionPanel
            buildingId={selectedBuildingId}
            building={building}
            facilityName={cfg.name}
            facilityIcon={cfg.icon}
            facilityDescription={cfg.description}
            canDemolish={canDemolish}
            demolishReason={demolishReason}
            onDemolish={() => {
              onDemolishBuilding?.(buildingKey);
              setSelectedBuildingId(null);
            }}
            onClose={() => setSelectedBuildingId(null)}
          />
        );
      })()}

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
        <span>🏗️ Segure para mover</span>
      </div>
    </div>
  );
};
