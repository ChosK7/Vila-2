import * as THREE from 'three';

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

export interface LightingPreset {
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

export const LIGHTING_PRESETS: Record<TimeOfDay, LightingPreset> = {
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

/**
 * Returns visual day period classification according to exact decimal hour ranges.
 */
export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  // 05:30 - 08:00 -> Alvorada / Amanhecer
  if (hour >= 5.5 && hour < 8.0) return 'dawn';
  // 08:00 - 17:30 -> Dia Pleno
  if (hour >= 8.0 && hour < 17.5) return 'day';
  // 17:30 - 19:30 -> Pôr do Sol / Entardecer
  if (hour >= 17.5 && hour < 19.5) return 'sunset';
  // 19:30 - 05:30 -> Noite Sombria
  return 'night';
}

/**
 * Resolves effective TimeOfDay, taking manual override into account.
 */
export function resolveTimeOfDay(
  gameHour: number,
  override: 'auto' | TimeOfDay
): TimeOfDay {
  if (override !== 'auto') {
    return override;
  }
  return getTimeOfDayFromHour(gameHour);
}

export interface LightingObjects {
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
}

/**
 * Creates initial ambient and directional lights configured for the scene.
 */
export function createSceneLighting(): LightingObjects {
  const ambientLight = new THREE.AmbientLight(0xfef3c7, 0.9);

  const directionalLight = new THREE.DirectionalLight(0xffedd5, 1.6);
  directionalLight.position.set(15, 25, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 60;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;

  return { ambientLight, directionalLight };
}

/**
 * Creates the celestial night star dome points mesh.
 */
export function createNightStars(): THREE.Points {
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
  return stars;
}

/**
 * Creates the stylized glowing celestial moon mesh.
 */
export function createNightMoon(): THREE.Mesh {
  const moonGeo = new THREE.SphereGeometry(1.6, 16, 16);
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0,
  });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(-22, 28, -20);
  moon.name = 'night_moon';
  return moon;
}

export interface LightingTransitionState {
  currentSkyColor: THREE.Color;
  currentFogColor: THREE.Color;
}

export interface LightingUpdateContext {
  scene: THREE.Scene;
  ambientLight: THREE.AmbientLight | null;
  directionalLight: THREE.DirectionalLight | null;
  groundMaterial: THREE.MeshStandardMaterial | null;
  stars: THREE.Points | null;
  moon: THREE.Mesh | null;
  campfireLight?: THREE.PointLight | null;
  currentSkyColor: THREE.Color;
  currentFogColor: THREE.Color;
  gameHour?: number;
}

/**
 * Smoothly updates atmospheric lighting, sky, fog, sun/moon arcs, and campfire illumination.
 */
export function updateLightingForTimeOfDay(
  timeOfDay: TimeOfDay,
  context: LightingUpdateContext,
  time: number
): void {
  const targetPreset = LIGHTING_PRESETS[timeOfDay];
  if (!targetPreset) return;

  const { scene } = context;

  // 1. Lerp Sky background color smoothly
  context.currentSkyColor.lerp(targetPreset.skyColor, 0.04);
  scene.background = context.currentSkyColor;

  // 2. Lerp Fog color and density smoothly
  if (scene.fog && scene.fog instanceof THREE.FogExp2) {
    context.currentFogColor.lerp(targetPreset.fogColor, 0.04);
    scene.fog.color.copy(context.currentFogColor);
    scene.fog.density = THREE.MathUtils.lerp(
      scene.fog.density,
      targetPreset.fogDensity,
      0.04
    );
  }

  // 3. Lerp Ambient Light color and intensity
  if (context.ambientLight) {
    context.ambientLight.color.lerp(targetPreset.ambientColor, 0.04);
    context.ambientLight.intensity = THREE.MathUtils.lerp(
      context.ambientLight.intensity,
      targetPreset.ambientIntensity,
      0.04
    );
  }

  // 4. Lerp Directional Light (Sun/Moon) color, intensity, and continuous orbit arc
  if (context.directionalLight) {
    context.directionalLight.color.lerp(targetPreset.sunColor, 0.04);
    context.directionalLight.intensity = THREE.MathUtils.lerp(
      context.directionalLight.intensity,
      targetPreset.sunIntensity,
      0.04
    );

    // Calculate continuous sun/moon position in the sky based on gameHour
    const hour = context.gameHour ?? 6.0;
    const h = ((hour % 24) + 24) % 24;
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

    context.directionalLight.position.lerp(celestialPos, 0.03);
  }

  // 5. Lerp Ground plane tint
  if (context.groundMaterial) {
    context.groundMaterial.color.lerp(targetPreset.groundColor, 0.04);
  }

  // 6. Stars celestial rotation and smooth fade in/out
  if (context.stars) {
    context.stars.rotation.y = time * 0.003;
    if (context.stars.material instanceof THREE.PointsMaterial) {
      const starsMat = context.stars.material;
      starsMat.opacity = THREE.MathUtils.lerp(
        starsMat.opacity,
        targetPreset.starsOpacity,
        0.04
      );
      context.stars.visible = starsMat.opacity > 0.01;
    }
  }

  // 7. Moon smooth fade in/out and celestial arc
  if (context.moon) {
    if (context.moon.material instanceof THREE.MeshBasicMaterial) {
      const moonMat = context.moon.material;
      moonMat.opacity = THREE.MathUtils.lerp(
        moonMat.opacity,
        targetPreset.moonOpacity,
        0.04
      );
      context.moon.visible = moonMat.opacity > 0.01;
    }

    const hour = context.gameHour ?? 6.0;
    const h = ((hour % 24) + 24) % 24;
    const nightH = h >= 19.5 ? h - 19.5 : h + 4.5;
    const moonProgress = nightH / 10.0;
    const moonAngle = moonProgress * Math.PI;
    context.moon.position.x = -Math.cos(moonAngle) * 26;
    context.moon.position.y = Math.sin(moonAngle) * 28 + 4;
    context.moon.position.z = -20;
  }

  // 8. Campfire PointLight: extra warm amber illumination and flicker at night!
  if (context.campfireLight) {
    const flicker = Math.sin(time * 15) * 0.35 + Math.cos(time * 23) * 0.15;
    const targetCampfireIntensity = targetPreset.campfireLightIntensity + flicker;
    context.campfireLight.intensity = THREE.MathUtils.lerp(
      context.campfireLight.intensity,
      targetCampfireIntensity,
      0.08
    );
  }
}
