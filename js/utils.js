import { CONFIG } from './config.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d', { alpha: false });

canvas.width = CONFIG.CANVAS.W;
canvas.height = CONFIG.CANVAS.H;

export const world = {
  w: canvas.width,
  h: canvas.height,
  running: false,
  dist: 0,
  // Scroll speed in px/s (see CONFIG.SCROLL.PX_PER_SEC)
  scroll: CONFIG.SCROLL.PX_PER_SEC,
  // Per-frame scroll delta in px (computed each frame by the game loop)
  dy: 0,
  player: null,
  level: 1,
  chassisKey: 'windward',
  allowedWeaponDrops: null,
  allowedWeaponSides: null,
  bossActive: false,
  nextBossDist: (CONFIG.BOSS?.INTERVAL_DIST ?? 5000),
  spawnLocked: false,
  spawnScale: 1,
  // HUD counters (read by hud.js)
  ibsHit: 0,
  enemyDestroyed: 0
};

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function rand(a, b){ return a + Math.random() * (b - a); }
