import * as THREE from 'three';

// Materials (Anime / Cel-shaded aesthetic)
const woodMat = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.7 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x562708, roughness: 0.75 });
const thatchMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 }); // vibrant anime golden thatch
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8b2d1, roughness: 0.65 }); // clean anime stone
const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x717c96, roughness: 0.7 });
const adobeMat = new THREE.MeshStandardMaterial({ color: 0xdfad7b, roughness: 0.75 });
const mudbrickMat = new THREE.MeshStandardMaterial({ color: 0xc26d1a, roughness: 0.75 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5, roughness: 0.25 });

export function createCampfireMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'campfire';

  // Ring of Stones
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stoneGeo = new THREE.DodecahedronGeometry(0.12);
    const stone = new THREE.Mesh(stoneGeo, darkStoneMat);
    stone.position.set(Math.cos(angle) * 0.45, 0.08, Math.sin(angle) * 0.45);
    stone.castShadow = true;
    group.add(stone);
  }

  // Cross Logs
  for (let i = 0; i < 4; i++) {
    const logGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
    const log = new THREE.Mesh(logGeo, darkWoodMat);
    log.rotation.x = Math.PI / 2;
    log.rotation.z = (i / 4) * Math.PI;
    log.position.y = 0.06;
    group.add(log);
  }

  // Fire Flame
  const flameGeo = new THREE.ConeGeometry(0.18, 0.4, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 0.25;
  flame.name = 'flame';
  group.add(flame);

  // Inner Yellow flame
  const innerFlameGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
  const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
  innerFlame.position.y = 0.2;
  innerFlame.name = 'innerFlame';
  group.add(innerFlame);

  // Point light for glowing night/evening
  const light = new THREE.PointLight(0xf59e0b, 1.2, 12);
  light.position.y = 0.45;
  light.name = 'campfirePointLight';
  group.add(light);

  return group;
}

export function createHutMesh(level: number = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hut';

  // Mudbrick circular base
  const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, 1.2, 12);
  const base = new THREE.Mesh(baseGeo, adobeMat);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Conical Thatch Roof
  const roofGeo = new THREE.ConeGeometry(1.7, 1.3, 12);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.y = 1.85;
  roof.castShadow = true;
  group.add(roof);

  // Doorway
  const doorGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x1f1b18 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.45, 1.2);
  group.add(door);

  // Detalhes visuais de Nível 2+ (Estrutura reforçada de vigas e toldo frontal)
  if (level >= 2) {
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.35, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    [-1.25, 1.25].forEach((px) => {
      [-1.25, 1.25].forEach((pz) => {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0.68, pz);
        post.castShadow = true;
        group.add(post);
      });
    });

    const awningGeo = new THREE.BoxGeometry(0.85, 0.07, 0.55);
    const awning = new THREE.Mesh(awningGeo, thatchMat);
    awning.position.set(0, 0.95, 1.35);
    awning.rotation.x = 0.22;
    awning.castShadow = true;
    group.add(awning);
  }

  // Detalhes visuais de Nível 3+ (Finial totem no ápice e tocha lateral)
  if (level >= 3) {
    const finialGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.65, 6);
    const finialMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const finial = new THREE.Mesh(finialGeo, finialMat);
    finial.position.set(0, 2.75, 0);
    finial.castShadow = true;
    group.add(finial);

    const torchGeo = new THREE.BoxGeometry(0.15, 0.22, 0.15);
    const torchMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const torch = new THREE.Mesh(torchGeo, torchMat);
    torch.position.set(0.45, 0.85, 1.35);
    group.add(torch);
  }

  return group;
}

export function createStoneDwellingMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stone_dwelling';

  // Dry-stone circular base with stone blocks feel
  const wallGeo = new THREE.CylinderGeometry(1.5, 1.6, 1.4, 16);
  const wall = new THREE.Mesh(wallGeo, stoneMat);
  wall.position.y = 0.7;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Thatched roof with overhanging rim
  const roofGeo = new THREE.ConeGeometry(2.0, 1.4, 16);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.y = 2.1;
  roof.castShadow = true;
  group.add(roof);

  // Wooden lintel door
  const doorGeo = new THREE.BoxGeometry(0.6, 1.0, 0.2);
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x181512 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.55, 1.55);
  group.add(door);

  // Small stone mortar slab outside
  const slabGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.15, 8);
  const slab = new THREE.Mesh(slabGeo, darkStoneMat);
  slab.position.set(1.4, 0.08, 0.8);
  group.add(slab);

  return group;
}

export function createGranaryMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'granary';

  // 4 Wooden Stilts
  const stiltPositions = [
    [-0.8, -0.8],
    [0.8, -0.8],
    [-0.8, 0.8],
    [0.8, 0.8],
  ];
  stiltPositions.forEach(([x, z]) => {
    const stiltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const stilt = new THREE.Mesh(stiltGeo, darkWoodMat);
    stilt.position.set(x, 0.4, z);
    stilt.castShadow = true;
    group.add(stilt);
  });

  // Elevated Cabin Box
  const boxGeo = new THREE.BoxGeometry(2.0, 1.3, 2.0);
  const box = new THREE.Mesh(boxGeo, mudbrickMat);
  box.position.y = 1.45;
  box.castShadow = true;
  group.add(box);

  // Pitched Roof
  const roofGeo = new THREE.ConeGeometry(1.8, 1.0, 4);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.y = 2.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Stacks of grain sacks/crates on side
  const sackGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 });
  for (let i = 0; i < 3; i++) {
    const sack = new THREE.Mesh(sackGeo, sackMat);
    sack.position.set(1.2 + i * 0.2, 0.2, 0.5);
    sack.scale.set(1, 0.7, 1);
    group.add(sack);
  }

  return group;
}

export function createWellMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'village_well';

  // Circular Stone Basin
  const basinGeo = new THREE.CylinderGeometry(0.9, 0.95, 0.8, 16);
  const basin = new THREE.Mesh(basinGeo, stoneMat);
  basin.position.y = 0.4;
  basin.castShadow = true;
  group.add(basin);

  // Water Disc
  const waterGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.05, 16);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.1, metalness: 0.6 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.65;
  group.add(water);

  // Wooden Posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
  const leftPost = new THREE.Mesh(postGeo, darkWoodMat);
  leftPost.position.set(-0.8, 1.0, 0);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, darkWoodMat);
  rightPost.position.set(0.8, 1.0, 0);
  group.add(rightPost);

  // Crossbeam & Roof
  const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
  const beam = new THREE.Mesh(beamGeo, darkWoodMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, 1.8, 0);
  group.add(beam);

  // Little Thatched Canopy
  const canopyGeo = new THREE.ConeGeometry(1.2, 0.5, 4);
  const canopy = new THREE.Mesh(canopyGeo, thatchMat);
  canopy.position.set(0, 2.05, 0);
  canopy.rotation.y = Math.PI / 4;
  group.add(canopy);

  return group;
}

export function createLonghouseMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'longhouse';

  // Wooden Long Hall
  const hallGeo = new THREE.BoxGeometry(4.5, 1.6, 2.4);
  const hall = new THREE.Mesh(hallGeo, woodMat);
  hall.position.y = 0.8;
  hall.castShadow = true;
  group.add(hall);

  // Crossed Timbers Roof
  const roofGeo = new THREE.CylinderGeometry(0.1, 1.8, 4.8, 3);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI;
  roof.position.y = 2.1;
  roof.castShadow = true;
  group.add(roof);

  // Crossed Gables
  const gableGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
  const gable1 = new THREE.Mesh(gableGeo, darkWoodMat);
  gable1.position.set(-2.2, 2.7, 0);
  gable1.rotation.z = 0.4;
  group.add(gable1);

  const gable2 = new THREE.Mesh(gableGeo, darkWoodMat);
  gable2.position.set(-2.2, 2.7, 0);
  gable2.rotation.z = -0.4;
  group.add(gable2);

  return group;
}

export function createZigguratMesh(tierCount: number = 4): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ziggurat';

  const tierDimensions = [
    { w: 9.0, h: 1.5, d: 9.0 },
    { w: 6.8, h: 1.3, d: 6.8 },
    { w: 4.8, h: 1.1, d: 4.8 },
    { w: 3.0, h: 0.9, d: 3.0 },
  ];

  let currentY = 0;
  for (let i = 0; i < Math.min(tierCount, 4); i++) {
    const dim = tierDimensions[i];
    const tierGeo = new THREE.BoxGeometry(dim.w, dim.h, dim.d);
    const tierMesh = new THREE.Mesh(tierGeo, adobeMat);
    tierMesh.position.y = currentY + dim.h / 2;
    tierMesh.castShadow = true;
    tierMesh.receiveShadow = true;
    group.add(tierMesh);

    currentY += dim.h;
  }

  // Golden Shrine on Top
  if (tierCount >= 4) {
    const shrineGeo = new THREE.BoxGeometry(1.6, 1.2, 1.6);
    const shrine = new THREE.Mesh(shrineGeo, goldMat);
    shrine.position.y = currentY + 0.6;
    shrine.castShadow = true;
    group.add(shrine);
  }

  // Grand Front Staircase
  const rampGeo = new THREE.BoxGeometry(1.4, currentY, 3.5);
  const ramp = new THREE.Mesh(rampGeo, darkStoneMat);
  ramp.position.set(0, currentY / 2, 4.5);
  ramp.rotation.x = -0.3;
  ramp.castShadow = true;
  group.add(ramp);

  return group;
}

export function createTreeMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tree';

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 8);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage (Stylized clustered spheres)
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 });
  const mainFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9), foliageMat);
  mainFoliage.position.y = 1.8;
  mainFoliage.castShadow = true;
  group.add(mainFoliage);

  const subFoliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), foliageMat);
  subFoliage1.position.set(0.4, 2.2, 0.2);
  group.add(subFoliage1);

  const subFoliage2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), foliageMat);
  subFoliage2.position.set(-0.35, 2.0, -0.3);
  group.add(subFoliage2);

  return group;
}

// Fazenda Viva e Diversificada inspirada na imagem (Couves, Trigo Verdejante, Cenouras e Pomar Frutífero)
export function createWheatPatchMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'wheat_patch';

  // Base Grass Foundation & Pathways
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x72c244, roughness: 0.85 }); // Vibrant anime grass lawn
  const soilBedMat = new THREE.MeshStandardMaterial({ color: 0x542b10, roughness: 0.95 }); // Rich dark cultivated soil
  const cabbageLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 }); // Lush cabbage green
  const cabbageHeadMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 }); // Light creamy cauliflower head
  const carrotOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 }); // Juicy carrot crown
  const carrotLeafMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7 }); // Feathery carrot top
  const wheatGreenMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.6 }); // Vibrant cereal green
  const wheatGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }); // Sun-kissed golden tip
  const fruitRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.1 }); // Glossy red pomegranates/apples
  const orchardFoliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 }); // Dense orchard foliage
  const orchardWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b3f1f, roughness: 0.8 }); // Organic tree trunk wood
  const flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 }); // Bright yellow corn tassels

  // Base grass plot beneath farm
  const baseLawn = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.08, 6.6), lawnMat);
  baseLawn.position.y = 0.04;
  baseLawn.receiveShadow = true;
  group.add(baseLawn);

  // ==============================================================
  // 1. CANTEIRO DE COUVES E REPOLHOS / COUVE-FLOR (Plot Superior-Esquerdo)
  // ==============================================================
  const cabbageBed = new THREE.Group();
  cabbageBed.position.set(-1.6, 0.08, -1.6);

  // Raised dark furrow soil bed
  const cabbageSoil = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 2.3), soilBedMat);
  cabbageSoil.position.y = 0.06;
  cabbageSoil.receiveShadow = true;
  cabbageSoil.castShadow = true;
  cabbageBed.add(cabbageSoil);

  // Furrows ridges
  for (let rz = -0.75; rz <= 0.75; rz += 0.5) {
    const furrow = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.5, 6), soilBedMat);
    furrow.rotation.z = Math.PI / 2;
    furrow.position.set(0, 0.13, rz);
    cabbageBed.add(furrow);
  }

  // 4x3 Grid of leafy Cabbages with creamy centers
  for (let cx = -0.95; cx <= 0.95; cx += 0.63) {
    for (let cz = -0.75; cz <= 0.75; cz += 0.5) {
      const cabbageHead = new THREE.Group();
      cabbageHead.position.set(cx + (Math.sin(cx * 5 + cz) * 0.04), 0.15, cz);

      // Creamy cauliflower / cabbage center core
      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), cabbageHeadMat);
      core.position.y = 0.08;
      core.castShadow = true;
      cabbageHead.add(core);

      // Curled outer green leaves surrounding the head
      for (let l = 0; l < 5; l++) {
        const leafAngle = (l / 5) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), cabbageLeafMat);
        leaf.scale.set(1.1, 0.35, 0.75);
        leaf.position.set(Math.cos(leafAngle) * 0.12, 0.05, Math.sin(leafAngle) * 0.12);
        leaf.rotation.y = leafAngle;
        leaf.rotation.z = 0.35;
        leaf.castShadow = true;
        cabbageHead.add(leaf);
      }

      cabbageBed.add(cabbageHead);
    }
  }
  group.add(cabbageBed);

  // ==============================================================
  // 2. CANTEIRO DE TRIGO E CEREAIS VERDEJANTES (Plot Central-Esquerdo)
  // ==============================================================
  const wheatBed = new THREE.Group();
  wheatBed.position.set(-1.6, 0.08, 0.95);

  const wheatSoil = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.8), soilBedMat);
  wheatSoil.position.y = 0.06;
  wheatSoil.receiveShadow = true;
  wheatSoil.castShadow = true;
  wheatBed.add(wheatSoil);

  // Raised furrow ridges
  for (let wz = -0.55; wz <= 0.55; wz += 0.55) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.5, 6), soilBedMat);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, 0.12, wz);
    wheatBed.add(ridge);
  }

  // Rows of lush green wheat stalks with golden tips
  const stalkGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.85, 4);
  const earGeo = new THREE.ConeGeometry(0.075, 0.35, 5);

  for (let wx = -1.1; wx <= 1.1; wx += 0.32) {
    for (let wz = -0.65; wz <= 0.65; wz += 0.32) {
      const seed = Math.sin(wx * 11 + wz * 7);
      const isGolden = seed > 0.3;
      const currentMat = isGolden ? wheatGoldMat : wheatGreenMat;

      const stalk = new THREE.Mesh(stalkGeo, wheatGreenMat);
      stalk.position.set(wx, 0.48, wz);
      stalk.rotation.z = seed * 0.1;
      stalk.castShadow = true;
      wheatBed.add(stalk);

      const ear = new THREE.Mesh(earGeo, currentMat);
      ear.position.set(wx, 0.92, wz);
      ear.rotation.z = stalk.rotation.z;
      ear.castShadow = true;
      wheatBed.add(ear);

      // Low leafy foliage tuft at stalk base
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 3), wheatGreenMat);
        blade.position.set(wx + (b - 1) * 0.05, 0.22, wz);
        blade.rotation.z = (b - 1) * 0.25;
        wheatBed.add(blade);
      }
    }
  }
  group.add(wheatBed);

  // ==============================================================
  // 3. CANTEIRO DE CENOURAS E RAÍZES (Plot Inferior-Centro / Frente)
  // ==============================================================
  const carrotBed = new THREE.Group();
  carrotBed.position.set(0.65, 0.08, 1.35);

  const carrotSoil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 2.5), soilBedMat);
  carrotSoil.position.y = 0.06;
  carrotSoil.receiveShadow = true;
  carrotSoil.castShadow = true;
  carrotBed.add(carrotSoil);

  // Longitudinal soil ridges for carrots
  for (let crx = -0.55; crx <= 0.55; crx += 0.55) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 2.3, 6), soilBedMat);
    ridge.position.set(crx, 0.12, 0);
    carrotBed.add(ridge);
  }

  // Rows of orange carrot crowns with green leafy tops
  const carrotCrownGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.16, 6);
  const carrotLeafGeo = new THREE.ConeGeometry(0.035, 0.26, 4);

  for (let cx = -0.65; cx <= 0.65; cx += 0.28) {
    for (let cz = -0.95; cz <= 0.95; cz += 0.28) {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx + (Math.sin(cz * 7) * 0.03), 0.14, cz);

      // Orange root crown emerging from soil
      const crown = new THREE.Mesh(carrotCrownGeo, carrotOrangeMat);
      crown.position.y = 0.06;
      crown.castShadow = true;
      cGroup.add(crown);

      // Feathery carrot greens
      for (let lf = 0; lf < 3; lf++) {
        const leaf = new THREE.Mesh(carrotLeafGeo, carrotLeafMat);
        leaf.position.set((lf - 1) * 0.03, 0.22, 0);
        leaf.rotation.z = (lf - 1) * 0.3;
        leaf.castShadow = true;
        cGroup.add(leaf);
      }

      carrotBed.add(cGroup);
    }
  }
  group.add(carrotBed);

  // ==============================================================
  // 4. POMAR FRUTÍFERO DE ÁRVORES CARREGADAS (Área Direita e Traseira)
  // ==============================================================
  const orchardGroup = new THREE.Group();
  orchardGroup.position.set(1.4, 0, -1.1);

  const createFruitTree = (tx: number, tz: number, scale: number = 1.0) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    tree.scale.set(scale, scale, scale);

    // Gnarled organic tree trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.4, 7), orchardWoodMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    tree.add(trunk);

    // Curved primary branches
    for (let b = 0; b < 3; b++) {
      const angle = (b / 3) * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.9, 5), orchardWoodMat);
      branch.position.set(Math.cos(angle) * 0.35, 1.25, Math.sin(angle) * 0.35);
      branch.rotation.z = -Math.cos(angle) * 0.6;
      branch.rotation.x = Math.sin(angle) * 0.6;
      branch.castShadow = true;
      tree.add(branch);
    }

    // Lush Anime Green Leaf Canopies (clustered spheres)
    const canopyCoords = [
      { x: 0, y: 1.85, z: 0, r: 0.95 },
      { x: 0.5, y: 1.95, z: 0.35, r: 0.75 },
      { x: -0.45, y: 1.8, z: -0.4, r: 0.7 },
      { x: 0.3, y: 1.6, z: -0.5, r: 0.65 },
      { x: -0.4, y: 1.65, z: 0.45, r: 0.65 },
    ];

    canopyCoords.forEach((c) => {
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r), orchardFoliageMat);
      foliage.position.set(c.x, c.y, c.z);
      foliage.castShadow = true;
      tree.add(foliage);
    });

    // Clusters of Bright Red Glossy Fruits (Pomegranates / Apples hanging from canopy)
    const fruitCoords = [
      { x: 0.45, y: 1.55, z: 0.45 },
      { x: -0.4, y: 1.5, z: 0.5 },
      { x: 0.65, y: 1.7, z: -0.2 },
      { x: -0.55, y: 1.65, z: -0.35 },
      { x: 0.1, y: 1.35, z: 0.7 },
      { x: -0.2, y: 1.4, z: -0.65 },
      { x: 0.55, y: 1.85, z: 0.2 },
      { x: -0.35, y: 1.9, z: 0.3 },
      { x: 0.0, y: 1.5, z: -0.6 },
    ];

    fruitCoords.forEach((fc) => {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), fruitRedMat);
      fruit.position.set(fc.x, fc.y, fc.z);
      fruit.castShadow = true;
      tree.add(fruit);
    });

    return tree;
  };

  // 2 Fruit Orchard trees
  orchardGroup.add(createFruitTree(0, 0, 1.1));
  orchardGroup.add(createFruitTree(0.75, 1.1, 0.95));

  group.add(orchardGroup);

  // ==============================================================
  // 5. FIADA DE FLORES E MILHO DOURADO (Borda Esquerda como na imagem)
  // ==============================================================
  for (let fz = -2.2; fz <= 2.2; fz += 0.55) {
    const flowerStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.1, 4), wheatGreenMat);
    flowerStalk.position.set(-3.0, 0.55, fz);
    flowerStalk.castShadow = true;
    group.add(flowerStalk);

    // Yellow floral petal / corn tassel head
    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), flowerYellowMat);
    flower.position.set(-3.0, 1.05, fz);
    flower.castShadow = true;
    group.add(flower);
  }

  return group;
}

export function createRockQuarryMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rock_quarry';

  for (let i = 0; i < 5; i++) {
    const rockGeo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.35);
    const rock = new THREE.Mesh(rockGeo, darkStoneMat);
    const angle = (i / 5) * Math.PI * 2;
    const dist = 0.5 + Math.random() * 0.4;
    rock.position.set(Math.cos(angle) * dist, 0.25 + Math.random() * 0.15, Math.sin(angle) * dist);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    group.add(rock);
  }

  return group;
}

// 4. Clay Pit / Riverbed (Oleiro - potter)
export function createClayPitMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'clay_pit';

  // Terracotta moist clay soil bed
  const bedGeo = new THREE.PlaneGeometry(3.6, 3.2);
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = 0.015;
  bed.receiveShadow = true;
  group.add(bed);

  // Water puddle / alluvial clay water
  const puddleGeo = new THREE.CircleGeometry(0.7, 16);
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.2 });
  const puddle = new THREE.Mesh(puddleGeo, puddleMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(-0.5, 0.02, 0.4);
  group.add(puddle);

  // Clay mounds / dug earth
  for (let i = 0; i < 4; i++) {
    const moundGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.6);
    mound.castShadow = true;
    group.add(mound);
  }

  // Raw terracotta pots drying in the sun
  for (let i = 0; i < 3; i++) {
    const potGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.25, 8);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(0.8 + (i % 2) * 0.25, 0.12, -0.6 + i * 0.3);
    pot.castShadow = true;
    group.add(pot);
  }

  return group;
}

// 5. Active Builder Construction Site (Construtor - builder)
export function createBuilderSiteMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'builder_site';

  // Timber scaffolding poles
  for (let i = 0; i < 4; i++) {
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
    const pole = new THREE.Mesh(poleGeo, woodMat);
    const x = (i % 2 === 0 ? -0.8 : 0.8);
    const z = (i < 2 ? -0.8 : 0.8);
    pole.position.set(x, 0.9, z);
    pole.castShadow = true;
    group.add(pole);
  }

  // Cross timbers
  const crossBeamGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6);
  const beam1 = new THREE.Mesh(crossBeamGeo, woodMat);
  beam1.rotation.z = Math.PI / 2;
  beam1.position.set(0, 1.2, -0.8);
  group.add(beam1);

  const beam2 = new THREE.Mesh(crossBeamGeo, woodMat);
  beam2.rotation.z = Math.PI / 2;
  beam2.position.set(0, 1.2, 0.8);
  group.add(beam2);

  // Stack of cut stone blocks
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const blockGeo = new THREE.BoxGeometry(0.3, 0.2, 0.3);
      const block = new THREE.Mesh(blockGeo, stoneMat);
      block.position.set(x * 0.32 - 0.16, y * 0.21 + 0.1, 0);
      block.castShadow = true;
      group.add(block);
    }
  }

  return group;
}

// 6. Elder Study Desk / Cuneiform Altar (Ancião - elder)
export function createElderDeskMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'elder_desk';

  // Carved stone reading table
  const tableTopGeo = new THREE.BoxGeometry(1.2, 0.1, 0.7);
  const tableTop = new THREE.Mesh(tableTopGeo, stoneMat);
  tableTop.position.set(0, 0.65, 0);
  tableTop.castShadow = true;
  group.add(tableTop);

  // Stone pillars / legs
  for (let i = -1; i <= 1; i += 2) {
    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.55);
    const leg = new THREE.Mesh(legGeo, darkStoneMat);
    leg.position.set(i * 0.45, 0.3, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Clay tablets on desk
  const tabGeo = new THREE.BoxGeometry(0.2, 0.04, 0.15);
  const tabMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const tab1 = new THREE.Mesh(tabGeo, tabMat);
  tab1.position.set(-0.25, 0.72, 0.05);
  tab1.rotation.y = 0.2;
  group.add(tab1);

  const tab2 = new THREE.Mesh(tabGeo, tabMat);
  tab2.position.set(0.2, 0.72, -0.05);
  tab2.rotation.y = -0.3;
  group.add(tab2);

  // Brazier with embers
  const brazierGeo = new THREE.CylinderGeometry(0.12, 0.06, 0.3, 8);
  const brazier = new THREE.Mesh(brazierGeo, darkStoneMat);
  brazier.position.set(0.8, 0.2, 0.3);
  group.add(brazier);

  const emberGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const ember = new THREE.Mesh(emberGeo, emberMat);
  ember.position.set(0.8, 0.35, 0.3);
  group.add(ember);

  return group;
}

// 7. Guard Watchpost / Totem (Guarda - guard)
export function createGuardPostMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'guard_post';

  // Watchpost timber mast
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8);
  const pole = new THREE.Mesh(poleGeo, darkWoodMat);
  pole.position.y = 1.4;
  pole.castShadow = true;
  group.add(pole);

  // Crossarm with tribal banner / pennant
  const bannerArmGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
  const bannerArm = new THREE.Mesh(bannerArmGeo, woodMat);
  bannerArm.rotation.z = Math.PI / 2;
  bannerArm.position.set(0.3, 2.4, 0);
  group.add(bannerArm);

  const bannerGeo = new THREE.PlaneGeometry(0.45, 0.7);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0.3, 2.05, 0);
  group.add(banner);

  // Weapon rack with spears
  const rackGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
  const rack = new THREE.Mesh(rackGeo, woodMat);
  rack.position.set(-0.4, 0.4, 0);
  group.add(rack);

  for (let i = -1; i <= 1; i++) {
    const spearGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6);
    const spear = new THREE.Mesh(spearGeo, woodMat);
    spear.position.set(-0.4 + i * 0.1, 0.7, 0);
    spear.rotation.z = 0.1 * i;
    group.add(spear);
  }

  return group;
}

// 8. Serraria de Troncos (Sawmill)
export function createSawmillMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'sawmill';

  // 4 Postes de madeira rústica sustentando o telheiro
  const postPositions = [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ];
  postPositions.forEach(([x, z]) => {
    const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.6, 6);
    const post = new THREE.Mesh(postGeo, darkWoodMat);
    post.position.set(x, 0.8, z);
    post.castShadow = true;
    group.add(post);
  });

  // Teto rústico inclinado de colmo / tábuas
  const roofGeo = new THREE.ConeGeometry(1.6, 0.55, 4);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.y = 1.85;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Cavalete / Bancada de corte de troncos
  const benchGeo = new THREE.BoxGeometry(1.2, 0.45, 0.55);
  const bench = new THREE.Mesh(benchGeo, woodMat);
  bench.position.set(0, 0.35, 0);
  bench.castShadow = true;
  group.add(bench);

  // Tronco repousando sobre a bancada
  const activeLogGeo = new THREE.CylinderGeometry(0.12, 0.13, 1.3, 8);
  const activeLog = new THREE.Mesh(activeLogGeo, darkWoodMat);
  activeLog.rotation.z = Math.PI / 2;
  activeLog.position.set(0, 0.65, 0);
  group.add(activeLog);

  // Pilha de toras cortadas ao lado da serraria
  for (let i = 0; i < 4; i++) {
    const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 6);
    const log = new THREE.Mesh(logGeo, darkWoodMat);
    log.rotation.z = Math.PI / 2;
    const layer = i < 3 ? 0 : 1;
    const offset = i < 3 ? (i - 1) * 0.22 : 0;
    log.position.set(offset + 1.2, 0.12 + layer * 0.18, 0.4);
    group.add(log);
  }

  return group;
}

// 9. Oficina de Cantaria (Stoneworks)
export function createStoneworksMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stoneworks';

  // Base com lajes de pedra assentadas no chão
  const floorGeo = new THREE.BoxGeometry(2.4, 0.08, 2.0);
  const floor = new THREE.Mesh(floorGeo, darkStoneMat);
  floor.position.y = 0.04;
  floor.receiveShadow = true;
  group.add(floor);

  // Bancada pesada de cantaria
  const tableGeo = new THREE.BoxGeometry(1.1, 0.5, 0.6);
  const table = new THREE.Mesh(tableGeo, stoneMat);
  table.position.set(0, 0.3, 0);
  table.castShadow = true;
  group.add(table);

  // Bloco de pedra sendo trabalhado na bancada
  const blockGeo = new THREE.BoxGeometry(0.45, 0.3, 0.35);
  const block = new THREE.Mesh(blockGeo, stoneMat);
  block.position.set(0, 0.65, 0);
  group.add(block);

  // Cinzel / ferramenta de talha sobre a mesa
  const chiselGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4);
  const chisel = new THREE.Mesh(chiselGeo, darkStoneMat);
  chisel.rotation.x = Math.PI / 2;
  chisel.position.set(0.35, 0.56, 0.1);
  group.add(chisel);

  // Pilha de blocos de cantaria talhados ao lado
  for (let i = 0; i < 5; i++) {
    const sGeo = new THREE.BoxGeometry(0.35, 0.22, 0.35);
    const sBlock = new THREE.Mesh(sGeo, darkStoneMat);
    const x = -0.9 + (i % 2) * 0.38;
    const y = i < 4 ? 0.15 : 0.35;
    const z = -0.4 + Math.floor(i / 2) * 0.38;
    sBlock.position.set(x, y, z);
    sBlock.castShadow = true;
    group.add(sBlock);
  }

  // Toldo leve sustentado por 2 postes de madeira
  const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), darkWoodMat);
  pole1.position.set(-0.8, 0.8, -0.8);
  group.add(pole1);
  const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), darkWoodMat);
  pole2.position.set(0.8, 0.8, -0.8);
  group.add(pole2);

  const awningGeo = new THREE.PlaneGeometry(1.9, 1.3);
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, side: THREE.DoubleSide });
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.rotation.x = Math.PI / 3;
  awning.position.set(0, 1.5, -0.4);
  group.add(awning);

  return group;
}

// 10. Fazenda & Armazém de Alimentos Ancestral (Cooking Pit / Ancestral Food Storage Farm)
export function createCookingPitMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'cooking_pit';

  // Specific materials for detailed ancestral food storage & farming
  const ceramicClayMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75 });
  const sackBurlapMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.88 });
  const grainGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 });
  const brightGrainMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const flourMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.95 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const potBronzeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.5 });
  const herbGreenMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.8 });
  const wickerMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });

  // 1. Raised Flagstone & Timber Foundation Platform
  const floorGeo = new THREE.CylinderGeometry(2.6, 2.75, 0.14, 16);
  const floor = new THREE.Mesh(floorGeo, darkStoneMat);
  floor.position.y = 0.07;
  floor.receiveShadow = true;
  group.add(floor);

  // Perimeter timber curb beam protecting food from damp ground
  const curbGeo = new THREE.TorusGeometry(2.65, 0.05, 6, 20);
  const curb = new THREE.Mesh(curbGeo, darkWoodMat);
  curb.rotation.x = Math.PI / 2;
  curb.position.y = 0.12;
  curb.receiveShadow = true;
  group.add(curb);

  // Stone access steps on front
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.35), darkStoneMat);
  step1.position.set(0, 0.035, 2.7);
  group.add(step1);

  // 2. Ancestral Granary / Food Storage Silo (Silo elevado de argila e adobe para grãos secos)
  const siloGroup = new THREE.Group();
  siloGroup.position.set(-1.15, 0, -0.65);

  // 4 Staddle-stone style stilt posts with rodent barrier discs
  const stiltCoords = [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ];
  stiltCoords.forEach(([sx, sz]) => {
    const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), darkWoodMat);
    stilt.position.set(sx, 0.275, sz);
    stilt.castShadow = true;
    siloGroup.add(stilt);

    // Flat stone disc / collar preventing climbing rodents
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8), stoneMat);
    disc.position.set(sx, 0.5, sz);
    disc.castShadow = true;
    siloGroup.add(disc);
  });

  // Elevated Silo floor platform
  const siloFloor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.5), woodMat);
  siloFloor.position.y = 0.54;
  siloFloor.castShadow = true;
  siloGroup.add(siloFloor);

  // Cylindrical Adobe Silo Body
  const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 1.4, 14), adobeMat);
  siloBody.position.y = 1.25;
  siloBody.castShadow = true;
  siloBody.receiveShadow = true;
  siloGroup.add(siloBody);

  // Wooden reinforcing staves & hoops
  [0.85, 1.35, 1.8].forEach((hy) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.025, 6, 16), darkWoodMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = hy;
    siloGroup.add(hoop);
  });

  // Conical Thatched Silo Roof with Finial
  const siloRoof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.85, 14), thatchMat);
  siloRoof.position.y = 2.35;
  siloRoof.castShadow = true;
  siloGroup.add(siloRoof);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.35, 6), darkWoodMat);
  finial.position.y = 2.85;
  siloGroup.add(finial);

  // Grain Chute / Trapdoor on front
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.12), darkWoodMat);
  chute.position.set(0, 0.85, 0.8);
  chute.rotation.x = 0.25;
  siloGroup.add(chute);

  // Grain sack beneath chute catching meal
  const catchSack = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), sackBurlapMat);
  catchSack.scale.set(1.1, 0.75, 1.1);
  catchSack.position.set(0, 0.65, 0.95);
  siloGroup.add(catchSack);

  group.add(siloGroup);

  // 3. Elevated Slatted Grain Crib (Tulha de Milho / Cevada para secagem ao ar)
  const cribGroup = new THREE.Group();
  cribGroup.position.set(1.2, 0, -0.75);

  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 6), darkWoodMat);
      leg.position.set(i * 0.45, 0.325, j * 0.35);
      leg.castShadow = true;
      cribGroup.add(leg);
    }
  }

  // Crib box with slatted sides
  const cribBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.9), woodMat);
  cribBase.position.y = 0.65;
  cribGroup.add(cribBase);

  const cribWallF = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.04), woodMat);
  cribWallF.position.set(0, 0.88, 0.43);
  cribGroup.add(cribWallF);

  const cribWallB = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.04), woodMat);
  cribWallB.position.set(0, 0.88, -0.43);
  cribGroup.add(cribWallB);

  // Golden corn/wheat cobs piled inside crib
  const cornPile = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), grainGoldMat);
  cornPile.scale.set(1.3, 0.6, 0.95);
  cornPile.position.set(0, 0.9, 0);
  cribGroup.add(cornPile);

  // Slanted mini-roof over crib
  const cribRoof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 1.05), thatchMat);
  cribRoof.position.set(0, 1.25, 0);
  cribRoof.rotation.x = 0.15;
  cribRoof.castShadow = true;
  cribGroup.add(cribRoof);

  group.add(cribGroup);

  // 4. Ancestral Cooking Hearth & Caldron (Fogueira protegida com caldeirão)
  const hearthGroup = new THREE.Group();
  hearthGroup.position.set(0.25, 0.07, 0.4);

  // River stones ring
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const stoneGeo = new THREE.DodecahedronGeometry(0.12);
    const stone = new THREE.Mesh(stoneGeo, darkStoneMat);
    stone.position.set(Math.cos(angle) * 0.45, 0.08, Math.sin(angle) * 0.45);
    stone.castShadow = true;
    hearthGroup.add(stone);
  }

  // Cross charred firewood logs
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 5), darkWoodMat);
    log.rotation.x = Math.PI / 2;
    log.rotation.z = (i / 4) * Math.PI + 0.2;
    log.position.y = 0.06;
    hearthGroup.add(log);
  }

  // Embers glow bed
  const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 8), emberMat);
  embers.position.y = 0.07;
  hearthGroup.add(embers);

  // Central flame
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  flame.position.y = 0.22;
  hearthGroup.add(flame);

  // Sturdy wood tripod over fire
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3, 6), darkWoodMat);
    leg.position.set(Math.cos(angle) * 0.34, 0.65, Math.sin(angle) * 0.34);
    leg.rotation.z = -Math.cos(angle) * 0.28;
    leg.rotation.x = Math.sin(angle) * 0.28;
    leg.castShadow = true;
    hearthGroup.add(leg);
  }

  // Hanging chain & heavy cauldron
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 4), potBronzeMat);
  chain.position.y = 1.05;
  hearthGroup.add(chain);

  const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.8), potBronzeMat);
  cauldron.rotation.x = Math.PI;
  cauldron.position.y = 0.72;
  cauldron.castShadow = true;
  hearthGroup.add(cauldron);

  // Soup stew inside cauldron
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.21, 10), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3 }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = 0.78;
  hearthGroup.add(soup);

  group.add(hearthGroup);

  // 5. Firewood Stack (Lenha cortada e empilhada)
  const woodStackGroup = new THREE.Group();
  woodStackGroup.position.set(-0.7, 0.07, 1.4);
  for (let layer = 0; layer < 3; layer++) {
    for (let c = 0; c < 3 - layer; c++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkWoodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(c * 0.11 - 0.15, layer * 0.09 + 0.05, 0);
      log.castShadow = true;
      woodStackGroup.add(log);
    }
  }
  group.add(woodStackGroup);

  // 6. Ancestral Saddle Quern & Grain Mortar (Mó de pedra de moer trigo e pilão)
  const millingGroup = new THREE.Group();
  millingGroup.position.set(1.4, 0.07, 0.7);

  // Lower stationary saddle stone
  const saddleStone = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.38), darkStoneMat);
  saddleStone.position.y = 0.08;
  saddleStone.castShadow = true;
  millingGroup.add(saddleStone);

  // Oblong grinding stone (mó móvel)
  const handStone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 8), stoneMat);
  handStone.rotation.z = Math.PI / 2;
  handStone.position.set(0, 0.21, 0);
  millingGroup.add(handStone);

  // Flour dust on stone surface
  const flourPatch = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), flourMat);
  flourPatch.rotation.x = -Math.PI / 2;
  flourPatch.position.set(0.12, 0.165, 0);
  millingGroup.add(flourPatch);

  // Wooden meal bowl beside the milling stone
  const mealBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.1, 8), woodMat);
  mealBowl.position.set(-0.35, 0.05, 0.1);
  millingGroup.add(mealBowl);

  const mealContent = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), flourMat);
  mealContent.rotation.x = -Math.PI / 2;
  mealContent.position.set(-0.35, 0.1, 0.1);
  millingGroup.add(mealContent);

  group.add(millingGroup);

  // 7. Sun-Drying Grain Rack / Wicker Tray (Secador de grãos em esteira de vime)
  const dryerGroup = new THREE.Group();
  dryerGroup.position.set(0.65, 0.07, 1.55);

  // 4 Legs
  [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]].forEach(([dx, dz]) => {
    const dLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 5), darkWoodMat);
    dLeg.position.set(dx, 0.275, dz);
    dryerGroup.add(dLeg);
  });

  // Wicker Tray Frame
  const trayFrame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.55), darkWoodMat);
  trayFrame.position.y = 0.55;
  dryerGroup.add(trayFrame);

  // Sunning grains bed
  const dryingGrains = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.48), brightGrainMat);
  dryingGrains.rotation.x = -Math.PI / 2;
  dryingGrains.position.y = 0.575;
  dryerGroup.add(dryingGrains);

  group.add(dryerGroup);

  // 8. Storage Vessels: Terracotta Amphoras & Burlap Sacks
  const storageGroup = new THREE.Group();
  storageGroup.position.set(-1.6, 0.07, 0.7);

  // Large amphora 1
  const amph1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.6, 10), terracottaMat);
  amph1.position.set(0, 0.3, 0);
  amph1.castShadow = true;
  storageGroup.add(amph1);

  // Reed lid with cord
  const lid1 = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.1, 8), wickerMat);
  lid1.position.set(0, 0.63, 0);
  storageGroup.add(lid1);

  // Smaller amphora 2
  const amph2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.48, 10), ceramicClayMat);
  amph2.position.set(0.28, 0.24, -0.2);
  amph2.castShadow = true;
  storageGroup.add(amph2);

  // Stack of 3 Grain Sacks
  const sack1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), sackBurlapMat);
  sack1.scale.set(1.2, 0.7, 0.9);
  sack1.position.set(0.3, 0.17, 0.35);
  sack1.castShadow = true;
  storageGroup.add(sack1);

  const sack2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), sackBurlapMat);
  sack2.scale.set(1.1, 0.65, 0.9);
  sack2.position.set(0.32, 0.45, 0.33);
  sack2.castShadow = true;
  storageGroup.add(sack2);

  // Harvest Basket with roots
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.3, 10), wickerMat);
  basket.position.set(-0.25, 0.15, -0.35);
  basket.castShadow = true;
  storageGroup.add(basket);

  // Produce roots inside basket
  for (let i = 0; i < 4; i++) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 5), ceramicClayMat);
    root.rotation.x = (i % 2 === 0 ? 0.4 : -0.3);
    root.rotation.z = (i * 0.3 - 0.4);
    root.position.set(-0.25 + (i - 1.5) * 0.06, 0.3, -0.35);
    storageGroup.add(root);
  }

  group.add(storageGroup);

  // 9. Grand Ancestral Thatched Shelter Pavilion (4 pilares robustos, vigas e teto protetor)
  const canopyGroup = new THREE.Group();

  const postPositions = [
    [-1.75, -1.6],
    [1.75, -1.6],
    [-1.75, 1.6],
    [1.75, 1.6],
  ];

  postPositions.forEach(([px, pz]) => {
    // Stout pillar
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.1, 8), darkWoodMat);
    post.position.set(px, 1.05, pz);
    post.castShadow = true;
    canopyGroup.add(post);

    // Diagonal knee brace to support roof
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 6), woodMat);
    brace.position.set(px * 0.85, 1.85, pz * 0.85);
    brace.rotation.z = px < 0 ? -0.7 : 0.7;
    canopyGroup.add(brace);
  });

  // Perimeter top tie beams
  const beamFront = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.09, 0.09), woodMat);
  beamFront.position.set(0, 2.05, 1.6);
  canopyGroup.add(beamFront);

  const beamBack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.09, 0.09), woodMat);
  beamBack.position.set(0, 2.05, -1.6);
  canopyGroup.add(beamBack);

  const beamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 3.3), woodMat);
  beamLeft.position.set(-1.75, 2.05, 0);
  canopyGroup.add(beamLeft);

  const beamRight = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 3.3), woodMat);
  beamRight.position.set(1.75, 2.05, 0);
  canopyGroup.add(beamRight);

  // Overhead Hanging Provisions Rafter (Varal de cura no interior do telheiro)
  const rafterBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), darkWoodMat);
  rafterBeam.position.set(0, 1.95, 0.2);
  canopyGroup.add(rafterBeam);

  // Hanging garlic, herbs and cured bundles from rafter
  for (let i = 0; i < 5; i++) {
    const herbMat = i % 2 === 0 ? herbGreenMat : grainGoldMat;
    const herb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 5), herbMat);
    herb.rotation.x = Math.PI;
    herb.position.set(-0.8 + i * 0.4, 1.78, 0.2);
    canopyGroup.add(herb);
  }

  // Broad Overhanging Hip Thatched Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 0.95, 4), thatchMat);
  roof.position.y = 2.45;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  canopyGroup.add(roof);

  // Ridge cap of woven thatch
  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.25), thatchMat);
  ridgeCap.position.y = 2.92;
  canopyGroup.add(ridgeCap);

  group.add(canopyGroup);

  return group;
}

// 11. Olaria & Forno de Argila (Pottery Kiln)
export function createPotteryKilnMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pottery_kiln';

  // Forno abobadado de argila/adobe com chaminé
  const domeGeo = new THREE.SphereGeometry(0.85, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0.2;
  dome.castShadow = true;
  group.add(dome);

  // Chaminé de ventilação no topo
  const chimneyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.6, 8);
  const chimney = new THREE.Mesh(chimneyGeo, mudbrickMat);
  chimney.position.y = 1.0;
  group.add(chimney);

  // Boca do forno com brasa interior
  const doorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 8, 1, false, 0, Math.PI);
  const doorMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.rotation.z = Math.PI / 2;
  door.position.set(0, 0.25, 0.75);
  group.add(door);

  // Vasos de argila assados descansando na bancada
  for (let i = 0; i < 3; i++) {
    const potGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.26, 8);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(1.0, 0.13 + i * 0.02, -0.4 + i * 0.35);
    group.add(pot);
  }

  return group;
}

// 12. Sede da Vila & Depósito Geral Central (Village Hall)
export function createVillageHallMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'village_hall';

  // 1. Base baixa de pedra rústica (fundação comunal)
  const foundationGeo = new THREE.BoxGeometry(3.2, 0.25, 2.6);
  const foundation = new THREE.Mesh(foundationGeo, darkStoneMat);
  foundation.position.y = 0.125;
  foundation.receiveShadow = true;
  foundation.castShadow = true;
  group.add(foundation);

  // 2. Paredes de adobe e barro ancestral
  const wallsGeo = new THREE.BoxGeometry(2.9, 1.1, 2.3);
  const walls = new THREE.Mesh(wallsGeo, adobeMat);
  walls.position.y = 0.25 + 0.55;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // 3. Pilares de madeira rústica nos 4 cantos
  const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.35, 6);
  [
    [-1.4, -1.1],
    [1.4, -1.1],
    [-1.4, 1.1],
    [1.4, 1.1],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, darkWoodMat);
    post.position.set(px, 0.7, pz);
    post.castShadow = true;
    group.add(post);
  });

  // 4. Telhado largo de palha com caimento duplo (estilo casa comunal)
  const roofGeo = new THREE.CylinderGeometry(0.12, 1.7, 3.4, 3);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI;
  roof.position.y = 1.95;
  roof.castShadow = true;
  group.add(roof);

  // Vigas cruzadas no frontão
  const gableGeo = new THREE.BoxGeometry(0.07, 1.0, 0.07);
  const g1 = new THREE.Mesh(gableGeo, darkWoodMat);
  g1.position.set(-1.65, 2.15, 0);
  g1.rotation.z = 0.45;
  group.add(g1);
  const g2 = new THREE.Mesh(gableGeo, darkWoodMat);
  g2.position.set(-1.65, 2.15, 0);
  g2.rotation.z = -0.45;
  group.add(g2);

  // 5. Entrada frontal com vão e toldo rústico
  const doorGeo = new THREE.BoxGeometry(0.65, 0.85, 0.2);
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x1f1b18 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.55, 1.16);
  group.add(door);

  // Pontais do alpendre frontal
  [-0.45, 0.45].forEach((px) => {
    const pGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.95, 6);
    const pMesh = new THREE.Mesh(pGeo, darkWoodMat);
    pMesh.position.set(px, 0.5, 1.5);
    pMesh.castShadow = true;
    group.add(pMesh);
  });

  const awningGeo = new THREE.BoxGeometry(1.15, 0.08, 0.55);
  const awning = new THREE.Mesh(awningGeo, thatchMat);
  awning.position.set(0, 1.0, 1.4);
  awning.rotation.x = 0.2;
  awning.castShadow = true;
  group.add(awning);

  // 6. Elementos que comunicam visualmente "depósito central de recursos":
  // A. Sacos e cestos de grãos (Alimento)
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
  const sack1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), sackMat);
  sack1.position.set(0.95, 0.32, 1.3);
  sack1.castShadow = true;
  group.add(sack1);

  const sack2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), sackMat);
  sack2.position.set(1.2, 0.3, 1.2);
  sack2.castShadow = true;
  group.add(sack2);

  const sack3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13), sackMat);
  sack3.position.set(1.08, 0.5, 1.25);
  sack3.castShadow = true;
  group.add(sack3);

  // B. Toras de madeira empilhadas na lateral (Madeira)
  const logGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6);
  [
    [-1.75, 0.18, 0.3],
    [-1.75, 0.18, 0.5],
    [-1.75, 0.28, 0.4],
  ].forEach(([lx, ly, lz]) => {
    const log = new THREE.Mesh(logGeo, woodMat);
    log.rotation.x = Math.PI / 2;
    log.position.set(lx, ly, lz);
    log.castShadow = true;
    group.add(log);
  });

  // C. Blocos talhados de calcário na lateral oposta (Pedra)
  const blockGeo = new THREE.BoxGeometry(0.3, 0.2, 0.25);
  const b1 = new THREE.Mesh(blockGeo, stoneMat);
  b1.position.set(1.7, 0.22, -0.4);
  b1.castShadow = true;
  group.add(b1);
  const b2 = new THREE.Mesh(blockGeo, stoneMat);
  b2.position.set(1.7, 0.4, -0.4);
  b2.rotation.y = 0.2;
  b2.castShadow = true;
  group.add(b2);

  // D. Vasos e ânforas de cerâmica na varanda (Argila)
  const amphoraMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
  const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.28, 8), amphoraMat);
  pot1.position.set(-0.85, 0.32, 1.35);
  pot1.castShadow = true;
  group.add(pot1);

  const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.22, 8), amphoraMat);
  pot2.position.set(-1.08, 0.29, 1.25);
  pot2.castShadow = true;
  group.add(pot2);

  // E. Estandarte tribal de liderança
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
  const pole = new THREE.Mesh(poleGeo, darkWoodMat);
  pole.position.set(1.4, 0.9, 1.45);
  pole.castShadow = true;
  group.add(pole);

  const bannerGeo = new THREE.BoxGeometry(0.35, 0.25, 0.02);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(1.22, 1.55, 1.45);
  group.add(banner);

  return group;
}

