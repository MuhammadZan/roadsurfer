export const LANE = 3.2;
export const CHUNK = 90;
export const START_Z = -20;

export const TUNING = {
  startSpeed: 38,
  attractSpeed: 24,
  maxExtra: 36,
  accelPerMeter: 0.011,
  nitroMul: 1.4,
  nitroTime: 4.4,
  magnetTime: 7.5,
  jumpH: 2.28,
  jumpDur: 0.66,
  duckTime: 0.56,
  playerHx: 0.76,
  playerHz: 1.48,
  standH: 1.14,
  duckH: 0.48,
  nearWindow: 1.35,
};

export const PAINTS = [
  { id: 'crimson', name: 'Crimson', color: '#d30b12', glow: '#ff2940' },
  { id: 'midnight', name: 'Midnight', color: '#171b24', glow: '#49c2ff' },
  { id: 'pearl', name: 'Pearl', color: '#f4f0e8', glow: '#ffd27a' },
  { id: 'surf', name: 'Surf', color: '#12c4b0', glow: '#7dffe9' },
];

export const DRIVERS = [
  { id: 'rio', name: 'Rio', helmet: '#f6f6f6', suit: '#1a1a1a', visor: '#1b242c' },
  { id: 'nova', name: 'Nova', helmet: '#ffb703', suit: '#2a1218', visor: '#14202b' },
  { id: 'lux', name: 'Lux', helmet: '#141414', suit: '#f3f3f3', visor: '#e0b44a' },
];

export const TRAFFIC_COLORS = [
  0xf4f4f4, 0x2c3038, 0xd4a017, 0x355c7d, 0xc9c3b8, 0x8c1c13, 0x1f6f5b, 0x4a4e69, 0xe07a3d,
];

export function paintById(id) {
  return PAINTS.find((p) => p.id === id) || PAINTS[0];
}

export function driverById(id) {
  return DRIVERS.find((d) => d.id === id) || DRIVERS[0];
}
