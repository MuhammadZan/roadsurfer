import * as THREE from 'three';
import { CHUNK, LANE, START_Z, TRAFFIC_COLORS } from './config.js';
import { box, textures } from './geo.js';
import { billboardMaterial, facade, shared } from './materials.js';
import { makeTraffic } from './traffic.js';

const _v = new THREE.Vector3();
const FOG = new THREE.Color(0x7a4a56);

function birdTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff7f1';
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(8, 46);
  g.quadraticCurveTo(40, 8, 64, 30);
  g.quadraticCurveTo(88, 8, 120, 46);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 3.3, 6);
const leafGeo = new THREE.SphereGeometry(0.55, 7, 5);
leafGeo.scale(1.7, 0.16, 0.48);
const headGeo = new THREE.SphereGeometry(0.13, 8, 8);
const hairGeo = new THREE.SphereGeometry(0.135, 8, 6);
const bushGeo = new THREE.SphereGeometry(0.42, 8, 6);
const rockGeo = new THREE.DodecahedronGeometry(1, 0);
const coneGeo = new THREE.ConeGeometry(0.26, 0.68, 8);
const coinGeo = new THREE.OctahedronGeometry(0.28, 0);
const coinRing = new THREE.TorusGeometry(0.4, 0.028, 6, 16);
const roadGeo = new THREE.PlaneGeometry(11.7, CHUNK);
const onRoadGeo = new THREE.PlaneGeometry(7.3, CHUNK);
const archSignGeo = new THREE.PlaneGeometry(3.6, 1.05);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function markerTexture(label) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1714';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#f0c36a';
  g.fillRect(0, 0, 256, 8);
  g.fillStyle = '#fff8ea';
  g.font = '700 58px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 128, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addCollider(list, chunkId, obj, kind, hx, hz, y0, y1, baseY) {
  list.push({
    obj,
    kind,
    hx,
    hz,
    y0,
    y1,
    baseY,
    chunkId,
    alive: true,
    missed: false,
    used: false,
    dying: 0,
    phase: Math.random() * Math.PI * 2,
    x: 0,
    z: 0,
  });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.chunks = [];
    this.next = 0;
    this.coverage = 0;
    this.scenic = true;
    this.root = new THREE.Group();
    scene.add(this.root);

    scene.fog = new THREE.Fog(FOG, 52, 198);
    scene.background = FOG.clone();
    this.buildSky();
    this.buildLand();
    this.buildOncoming();
    this.buildPad();
  }

  buildSky() {
    const mats = shared();
    this.skyRig = new THREE.Group();
    this.scene.add(this.skyRig);

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#120816') },
        mid: { value: new THREE.Color('#3a215c') },
        horizon: { value: FOG.clone() },
        bottom: { value: new THREE.Color('#1a121c') },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 top;
        uniform vec3 mid;
        uniform vec3 horizon;
        uniform vec3 bottom;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(bottom, horizon, smoothstep(-0.25, 0.0, h));
          col = mix(col, mid, smoothstep(0.02, 0.38, h));
          col = mix(col, top, smoothstep(0.28, 0.9, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 28, 18), skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.skyRig.add(sky);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(18, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd2b0, fog: false }),
    );
    sun.position.set(-86, 20, -220);
    sun.renderOrder = -6;
    this.skyRig.add(sun);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.glow,
      color: 0xffb080,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
      fog: false,
    }));
    glow.position.copy(sun.position);
    glow.scale.set(110, 110, 1);
    glow.renderOrder = -7;
    this.skyRig.add(glow);

    const mountains = new THREE.Group();
    [-18, -52, -88, -124, -156, -36, -70].forEach((x, i) => {
      const h = 24 + (i % 4) * 10;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(16 + (i % 3) * 6, h, 5), mats.mount);
      peak.position.set(x, h * 0.32, (i % 2) * -14);
      mountains.add(peak);
    });
    mountains.position.set(0, -8, -156);
    this.skyRig.add(mountains);

    const city = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const w = 7 + (i % 4) * 2;
      const h = 18 + ((i * 5) % 26);
      const d = 7 + (i % 3);
      const face = facade(w, h, false);
      const b = new THREE.Mesh(box(w, h, d), face.materials);
      b.position.set(i * 9, h / 2, (i % 3) * 8);
      city.add(b);
    }
    city.position.set(10, -6, -128);
    this.skyRig.add(city);

    mats.cloud.opacity = 0.14;
    for (let i = 0; i < 4; i++) {
      const cluster = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 8), mats.cloud);
        puff.position.set((k - 1) * 4.2, (k % 2) * 1.4, k * 0.3);
        cluster.add(puff);
      }
      cluster.position.set(-55 + i * 34, 30 + (i % 2) * 5, -120);
      this.skyRig.add(cluster);
    }

    this.blimp = this.makeBlimp();
    this.skyRig.add(this.blimp);

    this.birdMat = new THREE.SpriteMaterial({
      map: birdTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.gulls = [];
    for (let i = 0; i < 4; i++) {
      const gull = new THREE.Sprite(this.birdMat);
      gull.userData.baseX = -30 + i * 16;
      gull.userData.phase = i * 1.4;
      gull.userData.baseScale = 1.15;
      gull.scale.set(3.1, 1.15, 1);
      gull.position.set(gull.userData.baseX, 24 + (i % 2) * 3, -78 - i * 6);
      this.skyRig.add(gull);
      this.gulls.push(gull);
    }
  }

  makeBlimp() {
    const mats = shared();
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(5.5, 18, 12), mats.blimp);
    body.scale.set(1, 0.52, 2.05);
    const stripe = new THREE.Mesh(box(0.2, 0.35, 16), mats.blimpRed);
    stripe.position.y = 1.15;
    const fin = new THREE.Mesh(box(0.15, 2.4, 1.6), mats.blimp);
    fin.position.set(0, 1.4, 9.2);
    const gondola = new THREE.Mesh(box(1.3, 0.7, 2.4), mats.dark);
    gondola.position.y = -3.1;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.7), mats.banner);
    banner.position.set(0, -5.1, 0);
    g.add(body, stripe, fin, gondola, banner);
    g.scale.setScalar(0.42);
    g.position.set(38, 34, -120);
    return g;
  }

  buildLand() {
    const mats = shared();
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.4;
    this.scene.add(this.ground);

    this.sand = new THREE.Mesh(new THREE.PlaneGeometry(9, 340), mats.sand);
    this.sand.rotation.x = -Math.PI / 2;
    this.sand.position.set(-11.6, 0.02, 0);
    this.sand.receiveShadow = true;
    this.scene.add(this.sand);

    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uDeep: { value: new THREE.Color('#0c3348') },
        uCrest: { value: new THREE.Color('#3f8f98') },
        uFog: { value: FOG.clone() },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uScroll;
        varying float vWave;
        varying vec3 vWorld;
        void main() {
          vec3 p = position;
          float z = p.z + uScroll;
          float w = sin(p.x * 0.05 + z * 0.035 + uTime * 0.8) * 0.28
                  + sin(p.x * 0.02 - z * 0.05 + uTime * 0.45) * 0.16;
          p.y += w;
          vWave = w;
          vec4 world = modelMatrix * vec4(p, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying float vWave;
        varying vec3 vWorld;
        uniform vec3 uDeep;
        uniform vec3 uCrest;
        uniform vec3 uFog;
        void main() {
          float crest = smoothstep(-0.08, 0.32, vWave);
          vec3 col = mix(uDeep, uCrest, crest);
          float dist = distance(cameraPosition, vWorld);
          col = mix(col, uFog, smoothstep(36.0, 180.0, dist));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(130, 340, 36, 36), waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(-80, 0, 0);
    this.scene.add(this.water);
  }

  buildPad() {
    const mats = shared();
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(16, 50), mats.asphalt);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, -0.02, 22);
    pad.receiveShadow = true;
    this.scene.add(pad);
  }

  buildOncoming() {
    const types = ['sedan', 'sport', 'sedan', 'van', 'truck', 'sport', 'sedan', 'van'];
    this.oncoming = types.map((type, i) => {
      const car = makeTraffic(type, TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
      car.rotation.y = Math.PI;
      this.scene.add(car);
      return {
        group: car,
        spinners: car.userData.spinners,
        speed: 16 + (i % 5) * 3.5,
        paint: car.userData.paint,
      };
    });
  }

  reset(scenic) {
    this.scenic = scenic;
    for (const chunk of this.chunks) {
      this.root.remove(chunk.group);
      chunk.dispose();
    }
    this.chunks = [];
    this.colliders = [];
    this.next = 0;
    this.coverage = 0;
    this.ensure(START_Z);
    this.oncoming.forEach((car, i) => {
      car.group.position.set(i % 2 === 0 ? 11 : 14, 0, START_Z - 40 - i * 34);
      car.group.rotation.y = Math.PI;
    });
  }

  ensure(playerZ) {
    const limit = playerZ - 250;
    let guard = 0;
    while (this.coverage > limit && guard < 6) {
      this.spawn(this.next);
      this.next += 1;
      this.coverage = -this.next * CHUNK;
      guard += 1;
    }
  }

  recycle(playerZ) {
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      const zMin = -(chunk.index + 1) * CHUNK;
      if (zMin > playerZ + 36) {
        this.root.remove(chunk.group);
        chunk.dispose();
        this.chunks.splice(i, 1);
        const id = chunk.index;
        this.colliders = this.colliders.filter((c) => c.chunkId !== id);
      }
    }
  }

  spawn(index) {
    const chunk = {
      index,
      group: new THREE.Group(),
      spinners: [],
      palms: [],
      bobs: [],
      disposables: [],
      dispose() {
        for (const item of this.disposables) item.dispose?.();
      },
    };
    chunk.group.position.z = -index * CHUNK;
    this.decorate(chunk);
    this.fill(chunk);
    this.root.add(chunk.group);
    chunk.group.updateMatrixWorld(true);
    this.chunks.push(chunk);
  }

  decorate(chunk) {
    const mats = shared();
    const rng = mulberry32(chunk.index * 4243 + 9);
    const road = new THREE.Mesh(roadGeo, mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -CHUNK / 2);
    road.receiveShadow = true;
    chunk.group.add(road);

    const skirt = new THREE.Mesh(box(12.2, 0.4, CHUNK), mats.concrete);
    skirt.position.set(0, -0.22, -CHUNK / 2);
    chunk.group.add(skirt);

    for (const x of [-5.55, 5.55]) {
      const edge = new THREE.Mesh(box(0.14, 0.03, CHUNK), mats.edge);
      edge.position.set(x, 0.02, -CHUNK / 2);
      chunk.group.add(edge);
    }
    const dash = box(0.16, 0.028, 2.05);
    for (const x of [-LANE / 2, LANE / 2]) {
      for (let z = -4; z > -CHUNK + 2; z -= 6.5) {
        const mark = new THREE.Mesh(dash, mats.line);
        mark.position.set(x, 0.025, z);
        chunk.group.add(mark);
      }
    }
    for (const x of [-6.25, 6.25]) {
      const rail = new THREE.Mesh(box(0.42, 0.55, CHUNK), mats.jersey);
      rail.position.set(x, 0.28, -CHUNK / 2);
      chunk.group.add(rail);
    }

    const onRoad = new THREE.Mesh(onRoadGeo, mats.asphalt);
    onRoad.rotation.x = -Math.PI / 2;
    onRoad.position.set(12.5, 0, -CHUNK / 2);
    onRoad.receiveShadow = true;
    chunk.group.add(onRoad);
    for (const x of [9.05, 15.95]) {
      const edge = new THREE.Mesh(box(0.1, 0.025, CHUNK), mats.edge);
      edge.position.set(x, 0.02, -CHUNK / 2);
      chunk.group.add(edge);
    }
    for (let z = -4; z > -CHUNK + 2; z -= 7) {
      const mark = new THREE.Mesh(dash, mats.line);
      mark.position.set(12.5, 0.025, z);
      chunk.group.add(mark);
    }
    const median = new THREE.Mesh(box(0.85, 0.46, CHUNK), mats.concrete);
    median.position.set(7.6, 0.23, -CHUNK / 2);
    chunk.group.add(median);

    for (let n = 0; n < 3; n++) {
      const bush = new THREE.Mesh(bushGeo, mats.leaf);
      bush.scale.y = 0.72;
      bush.position.set(7.6, 0.55, -12 - n * 28 - rng() * 6);
      chunk.group.add(bush);
    }

    for (const z of [-16, -46, -76]) {
      this.addLamp(chunk, -7.15, z, 1);
      this.addLamp(chunk, 17.4, z + 8, -1);
    }

    for (let n = 0; n < 3; n++) {
      const palm = this.makePalm();
      const lean = (rng() - 0.5) * 0.18;
      palm.position.set(-8.15 - rng() * 0.6, 0, -12 - n * 26 - rng() * 8);
      palm.rotation.y = rng() * Math.PI * 2;
      palm.rotation.z = lean;
      chunk.group.add(palm);
      chunk.palms.push({ mesh: palm, lean, phase: rng() * 6 });
    }

    for (let n = 0; n < 3; n++) {
      const person = this.makePerson(rng);
      person.position.set(-10.4 - rng() * 2.2, 0, -18 - rng() * 64);
      person.rotation.y = 0.8 + rng() * 0.8;
      chunk.group.add(person);
      chunk.bobs.push({ mesh: person, base: 0, phase: rng() * 6 });
    }

    for (let n = 0; n < 4; n++) {
      const w = 5 + (rng() * 4) | 0;
      const h = 7 + (rng() * 14) | 0;
      const d = 5 + (rng() * 4) | 0;
      const x = 20 + rng() * 12;
      const z = -8 - rng() * 74;
      const face = facade(w, h, true);
      const building = new THREE.Mesh(box(w, h, d), face.materials);
      building.position.set(x, h / 2, z);
      chunk.group.add(building);
      chunk.disposables.push(...face.trash);
      if (h > 13 && rng() > 0.45) {
        const pent = new THREE.Mesh(box(w * 0.42, 1.3, d * 0.42), mats.roof);
        pent.position.set(x, h + 0.65, z);
        chunk.group.add(pent);
      }
    }

    if (chunk.index % 2 === 0) {
      const mat = billboardMaterial(chunk.index);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat);
      const z = -24 - (chunk.index % 3) * 18;
      board.position.set(17.8, 3.3, z);
      board.rotation.y = Math.PI / 2;
      const pole = new THREE.Mesh(box(0.16, 3.3, 0.16), mats.dark);
      pole.position.set(17.8, 1.65, z);
      chunk.group.add(board, pole);
      chunk.disposables.push(mat);
    }

    const tex = markerTexture(`${chunk.index * 70}m`);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.62), mat);
    sign.position.set(-7.35, 1.25, -CHUNK * 0.55);
    sign.rotation.y = -Math.PI / 2;
    const post = new THREE.Mesh(box(0.08, 1.25, 0.08), mats.dark);
    post.position.set(-7.35, 0.62, -CHUNK * 0.55);
    chunk.group.add(sign, post);
    chunk.disposables.push(tex, mat);

    if (chunk.index > 0 && chunk.index % 5 === 0) this.addArch(chunk);

    if (chunk.index % 3 === 1) {
      const tower = this.makeTower();
      tower.position.set(-12.4, 0, -38 - rng() * 20);
      chunk.group.add(tower);
    }

    for (let n = 0; n < 2; n++) {
      const rock = new THREE.Mesh(rockGeo, mats.concrete);
      rock.scale.setScalar(0.35 + rng() * 0.55);
      rock.position.set(-18 - rng() * 14, 0.15, -10 - rng() * 70);
      rock.rotation.set(rng(), rng(), rng());
      chunk.group.add(rock);
    }

    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.35), mats.arrow);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(((chunk.index % 3) - 1) * LANE, 0.03, -CHUNK * 0.33);
    chunk.group.add(arrow);
  }

  addLamp(chunk, x, z, side) {
    const mats = shared();
    const g = new THREE.Group();
    const pole = new THREE.Mesh(box(0.12, 5.2, 0.12), mats.dark);
    pole.position.y = 2.6;
    const arm = new THREE.Mesh(box(1.5, 0.08, 0.08), mats.dark);
    arm.position.set(side * 0.7, 5.15, 0);
    const lamp = new THREE.Mesh(box(0.5, 0.1, 0.28), mats.lamp);
    lamp.position.set(side * 1.25, 5.05, 0);
    const glow = new THREE.Sprite(mats.glowWarm);
    glow.position.copy(lamp.position);
    glow.scale.setScalar(1.7);
    g.add(pole, arm, lamp, glow);
    g.position.set(x, 0, z);
    chunk.group.add(g);
  }

  makePalm() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, shared().trunk);
    trunk.position.y = 1.65;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(leafGeo, shared().leaf);
      leaf.position.y = 3.25;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.rotation.z = 0.9;
      g.add(leaf);
    }
    return g;
  }

  makePerson(rng) {
    const mats = shared();
    const g = new THREE.Group();
    const shirt = mats.shirts[(rng() * mats.shirts.length) | 0];
    const skin = mats.skins[(rng() * mats.skins.length) | 0];
    const torso = new THREE.Mesh(box(0.32, 0.46, 0.18), shirt);
    torso.position.y = 0.78;
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 1.12;
    const hair = new THREE.Mesh(hairGeo, mats.hair);
    hair.position.y = 1.2;
    hair.scale.set(1, 0.62, 1);
    const legL = new THREE.Mesh(box(0.1, 0.4, 0.1), mats.shorts);
    legL.position.set(-0.08, 0.28, 0);
    const legR = legL.clone();
    legR.position.x = 0.08;
    g.add(torso, head, hair, legL, legR);
    return g;
  }

  makeTower() {
    const mats = shared();
    const g = new THREE.Group();
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(box(0.08, 2.2, 0.08), mats.dark);
        leg.position.set(x, 1.1, z);
        g.add(leg);
      }
    }
    const deck = new THREE.Mesh(box(1.6, 0.12, 1.3), mats.jersey);
    deck.position.y = 2.2;
    const hut = new THREE.Mesh(box(1.25, 0.85, 1.05), mats.stripe);
    hut.position.y = 2.7;
    g.add(deck, hut);
    return g;
  }

  addArch(chunk) {
    const mats = shared();
    const z = -CHUNK * 0.48;
    for (const x of [-6.55, 6.55]) {
      const post = new THREE.Mesh(box(0.38, 6.5, 0.38), mats.concrete);
      post.position.set(x, 3.25, z);
      chunk.group.add(post);
    }
    const beam = new THREE.Mesh(box(13.8, 0.42, 0.5), mats.jersey);
    beam.position.set(0, 6.35, z);
    chunk.group.add(beam);
    const sign = new THREE.Mesh(archSignGeo, mats.banner);
    sign.position.set(0, 5.55, z + 0.35);
    chunk.group.add(sign);
  }

  fill(chunk) {
    if (this.scenic) {
      if (chunk.index % 2 === 0) this.coinLine(chunk, 0, -34, 6);
      return;
    }
    const i = chunk.index;
    if (i === 0 || i === 1) {
      this.coinLine(chunk, 0, -40, 7);
      if (i === 1) this.coinLine(chunk, 1, -70, 4);
      return;
    }
    if (i === 2) {
      this.coinLine(chunk, 1, -32, 5);
      this.barrier(chunk, 0, -54);
      this.coinLine(chunk, -1, -72, 4);
      return;
    }
    if (i === 3) {
      this.overhead(chunk, -40, 'all');
      this.power(chunk, 0, -64, 'shield');
      return;
    }
    if (i === 4) {
      this.ramp(chunk, 0, -32);
      this.airCoins(chunk, 0, -32);
      this.barrier(chunk, -1, -70);
      this.barrier(chunk, 1, -70);
      this.power(chunk, 1, -78, 'nitro');
      return;
    }
    const rng = mulberry32(i * 9973 + 11);
    const difficulty = Math.min(1, (i - 4) / 14);
    const z1 = -24 - rng() * 6;
    this.gate(chunk, rng, difficulty, z1);
    if (i > 6) {
      const z2 = Math.max(-CHUNK + 12, z1 - 36 - rng() * 8);
      this.gate(chunk, rng, difficulty, z2);
    }
  }

  gate(chunk, rng, difficulty, z) {
    const lane = () => ((rng() * 3) | 0) - 1;
    const roll = rng();
    if (roll < 0.2) {
      const blocked = lane();
      this.barrier(chunk, blocked, z);
      const safe = blocked === 0 ? (rng() < 0.5 ? -1 : 1) : 0;
      this.coinLine(chunk, safe, z, 4);
    } else if (roll < 0.38) {
      const free = lane();
      for (const l of [-1, 0, 1]) {
        if (l === free) continue;
        if (rng() < 0.55) this.barrier(chunk, l, z);
        else this.cones(chunk, l, z);
      }
      this.coinLine(chunk, free, z, 4);
    } else if (roll < 0.54) {
      this.traffic(chunk, lane(), z, this.trafficType(rng, difficulty), rng);
    } else if (roll < 0.68) {
      const a = lane();
      let b = lane();
      if (b === a) b = a === 1 ? -1 : a + 1;
      const type = difficulty > 0.45 && rng() < 0.45 ? 'van' : 'sedan';
      this.traffic(chunk, a, z, type, rng);
      this.barrier(chunk, b, z);
      const free = [-1, 0, 1].find((l) => l !== a && l !== b);
      this.coinLine(chunk, free, z, 4);
    } else if (roll < 0.8) {
      this.overhead(chunk, z, rng() < 0.48 ? 'all' : lane());
    } else if (roll < 0.9) {
      const l = lane();
      this.ramp(chunk, l, z);
      this.airCoins(chunk, l, z);
    } else {
      const kinds = ['shield', 'magnet', 'nitro'];
      this.power(chunk, lane(), z, kinds[(rng() * kinds.length) | 0]);
    }
  }

  trafficType(rng, difficulty) {
    const roll = rng();
    if (roll < 0.34 - difficulty * 0.12) return 'sport';
    if (roll < 0.62) return 'sedan';
    if (roll < 0.84) return 'van';
    return difficulty > 0.28 ? 'truck' : 'van';
  }

  coinLine(chunk, lane, gateZ, count) {
    for (let k = 0; k < count; k++) this.coin(chunk, lane, gateZ + 16 - k * 3.15, 0.95);
  }

  airCoins(chunk, lane, rampZ) {
    for (let k = 0; k < 6; k++) {
      const z = rampZ - 6 - k * 3.15;
      const y = 1.05 + Math.sin((k / 5) * Math.PI) * 0.9;
      this.coin(chunk, lane, z, y);
    }
  }

  coin(chunk, lane, z, y) {
    const mats = shared();
    const g = new THREE.Group();
    const gem = new THREE.Mesh(coinGeo, mats.volt);
    const ring = new THREE.Mesh(coinRing, mats.volt);
    ring.rotation.x = Math.PI / 2;
    g.add(gem, ring);
    g.position.set(lane * LANE, y, z);
    chunk.group.add(g);
    const aerial = y > 1.35;
    addCollider(
      this.colliders,
      chunk.index,
      g,
      'coin',
      0.72,
      0.72,
      aerial ? y - 0.4 : 0.3,
      aerial ? y + 0.75 : 2.5,
      y,
    );
  }

  power(chunk, lane, z, kind) {
    const mats = shared();
    const g = new THREE.Group();
    let geo = new THREE.IcosahedronGeometry(0.4, 0);
    let mat = mats.shield;
    if (kind === 'magnet') {
      geo = new THREE.TorusGeometry(0.32, 0.09, 8, 16);
      mat = mats.magnet;
    } else if (kind === 'nitro') {
      geo = new THREE.CapsuleGeometry(0.2, 0.46, 4, 8);
      mat = mats.nitro;
    }
    g.add(new THREE.Mesh(geo, mat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 18), mat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const y = 1.2;
    g.position.set(lane * LANE, y, z);
    chunk.group.add(g);
    addCollider(this.colliders, chunk.index, g, kind, 0.75, 0.75, 0.25, 2.7, y);
  }

  barrier(chunk, lane, z) {
    const mesh = new THREE.Mesh(box(2.05, 0.82, 0.5), shared().stripe);
    mesh.position.set(lane * LANE, 0.41, z);
    chunk.group.add(mesh);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.15), shared().blob);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(lane * LANE, 0.03, z);
    chunk.group.add(shadow);
    addCollider(this.colliders, chunk.index, mesh, 'solid', 0.9, 0.3, 0, 0.84, 0);
  }

  cones(chunk, lane, z) {
    const g = new THREE.Group();
    const mats = shared();
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(coneGeo, mats.cone);
      cone.position.set((i - 1) * 0.42, 0.34, (i - 1) * 0.42);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 10), mats.coneBand);
      band.rotation.x = Math.PI / 2;
      band.position.set((i - 1) * 0.42, 0.4, (i - 1) * 0.42);
      g.add(cone, band);
    }
    g.position.set(lane * LANE, 0, z);
    chunk.group.add(g);
    addCollider(this.colliders, chunk.index, g, 'solid', 0.82, 0.7, 0, 0.7, 0);
  }

  ramp(chunk, lane, z) {
    const wedge = new THREE.Mesh(box(2.15, 0.18, 3.3), shared().chevron);
    wedge.rotation.x = -0.34;
    wedge.position.set(lane * LANE, 0.48, z);
    chunk.group.add(wedge);
    addCollider(this.colliders, chunk.index, wedge, 'ramp', 1.0, 1.45, 0, 0.85, 0);
  }

  overhead(chunk, z, lane) {
    const mats = shared();
    const full = lane === 'all';
    const g = new THREE.Group();
    const span = full ? [-5.3, 5.3] : [-1.2, 1.2];
    for (const x of span) {
      const post = new THREE.Mesh(box(0.16, 3.05, 0.16), mats.dark);
      post.position.set(x, 1.52, 0);
      g.add(post);
    }
    const beam = new THREE.Mesh(box(full ? 11 : 2.55, 0.22, 0.36), mats.jersey);
    beam.position.set(0, 2.95, 0);
    g.add(beam);
    const board = new THREE.Mesh(box(full ? 3.4 : 1.7, 1.65, 0.08), full ? mats.tuck : mats.laneSign);
    board.position.set(0, 1.95, 0.08);
    g.add(board);
    g.position.set(full ? 0 : lane * LANE, 0, z);
    chunk.group.add(g);
    addCollider(this.colliders, chunk.index, g, 'solid', full ? 4.7 : 1.12, 0.42, 1.02, 3.4, 0);
  }

  traffic(chunk, lane, z, type, rng) {
    const color = TRAFFIC_COLORS[(rng() * TRAFFIC_COLORS.length) | 0];
    const car = makeTraffic(type, color);
    car.position.set(lane * LANE, 0, z);
    chunk.group.add(car);
    chunk.spinners.push(...car.userData.spinners);
    chunk.disposables.push(car.userData.paint);
    addCollider(
      this.colliders,
      chunk.index,
      car,
      'solid',
      car.userData.hx,
      car.userData.hz,
      0,
      car.userData.y1,
      0,
    );
  }

  update(dt, state) {
    this.ensure(state.z);
    this.recycle(state.z);
    this.animate(dt, state.time);
    if (state.magnet > 0) this.pullCoins(state.x, state.z, dt);
    this.syncColliders(dt, state.time);
    this.moveOncoming(dt, state.z);
    this.water.position.z = state.z;
    this.sand.position.z = state.z;
    this.ground.position.z = state.z;
    this.water.material.uniforms.uTime.value = state.time;
    this.water.material.uniforms.uScroll.value = state.z;
    this.sand.material.map.offset.y = -state.z * 0.012;
    this.blimp.position.set(34 + Math.sin(state.time * 0.12) * 6, 32, -115);
    for (const gull of this.gulls) {
      gull.position.x = gull.userData.baseX + Math.sin(state.time * 0.35 + gull.userData.phase) * 6;
      const flap = 0.72 + Math.abs(Math.sin(state.time * 7 + gull.userData.phase)) * 0.38;
      gull.scale.y = gull.userData.baseScale * flap;
    }
  }

  animate(dt, time) {
    for (const chunk of this.chunks) {
      for (const palm of chunk.palms) {
        palm.mesh.rotation.z = palm.lean + Math.sin(time * 1.15 + palm.phase) * 0.035;
      }
      for (const bob of chunk.bobs) {
        bob.mesh.position.y = bob.base + Math.abs(Math.sin(time * 5 + bob.phase)) * 0.055;
      }
      for (const spin of chunk.spinners) spin.rotation.x -= dt * 18;
    }
  }

  pullCoins(px, pz, dt) {
    for (const coin of this.colliders) {
      if (coin.kind !== 'coin' || !coin.alive) continue;
      coin.obj.updateWorldMatrix(true, false);
      coin.obj.getWorldPosition(_v);
      const dx = px - _v.x;
      const dz = pz - _v.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 8.5 || dist < 0.05) continue;
      const step = Math.min(0.8, dt * 12);
      _v.x += dx * step;
      _v.z += dz * step;
      coin.obj.parent.worldToLocal(_v);
      coin.obj.position.x = _v.x;
      coin.obj.position.z = _v.z;
    }
  }

  syncColliders(dt, time) {
    for (const item of this.colliders) {
      const pickup = item.kind === 'coin' || item.kind === 'shield' || item.kind === 'magnet' || item.kind === 'nitro';
      if (pickup && item.alive) {
        item.obj.rotation.y += dt * (item.kind === 'coin' ? 2.2 : 1.6);
        item.obj.position.y = item.baseY + Math.sin(time * 3 + item.phase) * 0.12;
      }
      if (item.dying > 0) {
        item.dying -= dt * 5;
        item.obj.scale.setScalar(Math.max(0.01, item.dying));
        if (item.dying <= 0) {
          item.dying = 0;
          item.obj.visible = false;
        }
      }
      item.obj.updateWorldMatrix(true, false);
      item.obj.getWorldPosition(_v);
      item.x = _v.x;
      item.z = _v.z;
    }
  }

  moveOncoming(dt, playerZ) {
    for (const car of this.oncoming) {
      car.group.position.z += car.speed * dt;
      for (const spin of car.spinners) spin.rotation.x -= dt * (car.speed / 0.34);
      if (car.group.position.z > playerZ + 20) {
        car.group.position.z = playerZ - (90 + Math.random() * 120);
        car.group.position.x = Math.random() < 0.5 ? 11 : 14;
        car.paint.color.setHex(TRAFFIC_COLORS[(Math.random() * TRAFFIC_COLORS.length) | 0]);
      }
    }
  }

  followCamera(camera) {
    this.skyRig.position.copy(camera.position);
  }
}
