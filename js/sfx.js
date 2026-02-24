const SHOT_FILES = {
  small: './assets/sounds/shoot-small.wav',
  big: './assets/sounds/shoot-big.wav',
  rocket: './assets/sounds/shoot-rocket.wav'
};

const SHOT_BY_WEAPON = {
  rifle: 'small',
  chaingun: 'small',
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
  for (const name of Object.keys(SHOT_FILES)){
    getPool(name);
  }
}

export function playShot(weaponType){
  const key = SHOT_BY_WEAPON[weaponType];
  if (!key) return;
  playFromPool(getPool(key));
}

export const SFX = { warmup, playShot };

