import * as THREE from 'three';

// Shared materials for lush natural environment
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });
const birchWoodMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.8 });
const birchMarkingMat = new THREE.MeshStandardMaterial({ color: 0x332822, roughness: 0.95 });
const pineFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x1b4324, roughness: 0.85 }); // deep pine green
const pineFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x24542d, roughness: 0.85 }); // forest conifer
const acaciaFoliageMat = new THREE.MeshStandardMaterial({ color: 0x6e8b3d, roughness: 0.9 }); // savanna olive-gold
const oakFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x3d6e22, roughness: 0.88 }); // rich oak green
const oakFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x4f822f, roughness: 0.88 }); // vibrant spring oak
const autumnFoliageMat = new THREE.MeshStandardMaterial({ color: 0xab6726, roughness: 0.9 }); // golden steppe amber
const poplarFoliageMat = new THREE.MeshStandardMaterial({ color: 0x447738, roughness: 0.85 }); // upright olive green
const cypressFoliageMat = new THREE.MeshStandardMaterial({ color: 0x1e3d22, roughness: 0.88 }); // deep cypress
const birchFoliageMat = new THREE.MeshStandardMaterial({ color: 0x76a337, roughness: 0.9 }); // bright birch green
const willowFoliageMat = new THREE.MeshStandardMaterial({ color: 0x5a8738, roughness: 0.92 }); // weeping willow

const shrubMat1 = new THREE.MeshStandardMaterial({ color: 0x4a7c29, roughness: 0.9 });
const shrubMat2 = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.92 });
const grassMatWarm = new THREE.MeshStandardMaterial({ color: 0x8a9a46, roughness: 0.95 });
const grassMatLush = new THREE.MeshStandardMaterial({ color: 0x4d7524, roughness: 0.95 });
const fernMat = new THREE.MeshStandardMaterial({ color: 0x356322, roughness: 0.88 });

// Wild flower petals
const flowerChamomileMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // yellow chamomile
const flowerPoppyMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 }); // wild steppe poppy
const flowerLavenderMat = new THREE.MeshBasicMaterial({ color: 0xc084fc }); // mountain lavender
const flowerWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc }); // white daisy

const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
const mossyRockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });

/**
 * Função matemática determinística de elevação topográfica do terreno (irregularidades orgânicas no solo).
 * - Centro imediato (raio < 3.5m): leve micro-relevo natural (0.06m a 0.15m) para caminhar com suavidade.
 * - Zona da aldeia e áreas produtivas (raio 3.5 a 20m): ondulações palpáveis e orgânicas (0.2m a 0.85m),
 *   com declive sutil na margem de argila e elevação suave nas pedreiras e pomar.
 * - Bordas e encostas perimetrais (raio > 20m): colinas e encostas montanhosas que emolduram o vale (1.5m a 4.2m).
 */
export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);

  // Micro-irregularidades no solo da aldeia (montículos sutis e textura de terra batida)
  const villageUndulation =
    Math.sin(x * 0.36) * Math.cos(z * 0.36) * 0.22 +
    Math.sin(x * 0.72 + 1.1) * 0.08 +
    Math.cos(z * 0.68 - 0.7) * 0.08;

  // Centro imediato da fogueira (raio < 3.5m)
  if (distFromCenter < 3.5) {
    return villageUndulation * 0.45;
  }

  // Fator de transição gradual do centro para a periferia intermediária
  const borderFactor = Math.min(1, Math.max(0, (distFromCenter - 3.5) / 16));

  // Ondulações de relevo intermediário
  const wave1 = Math.sin(x * 0.12 + 1.2) * Math.cos(z * 0.13 - 0.7) * 1.55;
  const wave2 = Math.cos(x * 0.22 - z * 0.18 + 0.4) * 0.75;
  const wave3 = Math.sin(x * 0.35 + z * 0.28) * 0.32;

  // Declive na margem leste fluvial (onde fica a argila x ~ 7, z ~ 3.5)
  const riverDepression = (x > 5 && z > 1 && z < 7) ? -0.35 : 0;

  // Elevação montanhosa perimetral nas bordas extremas do mapa (dist > 20)
  const edgeHills = distFromCenter > 20 ? Math.pow((distFromCenter - 20) / 10.5, 1.48) * 2.3 : 0;

  return villageUndulation * (1 - borderFactor) + (wave1 + wave2 + wave3 + riverDepression) * borderFactor + edgeHills;
}

/**
 * Árvore tipo 1: Conífera / Pinheiro do Bosque (Tiered Pine)
 */
export function createConiferTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'conifer_tree';

  const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 2.3 * scale, 7);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.y = 1.15 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const tierConfigs = [
    { radius: 1.45 * scale, height: 1.6 * scale, y: 2.1 * scale, mat: pineFoliageMat1 },
    { radius: 1.2 * scale, height: 1.4 * scale, y: 3.0 * scale, mat: pineFoliageMat2 },
    { radius: 0.9 * scale, height: 1.2 * scale, y: 3.85 * scale, mat: pineFoliageMat1 },
    { radius: 0.5 * scale, height: 0.85 * scale, y: 4.5 * scale, mat: pineFoliageMat2 },
  ];

  tierConfigs.forEach((cfg) => {
    const coneGeo = new THREE.ConeGeometry(cfg.radius, cfg.height, 7);
    const cone = new THREE.Mesh(coneGeo, cfg.mat);
    cone.position.y = cfg.y;
    cone.castShadow = true;
    group.add(cone);
  });

  return group;
}

/**
 * Árvore tipo 2: Acácia do Vale Fluvial (Umbrella Acacia)
 */
export function createAcaciaTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'acacia_tree';

  const trunkGeo = new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 2.1 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.set(0, 1.05 * scale, 0);
  trunk.rotation.z = 0.12;
  trunk.castShadow = true;
  group.add(trunk);

  const branchGeo = new THREE.CylinderGeometry(0.09 * scale, 0.13 * scale, 1.3 * scale, 5);
  const branch = new THREE.Mesh(branchGeo, darkWoodMat);
  branch.position.set(0.38 * scale, 1.9 * scale, 0);
  branch.rotation.z = -0.55;
  branch.castShadow = true;
  group.add(branch);

  const canopies = [
    { x: -0.3 * scale, y: 2.4 * scale, z: 0, rx: 1.8 * scale },
    { x: 0.85 * scale, y: 2.7 * scale, z: 0.25 * scale, rx: 1.45 * scale },
    { x: 0.2 * scale, y: 2.9 * scale, z: -0.35 * scale, rx: 1.25 * scale },
  ];

  canopies.forEach((c) => {
    const discGeo = new THREE.CylinderGeometry(c.rx, c.rx * 1.08, 0.42 * scale, 8);
    const canopy = new THREE.Mesh(discGeo, acaciaFoliageMat);
    canopy.position.set(c.x, c.y, c.z);
    canopy.castShadow = true;
    group.add(canopy);
  });

  return group;
}

/**
 * Árvore tipo 3: Carvalho / Frondosa Arredondada (Dense Volumetric Oak)
 */
export function createOakTreeMesh(scale: number = 1.0, isAutumn: boolean = false): THREE.Group {
  const group = new THREE.Group();
  group.name = 'oak_tree';

  const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 1.7 * scale, 8);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.y = 0.85 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const matPrimary = isAutumn ? autumnFoliageMat : oakFoliageMat1;
  const matSecondary = isAutumn ? autumnFoliageMat : oakFoliageMat2;

  const blobs = [
    { x: 0, y: 2.1 * scale, z: 0, r: 1.15 * scale, mat: matPrimary },
    { x: 0.65 * scale, y: 2.3 * scale, z: 0.4 * scale, r: 0.9 * scale, mat: matSecondary },
    { x: -0.55 * scale, y: 2.2 * scale, z: -0.35 * scale, r: 0.95 * scale, mat: matPrimary },
    { x: 0.2 * scale, y: 2.85 * scale, z: -0.2 * scale, r: 0.85 * scale, mat: matSecondary },
    { x: -0.3 * scale, y: 2.6 * scale, z: 0.55 * scale, r: 0.8 * scale, mat: matPrimary },
  ];

  blobs.forEach((b) => {
    const geo = new THREE.DodecahedronGeometry(b.r);
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.position.set(b.x, b.y, b.z);
    mesh.castShadow = true;
    group.add(mesh);
  });

  return group;
}

/**
 * Árvore tipo 4: Choupo / Álamo Esguio (Slender Columnar Poplar)
 */
export function createPoplarTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'poplar_tree';

  const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.17 * scale, 2.9 * scale, 7);
  const trunk = new THREE.Mesh(trunkGeo, birchWoodMat);
  trunk.position.y = 1.45 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageGeo = new THREE.CylinderGeometry(0.48 * scale, 0.8 * scale, 3.4 * scale, 7);
  const foliage = new THREE.Mesh(foliageGeo, poplarFoliageMat);
  foliage.position.y = 3.1 * scale;
  foliage.castShadow = true;
  group.add(foliage);

  const topGeo = new THREE.ConeGeometry(0.48 * scale, 1.1 * scale, 7);
  const top = new THREE.Mesh(topGeo, poplarFoliageMat);
  top.position.y = 4.95 * scale;
  top.castShadow = true;
  group.add(top);

  return group;
}

/**
 * Árvore tipo 5: Cipreste Mediterrâneo Ancestral (Ancient Cypress Spire)
 */
export function createCypressTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'cypress_tree';

  // Tronco delgado e curto
  const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 1.2 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Coluna conífera densa e alongada em chama
  const spireGeo1 = new THREE.ConeGeometry(0.65 * scale, 3.2 * scale, 8);
  const spire1 = new THREE.Mesh(spireGeo1, cypressFoliageMat);
  spire1.position.y = 2.4 * scale;
  spire1.castShadow = true;
  group.add(spire1);

  const spireGeo2 = new THREE.ConeGeometry(0.48 * scale, 2.2 * scale, 7);
  const spire2 = new THREE.Mesh(spireGeo2, pineFoliageMat1);
  spire2.position.y = 3.6 * scale;
  spire2.castShadow = true;
  group.add(spire2);

  return group;
}

/**
 * Árvore tipo 6: Bétula Prateada com Marcas (Silver Birch)
 */
export function createBirchTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'birch_tree';

  // Tronco esbranquiçado
  const trunkGeo = new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, 2.6 * scale, 7);
  const trunk = new THREE.Mesh(trunkGeo, birchWoodMat);
  trunk.position.y = 1.3 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Anéis escuros típicos da casca de bétula
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 0.08 * scale, 7);
    const ring = new THREE.Mesh(ringGeo, birchMarkingMat);
    ring.position.y = (0.6 + i * 0.7) * scale;
    group.add(ring);
  }

  // Folhagem verde-clara e arejada
  const canopies = [
    { x: 0, y: 2.6 * scale, z: 0, r: 0.85 * scale },
    { x: 0.35 * scale, y: 3.1 * scale, z: 0.2 * scale, r: 0.75 * scale },
    { x: -0.3 * scale, y: 2.9 * scale, z: -0.25 * scale, r: 0.7 * scale },
    { x: 0.1 * scale, y: 3.6 * scale, z: 0, r: 0.65 * scale },
  ];

  canopies.forEach((c) => {
    const geo = new THREE.DodecahedronGeometry(c.r);
    const mesh = new THREE.Mesh(geo, birchFoliageMat);
    mesh.position.set(c.x, c.y, c.z);
    mesh.castShadow = true;
    group.add(mesh);
  });

  return group;
}

/**
 * Árvore tipo 7: Salgueiro Chorão Ribeirinho (Weeping Willow)
 */
export function createWillowTreeMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'willow_tree';

  // Tronco inclinado
  const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.0 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.set(0, 1.0 * scale, 0);
  trunk.rotation.z = -0.15;
  trunk.castShadow = true;
  group.add(trunk);

  // Cúpula central e ramagens pendentes caídas
  const domeGeo = new THREE.DodecahedronGeometry(1.2 * scale);
  const dome = new THREE.Mesh(domeGeo, willowFoliageMat);
  dome.position.set(0, 2.4 * scale, 0);
  dome.castShadow = true;
  group.add(dome);

  // Galhos pendentes que descem suavemente em cascata
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const dropGeo = new THREE.CylinderGeometry(0.3 * scale, 0.15 * scale, 1.2 * scale, 5);
    const drop = new THREE.Mesh(dropGeo, willowFoliageMat);
    drop.position.set(Math.cos(angle) * 0.9 * scale, 1.7 * scale, Math.sin(angle) * 0.9 * scale);
    drop.rotation.z = Math.sin(angle) * 0.2;
    drop.castShadow = true;
    group.add(drop);
  }

  return group;
}

/**
 * Árvore tipo 8: Carvalho Ancestral Gigante (Grand Ancient Oak)
 */
export function createAncientOakTreeMesh(scale: number = 1.2): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ancient_oak_tree';

  // Tronco maciço com raízes nodíferas
  const trunkGeo = new THREE.CylinderGeometry(0.32 * scale, 0.55 * scale, 2.2 * scale, 8);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
  trunk.position.y = 1.1 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // 3 Raízes proeminentes salientes na terra
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.3;
    const rootGeo = new THREE.ConeGeometry(0.22 * scale, 1.1 * scale, 5);
    const root = new THREE.Mesh(rootGeo, darkWoodMat);
    root.position.set(Math.cos(angle) * 0.45 * scale, 0.3 * scale, Math.sin(angle) * 0.45 * scale);
    root.rotation.x = Math.sin(angle) * 0.5;
    root.rotation.z = -Math.cos(angle) * 0.5;
    group.add(root);
  }

  // Enorme copa volumosa multi-nível
  const blobs = [
    { x: 0, y: 2.7 * scale, z: 0, r: 1.55 * scale, mat: oakFoliageMat1 },
    { x: 0.9 * scale, y: 2.8 * scale, z: 0.6 * scale, r: 1.2 * scale, mat: oakFoliageMat2 },
    { x: -0.85 * scale, y: 2.7 * scale, z: -0.5 * scale, r: 1.25 * scale, mat: oakFoliageMat1 },
    { x: 0.3 * scale, y: 3.6 * scale, z: -0.3 * scale, r: 1.1 * scale, mat: oakFoliageMat2 },
    { x: -0.4 * scale, y: 3.3 * scale, z: 0.8 * scale, r: 1.05 * scale, mat: oakFoliageMat1 },
  ];

  blobs.forEach((b) => {
    const geo = new THREE.DodecahedronGeometry(b.r);
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.position.set(b.x, b.y, b.z);
    mesh.castShadow = true;
    group.add(mesh);
  });

  return group;
}

/**
 * Vegetação rasteira: Tufo de grama selvagem (Wild Grass Clump)
 */
export function createGrassTuftMesh(scale: number = 1.0, isLush: boolean = false): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grass_tuft';

  const mat = isLush ? grassMatLush : grassMatWarm;
  const bladeGeo = new THREE.ConeGeometry(0.06 * scale, 0.58 * scale, 3);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.position.set(Math.cos(angle) * 0.13 * scale, 0.26 * scale, Math.sin(angle) * 0.13 * scale);
    blade.rotation.x = (Math.random() - 0.5) * 0.45;
    blade.rotation.z = (Math.random() - 0.5) * 0.45;
    group.add(blade);
  }

  return group;
}

/**
 * Vegetação rasteira: Samambaia baixa campestre (Fern Clump)
 */
export function createFernTuftMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fern_tuft';

  const frondGeo = new THREE.ConeGeometry(0.12 * scale, 0.7 * scale, 3);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.2;
    const frond = new THREE.Mesh(frondGeo, fernMat);
    frond.position.set(Math.cos(angle) * 0.18 * scale, 0.2 * scale, Math.sin(angle) * 0.18 * scale);
    frond.rotation.x = Math.sin(angle) * 0.75;
    frond.rotation.z = -Math.cos(angle) * 0.75;
    group.add(frond);
  }

  return group;
}

/**
 * Vegetação rasteira: Flores silvestres da estepe (Wildflowers)
 */
export function createWildflowerTuftMesh(
  scale: number = 1.0,
  variety: 'chamomile' | 'poppy' | 'lavender' | 'white' = 'chamomile'
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'wildflower_tuft';

  const mat =
    variety === 'poppy'
      ? flowerPoppyMat
      : variety === 'lavender'
      ? flowerLavenderMat
      : variety === 'white'
      ? flowerWhiteMat
      : flowerChamomileMat;

  // Haste e folhas verdes
  const stemMat = grassMatLush;
  const count = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const ox = (Math.random() - 0.5) * 0.3 * scale;
    const oz = (Math.random() - 0.5) * 0.3 * scale;
    const height = (0.28 + Math.random() * 0.18) * scale;

    const stemGeo = new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, height, 4);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(ox, height / 2, oz);
    group.add(stem);

    const flowerGeo = new THREE.SphereGeometry(0.06 * scale, 5, 5);
    const flower = new THREE.Mesh(flowerGeo, mat);
    flower.position.set(ox, height, oz);
    group.add(flower);
  }

  return group;
}

/**
 * Vegetação rasteira: Arbusto baixo com folhagem arredondada
 */
export function createShrubMesh(scale: number = 1.0, hasFlowers: boolean = false): THREE.Group {
  const group = new THREE.Group();
  group.name = 'shrub';

  const baseGeo = new THREE.DodecahedronGeometry(0.4 * scale);
  const mesh1 = new THREE.Mesh(baseGeo, shrubMat1);
  mesh1.position.set(0, 0.25 * scale, 0);
  mesh1.castShadow = true;
  group.add(mesh1);

  const mesh2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * scale), shrubMat2);
  mesh2.position.set(0.24 * scale, 0.22 * scale, 0.1 * scale);
  group.add(mesh2);

  const mesh3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 * scale), shrubMat1);
  mesh3.position.set(-0.2 * scale, 0.19 * scale, -0.16 * scale);
  group.add(mesh3);

  // Flores silvestres campestres
  if (hasFlowers) {
    for (let i = 0; i < 4; i++) {
      const flowerGeo = new THREE.SphereGeometry(0.05 * scale, 4, 4);
      const flower = new THREE.Mesh(flowerGeo, flowerChamomileMat);
      flower.position.set(
        (Math.random() - 0.5) * 0.45 * scale,
        0.36 * scale + Math.random() * 0.16 * scale,
        (Math.random() - 0.5) * 0.45 * scale
      );
      group.add(flower);
    }
  }

  return group;
}

/**
 * Pequena rocha decorativa de solo com musgo
 */
export function createPebbleMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ground_pebble';

  const rockGeo = new THREE.DodecahedronGeometry(0.14 * scale);
  const rock = new THREE.Mesh(rockGeo, Math.random() > 0.4 ? pebbleMat : mossyRockMat);
  rock.position.y = 0.08 * scale;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  group.add(rock);

  return group;
}

/**
 * Gera a floresta densa e variada nas bordas e perímetro exterior do mapa (74x74).
 * Combina 8 espécies de árvores: Coníferas, Acácias, Carvalhos Verdes e Dourados,
 * Choulos, Ciprestes Ancestrais, Bétulas Prateadas e Salgueiros.
 */
export function createBorderForestGroup(): THREE.Group {
  const forestGroup = new THREE.Group();
  forestGroup.name = 'border_forest_group';

  type TreeSpecies = 'conifer' | 'acacia' | 'oak' | 'autumn' | 'poplar' | 'cypress' | 'birch' | 'willow' | 'ancient';
  const treeConfigs: Array<{ x: number; z: number; type: TreeSpecies; scale: number }> = [];

  // 1. Borda Norte (Z entre -34 e -21)
  for (let x = -34; x <= 34; x += 2.8 + Math.random() * 1.6) {
    const z = -22 - Math.random() * 11.5;
    const speciesList: TreeSpecies[] = ['conifer', 'cypress', 'oak', 'poplar', 'birch', 'ancient'];
    treeConfigs.push({
      x: x + (Math.random() - 0.5) * 1.2,
      z,
      type: speciesList[Math.floor(Math.random() * speciesList.length)],
      scale: 0.85 + Math.random() * 0.5,
    });
  }

  // 2. Borda Sul (Z entre 21 e 34)
  for (let x = -34; x <= 34; x += 2.9 + Math.random() * 1.6) {
    const z = 22 + Math.random() * 11.5;
    const speciesList: TreeSpecies[] = ['acacia', 'willow', 'autumn', 'oak', 'cypress', 'conifer'];
    treeConfigs.push({
      x: x + (Math.random() - 0.5) * 1.2,
      z,
      type: speciesList[Math.floor(Math.random() * speciesList.length)],
      scale: 0.85 + Math.random() * 0.5,
    });
  }

  // 3. Borda Oeste (X entre -35 e -21)
  for (let z = -26; z <= 26; z += 3.0 + Math.random() * 1.6) {
    const x = -22 - Math.random() * 11.5;
    const speciesList: TreeSpecies[] = ['conifer', 'birch', 'poplar', 'oak', 'ancient'];
    treeConfigs.push({
      x,
      z: z + (Math.random() - 0.5) * 1.2,
      type: speciesList[Math.floor(Math.random() * speciesList.length)],
      scale: 0.85 + Math.random() * 0.5,
    });
  }

  // 4. Borda Leste (X entre 21 e 35)
  for (let z = -26; z <= 26; z += 3.0 + Math.random() * 1.6) {
    const x = 22 + Math.random() * 11.5;
    const speciesList: TreeSpecies[] = ['autumn', 'oak', 'willow', 'cypress', 'acacia'];
    treeConfigs.push({
      x,
      z: z + (Math.random() - 0.5) * 1.2,
      type: speciesList[Math.floor(Math.random() * speciesList.length)],
      scale: 0.85 + Math.random() * 0.5,
    });
  }

  // 5. Aglomerados de Colina nos 4 Cantos (NW, NE, SW, SE) para profundidade de horizonte
  const corners = [
    { cx: -28, cz: -28 },
    { cx: 28, cz: -28 },
    { cx: -28, cz: 28 },
    { cx: 28, cz: 28 },
  ];

  corners.forEach(({ cx, cz }) => {
    for (let i = 0; i < 7; i++) {
      const rx = cx + (Math.random() - 0.5) * 9;
      const rz = cz + (Math.random() - 0.5) * 9;
      const cornerSpecies: TreeSpecies[] = ['ancient', 'conifer', 'cypress', 'autumn', 'birch'];
      treeConfigs.push({
        x: rx,
        z: rz,
        type: cornerSpecies[Math.floor(Math.random() * cornerSpecies.length)],
        scale: 0.95 + Math.random() * 0.45,
      });
    }
  });

  // Instanciação com elevação exata do relevo montanhoso
  treeConfigs.forEach((cfg) => {
    let tree: THREE.Group;
    switch (cfg.type) {
      case 'conifer':
        tree = createConiferTreeMesh(cfg.scale);
        break;
      case 'acacia':
        tree = createAcaciaTreeMesh(cfg.scale);
        break;
      case 'poplar':
        tree = createPoplarTreeMesh(cfg.scale);
        break;
      case 'cypress':
        tree = createCypressTreeMesh(cfg.scale);
        break;
      case 'birch':
        tree = createBirchTreeMesh(cfg.scale);
        break;
      case 'willow':
        tree = createWillowTreeMesh(cfg.scale);
        break;
      case 'ancient':
        tree = createAncientOakTreeMesh(cfg.scale);
        break;
      case 'autumn':
        tree = createOakTreeMesh(cfg.scale, true);
        break;
      default:
        tree = createOakTreeMesh(cfg.scale, false);
        break;
    }

    const y = getTerrainHeight(cfg.x, cfg.z);
    tree.position.set(cfg.x, y, cfg.z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    forestGroup.add(tree);
  });

  return forestGroup;
}

/**
 * Gera a vegetação rasteira espalhada por toda a aldeia e vales:
 * - Mais de 220 tufos de grama selvagem (variantes secas e verdejantes)
 * - Flores silvestres (camomila amarela, papoulas vermelhas, lavanda púrpura e margaridas)
 * - Samambaias baixas perto de bosques e pedreiras
 * - Arbustos campestres e moitas com flores
 * - Pedras e seixos naturais de solo
 */
export function createUndergrowthVegetationGroup(): THREE.Group {
  const undergrowthGroup = new THREE.Group();
  undergrowthGroup.name = 'undergrowth_vegetation_group';

  // 1. Tufos de grama silvestre (200 unidades espalhadas de 3.2m a 28m de raio)
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.2 + Math.random() * 25.5;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 1.5;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 1.5;

    // Evita fogueira central imediata
    if (Math.hypot(x, z) < 2.5) continue;

    const scale = 0.7 + Math.random() * 0.6;
    const isLush = Math.random() > 0.42;
    const tuft = createGrassTuftMesh(scale, isLush);

    const y = getTerrainHeight(x, z);
    tuft.position.set(x, y, z);
    tuft.rotation.y = Math.random() * Math.PI * 2;
    undergrowthGroup.add(tuft);
  }

  // 2. Flores silvestres coloridas (60 unidades)
  const flowerTypes: ('chamomile' | 'poppy' | 'lavender' | 'white')[] = [
    'chamomile',
    'poppy',
    'lavender',
    'white',
  ];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.6 + Math.random() * 22;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (Math.hypot(x, z) < 2.6) continue;

    const scale = 0.8 + Math.random() * 0.45;
    const variety = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
    const flowers = createWildflowerTuftMesh(scale, variety);

    const y = getTerrainHeight(x, z);
    flowers.position.set(x, y, z);
    flowers.rotation.y = Math.random() * Math.PI * 2;
    undergrowthGroup.add(flowers);
  }

  // 3. Samambaias baixas (35 unidades nos bosques e encostas)
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4.5 + Math.random() * 22;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const scale = 0.8 + Math.random() * 0.45;
    const fern = createFernTuftMesh(scale);

    const y = getTerrainHeight(x, z);
    fern.position.set(x, y, z);
    fern.rotation.y = Math.random() * Math.PI * 2;
    undergrowthGroup.add(fern);
  }

  // 4. Arbustos arredondados (55 unidades)
  for (let i = 0; i < 55; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4.0 + Math.random() * 23;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (Math.hypot(x, z) < 2.8) continue;

    const scale = 0.75 + Math.random() * 0.5;
    const hasFlowers = Math.random() > 0.5;
    const shrub = createShrubMesh(scale, hasFlowers);

    const y = getTerrainHeight(x, z);
    shrub.position.set(x, y, z);
    shrub.rotation.y = Math.random() * Math.PI * 2;
    undergrowthGroup.add(shrub);
  }

  // 5. Pedras e seixos naturais de solo (30 unidades)
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.2 + Math.random() * 24;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const scale = 0.8 + Math.random() * 0.7;
    const pebble = createPebbleMesh(scale);

    const y = getTerrainHeight(x, z);
    pebble.position.set(x, y, z);
    undergrowthGroup.add(pebble);
  }

  return undergrowthGroup;
}
