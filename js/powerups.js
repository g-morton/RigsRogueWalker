import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';

const items = [];
let accPx = 0;
let spawnCount = 0;
let nextRepairAt = 5;

const R = CONFIG.POWERUPS.RADIUS;

const SIDE_WEAPON_DROPS = [
  { key:'L-Ri', type:'weapon', side:'left',  weapon:'rifle'    },
  { key:'R-Ri', type:'weapon', side:'right', weapon:'rifle'    },
  { key:'L-Ch', type:'weapon', side:'left',  weapon:'chaingun' },
  { key:'R-Ch', type:'weapon', side:'right', weapon:'chaingun' },
  { key:'L-Ro', type:'weapon', side:'left',  weapon:'rocket'   },
  { key:'R-Ro', type:'weapon', side:'right', weapon:'rocket'   },
  { key:'L-Ca', type:'weapon', side:'left',  weapon:'cannon'   },
  { key:'R-Ca', type:'weapon', side:'right', weapon:'cannon'   }
];
const UPGRADE_DROPS = [
  { key:'D', type:'upgrade', stat:'damage' },
  { key:'F', type:'upgrade', stat:'projSpeedMul' },
  { key:'R', type:'upgrade', stat:'reloadMul' },
  { key:'M', type:'upgrade', stat:'speedMul' }
];
const REPAIR_DROPS = [
  { key:'HP', type:'repair', healFrac: CONFIG.POWERUPS.REPAIR_HEAL_FRAC ?? 0.35 }
];
const NON_REPAIR_DROPS = [...SIDE_WEAPON_DROPS, ...UPGRADE_DROPS];

function scheduleNextRepair(){
  const minN = Math.max(1, CONFIG.POWERUPS.REPAIR_GUARANTEE_MIN ?? 4);
  const maxN = Math.max(minN, CONFIG.POWERUPS.REPAIR_GUARANTEE_MAX ?? 5);
  const span = maxN - minN + 1;
  nextRepairAt = spawnCount + minN + ((Math.random() * span) | 0);
}

function chooseDrop(){
  const pl = world.player;
  const maxHp = Math.max(1, pl?.maxHp ?? 1);
  const hp = Math.max(0, Math.min(maxHp, pl?.hp ?? maxHp));
  const hpRatio = hp / maxHp;
  const damaged = hpRatio < 0.999;

  // Guarantee a repair every 4-5 drops while damaged.
  if (damaged && spawnCount >= nextRepairAt){
    scheduleNextRepair();
    return REPAIR_DROPS[0];
  }

  // Damage-aware repair weighting.
  const base = CONFIG.POWERUPS.REPAIR_BASE_CHANCE ?? 0.08;
  const bonusMax = CONFIG.POWERUPS.REPAIR_MAX_BONUS_CHANCE ?? 0.55;
  const chance = damaged ? Math.min(0.9, base + (1 - hpRatio) * bonusMax) : Math.max(0, base * 0.15);
  if (Math.random() < chance){
    if (damaged) scheduleNextRepair();
    return REPAIR_DROPS[0];
  }

  return NON_REPAIR_DROPS[(Math.random() * NON_REPAIR_DROPS.length) | 0];
}

function spawnOne(){
  const y = -R - 6;
  spawnCount++;
  const def = chooseDrop();
  // try to spawn on a safe corridor
  for (let i=0;i<24;i++){
    const x = 20 + Math.random()*(world.w-40);
    if (Tiles.isSafe(x, y + 10)) { items.push({ x, y, def }); return; }
  }
  items.push({ x: world.w/2, y, def });
}

export function reset(){
  items.length = 0;
  accPx = 0;
  spawnCount = 0;
  scheduleNextRepair();
}

export function update(dt){
  const dy = world.dy;
  // accumulate pixel scroll like tiles
  accPx += dy;
  const spacingPx = CONFIG.TILE.H * CONFIG.POWERUPS.EVERY_ROWS;
  while (accPx >= spacingPx){
    accPx -= spacingPx;
    spawnOne();
  }
  for(const it of items) it.y += dy;

  const p = world.player;
  if (p){
    for (let i=items.length-1;i>=0;i--){
      const it = items[i];
      const dx = it.x - p.x, dy = it.y - p.y;
      if (dx*dx + dy*dy <= (R+18)*(R+18)){
        apply(it.def, p);
        items.splice(i,1);
      }
    }
  }

  for (let i=items.length-1;i>=0;i--){
    if (items[i].y > world.h + 40) items.splice(i,1);
  }
}

function apply(def, p){
  if (def.type === 'weapon'){
    p.setWeapon(def.side, def.weapon);
  } else if (def.type === 'upgrade'){
    switch(def.stat){
      case 'speedMul':      p.speedMul       = Math.min(2.0, p.speedMul * 1.12); break;
      case 'projSpeedMul':  p.projSpeedMul   = Math.min(2.5, p.projSpeedMul * 1.15); break;
      case 'reloadMul':     p.reloadMul      = Math.max(0.4, p.reloadMul * 0.88); break;
      case 'damage':        p.damageMul      = Math.min(3.0, p.damageMul * 1.10); break;
    }
  } else if (def.type === 'repair'){
    const maxHp = Math.max(1, p.maxHp ?? 1);
    const heal = maxHp * (def.healFrac ?? 0.35);
    p.hp = Math.min(maxHp, (p.hp ?? maxHp) + heal);
  }
}

export function draw(g){
  for(const it of items) Theme.drawPowerup(g, it, R);
}

export const Powerups = { reset, update, draw };
