import { DRIVERS, PAINTS } from './config.js';
import { Game } from './game.js';

const canvas = document.querySelector('#c');
const fail = document.querySelector('#fail');

const scoreEl = document.querySelector('#score');
const metersEl = document.querySelector('#meters');
const speedEl = document.querySelector('#speed');
const voltsEl = document.querySelector('#volts');
const streakEl = document.querySelector('#streak');
const powersEl = document.querySelector('#powers');
const menuBest = document.querySelector('#menu-best');
const overKicker = document.querySelector('#over-kicker');
const overScore = document.querySelector('#over-score');
const overMeters = document.querySelector('#over-meters');
const overVolts = document.querySelector('#over-volts');
const overNears = document.querySelector('#over-nears');
const overSmashes = document.querySelector('#over-smashes');
const recordEl = document.querySelector('#record');
const muteEl = document.querySelector('#mute');
const coachEl = document.querySelector('#coach');
const toasts = document.querySelector('#toasts');

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');

let coachTimer = 0;
let lastKey = '';

function pushToast(text, kind) {
  const el = document.createElement('div');
  el.className = `toast ${kind || ''}`;
  el.textContent = text;
  toasts.appendChild(el);
  while (toasts.children.length > 4) toasts.firstChild.remove();
  setTimeout(() => el.remove(), 950);
}

const ui = {
  onFrame(snap) {
    const key = [
      snap.score, snap.meters, snap.speed, snap.volts, snap.streak,
      snap.shield, snap.magnet.toFixed(1), snap.nitro.toFixed(1),
      snap.best, snap.mode, snap.paint, snap.driver, snap.newRecord, snap.muted,
    ].join('|');
    if (key === lastKey) return;
    lastKey = key;
    scoreEl.textContent = fmt(snap.score);
    metersEl.textContent = `${fmt(snap.meters)} m`;
    speedEl.textContent = fmt(snap.speed);
    voltsEl.textContent = fmt(snap.volts);
    streakEl.textContent = snap.streak > 1 ? `Near x${snap.streak}` : '';
    const chips = [];
    if (snap.shield) chips.push('<i class="shield">Shield</i>');
    if (snap.magnet > 0) chips.push(`<i class="magnet">Magnet ${snap.magnet.toFixed(1)}</i>`);
    if (snap.nitro > 0) chips.push(`<i class="nitro">Nitro ${snap.nitro.toFixed(1)}</i>`);
    powersEl.innerHTML = chips.join('');
    menuBest.textContent = `Best ${fmt(snap.best)}`;
    muteEl.textContent = snap.muted ? 'Muted' : 'Sound';
    document.querySelectorAll('#paints .swatch').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.id === snap.paint);
    });
    document.querySelectorAll('#drivers .driver').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.id === snap.driver);
    });
    if (snap.mode === 'over') {
      overKicker.textContent = snap.newRecord ? 'New record' : 'Wrecked';
      recordEl.hidden = true;
      overScore.textContent = fmt(snap.score);
      overMeters.textContent = `${fmt(snap.meters)} m`;
      overVolts.textContent = fmt(snap.volts);
      overNears.textContent = fmt(snap.nears);
      overSmashes.textContent = fmt(snap.smashes);
    }
  },
  toast: pushToast,
  coach() {
    coachEl.classList.add('show');
    clearTimeout(coachTimer);
    coachTimer = setTimeout(() => coachEl.classList.remove('show'), 7000);
  },
};

let game;
try {
  game = new Game(canvas, ui);
} catch (error) {
  console.error(error);
  fail.hidden = false;
  throw error;
}

const paints = document.querySelector('#paints');
for (const paint of PAINTS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swatch';
  btn.dataset.id = paint.id;
  btn.style.setProperty('--c', paint.color);
  btn.textContent = paint.name;
  btn.addEventListener('click', () => game.setPaint(paint.id));
  paints.appendChild(btn);
}

const drivers = document.querySelector('#drivers');
for (const driver of DRIVERS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'driver';
  btn.dataset.id = driver.id;
  btn.style.setProperty('--c', driver.helmet);
  btn.textContent = driver.name;
  btn.addEventListener('click', () => game.setDriver(driver.id));
  drivers.appendChild(btn);
}

document.querySelector('#play').addEventListener('click', () => game.play());
document.querySelector('#retry').addEventListener('click', () => game.play());
document.querySelector('#resume').addEventListener('click', () => game.resume());
document.querySelector('#to-menu').addEventListener('click', () => game.toMenu());
document.querySelector('#pause-menu').addEventListener('click', () => game.toMenu());
document.querySelector('#pause-btn').addEventListener('click', () => game.pause());
document.querySelector('#mute').addEventListener('click', () => {
  game.toggleMute();
  lastKey = '';
});

for (const btn of document.querySelectorAll('#touch button')) {
  btn.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    game.act(btn.dataset.act);
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => game?.destroy());
}
