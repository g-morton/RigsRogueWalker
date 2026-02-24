import { CONFIG } from './config.js';

const SHOT_FILES = {
  small: './assets/sounds/shoot-small.wav',
  chaingun: './assets/sounds/shoot-chaingun.wav',
  big: './assets/sounds/shoot-big.wav',
  rocket: './assets/sounds/shoot-rocket.wav'
};

const HIT_FILES = {
  small: './assets/sounds/hit-small.wav',
  big: './assets/sounds/hit-big.wav'
};

const ENEMY_EXPLODE_FILES = [
  './assets/sounds/enemy-explode-1.wav',
  './assets/sounds/enemy-explode-2.wav'
];

const IBS_SPLAT_COUNT = Math.max(1, CONFIG.SFX?.IBS_SPLAT_COUNT ?? 4);
const IBS_SPLAT_FILES = Array.from({ length: IBS_SPLAT_COUNT }, (_, i) => `./assets/sounds/ibs-splat-${i + 1}.wav`);

const SHOT_BY_WEAPON = {
  rifle: 'small',
  chaingun: 'chaingun',
  cannon: 'big',
  rocket: 'rocket'
};

const pools = new Map();
const POOL_SIZE = 6;

function makePool(url, size = POOL_SIZE){
  const arr = [];
  for (let i = 0; i < size; i++){
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = 0.45;
    arr.push(a);
  }
  return { clips: arr, idx: 0 };
}

function getPool(name){
  if (!pools.has(name)){
    const url = SHOT_FILES[name];
    if (!url) return null;
    pools.set(name, makePool(url));
  }
  return pools.get(name);
}

function playFromPool(pool){
  if (!pool || !pool.clips.length) return;
  const a = pool.clips[pool.idx];
  pool.idx = (pool.idx + 1) % pool.clips.length;
  try{
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(()=>{});
  } catch {}
}

export function warmup(){
  for (const [name, url] of Object.entries(SHOT_FILES)){
    pools.set(name, makePool(url));
  }
  for (const [name, url] of Object.entries(HIT_FILES)){
    pools.set(`hit:${name}`, makePool(url, 8));
  }
  for (let i = 0; i < ENEMY_EXPLODE_FILES.length; i++){
    pools.set(`explode:${i}`, makePool(ENEMY_EXPLODE_FILES[i], 4));
  }
  for (let i = 0; i < IBS_SPLAT_FILES.length; i++){
    pools.set(`ibs:${i}`, makePool(IBS_SPLAT_FILES[i], 3));
  }
}

function playHit(amount = 1){
  const key = (amount >= 14) ? 'big' : 'small';
  playFromPool(pools.get(`hit:${key}`));
}

function playEnemyExplode(){
  if (!ENEMY_EXPLODE_FILES.length) return;
  const idx = (Math.random() * ENEMY_EXPLODE_FILES.length) | 0;
  playFromPool(pools.get(`explode:${idx}`));
}

function playIbsSplat(){
  if (!IBS_SPLAT_FILES.length) return;
  const idx = (Math.random() * IBS_SPLAT_FILES.length) | 0;
  playFromPool(pools.get(`ibs:${idx}`));
}

function ensureWarm(){
  if (!pools.size){
    warmup();
  }
}

export function playShot(weaponType){
  ensureWarm();
  const key = SHOT_BY_WEAPON[weaponType];
  if (!key) return;
  playFromPool(pools.get(key) || getPool(key));
}

export const SFX = { warmup, playShot, playHit, playEnemyExplode, playIbsSplat };
