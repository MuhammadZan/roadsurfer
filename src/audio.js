export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.muted = false;
    this.beatAcc = 0;
    try {
      this.muted = localStorage.getItem('rs-mute') === '1';
    } catch {
      this.muted = false;
    }
  }

  unlock() {
    if (!this.ctx) this.build();
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('rs-mute', this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.85;
    return this.muted;
  }

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    osc2.start();

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx;
    this.master = master;
    this.noiseBuffer = buffer;
    this.engine = { osc, osc2, filter, gain };
  }

  setDrive(speed, on) {
    if (!this.engine) return;
    const now = this.ctx.currentTime;
    const g = on ? 0.03 + Math.min(0.035, speed * 0.00045) : 0;
    this.engine.gain.gain.setTargetAtTime(g, now, 0.08);
    const f = 42 + speed * 1.25;
    this.engine.osc.frequency.setTargetAtTime(f, now, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(f * 2.01, now, 0.08);
    this.engine.filter.frequency.setTargetAtTime(160 + speed * 9, now, 0.1);
  }

  blip(freq, dur, type, gainV, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gainV, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, gainV, freq = 900, type = 'highpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainV, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  lane() {
    this.blip(210, 0.07, 'square', 0.04);
    this.noise(0.05, 0.03, 1800, 'bandpass');
  }

  jump() {
    this.blip(280, 0.16, 'sine', 0.06, 220);
  }

  coin() {
    this.blip(1320, 0.07, 'sine', 0.05);
    this.blip(1760, 0.09, 'triangle', 0.03);
  }

  pickup(kind) {
    const base = kind === 'nitro' ? 440 : kind === 'magnet' ? 520 : 660;
    this.blip(base, 0.08, 'triangle', 0.05);
    this.blip(base * 1.5, 0.12, 'sine', 0.04);
  }

  near() {
    this.blip(540, 0.08, 'triangle', 0.04);
    this.blip(810, 0.1, 'sine', 0.03);
  }

  smash() {
    this.noise(0.12, 0.08, 500, 'lowpass');
    this.blip(180, 0.14, 'sawtooth', 0.05, -80);
  }

  crash() {
    this.noise(0.4, 0.16, 420, 'lowpass');
    this.blip(160, 0.35, 'sawtooth', 0.08, -110);
  }

  beat(dt, bpm) {
    if (!this.ctx || this.muted) return;
    this.beatAcc += dt;
    const step = 60 / Math.max(70, bpm);
    let n = 0;
    while (this.beatAcc >= step && n < 2) {
      this.beatAcc -= step;
      this.kick();
      n += 1;
    }
  }

  kick() {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.18);
  }
}
