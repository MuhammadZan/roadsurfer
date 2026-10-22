import * as THREE from 'three';
import { textures } from './geo.js';

let cache;

export function shared() {
  if (cache) return cache;

  const volt = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffc14a,
    emissiveIntensity: 1.7,
    roughness: 0.28,
    metalness: 0.45,
  });
  const shield = new THREE.MeshStandardMaterial({
    color: 0x8af4ff,
    emissive: 0x3ad7ff,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.2,
  });
  const magnet = new THREE.MeshStandardMaterial({
    color: 0xff6ad5,
    emissive: 0xff3db8,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.3,
  });
  const nitro = new THREE.MeshStandardMaterial({
    color: 0xff5a2a,
    emissive: 0xff3b12,
    emissiveIntensity: 1.5,
    roughness: 0.3,
    metalness: 0.2,
  });

  cache = {
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.72, metalness: 0.08 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xd5d8df, roughness: 0.22, metalness: 0.92 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xb7e4ff,
      roughness: 0.05,
      metalness: 0.15,
      transparent: true,
      opacity: 0.5,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0xff1d3a,
      emissive: 0xff1a30,
      emissiveIntensity: 2.1,
      roughness: 0.32,
    }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0xfff6d8,
      emissive: 0xfff1c4,
      emissiveIntensity: 2.6,
      roughness: 0.25,
    }),
    asphalt: new THREE.MeshStandardMaterial({
      map: textures.asphalt,
      roughness: 0.9,
      metalness: 0.04,
    }),
    sand: new THREE.MeshStandardMaterial({
      map: textures.sand,
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
    }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8e8b86, roughness: 0.92 }),
    jersey: new THREE.MeshStandardMaterial({ color: 0xd5cfc4, roughness: 0.84 }),
    stripe: new THREE.MeshStandardMaterial({
      map: textures.stripe,
      roughness: 0.62,
      metalness: 0.05,
    }),
    cone: new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.55 }),
    coneBand: new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }),
    line: new THREE.MeshStandardMaterial({
      color: 0xf3efe6,
      emissive: 0xb7b09a,
      emissiveIntensity: 0.18,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    edge: new THREE.MeshStandardMaterial({
      color: 0xfff8ee,
      emissive: 0xded6c4,
      emissiveIntensity: 0.2,
      roughness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    arrow: new THREE.MeshBasicMaterial({
      map: textures.arrow,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    chevron: new THREE.MeshStandardMaterial({
      map: textures.chevron,
      roughness: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x1e8a45, roughness: 0.72 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6d4c2e, roughness: 0.86 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x2a242e, roughness: 0.9 }),
    roofFar: new THREE.MeshStandardMaterial({ color: 0x241820, roughness: 0.9, fog: false }),
    mount: new THREE.MeshBasicMaterial({ color: 0x1a1022, fog: false }),
    cloud: new THREE.MeshBasicMaterial({
      color: 0xffc8b4,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: false,
    }),
    blimp: new THREE.MeshStandardMaterial({ color: 0xf4e6d6, roughness: 0.55, metalness: 0.05, fog: false }),
    blimpRed: new THREE.MeshStandardMaterial({ color: 0xd30b12, roughness: 0.45, fog: false }),
    gull: new THREE.MeshBasicMaterial({ color: 0xfff7f0, fog: false, side: THREE.DoubleSide }),
    volt,
    shield,
    magnet,
    nitro,
    plate: new THREE.MeshStandardMaterial({ map: textures.plate, roughness: 0.6 }),
    emblem: new THREE.MeshStandardMaterial({ map: textures.emblem, roughness: 0.4, metalness: 0.2 }),
    tuck: new THREE.MeshBasicMaterial({ map: textures.tuck }),
    laneSign: new THREE.MeshBasicMaterial({ map: textures.laneSign }),
    banner: new THREE.MeshBasicMaterial({ map: textures.banner, fog: false, side: THREE.DoubleSide }),
    beam: new THREE.MeshBasicMaterial({
      color: 0xfff2cc,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    flame: new THREE.MeshBasicMaterial({
      color: 0xff7a1a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    flameCore: new THREE.MeshBasicMaterial({
      color: 0xfff1c4,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    bubble: new THREE.MeshBasicMaterial({
      color: 0x8aefff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    glowWarm: new THREE.SpriteMaterial({
      map: textures.glow,
      color: 0xfff0c8,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.95,
    }),
    glowTail: new THREE.SpriteMaterial({
      map: textures.glow,
      color: 0xff3355,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    }),
    blob: new THREE.MeshBasicMaterial({
      map: textures.shadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.38,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    shirts: [0xe23d3d, 0x3d7ee0, 0xf2f2f2, 0x222222, 0xf0c14a, 0x2f9e78].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
    ),
    skins: [0xf0c7a0, 0xc68642, 0x8d5524, 0x5c3317].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.68 }),
    ),
    hair: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
    shorts: new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.8 }),
  };

  return cache;
}

export function heroPaint(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.62,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1,
  });
}

export function trafficPaint(color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.48,
    roughness: 0.38,
  });
  mat.userData.dispose = true;
  return mat;
}

export function facade(w, h, fog) {
  const map = textures.windows.clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 2.4)));
  map.colorSpace = THREE.SRGBColorSpace;
  const win = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffe6c4,
    emissiveIntensity: fog ? 0.62 : 0.85,
    roughness: 0.86,
    metalness: 0.04,
    fog,
  });
  const roof = fog ? shared().roof : shared().roofFar;
  return {
    materials: [win, win, roof, roof, win, win],
    trash: [map, win],
  };
}

export function billboardMaterial(index) {
  const map = textures.billboard[index % textures.billboard.length];
  return new THREE.MeshBasicMaterial({ map });
}
