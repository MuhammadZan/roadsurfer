import * as THREE from 'three';

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.max = 280;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;

    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0xdff8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lines = new THREE.Group();
    const lineGeo = new THREE.BoxGeometry(0.03, 0.03, 1);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(lineGeo, this.lineMat);
      this.placeLine(m, true);
      this.lines.add(m);
    }
    camera.add(this.lines);
  }

  placeLine(mesh, first) {
    const edge = Math.random() < 0.5 ? -1 : 1;
    const spread = 1.4 + Math.random() * 3.6;
    mesh.position.set(
      edge * spread + (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.4) * 3.2,
      first ? -4 - Math.random() * 28 : -18 - Math.random() * 16,
    );
    mesh.scale.z = 1.2 + Math.random() * 2.4;
  }

  burst(x, y, z, color, count, speed) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const id = this.cursor % this.max;
      this.cursor += 1;
      const i3 = id * 3;
      this.pos[i3] = x;
      this.pos[i3 + 1] = y;
      this.pos[i3 + 2] = z;
      this.col[i3] = c.r;
      this.col[i3 + 1] = c.g;
      this.col[i3 + 2] = c.b;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * speed;
      const sp = speed * (0.35 + Math.random());
      this.vel[i3] = Math.cos(a) * sp;
      this.vel[i3 + 1] = up;
      this.vel[i3 + 2] = Math.sin(a) * sp;
      this.life[id] = 0.35 + Math.random() * 0.35;
    }
  }

  update(dt, speed, boosting) {
    for (let i = 0; i < this.max; i++) {
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.pos[i3 + 1] = -9999;
        continue;
      }
      this.life[i] -= dt;
      this.vel[i3 + 1] -= dt * 8;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;

    const target = boosting ? 0.55 : Math.max(0, (speed - 58) / 90);
    this.lineMat.opacity = THREE.MathUtils.damp(this.lineMat.opacity, target, 4, dt);
    const push = dt * (16 + speed * 0.45);
    for (const line of this.lines.children) {
      line.position.z += push;
      if (line.position.z > 3) this.placeLine(line, false);
    }
  }
}
