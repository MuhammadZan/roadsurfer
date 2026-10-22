import * as THREE from 'three';

const boxCache = new Map();
const taperCache = new Map();

export function box(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let geo = boxCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    boxCache.set(key, geo);
  }
  return geo;
}

/** Flat-shaded tapered box. Origin at center X/Z, bottom at Y=0, nose toward -Z. */
export function taperBox(wr, wf, hr, hf, len) {
  const key = `${wr}|${wf}|${hr}|${hf}|${len}`;
  let geo = taperCache.get(key);
  if (geo) return geo;

  const v = [
    [-wr / 2, 0, len / 2],
    [wr / 2, 0, len / 2],
    [wf / 2, 0, -len / 2],
    [-wf / 2, 0, -len / 2],
    [-wr / 2, hr, len / 2],
    [wr / 2, hr, len / 2],
    [wf / 2, hf, -len / 2],
    [-wf / 2, hf, -len / 2],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [3, 6, 2], [3, 7, 6],
    [0, 4, 7], [0, 7, 3],
    [1, 2, 6], [1, 6, 5],
  ];
  const pos = [];
  for (const f of faces) {
    for (const i of f) pos.push(v[i][0], v[i][1], v[i][2]);
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  taperCache.set(key, geo);
  return geo;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const textures = {
  asphalt: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3f4a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2800; i++) {
      const v = 46 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v},${v + 8},0.16)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 3 + Math.random() * 12);
    }
  }),
  sand: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e4c48a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const v = 160 + Math.random() * 70;
      g.fillStyle = `rgba(${v},${v - 30},${v - 70},0.22)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }),
  stripe: canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#ff7a1a';
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-0.7);
    g.fillStyle = '#f7f7f7';
    for (let x = -180; x < 180; x += 26) g.fillRect(x, -90, 10, 180);
    g.restore();
  }),
  windows: canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#221c2a';
    g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 12) {
      for (let x = 4; x < w; x += 8) {
        if (Math.random() < 0.42) continue;
        g.fillStyle = Math.random() > 0.55 ? '#ffd7a1' : '#9fd0ea';
        g.globalAlpha = 0.55 + Math.random() * 0.45;
        g.fillRect(x, y, 4, 6);
        g.globalAlpha = 1;
      }
    }
  }),
  glow: canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }),
  shadow: canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.65)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }),
  plate: canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f6f3ec';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c1121f';
    g.fillRect(0, 0, w, 18);
    g.fillStyle = '#161616';
    g.font = '700 78px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SURF', w / 2, 74);
  }),
  emblem: canvasTex(128, 128, (g) => {
    g.fillStyle = '#f4efe6';
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d30b12';
    g.beginPath();
    g.moveTo(64, 20);
    g.lineTo(102, 80);
    g.lineTo(64, 62);
    g.lineTo(26, 80);
    g.closePath();
    g.fill();
  }),
  arrow: canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,252,245,0.92)';
    g.beginPath();
    g.moveTo(64, 8);
    g.lineTo(116, 72);
    g.lineTo(84, 72);
    g.lineTo(84, 120);
    g.lineTo(44, 120);
    g.lineTo(44, 72);
    g.lineTo(12, 72);
    g.closePath();
    g.fill();
  }),
  chevron: canvasTex(128, 128, (g) => {
    g.fillStyle = '#f08a24';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff6e8';
    for (let i = 0; i < 3; i++) {
      const y = 18 + i * 36;
      g.beginPath();
      g.moveTo(64, y);
      g.lineTo(108, y + 24);
      g.lineTo(96, y + 24);
      g.lineTo(64, y + 10);
      g.lineTo(32, y + 24);
      g.lineTo(20, y + 24);
      g.closePath();
      g.fill();
    }
  }),
  tuck: canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#161018';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffcc33';
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
    g.font = '800 92px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('TUCK', w / 2, h / 2 + 4);
  }),
  laneSign: canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#161018';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff5a3c';
    g.fillRect(0, 0, 14, h);
    g.fillStyle = '#fff6ea';
    g.font = '800 72px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('LOW', w / 2 + 8, h / 2 + 4);
  }),
  banner: canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#f3e6d4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d30b12';
    g.fillRect(0, 0, w, 12);
    g.fillRect(0, h - 12, w, 12);
    g.font = '800 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SURF THE COAST', w / 2, h / 2 + 4);
  }),
  billboard: [],
};

const ADS = [
  ['NIGHT RUN', 'NO BRAKES'],
  ['VOLT CITY', 'NEXT EXIT'],
  ['KEEP SURFING', 'COAST HIGHWAY'],
  ['HOLD THE LINE', 'THREE LANES'],
];

textures.billboard = ADS.map(([title, sub]) => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#141018';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff4d2e';
  g.fillRect(0, 0, 16, h);
  g.fillStyle = '#fff4e6';
  g.font = '800 78px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(title, 40, 118);
  g.fillStyle = '#ffb703';
  g.font = '700 36px sans-serif';
  g.fillText(sub, 42, 176);
}));

textures.asphalt.wrapS = textures.asphalt.wrapT = THREE.RepeatWrapping;
textures.asphalt.repeat.set(2, 8);
textures.sand.wrapS = textures.sand.wrapT = THREE.RepeatWrapping;
textures.sand.repeat.set(4, 4);
textures.windows.wrapS = textures.windows.wrapT = THREE.RepeatWrapping;
textures.stripe.wrapS = textures.stripe.wrapT = THREE.RepeatWrapping;

export function applyAniso(renderer) {
  const max = renderer.capabilities.getMaxAnisotropy();
  const list = [textures.asphalt, textures.sand, textures.windows, textures.stripe, ...textures.billboard];
  for (const t of list) t.anisotropy = max;
}
