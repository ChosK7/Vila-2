import * as THREE from 'three';
import { GameState, JobType, Villager } from '../types/game';
import { CharacterRig, setupToolForJob } from '../three/characterMesh';
import { chooseVillagerDecision, VillagerActivity } from '../game/VillagerAI';
import { FacilityNodes } from './FacilityRouting';
import { getWorkerDeliveryAmount } from '../game/ResourceSystem';

export type IdleActionType =
  | 'sway'
  | 'look_around'
  | 'sit'
  | 'warm_hands'
  | 'scratch_head';

export interface VillagerAgent {
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

export interface VillagerAudioController {
  playHarvest: () => void;
  playWood: () => void;
  playStone: () => void;
  [key: string]: any;
}

export interface VillagerRuntimeContext {
  gameState: GameState;
  facilityNodes: FacilityNodes;
  getTerrainHeight: (x: number, z: number) => number;
  getNodePos: (key: string, fallback: { x: number; z: number }) => THREE.Vector3;
  audio: VillagerAudioController;
  onVillagerGathers?: (resource: 'food' | 'wood' | 'stone' | 'clay', amount: number) => void;
  selectedVillagerId?: string | null;
}

/**
 * Helper para ocultar todos os fardos/materiais carregados pelo aldeão
 */
export function hideAllCarriedMeshes(rig: CharacterRig): void {
  rig.wheatCarry.visible = false;
  rig.woodCarry.visible = false;
  rig.stoneCarry.visible = false;
  rig.clayCarry.visible = false;
}

/**
 * Atribui o comportamento e metas de deslocamento do aldeão com base na IA e na rotina diária
 */
export function assignAgentJobBehavior(
  agent: VillagerAgent,
  job: JobType,
  context: VillagerRuntimeContext,
  agents: Map<string, VillagerAgent>,
  forceWork: boolean = false
): void {
  const { gameState, facilityNodes, getNodePos, getTerrainHeight } = context;

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
      agent.target = facilityNodes.wheat.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2)
      );
    } else if (job === 'lumberjack') {
      agent.target = facilityNodes.wood.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2)
      );
    } else if (job === 'quarryman') {
      agent.target = facilityNodes.stone.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8)
      );
    } else if (job === 'potter') {
      agent.target = facilityNodes.clay.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8)
      );
    } else if (job === 'builder') {
      agent.target = facilityNodes.buildersite.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)
      );
    } else if (job === 'guard') {
      const side = Math.random() > 0.5 ? 1 : -1;
      agent.target = new THREE.Vector3(5.2 * side, 0, 5.0 + (Math.random() - 0.5) * 1.5);
    } else if (job === 'elder') {
      agent.target = facilityNodes.elderDesk.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)
      );
    } else {
      agent.target = facilityNodes.campfire.clone();
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
    const agentKeys = Array.from(agents.keys());
    const idx = agentKeys.indexOf(agent.villager.id);
    const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
    const radius = 1.45 + Math.sin(angle * 4) * 0.25;
    agent.target = facilityNodes.campfire.clone().add(
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
    const partner = agents.get(decision.targetVillagerId);
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
    const agentKeys = Array.from(agents.keys());
    const idx = agentKeys.indexOf(agent.villager.id);
    const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
    const radius = 1.9 + (idx % 3) * 0.45;
    agent.target = facilityNodes.campfire.clone().add(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    );
    agent.state = 'resting';
    agent.idleAction = Math.random() > 0.5 ? 'sit' : 'warm_hands';
    return;
  }

  // 7. IDLE (idle): observação calma na vila
  const agentKeys = Array.from(agents.keys());
  const idx = agentKeys.indexOf(agent.villager.id);
  const angle = (idx / Math.max(1, agentKeys.length)) * Math.PI * 2;
  const radius = 2.2 + (idx % 3) * 0.4;
  agent.target = facilityNodes.campfire.clone().add(
    new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  );
  agent.state = 'idle';
}

/**
 * Loop de animação e atualização visual dos aldeões no mundo 3D
 */
export function updateVillagersAnimation(
  agents: Map<string, VillagerAgent>,
  delta: number,
  time: number,
  context: VillagerRuntimeContext
): void {
  const {
    gameState,
    facilityNodes,
    getTerrainHeight,
    audio,
    onVillagerGathers,
    selectedVillagerId,
  } = context;

  agents.forEach((agent) => {
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
          assignAgentJobBehavior(agent, agent.villager.job, context, agents, false);
          return;
        }
      }

      // Working behaviors
      if (agent.state === 'working') {
        // Se o expediente encerrou, interrompe a animação de trabalho e retorna à vila
        if (!agent.villager.isWorking) {
          assignAgentJobBehavior(agent, agent.villager.job, context, agents, false);
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
            agent.target = facilityNodes.foodStorage.clone();
            agent.state = 'carrying_to_storage';
            audio.playHarvest();
          } else if (agent.villager.job === 'lumberjack') {
            agent.rig.woodCarry.visible = true;
            agent.target = facilityNodes.materialStorage.clone();
            agent.state = 'carrying_to_storage';
            audio.playWood();
          } else if (agent.villager.job === 'quarryman') {
            agent.rig.stoneCarry.visible = true;
            agent.target = facilityNodes.materialStorage.clone();
            agent.state = 'carrying_to_storage';
            audio.playStone();
          } else if (agent.villager.job === 'potter') {
            agent.rig.clayCarry.visible = true;
            agent.target = facilityNodes.materialStorage.clone();
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
          onVillagerGathers?.('food', amount);
          audio.playHarvest();
        } else if (agent.villager.job === 'lumberjack') {
          const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'wood');
          onVillagerGathers?.('wood', amount);
          audio.playWood();
        } else if (agent.villager.job === 'quarryman') {
          const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'stone');
          onVillagerGathers?.('stone', amount);
          audio.playStone();
        } else if (agent.villager.job === 'potter') {
          const amount = getWorkerDeliveryAmount(agent.villager, gameState, 'clay');
          onVillagerGathers?.('clay', amount);
          audio.playWood();
        }

        // Return to assigned resource area (ou rotina fora de expediente se o turno terminou durante o trajeto)
        assignAgentJobBehavior(agent, agent.villager.job, context, agents, false);
      } else if (agent.state === 'walking_to_resource') {
        // Se o expediente encerrou no trajeto, retorna à vila
        if (!agent.villager.isWorking) {
          assignAgentJobBehavior(agent, agent.villager.job, context, agents, false);
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
          const partner = agents.get(agent.socialPartnerId);
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

          const distToFire = pos.distanceTo(facilityNodes.campfire);
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
}
