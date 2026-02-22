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
  scroll: CONFIG.SCROLL.BASE,
  player: null
};

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function rand(a, b){ return a + Math.random() * (b - a); }
