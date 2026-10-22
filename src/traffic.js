import * as THREE from 'three';
import { box } from './geo.js';
import { shared, trafficPaint } from './materials.js';

const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12);
const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.35 });

function mesh(parent, geo, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  parent.add(m);
  return m;
}

function addWheel(parent, spinners, x, z) {
  const spin = new THREE.Group();
  spin.position.set(x, 0.34, z);
  const tire = new THREE.Mesh(tireGeo, shared().rubber);
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(rimGeo, shared().rim);
  rim.rotation.z = Math.PI / 2;
  spin.add(tire, rim);
  parent.add(spin);
  spinners.push(spin);
}

function lights(parent, mats, zFront, zRear, y, span) {
  mesh(parent, box(0.22, 0.1, 0.06), mats.lamp, -span, y, zFront);
  mesh(parent, box(0.22, 0.1, 0.06), mats.lamp, span, y, zFront);
  mesh(parent, box(0.28, 0.1, 0.06), mats.tail, -span, y, zRear);
  mesh(parent, box(0.28, 0.1, 0.06), mats.tail, span, y, zRear);
  for (const x of [-span, span]) {
    const head = new THREE.Sprite(mats.glowWarm);
    head.position.set(x, y, zFront - 0.05);
    head.scale.setScalar(0.7);
    const tail = new THREE.Sprite(mats.glowTail);
    tail.position.set(x, y, zRear + 0.05);
    tail.scale.setScalar(0.55);
    parent.add(head, tail);
  }
}

function blob(parent, w, d) {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shared().blob);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  parent.add(shadow);
}

function driver(parent, x, y, z) {
  const head = new THREE.Mesh(headGeo, helmetMat);
  head.position.set(x, y, z);
  parent.add(head);
}

export function makeTraffic(type, color) {
  const mats = shared();
  const paint = trafficPaint(color);
  const group = new THREE.Group();
  const spinners = [];
  let hx = 0.88;
  let hz = 2.1;
  let y1 = 1.2;

  if (type === 'sport') {
    mesh(group, box(1.76, 0.34, 4.05), paint, 0, 0.5, 0);
    mesh(group, box(1.42, 0.28, 1.2), paint, 0, 0.78, -0.2);
    mesh(group, box(1.25, 0.26, 0.05), mats.glass, 0, 0.9, -0.72, 0.42);
    lights(group, mats, -2.02, 2.02, 0.55, 0.62);
    driver(group, -0.32, 0.92, -0.15);
    addWheel(group, spinners, -0.78, -1.25);
    addWheel(group, spinners, 0.78, -1.25);
    addWheel(group, spinners, -0.78, 1.25);
    addWheel(group, spinners, 0.78, 1.25);
    blob(group, 2, 4.2);
    hx = 0.86;
    hz = 2.02;
    y1 = 1.1;
  } else if (type === 'van') {
    mesh(group, box(1.9, 1.55, 4.7), paint, 0, 1.12, 0.1);
    mesh(group, box(1.7, 0.7, 0.06), mats.glass, 0, 1.35, -2.15, 0.15);
    lights(group, mats, -2.35, 2.4, 0.7, 0.7);
    driver(group, -0.45, 1.45, -1.3);
    addWheel(group, spinners, -0.82, -1.55);
    addWheel(group, spinners, 0.82, -1.55);
    addWheel(group, spinners, -0.82, 1.45);
    addWheel(group, spinners, 0.82, 1.45);
    blob(group, 2.2, 5);
    hx = 0.95;
    hz = 2.4;
    y1 = 1.95;
  } else if (type === 'truck') {
    mesh(group, box(1.95, 1.15, 3.5), paint, 0, 1.05, 0.85);
    mesh(group, box(1.9, 1.55, 2.15), paint, 0, 1.25, -1.85);
    mesh(group, box(1.7, 0.7, 0.06), mats.glass, 0, 1.55, -2.85, 0.2);
    mesh(group, box(1.95, 0.12, 3.5), mats.dark, 0, 1.68, 0.85);
    lights(group, mats, -2.95, 2.6, 0.75, 0.72);
    driver(group, -0.45, 1.6, -1.7);
    addWheel(group, spinners, -0.85, -1.7);
    addWheel(group, spinners, 0.85, -1.7);
    addWheel(group, spinners, -0.85, 1.55);
    addWheel(group, spinners, 0.85, 1.55);
    blob(group, 2.4, 6.4);
    hx = 1.0;
    hz = 3.25;
    y1 = 2.45;
  } else {
    mesh(group, box(1.74, 0.4, 4.35), paint, 0, 0.52, 0);
    mesh(group, box(1.52, 0.42, 2.0), paint, 0, 0.9, -0.15);
    mesh(group, box(1.4, 0.32, 0.05), mats.glass, 0, 1.05, -1.05, 0.4);
    mesh(group, box(1.35, 0.28, 0.05), mats.glass, 0, 1.08, 0.85, -0.45);
    lights(group, mats, -2.15, 2.15, 0.58, 0.62);
    driver(group, -0.35, 1.05, -0.2);
    addWheel(group, spinners, -0.78, -1.35);
    addWheel(group, spinners, 0.78, -1.35);
    addWheel(group, spinners, -0.78, 1.35);
    addWheel(group, spinners, 0.78, 1.35);
    blob(group, 2.05, 4.5);
    hx = 0.87;
    hz = 2.2;
    y1 = 1.42;
  }

  group.userData.paint = paint;
  group.userData.spinners = spinners;
  group.userData.hx = hx;
  group.userData.hz = hz;
  group.userData.y1 = y1;
  return group;
}
