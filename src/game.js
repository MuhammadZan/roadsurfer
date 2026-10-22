import * as THREE from 'three';
import { driverById, LANE, paintById, START_Z, TUNING } from './config.js';
import { Sound } from './audio.js';
import { Effects } from './fx.js';
import { textures } from './geo.js';
import { applyAniso } from './geo.js';
import { applyDriver, applyPaint, createRoadster, updateRoadster } from './roadster.js';
import { World } from './world.js';

const LOOK = new THREE.Vector3();

function loadNum(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function saveNum(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* private mode */
  }
}

function makeEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.HemisphereLight(0xffb38a, 0x1b2438, 2.2));
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c }),
  );
  sun.position.set(-8, 5, -6);
  env.add(sun);
  const fill = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x4d6dff }),
  );
  fill.position.set(7, 1, 3);
  env.add(fill);
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(8, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x241828 }),
  );
  ground.position.y = -8;
  env.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.mode = 'attract';
    this.dead = false;
    this.time = 0;
    this.keys = {};
    this.paintId = 'crimson';
    this.driverId = 'rio';
    this.best = loadNum('rs-best');
    this.snap = {};
    this.snapCam = true;
    this.pointer = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setClearColor(0x120810, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    applyAniso(this.renderer);

    this.scene = new THREE.Scene();
    this.scene.environment = makeEnvironment(this.renderer);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
    this.scene.add(this.camera);

    this.sun = new THREE.DirectionalLight(0xffc2a2, 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 70;
    this.sun.shadow.camera.left = -18;
    this.sun.shadow.camera.right = 18;
    this.sun.shadow.camera.top = 18;
    this.sun.shadow.camera.bottom = -18;
    this.sun.shadow.bias = -0.0007;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.HemisphereLight(0xffb59a, 0x1a1420, 0.9));
    const fill = new THREE.DirectionalLight(0x8eacff, 0.55);
    fill.position.set(14, 8, 8);
    this.scene.add(fill);
    this.rim = new THREE.DirectionalLight(0xffd5cc, 0.85);
    this.scene.add(this.rim, this.rim.target);

    this.world = new World(this.scene);
    this.car = createRoadster();
    this.scene.add(this.car.group);
    applyPaint(this.car, this.paintId);
    applyDriver(this.car, this.driverId);

    this.fx = new Effects(this.scene, this.camera);
    this.sound = new Sound();

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 4.4),
      new THREE.MeshBasicMaterial({
        map: textures.shadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.04;
    this.scene.add(this.shadow);

    this.laneGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 6.2),
      new THREE.MeshBasicMaterial({
        color: 0xffc857,
        transparent: true,
        depthWrite: false,
        opacity: 0.12,
      }),
    );
    this.laneGlow.rotation.x = -Math.PI / 2;
    this.scene.add(this.laneGlow);

    this.resetRun(true);
    this.resize();
    this.bind();
    this.last = performance.now();
    this.frame = (t) => this.tick(t);
    requestAnimationFrame(this.frame);
  }

  bind() {
    this.onKeyDown = (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.repeat) return;
      this.keys[event.code] = true;
      if (event.code === 'Enter') {
        if (this.mode === 'attract' || this.mode === 'over') this.play();
        else if (this.mode === 'pause') this.resume();
        return;
      }
      if (event.code === 'Escape') {
        if (this.mode === 'play') this.pause();
        else if (this.mode === 'pause') this.resume();
        else if (this.mode === 'over') this.toMenu();
        return;
      }
      if (event.code === 'KeyP' && (this.mode === 'play' || this.mode === 'pause')) {
        if (this.mode === 'play') this.pause();
        else this.resume();
        return;
      }
      if (this.mode !== 'play') {
        if (event.code === 'Space' && (this.mode === 'attract' || this.mode === 'over')) this.play();
        return;
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.shiftLane(-1);
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') this.shiftLane(1);
      else if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') this.tryJump();
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') this.tryDuck();
    };
    this.onKeyUp = (event) => {
      this.keys[event.code] = false;
    };
    this.onPointerDown = (event) => {
      if (event.target.closest('button')) return;
      this.pointer = { x: event.clientX, y: event.clientY };
    };
    this.onPointerUp = (event) => {
      if (!this.pointer) return;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer = null;
      if (Math.hypot(dx, dy) < 28) return;
      if (this.mode !== 'play') return;
      if (Math.abs(dx) > Math.abs(dy)) this.shiftLane(dx > 0 ? 1 : -1);
      else if (dy < 0) this.tryJump();
      else this.tryDuck();
    };
    this.onResize = () => this.resize();
    this.onHide = () => {
      if (document.hidden && this.mode === 'play') this.pause();
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onHide);
  }

  destroy() {
    this.dead = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onHide);
    this.renderer.dispose();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  resetRun(scenic) {
    this.z = START_Z;
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.targetLane = 0;
    this.speed = scenic ? TUNING.attractSpeed : TUNING.startSpeed;
    this.score = 0;
    this.meters = 0;
    this.volts = 0;
    this.bonus = 0;
    this.nears = 0;
    this.smashes = 0;
    this.streak = 0;
    this.streakT = 0;
    this.shield = 0;
    this.magnet = 0;
    this.nitro = 0;
    this.invuln = scenic ? 0 : 1.7;
    this.jumping = false;
    this.jumpU = 0;
    this.ducking = false;
    this.duckT = 0;
    this.visualDuck = 0;
    this.roll = 0;
    this.wreckT = 0;
    this.shake = 0;
    this.sparkT = 0;
    this.danger = false;
    this.newRecord = false;
    this.padDuck = false;
    this.car.group.rotation.set(0, 0, 0);
    this.car.group.visible = true;
    this.car.group.position.set(0, 0, this.z);
    this.world.reset(scenic);
    this.snapCam = true;
  }

  play() {
    this.sound.unlock();
    this.mode = 'play';
    this.resetRun(false);
    this.canvas.focus();
    if (document.activeElement && document.activeElement !== this.canvas) document.activeElement.blur();
    this.ui.coach();
    this.ui.toast('GO', 'gold');
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
  }

  resume() {
    if (this.mode !== 'pause') return;
    this.mode = 'play';
    this.last = performance.now();
  }

  toMenu() {
    this.mode = 'attract';
    this.resetRun(true);
  }

  setPaint(id) {
    this.paintId = paintById(id).id;
    applyPaint(this.car, this.paintId);
  }

  setDriver(id) {
    this.driverId = driverById(id).id;
    applyDriver(this.car, this.driverId);
  }

  toggleMute() {
    const muted = this.sound.toggleMute();
    if (!muted) this.sound.unlock();
    return muted;
  }

  shiftLane(dir) {
    if (this.mode !== 'play') return;
    const next = THREE.MathUtils.clamp(this.targetLane + dir, -1, 1);
    if (next === this.targetLane) return;
    this.targetLane = next;
    this.sound.lane();
    this.fx.burst(this.x, 0.25, this.z + 0.4, 0xfff1d0, 7, 2.2);
  }

  tryJump() {
    if (this.mode !== 'play' || this.jumping) return;
    this.jumping = true;
    this.jumpU = 0;
    this.ducking = false;
    this.duckT = 0;
    this.sound.jump();
  }

  tryDuck() {
    if (this.mode !== 'play' || this.jumping) return;
    this.duckT = Math.max(this.duckT, TUNING.duckTime);
    this.ducking = true;
  }

  act(name) {
    if (name === 'left') this.shiftLane(-1);
    else if (name === 'right') this.shiftLane(1);
    else if (name === 'jump') this.tryJump();
    else if (name === 'duck') this.tryDuck();
  }

  tick(now) {
    if (this.dead) return;
    const dt = Math.min(0.033, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.ui.onFrame(this.snap);
    requestAnimationFrame(this.frame);
  }

  update(dt) {
    this.pollPad();
    if (this.mode === 'pause') {
      this.sound.setDrive(0, false);
      this.syncSnap();
      return;
    }

    const playing = this.mode === 'play';
    const attract = this.mode === 'attract';
    const wreck = this.mode === 'wreck';

    if (attract) {
      const wave = Math.sin(this.time * 0.45);
      this.targetLane = wave > 0.48 ? 1 : wave < -0.48 ? -1 : 0;
    }

    if (playing || attract) {
      this.integrate(dt, playing);
      this.world.update(dt, {
        x: this.x,
        z: this.z,
        speed: this.speed,
        time: this.time,
        magnet: playing ? this.magnet : 0,
      });
      if (playing) this.collide();
    } else if (wreck) {
      this.wreckT += dt;
      this.speed *= Math.exp(-3 * dt);
      this.z -= this.speed * dt;
      this.world.update(dt, { x: this.x, z: this.z, speed: this.speed, time: this.time, magnet: 0 });
      if (this.wreckT > 1.15) this.finish();
    }

    if (playing) this.tally();
    this.poseCar(dt);
    this.poseCamera(dt);
    this.fx.update(dt, this.speed, playing && this.nitro > 0);
    const audible = playing || attract || wreck;
    this.sound.setDrive(this.speed, audible && this.mode !== 'pause');
    if (playing) this.sound.beat(dt, 96 + this.speed * 0.35);
    this.syncSnap();
  }

  integrate(dt, playing) {
    const preview = Math.max(0, (START_Z - this.z) * 0.7);
    let cap = TUNING.startSpeed + Math.min(TUNING.maxExtra, preview * TUNING.accelPerMeter);
    if (!playing) cap = TUNING.attractSpeed;
    const target = playing && this.nitro > 0 ? cap * TUNING.nitroMul : cap;
    this.speed = THREE.MathUtils.damp(this.speed, target, playing ? 1.5 : 2, dt);
    this.z -= this.speed * dt;

    const targetX = this.targetLane * LANE;
    this.prevX = this.x;
    this.x = THREE.MathUtils.damp(this.x, targetX, 16, dt);

    if (this.jumping) {
      this.jumpU += dt / TUNING.jumpDur;
      if (this.jumpU >= 1) {
        this.jumping = false;
        this.jumpU = 0;
        this.y = 0;
        this.fx.burst(this.x, 0.2, this.z, 0xd9d3c6, 8, 2);
        this.shake = Math.max(this.shake, 0.06);
      } else {
        this.y = Math.sin(this.jumpU * Math.PI) * TUNING.jumpH;
      }
    } else {
      this.y = 0;
    }

    if (!playing) return;

    if (this.duckT > 0) this.duckT -= dt;
    const held = this.keys.ArrowDown || this.keys.KeyS || this.padDuck;
    if (held && !this.jumping) this.duckT = Math.max(this.duckT, 0.1);
    this.ducking = this.duckT > 0 && !this.jumping;
    if (this.nitro > 0) this.nitro -= dt;
    if (this.magnet > 0) this.magnet -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.streakT > 0) {
      this.streakT -= dt;
      if (this.streakT <= 0) this.streak = 0;
    }
    if (this.nitro > 0) {
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.045;
        this.fx.burst(this.x + (Math.random() - 0.5) * 0.3, 0.35, this.z + 2.2, 0xff6a2a, 2, 1.4);
      }
    }
  }

  tally() {
    this.meters = Math.max(0, Math.floor((START_Z - this.z) * 0.7));
    this.score = this.meters + this.volts * 10 + this.bonus;
  }

  collide() {
    const targetX = this.targetLane * LANE;
    this.danger = false;
    const height = this.ducking ? TUNING.duckH : TUNING.standH;
    const p0 = Math.max(0, this.y);
    const p1 = p0 + height;

    for (const item of this.world.colliders) {
      if (!item.alive) continue;
      const dx = Math.abs(item.x - this.x);
      const dz = Math.abs(item.z - this.z);
      const ahead = this.z - item.z;

      if (item.kind === 'solid' && ahead > 0 && ahead < 26 && Math.abs(item.x - targetX) < 1.35) {
        if (height > item.y0 && p0 < item.y1) this.danger = true;
      }

      if (item.kind === 'ramp') {
        const hit = dx < item.hx + TUNING.playerHx && dz < item.hz + 0.4;
        if (hit && !item.used && !this.jumping && this.y < 0.4) {
          item.used = true;
          this.jumping = true;
          this.jumpU = 0.04;
          this.ducking = false;
          this.duckT = 0;
          this.sound.jump();
        }
        continue;
      }

      const xHit = dx < item.hx + TUNING.playerHx;
      const zHit = dz < item.hz + TUNING.playerHz;
      const vHit = p1 > item.y0 && p0 < item.y1;
      if (!xHit || !zHit || !vHit) {
        if (
          item.kind === 'solid' &&
          !item.missed &&
          !xHit &&
          dx < LANE * 1.22 &&
          dz < Math.max(1.05, item.hz * 0.45) &&
          height > item.y0
        ) {
          item.missed = true;
          this.streak += 1;
          this.streakT = 2.3;
          const pts = 50 * this.streak;
          this.bonus += pts;
          this.nears += 1;
          this.sound.near();
          this.ui.toast(this.streak > 1 ? `NEAR x${this.streak} +${pts}` : `NEAR +${pts}`, 'gold');
        }
        continue;
      }

      if (item.kind === 'coin') {
        item.alive = false;
        item.dying = 1;
        this.volts += 1;
        this.sound.coin();
        this.fx.burst(item.x, item.baseY, item.z, 0xffc14a, 6, 2);
        continue;
      }
      if (item.kind === 'shield' || item.kind === 'magnet' || item.kind === 'nitro') {
        item.alive = false;
        item.dying = 1;
        this.grant(item.kind);
        continue;
      }
      if (item.kind !== 'solid') continue;
      if (this.invuln > 0) continue;
      if (this.shield > 0) {
        this.shield = 0;
        this.invuln = 0.65;
        item.alive = false;
        item.obj.visible = false;
        this.sound.smash();
        this.shake = 0.22;
        this.fx.burst(item.x, 0.9, item.z, 0x8aefff, 18, 5);
        this.ui.toast('SHIELD BROKE', 'cyan');
        continue;
      }
      if (this.nitro > 0) {
        item.alive = false;
        item.obj.visible = false;
        this.bonus += 100;
        this.smashes += 1;
        this.sound.smash();
        this.fx.burst(item.x, 0.9, item.z, 0xff6a2a, 20, 6);
        this.ui.toast('SMASH +100', 'hot');
        continue;
      }
      this.wreck();
      return;
    }
  }

  grant(kind) {
    if (kind === 'shield') this.shield = 1;
    if (kind === 'magnet') this.magnet = Math.min(12, this.magnet + TUNING.magnetTime);
    if (kind === 'nitro') this.nitro = Math.min(8, this.nitro + TUNING.nitroTime);
    this.sound.pickup(kind);
    const label = kind === 'nitro' ? 'NITRO' : kind === 'magnet' ? 'MAGNET' : 'SHIELD';
    const tone = kind === 'nitro' ? 'hot' : kind === 'shield' ? 'cyan' : 'gold';
    this.ui.toast(label, tone);
    const color = kind === 'shield' ? 0x7ee7ff : kind === 'magnet' ? 0xff6ad5 : 0xff5a2a;
    this.fx.burst(this.x, 1, this.z, color, 14, 4);
  }

  wreck() {
    if (this.mode !== 'play') return;
    this.mode = 'wreck';
    this.wreckT = 0;
    this.nitro = 0;
    this.shake = 0.55;
    this.sound.crash();
    this.fx.burst(this.x, 0.8, this.z, 0xff4422, 30, 7);
    this.fx.burst(this.x, 1.1, this.z, 0xffe0b0, 12, 4);
    this.ui.toast('WRECKED', 'hot');
  }

  finish() {
    if (this.mode === 'over') return;
    this.tally();
    this.newRecord = this.score > this.best && this.score > 0;
    if (this.newRecord) {
      this.best = this.score;
      saveNum('rs-best', this.best);
    }
    this.mode = 'over';
    this.car.group.visible = true;
    this.sound.setDrive(0, false);
  }

  poseCar(dt) {
    const targetX = this.targetLane * LANE;
    this.roll = THREE.MathUtils.damp(
      this.roll,
      THREE.MathUtils.clamp((targetX - this.x) * 0.12, -0.26, 0.26),
      7,
      dt,
    );
    this.visualDuck = THREE.MathUtils.damp(this.visualDuck, this.ducking ? 1 : 0, 16, dt);
    const bob = this.jumping || this.mode === 'wreck'
      ? 0
      : Math.sin(this.time * (6 + this.speed * 0.1)) * 0.01;
    const y = (this.jumping ? this.y : 0) - this.visualDuck * 0.05 + bob;
    this.car.group.position.set(this.x, y, this.z);
    if (this.mode === 'wreck') {
      this.car.group.rotation.set(0.22, this.wreckT * 3.5, Math.sin(this.wreckT * 3) * 0.65);
    } else {
      const pitch = this.jumping ? Math.cos(this.jumpU * Math.PI) * 0.16 : 0;
      this.car.group.rotation.set(pitch - this.visualDuck * 0.16, 0, this.roll);
    }
    updateRoadster(this.car, dt, {
      speed: this.speed,
      steer: (this.x - targetX) * 0.34,
      ducking: this.ducking,
      nitro: this.nitro > 0 && this.mode === 'play',
      shield: this.shield > 0 && this.mode === 'play',
      time: this.time,
    });
    const blink = this.mode === 'play' && this.invuln > 0 && Math.sin(this.time * 28) < -0.2;
    this.car.group.visible = !blink;

    this.shadow.position.set(this.x, 0.045, this.z);
    const air = Math.min(1, Math.max(0, this.y) / 2.2);
    this.shadow.material.opacity = 0.48 * (1 - air);
    this.shadow.scale.setScalar(1.05 + air * 0.45);

    this.laneGlow.position.x = THREE.MathUtils.damp(this.laneGlow.position.x, targetX, 14, dt);
    this.laneGlow.position.y = 0.03;
    this.laneGlow.position.z = this.z - 0.4;
    this.laneGlow.material.color.setHex(this.danger ? 0xff3344 : 0xffc857);
    this.laneGlow.material.opacity = this.danger ? 0.14 + Math.sin(this.time * 16) * 0.08 : 0.1;
  }

  poseCamera(dt) {
    const attract = this.mode === 'attract';
    const tall = this.camera.aspect < 1.15;
    const tx = attract ? (tall ? this.x - 3.6 : this.x - 0.2) : this.x * 0.36;
    const ty = attract ? (tall ? 2.05 : 3.15) : 3.45 + this.y * 0.22;
    const tz = attract ? (tall ? this.z + 7.6 : this.z + 13.2) : this.z + 6.5;
    const lx = attract ? (tall ? this.x - 0.15 : this.x + 3.4) : this.x * 0.7;
    const ly = attract ? (tall ? 0.55 : 0.35) : 0.68 + this.y * 0.12;
    const lz = attract ? (tall ? this.z + 0.2 : this.z - 6) : this.z - 14;
    const fov = attract
      ? (tall ? 32 : 36)
      : 73 + Math.max(0, this.speed - TUNING.startSpeed) * 0.16 + (this.nitro > 0 ? 6 : 0);

    if (this.snapCam) {
      this.camera.position.set(tx, ty, tz);
      this.snapCam = false;
    } else {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, tx, attract ? 2.4 : 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, ty, 4, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, tz, 8, dt);
    }
    LOOK.set(lx, ly, lz);
    this.camera.lookAt(LOOK);
    if (!attract && this.mode !== 'wreck') this.camera.rotateZ(this.roll * 0.45);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 4, dt);
    this.camera.updateProjectionMatrix();
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.55;
      this.shake = Math.max(0, this.shake - dt * 1.7);
    }

    this.sun.position.set(this.x - 24, 16, this.z + 6);
    this.sun.target.position.set(this.x, 0.4, this.z - 14);
    this.rim.position.set(this.x + 4, 3.5, this.z + 4);
    this.rim.target.position.set(this.x, 0.8, this.z);
    this.world.followCamera(this.camera);
  }

  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (!pad) return;
    const axis = pad.axes[0] || 0;
    const left = axis < -0.55 || pad.buttons[14]?.pressed;
    const right = axis > 0.55 || pad.buttons[15]?.pressed;
    if (left && !this.gpL) this.shiftLane(-1);
    if (right && !this.gpR) this.shiftLane(1);
    this.gpL = left;
    this.gpR = right;
    const jump = !!(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed);
    const duck = !!(pad.buttons[1]?.pressed || pad.buttons[13]?.pressed);
    this.padDuck = duck && this.mode === 'play';
    if (jump && !this.gpJ) {
      if (this.mode === 'attract' || this.mode === 'over') this.play();
      else if (this.mode === 'pause') this.resume();
      else this.tryJump();
    }
    if (duck && !this.gpD) this.tryDuck();
    this.gpJ = jump;
    this.gpD = duck;
  }

  syncSnap() {
    const snap = this.snap;
    snap.mode = this.mode;
    snap.score = this.score;
    snap.best = this.best;
    snap.volts = this.volts;
    snap.meters = this.meters;
    snap.speed = Math.round(this.speed * 2.25);
    snap.nears = this.nears;
    snap.smashes = this.smashes;
    snap.streak = this.streakT > 0 ? this.streak : 0;
    snap.shield = this.shield > 0;
    snap.magnet = Math.max(0, this.magnet);
    snap.nitro = Math.max(0, this.nitro);
    snap.paint = this.paintId;
    snap.driver = this.driverId;
    snap.newRecord = this.newRecord;
    snap.muted = this.sound.muted;
    document.body.dataset.mode = this.mode;
    document.body.dataset.boost = this.mode === 'play' && this.nitro > 0 ? '1' : '0';
  }
}
