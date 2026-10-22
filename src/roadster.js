import * as THREE from 'three';
import { box, taperBox } from './geo.js';
import { heroPaint, shared } from './materials.js';
import { paintById, driverById } from './config.js';

const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20);
const rimGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.3, 18);
const capGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 12);
const spokeGeo = new THREE.BoxGeometry(0.045, 0.2, 0.05);

function makeWheel(mats, x, z) {
  const steer = new THREE.Group();
  steer.position.set(x, 0.36, z);
  const spin = new THREE.Group();
  steer.add(spin);

  const tire = new THREE.Mesh(tireGeo, mats.rubber);
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(rimGeo, mats.rim);
  rim.rotation.z = Math.PI / 2;
  const cap = new THREE.Mesh(capGeo, mats.dark);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = x > 0 ? 0.08 : -0.08;
  spin.add(tire, rim, cap);

  const side = x > 0 ? 0.07 : -0.07;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, mats.rim);
    spoke.position.set(side, Math.sin(a) * 0.15, Math.cos(a) * 0.15);
    spoke.rotation.x = Math.PI / 2 - a;
    spin.add(spoke);
  }
  return { steer, spin };
}

function lampSprite(mats, x, y, z, tail = false) {
  const s = new THREE.Sprite(tail ? mats.glowTail : mats.glowWarm);
  s.position.set(x, y, z);
  s.scale.setScalar(tail ? 0.42 : 0.55);
  return s;
}

export function createRoadster() {
  const mats = shared();
  const group = new THREE.Group();
  const paint = heroPaint(paintById('crimson').color);
  const glowMat = new THREE.MeshStandardMaterial({
    color: paintById('crimson').glow,
    emissive: paintById('crimson').glow,
    emissiveIntensity: 1.8,
    roughness: 0.4,
  });
  const tailMat = mats.tail.clone();

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  add(taperBox(1.9, 1.74, 0.36, 0.3, 3.05), paint, 0, 0.3, 0.08);
  add(taperBox(1.74, 1.18, 0.28, 0.16, 1.35), paint, 0, 0.3, -1.72);
  add(taperBox(1.48, 1.02, 0.12, 0.045, 1.25), paint, 0, 0.58, -1.42);
  add(taperBox(1.7, 1.5, 0.16, 0.24, 1.15), paint, 0, 0.58, 1.12);
  add(box(1.55, 0.08, 0.42), paint, 0, 0.86, 1.62);

  add(box(0.12, 0.28, 1.05), paint, -0.66, 0.78, 0.05);
  add(box(0.12, 0.28, 1.05), paint, 0.66, 0.78, 0.05);
  add(box(1.15, 0.06, 0.9), mats.dark, 0, 0.66, 0.12);

  add(box(1.32, 0.46, 0.05), mats.glass, 0, 0.98, -0.48, 0.58, 0, 0);
  add(box(0.08, 0.12, 2.35), mats.dark, -0.96, 0.28, 0.05);
  add(box(0.08, 0.12, 2.35), mats.dark, 0.96, 0.28, 0.05);
  add(box(1.72, 0.06, 0.22), mats.dark, 0, 0.3, -2.28);
  add(box(1.35, 0.045, 0.06), mats.lamp, 0, 0.5, -2.32);
  add(box(0.28, 0.08, 0.06), mats.lamp, -0.62, 0.48, -2.3);
  add(box(0.28, 0.08, 0.06), mats.lamp, 0.62, 0.48, -2.3);
  add(box(1.42, 0.07, 0.06), tailMat, 0, 0.62, 2.02);

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), mats.plate);
  plate.position.set(0, 0.5, 2.08);
  group.add(plate);

  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), mats.emblem);
  emblem.rotation.x = -Math.PI / 2;
  emblem.position.set(0, 0.72, -1.35);
  group.add(emblem);

  for (const x of [-1.02, 1.02]) {
    add(box(0.42, 0.14, 0.7), paint, x, 0.58, -1.32);
    add(box(0.46, 0.16, 0.76), paint, x, 0.6, 1.28);
  }

  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 18, Math.PI), mats.dark);
  hoop.position.set(0, 0.86, 0.72);
  hoop.castShadow = true;
  group.add(hoop);

  add(box(1.55, 0.05, 0.55), paint, 0, 0.95, 1.72);
  add(box(0.06, 0.16, 0.08), mats.dark, -0.42, 0.84, 1.55);
  add(box(0.06, 0.16, 0.08), mats.dark, 0.42, 0.84, 1.55);

  for (let i = 0; i < 4; i++) {
    add(box(0.04, 0.14, 0.22), mats.dark, -0.28 + i * 0.18, 0.32, 1.95);
  }

  add(box(0.34, 0.22, 0.36), mats.dark, -0.36, 0.78, 0.18);
  add(box(0.34, 0.22, 0.36), mats.dark, 0.36, 0.78, 0.22);
  add(box(0.34, 0.32, 0.08), mats.dark, -0.36, 0.98, 0.34);
  add(box(0.34, 0.32, 0.08), mats.dark, 0.36, 0.98, 0.38);

  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: 0.32, metalness: 0.12 });
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x1b242c,
    emissive: 0x1b242c,
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.6,
  });

  const driver = new THREE.Group();
  driver.position.set(-0.36, 0.86, 0.16);
  driver.userData.baseY = 0.86;
  const pelvis = new THREE.Mesh(box(0.28, 0.16, 0.28), suitMat);
  const torso = new THREE.Mesh(box(0.32, 0.32, 0.2), suitMat);
  torso.position.set(0, 0.24, 0.02);
  torso.rotation.x = -0.15;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), helmetMat);
  helmet.position.set(0, 0.48, 0.02);
  helmet.scale.set(1, 0.92, 1.05);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), visorMat);
  visor.position.set(0, 0.47, -0.06);
  visor.scale.set(1.05, 0.55, 0.45);
  driver.add(pelvis, torso, helmet, visor);
  group.add(driver);

  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 16), mats.dark);
  steering.position.set(-0.36, 0.9, -0.22);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), suitMat);
  handL.position.set(-0.1, 0, 0);
  const handR = handL.clone();
  handR.position.x = 0.1;
  steering.add(handL, handR);
  group.add(steering);

  add(box(0.16, 0.08, 0.1), mats.dark, -0.95, 0.78, -0.15);
  add(box(0.16, 0.08, 0.1), mats.dark, 0.95, 0.78, -0.15);

  const underglow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.3), glowMat);
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.set(0, 0.06, 0.1);
  underglow.castShadow = false;
  group.add(underglow);

  const wheels = {
    fl: makeWheel(mats, -1.02, -1.32),
    fr: makeWheel(mats, 1.02, -1.32),
    rl: makeWheel(mats, -1.04, 1.28),
    rr: makeWheel(mats, 1.04, 1.28),
  };
  group.add(wheels.fl.steer, wheels.fr.steer, wheels.rl.steer, wheels.rr.steer);

  const beamGeo = new THREE.CylinderGeometry(0.05, 0.38, 5.2, 10, 1, true);
  const beams = new THREE.Group();
  for (const x of [-0.55, 0.55]) {
    const beam = new THREE.Mesh(beamGeo, mats.beam);
    beam.rotation.x = Math.PI / 2;
    beam.position.set(x, 0.52, -4.7);
    beam.castShadow = false;
    beams.add(beam);
  }
  group.add(beams);
  const tailGlowL = lampSprite(mats, -0.48, 0.62, 2.08, true);
  const tailGlowR = lampSprite(mats, 0.48, 0.62, 2.08, true);
  tailGlowL.scale.setScalar(0.28);
  tailGlowR.scale.setScalar(0.28);
  group.add(tailGlowL, tailGlowR);

  const flames = new THREE.Group();
  for (const x of [-0.38, 0.38]) {
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), mats.flame);
    outer.rotation.x = Math.PI / 2;
    outer.position.set(x, 0.32, 2.4);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.32, 6), mats.flameCore);
    core.rotation.x = Math.PI / 2;
    core.position.set(x, 0.32, 2.25);
    flames.add(outer, core);
  }
  flames.visible = false;
  group.add(flames);

  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.85, 24, 16), mats.bubble);
  bubble.position.set(0, 0.7, 0.1);
  bubble.visible = false;
  bubble.castShadow = false;
  group.add(bubble);

  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  underglow.castShadow = false;
  bubble.castShadow = false;
  beams.traverse((obj) => {
    obj.castShadow = false;
  });
  flames.traverse((obj) => {
    obj.castShadow = false;
  });
  plate.castShadow = false;

  return {
    group,
    paint,
    glowMat,
    underglow,
    tailMat,
    helmetMat,
    suitMat,
    visorMat,
    wheels,
    flames,
    bubble,
    driver,
    steering,
  };
}

export function applyPaint(car, paintId) {
  const spec = paintById(paintId);
  car.paint.color.set(spec.color);
  car.glowMat.color.set(spec.glow);
  car.glowMat.emissive.set(spec.glow);
}

export function applyDriver(car, driverId) {
  const spec = driverById(driverId);
  car.helmetMat.color.set(spec.helmet);
  car.suitMat.color.set(spec.suit);
  car.visorMat.color.set(spec.visor);
  car.visorMat.emissive.set(spec.visor);
}

export function updateRoadster(car, dt, state) {
  const spin = (state.speed * dt) / 0.36;
  for (const key of ['fl', 'fr', 'rl', 'rr']) car.wheels[key].spin.rotation.x -= spin;
  const steer = THREE.MathUtils.clamp(state.steer, -0.42, 0.42);
  car.wheels.fl.steer.rotation.y = steer;
  car.wheels.fr.steer.rotation.y = steer;
  car.steering.rotation.set(0.55, 0, -steer * 1.6);
  car.flames.visible = state.nitro;
  if (state.nitro) {
    for (const flame of car.flames.children) {
      flame.scale.y = 0.7 + Math.random() * 0.9;
    }
  }
  car.bubble.visible = state.shield;
  if (state.shield) {
    const p = 1 + Math.sin(state.time * 7) * 0.035;
    car.bubble.scale.setScalar(p);
    car.bubble.material.opacity = 0.14 + Math.sin(state.time * 7) * 0.06;
  }
  car.tailMat.emissiveIntensity = state.ducking ? 5 : state.nitro ? 3.4 : 1.7;
  car.driver.position.y = car.driver.userData.baseY + Math.sin(state.time * 2.4) * 0.01;
}
