import * as THREE from 'three';
import { Villager } from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  toolSlot: THREE.Group;
  wheatCarry: THREE.Group;
  woodCarry: THREE.Group;
  stoneCarry: THREE.Group;
  clayCarry: THREE.Group;
  mealBowl: THREE.Group;
  villagerId: string;
}

export function createCharacterMesh(villager: Villager): CharacterRig {
  const root = new THREE.Group();
  root.name = `character-${villager.id}`;

  // Materials (Anime Chibi Aesthetic)
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe0bd, // Warm anime peachy skin
    roughness: 0.35,
    metalness: 0.0,
  });

  // Anime Eyes Materials
  const eyeScleraMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeIrisMaterial = new THREE.MeshBasicMaterial({ color: 0x2563eb }); // Vibrant anime sapphire blue
  const eyePupilMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Deep pupil
  const eyeSparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Catchlight glimmer
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.45,
  }); // Cute anime pink blush

  const hairColor = villager.hairStyle === 'elder' ? 0xe2e8f0 : (villager.id.charCodeAt(0) % 2 === 0 ? 0x3e2723 : 0x78350f);
  const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.65 });

  const tunicColor = new THREE.Color(villager.tunicColor || '#8C5A32');
  const tunicMaterial = new THREE.MeshStandardMaterial({
    color: tunicColor,
    roughness: 0.45,
  });

  const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x271911, roughness: 0.7 });
  const limbMaterial = new THREE.MeshStandardMaterial({ color: 0xffe0bd, roughness: 0.4 }); // Skin-tone chibi arms
  const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

  // 1. Head (Expressive anime chibi head)
  const headGeo = new THREE.SphereGeometry(0.34, 24, 24);
  const head = new THREE.Mesh(headGeo, skinMaterial);
  head.position.y = 1.35;
  head.scale.set(1.05, 1.0, 1.0); // Slightly wider cute chibi face
  head.castShadow = true;
  root.add(head);

  // Big Expressive Anime Eyes (White sclera + colorful iris + pupil + catchlight sparkles)
  const createAnimeEye = (isRight: boolean) => {
    const eyeGroup = new THREE.Group();
    const xPos = isRight ? 0.105 : -0.105;
    eyeGroup.position.set(xPos, 0.03, 0.30);
    eyeGroup.rotation.y = isRight ? 0.18 : -0.18;

    // Sclera base (White oval)
    const scleraGeo = new THREE.SphereGeometry(0.065, 14, 14);
    const sclera = new THREE.Mesh(scleraGeo, eyeScleraMaterial);
    sclera.scale.set(0.9, 1.25, 0.25);
    eyeGroup.add(sclera);

    // Iris (Vibrant blue/hazel)
    const irisGeo = new THREE.CircleGeometry(0.052, 16);
    const iris = new THREE.Mesh(irisGeo, eyeIrisMaterial);
    iris.position.set(0, -0.005, 0.02);
    eyeGroup.add(iris);

    // Pupil
    const pupilGeo = new THREE.CircleGeometry(0.032, 14);
    const pupil = new THREE.Mesh(pupilGeo, eyePupilMaterial);
    pupil.position.set(0, 0, 0.025);
    eyeGroup.add(pupil);

    // Big anime sparkle (upper-left shine)
    const sparkleBigGeo = new THREE.CircleGeometry(0.016, 10);
    const sparkleBig = new THREE.Mesh(sparkleBigGeo, eyeSparkleMaterial);
    sparkleBig.position.set(-0.015, 0.018, 0.03);
    eyeGroup.add(sparkleBig);

    // Small anime sparkle (lower-right shine)
    const sparkleSmallGeo = new THREE.CircleGeometry(0.008, 8);
    const sparkleSmall = new THREE.Mesh(sparkleSmallGeo, eyeSparkleMaterial);
    sparkleSmall.position.set(0.015, -0.016, 0.03);
    eyeGroup.add(sparkleSmall);

    // Eyelash upper arc
    const lashGeo = new THREE.TorusGeometry(0.055, 0.008, 6, 12, Math.PI * 0.7);
    const lash = new THREE.Mesh(lashGeo, eyePupilMaterial);
    lash.position.set(0, 0.045, 0.02);
    lash.rotation.z = isRight ? -0.15 : Math.PI - 0.15;
    eyeGroup.add(lash);

    return eyeGroup;
  };

  head.add(createAnimeEye(false)); // Left eye
  head.add(createAnimeEye(true));  // Right eye

  // Cute Anime Rosy Blush Cheeks
  const leftBlushGeo = new THREE.CircleGeometry(0.045, 12);
  const leftBlush = new THREE.Mesh(leftBlushGeo, blushMaterial);
  leftBlush.position.set(-0.16, -0.08, 0.27);
  leftBlush.rotation.y = -0.45;
  head.add(leftBlush);

  const rightBlush = new THREE.Mesh(leftBlushGeo, blushMaterial);
  rightBlush.position.set(0.16, -0.08, 0.27);
  rightBlush.rotation.y = 0.45;
  head.add(rightBlush);

  // Cute small anime mouth
  const mouthGeo = new THREE.TorusGeometry(0.022, 0.005, 6, 10, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, eyePupilMaterial);
  mouth.position.set(0, -0.12, 0.31);
  mouth.rotation.x = Math.PI * 0.1;
  head.add(mouth);

  // Eyebrows (delicate expressive anime brows)
  const browGeo = new THREE.BoxGeometry(0.08, 0.018, 0.02);
  const leftBrow = new THREE.Mesh(browGeo, hairMaterial);
  leftBrow.position.set(-0.11, 0.15, 0.29);
  leftBrow.rotation.z = -0.08;
  head.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, hairMaterial);
  rightBrow.position.set(0.11, 0.15, 0.29);
  rightBrow.rotation.z = 0.08;
  head.add(rightBrow);

  // Anime Hair with Tufts and Fringe
  const hairCapGeo = new THREE.SphereGeometry(0.36, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hairCap = new THREE.Mesh(hairCapGeo, hairMaterial);
  hairCap.position.set(0, 0.04, -0.02);
  head.add(hairCap);

  // Anime Hair Front Bangs / Fringe
  for (let f = -2; f <= 2; f++) {
    const bangGeo = new THREE.ConeGeometry(0.07, 0.18, 6);
    const bang = new THREE.Mesh(bangGeo, hairMaterial);
    bang.position.set(f * 0.09, 0.24 - Math.abs(f) * 0.03, 0.25);
    bang.rotation.x = 0.6;
    bang.rotation.z = -f * 0.2;
    head.add(bang);
  }

  // Hair Style custom flourishes
  if (villager.hairStyle === 'spiky') {
    for (let i = -2; i <= 2; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.07, 0.24, 6);
      const spike = new THREE.Mesh(spikeGeo, hairMaterial);
      spike.position.set(i * 0.09, 0.36, 0.05 - Math.abs(i) * 0.04);
      spike.rotation.z = -i * 0.22;
      head.add(spike);
    }
  } else if (villager.hairStyle === 'elder') {
    // Beard
    const beardGeo = new THREE.ConeGeometry(0.14, 0.28, 8);
    const beard = new THREE.Mesh(beardGeo, hairMaterial);
    beard.position.set(0, -0.22, 0.23);
    beard.rotation.x = 0.2;
    head.add(beard);
  } else if (villager.hairStyle === 'bun') {
    const bunGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const bun = new THREE.Mesh(bunGeo, hairMaterial);
    bun.position.set(0, 0.40, -0.12);
    head.add(bun);
  }

  // 2. Body / Tunic (Cute chibi proportioned torso)
  const bodyGeo = new THREE.CylinderGeometry(0.2, 0.32, 0.65, 16);
  const body = new THREE.Mesh(bodyGeo, tunicMaterial);
  body.position.y = 0.85;
  body.castShadow = true;
  root.add(body);

  // Belt
  const beltGeo = new THREE.CylinderGeometry(0.25, 0.26, 0.06, 16);
  const belt = new THREE.Mesh(beltGeo, beltMaterial);
  belt.position.y = 0.02;
  body.add(belt);

  // 3. Legs (Hips at y=0.55, legs extend down to y=0)
  const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.5, 12);
  const footGeo = new THREE.BoxGeometry(0.08, 0.05, 0.12);

  // Left Leg Pivot
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.12, 0.55, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, limbMaterial);
  leftLegMesh.position.y = -0.25;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  const leftFoot = new THREE.Mesh(footGeo, shoeMaterial);
  leftFoot.position.set(0, -0.48, 0.03);
  leftLeg.add(leftFoot);
  root.add(leftLeg);

  // Right Leg Pivot
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.12, 0.55, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, limbMaterial);
  rightLegMesh.position.y = -0.25;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  const rightFoot = new THREE.Mesh(footGeo, shoeMaterial);
  rightFoot.position.set(0, -0.48, 0.03);
  rightLeg.add(rightFoot);
  root.add(rightLeg);

  // 4. Arms (Shoulders at y=1.05)
  const armGeo = new THREE.CylinderGeometry(0.038, 0.035, 0.45, 10);
  const handGeo = new THREE.SphereGeometry(0.045, 10, 10);

  // Left Arm Pivot
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.25, 1.08, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, limbMaterial);
  leftArmMesh.position.y = -0.22;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);

  const leftHand = new THREE.Mesh(handGeo, skinMaterial);
  leftHand.position.y = -0.44;
  leftArm.add(leftHand);
  root.add(leftArm);

  // Right Arm Pivot (Holds primary tools like sickle/axe/spear)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.25, 1.08, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, limbMaterial);
  rightArmMesh.position.y = -0.22;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  const rightHand = new THREE.Mesh(handGeo, skinMaterial);
  rightHand.position.y = -0.44;
  rightArm.add(rightHand);
  root.add(rightArm);

  // Tool attachment point on right hand
  const toolSlot = new THREE.Group();
  toolSlot.position.set(0, -0.44, 0);
  rightArm.add(toolSlot);

  // Meal Bowl / Cup for breakfast, lunch, and dinner
  const mealBowl = new THREE.Group();
  mealBowl.position.set(0, -0.42, 0.12);
  mealBowl.visible = false;

  const bowlGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.09, 12);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 }); // rustic terracotta bowl
  const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
  mealBowl.add(bowlMesh);

  // Food porridge/stew surface inside bowl
  const soupGeo = new THREE.CircleGeometry(0.10, 12);
  const soupMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const soupMesh = new THREE.Mesh(soupGeo, soupMat);
  soupMesh.rotation.x = -Math.PI / 2;
  soupMesh.position.y = 0.04;
  mealBowl.add(soupMesh);

  // Small spoon/bread
  const spoonGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6);
  const spoonMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
  const spoonMesh = new THREE.Mesh(spoonGeo, spoonMat);
  spoonMesh.rotation.z = Math.PI / 4;
  spoonMesh.position.set(0.06, 0.05, 0);
  mealBowl.add(spoonMesh);

  rightArm.add(mealBowl);

  // Wheat bundle carried under arm / on back
  const wheatCarry = new THREE.Group();
  wheatCarry.position.set(0, 0.9, -0.22);
  wheatCarry.visible = false;

  const wheatSheafGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 12);
  const wheatMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });
  const wheatSheaf = new THREE.Mesh(wheatSheafGeo, wheatMat);
  wheatSheaf.rotation.x = Math.PI / 4;
  wheatCarry.add(wheatSheaf);

  // Twine rope around sheaf
  const twineGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16);
  const twineMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
  const twine = new THREE.Mesh(twineGeo, twineMat);
  twine.rotation.x = Math.PI / 4;
  wheatCarry.add(twine);

  root.add(wheatCarry);

  // Wood log carried on shoulder / back
  const woodCarry = new THREE.Group();
  woodCarry.position.set(0, 0.95, -0.22);
  woodCarry.visible = false;

  const logGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.75, 10);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.9 });
  const logMesh = new THREE.Mesh(logGeo, logMat);
  logMesh.rotation.x = Math.PI / 3.5;
  logMesh.rotation.z = Math.PI / 10;
  woodCarry.add(logMesh);

  const logBandGeo = new THREE.TorusGeometry(0.15, 0.025, 8, 12);
  const logBandMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.8 });
  const logBand = new THREE.Mesh(logBandGeo, logBandMat);
  logBand.rotation.x = Math.PI / 3.5;
  woodCarry.add(logBand);

  root.add(woodCarry);

  // Stone block / rock basket carried on back
  const stoneCarry = new THREE.Group();
  stoneCarry.position.set(0, 0.9, -0.22);
  stoneCarry.visible = false;

  const stoneGeo = new THREE.DodecahedronGeometry(0.22, 0);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
  const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
  stoneMesh.scale.set(1.1, 0.85, 1.0);
  stoneCarry.add(stoneMesh);

  root.add(stoneCarry);

  // Clay pot / clay vessel carried
  const clayCarry = new THREE.Group();
  clayCarry.position.set(0, 0.9, -0.22);
  clayCarry.visible = false;

  const potGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.35, 12);
  const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 });
  const potMesh = new THREE.Mesh(potGeo, potMat);
  clayCarry.add(potMesh);

  root.add(clayCarry);

  // Setup specific tool according to villager job
  setupToolForJob(toolSlot, villager.job);

  // Shadow circle on ground
  const shadowGeo = new THREE.CircleGeometry(0.35, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  return {
    root,
    head,
    body,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    toolSlot,
    wheatCarry,
    woodCarry,
    stoneCarry,
    clayCarry,
    mealBowl,
    villagerId: villager.id,
  };
}

export function setupToolForJob(toolSlot: THREE.Group, job: string) {
  // Clear existing tools
  while (toolSlot.children.length > 0) {
    toolSlot.remove(toolSlot.children[0]);
  }

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

  if (job === 'farmer') {
    // Curved Sickle
    const sickleGroup = new THREE.Group();
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.x = Math.PI / 2;
    sickleGroup.add(handle);

    // Curved Blade (Torus arc)
    const bladeGeo = new THREE.TorusGeometry(0.14, 0.02, 8, 16, Math.PI * 0.9);
    const blade = new THREE.Mesh(bladeGeo, stoneMat);
    blade.position.set(0, 0, 0.2);
    blade.rotation.y = Math.PI / 2;
    sickleGroup.add(blade);

    toolSlot.add(sickleGroup);
  } else if (job === 'lumberjack') {
    // Stone Axe
    const axeGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.x = Math.PI / 2;
    axeGroup.add(handle);

    const headGeo = new THREE.BoxGeometry(0.06, 0.16, 0.1);
    const head = new THREE.Mesh(headGeo, stoneMat);
    head.position.set(0, 0, 0.25);
    axeGroup.add(head);

    toolSlot.add(axeGroup);
  } else if (job === 'quarryman' || job === 'builder') {
    // Pickaxe / Hammer
    const pickGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.x = Math.PI / 2;
    pickGroup.add(handle);

    const headGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
    const head = new THREE.Mesh(headGeo, stoneMat);
    head.position.set(0, 0, 0.22);
    pickGroup.add(head);

    toolSlot.add(pickGroup);
  } else if (job === 'guard') {
    // Spear & Round Shield
    const guardGroup = new THREE.Group();
    // Tall spear
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
    const shaft = new THREE.Mesh(shaftGeo, woodMat);
    shaft.position.y = 0.4;
    guardGroup.add(shaft);

    const tipGeo = new THREE.ConeGeometry(0.05, 0.2, 8);
    const tip = new THREE.Mesh(tipGeo, stoneMat);
    tip.position.y = 1.15;
    guardGroup.add(tip);

    // Round wooden shield on arm
    const shieldGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16);
    const shield = new THREE.Mesh(shieldGeo, woodMat);
    shield.position.set(-0.15, 0.1, 0.1);
    shield.rotation.z = Math.PI / 2;
    guardGroup.add(shield);

    toolSlot.add(guardGroup);
  } else if (job === 'elder') {
    // Cuneiform Clay Tablet
    const tabletGroup = new THREE.Group();
    const tabGeo = new THREE.BoxGeometry(0.24, 0.32, 0.04);
    const tablet = new THREE.Mesh(tabGeo, clayMat);
    tablet.rotation.x = Math.PI / 3;
    tabletGroup.add(tablet);

    toolSlot.add(tabletGroup);
  }
}
