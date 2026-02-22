import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';

const items = [];
let accPx = 0;

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
const DROPS = [...SIDE_WEAPON_DROPS, ...UPGRADE_DROPS];

function spawnOne(){
  const y = -R - 6;
  // try to spawn on a safe corridor
  for (let i=0;i<24;i++){
    const x = 20 + Math.random()*(world.w-40);
    if (Tiles.isSafe(x, y + 10)) { items.push({ x, y, def: DROPS[Math.floor(Math.random()*DROPS.length)] }); return; }
  }
  items.push({ x: world.w/2, y, def: DROPS[Math.floor(Math.random()*DROPS.length)] });
}

export function reset(){ items.length = 0; accPx = 0; }

export function update(dt){
  // accumulate pixel scroll like tiles
  accPx += world.scroll;
  const spacingPx = CONFIG.TILE.H * CONFIG.POWERUPS.EVERY_ROWS;
  while (accPx >= spacingPx){
    accPx -= spacingPx;
    spawnOne();
  }
  for(const it of items) it.y += world.scroll;

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
  }
}

export function draw(g){
  for(const it of items) Theme.drawPowerup(g, it, R);
}

export const Powerups = { reset, update, draw };
