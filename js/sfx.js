import { CONFIG } from './config.js';

const SHOT_FILES = {
  small: './assets/sounds/shoot-small.wav',
  beam: './assets/sounds/shoot-beam.wav',
  chaingun: './assets/sounds/shoot-chaingun.wav',
  big: './assets/sounds/shoot-big.wav',
  rocket: './assets/sounds/shoot-rocket.wav'
};
const CHAIN_WINDUP_FILE = './assets/sounds/chaingun-windup.wav';

const HIT_SMALL_COUNT = Math.max(1, CONFIG.SFX?.HIT_SMALL_COUNT ?? 1);
const HIT_BIG_COUNT = Math.max(1, CONFIG.SFX?.HIT_BIG_COUNT ?? 1);
const HIT_FILES = {
  small: Array.from({ length: HIT_SMALL_COUNT }, (_, i) => `./assets/sounds/hit-small-${i + 1}.wav`),
  big: Array.from({ length: HIT_BIG_COUNT }, (_, i) => `./assets/sounds/hit-big-${i + 1}.wav`)
};

const ENEMY_EXPLODE_COUNT = Math.max(1, CONFIG.SFX?.ENEMY_EXPLODE_COUNT ?? 2);
const ENEMY_EXPLODE_FILES = Array.from(
  { length: ENEMY_EXPLODE_COUNT },
  (_, i) => `./assets/sounds/enemy-explode-${i + 1}.wav`
);

const IBS_SPLAT_COUNT = Math.max(1, CONFIG.SFX?.IBS_SPLAT_COUNT ?? 4);
const IBS_SPLAT_FILES = Array.from({ length: IBS_SPLAT_COUNT }, (_, i) => `./assets/sounds/ibs-splat-${i + 1}.wav`);

const SHOT_BY_WEAPON = {
  rifle: 'small',
  beamer: 'beam',
  chaingun: 'chaingun',
  cannon: 'big',
  rocket: 'rocket'
};

const pools = new Map();
const POOL_SIZE = 6;
let lastChaingunWindupAt = -1e9;
const CHAIN_WINDUP_MIN_GAP_MS = 420;

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
  pools.set('chaingun-windup', makePool(CHAIN_WINDUP_FILE, 3));
  for (const [name, urls] of Object.entries(HIT_FILES)){
    for (let i = 0; i < urls.length; i++){
      pools.set(`hit:${name}:${i}`, makePool(urls[i], 8));
    }
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
  const variants = HIT_FILES[key] || [];
  if (!variants.length) return;
  const idx = (Math.random() * variants.length) | 0;
  playFromPool(pools.get(`hit:${key}:${idx}`));
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

export function playChaingunWindup(){
  ensureWarm();
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if ((now - lastChaingunWindupAt) < CHAIN_WINDUP_MIN_GAP_MS) return;
  lastChaingunWindupAt = now;
  playFromPool(pools.get('chaingun-windup'));
}

export const SFX = { warmup, playShot, playChaingunWindup, playHit, playEnemyExplode, playIbsSplat };
