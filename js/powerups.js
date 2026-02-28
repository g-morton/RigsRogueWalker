import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';
import { Particles } from './particles.js';
import { SFX } from './sfx.js';

const items = [];

const R = CONFIG.POWERUPS.RADIUS;

const SIDE_WEAPON_DROPS = [
  { key:'L-Ri', type:'weapon', side:'left',  weapon:'rifle'    },
  { key:'R-Ri', type:'weapon', side:'right', weapon:'rifle'    },
  { key:'L-LR', type:'weapon', side:'left',  weapon:'longrifle' },
  { key:'R-LR', type:'weapon', side:'right', weapon:'longrifle' },
  { key:'L-Sg', type:'weapon', side:'left',  weapon:'shotgun'  },
  { key:'R-Sg', type:'weapon', side:'right', weapon:'shotgun'  },
  { key:'L-HS', type:'weapon', side:'left',  weapon:'heavyshotgun' },
  { key:'R-HS', type:'weapon', side:'right', weapon:'heavyshotgun' },
  { key:'L-Ch', type:'weapon', side:'left',  weapon:'chaingun' },
  { key:'R-Ch', type:'weapon', side:'right', weapon:'chaingun' },
  { key:'L-CC', type:'weapon', side:'left',  weapon:'chaincannon' },
  { key:'R-CC', type:'weapon', side:'right', weapon:'chaincannon' },
  { key:'L-Be', type:'weapon', side:'left',  weapon:'beamer'   },
  { key:'R-Be', type:'weapon', side:'right', weapon:'beamer'   },
  { key:'L-PB', type:'weapon', side:'left',  weapon:'punchbeamer' },
  { key:'R-PB', type:'weapon', side:'right', weapon:'punchbeamer' },
  { key:'L-Ro', type:'weapon', side:'left',  weapon:'rocket'   },
  { key:'R-Ro', type:'weapon', side:'right', weapon:'rocket'   },
  { key:'L-RP', type:'weapon', side:'left',  weapon:'rocketpod' },
  { key:'R-RP', type:'weapon', side:'right', weapon:'rocketpod' },
  { key:'L-Ca', type:'weapon', side:'left',  weapon:'cannon'   },
  { key:'R-Ca', type:'weapon', side:'right', weapon:'cannon'   }
];
const MINOR_REPAIR = {
  key: 'Hp',
  type: 'repair',
  healFrac: CONFIG.POWERUPS.MINOR_REPAIR_HEAL_FRAC ?? 0.15
};
const MEDIUM_REPAIR = {
  key: 'Hp+',
  type: 'repair',
  healFrac: CONFIG.POWERUPS.MEDIUM_REPAIR_HEAL_FRAC ?? 0.30
};
const ESTELLE_MEDIUM_REPAIR = {
  key: 'Hp+',
  type: 'repair',
  healFrac: CONFIG.POWERUPS.ESTELLE_MEDIUM_REPAIR_HEAL_FRAC ?? 0.45
};
const BOT_UPGRADES = [
  { key: 'SPD+', type: 'bot', stat: 'speed', add: 0.12, max: 2.4, w: 1.0 },
  { key: 'DMG+', type: 'bot', stat: 'damage', mul: 1.12, max: 3.0, w: 1.0 },
  { key: 'RLD+', type: 'bot', stat: 'reload', mul: 0.92, min: 0.45, w: 0.95 },
  { key: 'PRJ+', type: 'bot', stat: 'projectile', mul: 1.10, max: 2.6, w: 0.90 }
];

function weightedPick(entries){
  let total = 0;
  for (const e of entries) total += Math.max(0, e.w ?? 1);
  let r = Math.random() * Math.max(1, total);
  for (const e of entries){
    r -= Math.max(0, e.w ?? 1);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function chooseBotUpgrade(){
  return weightedPick(BOT_UPGRADES);
}

function chooseWeaponDrop(){
  const allowed = Array.isArray(world.allowedWeaponDrops) ? world.allowedWeaponDrops : null;
  const allowedSides = Array.isArray(world.allowedWeaponSides) ? world.allowedWeaponSides : null;
  const pool = SIDE_WEAPON_DROPS.filter((d) => {
    if (allowed && allowed.length && !allowed.includes(d.weapon)) return false;
    if (allowedSides && allowedSides.length && !allowedSides.includes(d.side)) return false;
    return true;
  });
  const src = pool.length ? pool : SIDE_WEAPON_DROPS;
  return src[(Math.random() * src.length) | 0];
}

function chooseDropFromTurretType(type){
  if (type === 'small') return MINOR_REPAIR;
  if (type === 'medium'){
    if (world.chassisKey === 'estelle') return ESTELLE_MEDIUM_REPAIR;
    return chooseBotUpgrade();
  }
  if (type === 'large') return chooseWeaponDrop();
  return null;
}

export function spawnFromTurret(x, y, type){
  const def = chooseDropFromTurretType(type);
  if (!def) return;
  items.push({
    x: Math.max(20, Math.min(world.w - 20, x)),
    y,
    def
  });
}

function chooseBossDrop(hpFactor){
  // Higher HP bosses skew toward weapon drops.
  const weaponChance = Math.min(0.72, 0.24 + hpFactor * 0.36);
  const botChance = Math.min(0.34, 0.18 + hpFactor * 0.10);
  const mediumRepairChance = Math.max(0.10, 0.28 - hpFactor * 0.10);
  const r = Math.random();
  if (r < weaponChance) return chooseWeaponDrop();
  if (r < weaponChance + botChance) return chooseBotUpgrade();
  if (r < weaponChance + botChance + mediumRepairChance) return MEDIUM_REPAIR;
  return MINOR_REPAIR;
}

export function spawnBossBurst(x, y, maxHp = 260){
  const hp = Math.max(1, maxHp ?? 1);
  const hpFactor = Math.max(0, Math.min(1, (hp - 180) / 540)); // ~180..720 maps to 0..1
  const count = Math.max(3, Math.min(10, 3 + Math.round(hp / 180)));

  // Guarantee at least one repair and one weapon from larger bosses.
  const guaranteed = [];
  if (count >= 4) guaranteed.push(MEDIUM_REPAIR);
  if (count >= 6) guaranteed.push(chooseBotUpgrade());
  if (count >= 5) guaranteed.push(chooseWeaponDrop());

  for (let i = 0; i < count; i++){
    const def = guaranteed[i] || chooseBossDrop(hpFactor);
    const a = Math.random() * Math.PI * 2;
    const sp = 55 + Math.random() * 130 + hpFactor * 55;
    items.push({
      x: Math.max(20, Math.min(world.w - 20, x + Math.cos(a) * (6 + Math.random() * 18))),
      y: y + Math.sin(a) * (4 + Math.random() * 14),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (25 + Math.random() * 60),
      def
    });
  }
}

export function reset(){
  items.length = 0;
}

export function update(dt){
  const dy = world.dy;
  for(const it of items){
    it.y += dy;
    if (Number.isFinite(it.vx) || Number.isFinite(it.vy)){
      it.vx = (it.vx ?? 0) * Math.max(0, 1 - dt * 2.6);
      it.vy = (it.vy ?? 0) * Math.max(0, 1 - dt * 2.2) + (110 * dt);
      it.x += (it.vx ?? 0) * dt;
      it.y += (it.vy ?? 0) * dt;
      if (it.x < 20){ it.x = 20; it.vx = Math.abs(it.vx ?? 0) * 0.35; }
      if (it.x > world.w - 20){ it.x = world.w - 20; it.vx = -Math.abs(it.vx ?? 0) * 0.35; }
      if (Math.abs(it.vx ?? 0) < 2 && Math.abs(it.vy ?? 0) < 2){
        it.vx = 0; it.vy = 0;
      }
    }
  }

  const p = world.player;
  if (p){
    for (let i=items.length-1;i>=0;i--){
      const it = items[i];
      const dx = it.x - p.x, dy = it.y - p.y;
      if (dx*dx + dy*dy <= (R+18)*(R+18)){
        Particles.spawnPickupBurst?.(it.x, it.y, 1.0);
        SFX.playPickup?.();
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
    p.grantWeaponFromPickup?.(def.side, def.weapon) ?? p.setWeapon(def.side, def.weapon);
  } else if (def.type === 'repair'){
    const maxHp = Math.max(1, p.maxHp ?? 1);
    const heal = maxHp * (def.healFrac ?? 0.35);
    p.heal?.(heal);
  } else if (def.type === 'bot'){
    if (def.stat === 'speed'){
      const add = def.add ?? 0.1;
      const max = def.max ?? 2.0;
      p.speedMul = Math.min(max, (p.speedMul ?? 1) + add);
    } else if (def.stat === 'damage'){
      const mul = def.mul ?? 1.1;
      const max = def.max ?? 2.5;
      p.damageMul = Math.min(max, (p.damageMul ?? 1) * mul);
    } else if (def.stat === 'reload'){
      const mul = def.mul ?? 0.92;
      const min = def.min ?? 0.45;
      p.reloadMul = Math.max(min, (p.reloadMul ?? 1) * mul);
    } else if (def.stat === 'projectile'){
      const mul = def.mul ?? 1.08;
      const max = def.max ?? 2.3;
      p.projSpeedMul = Math.min(max, (p.projSpeedMul ?? 1) * mul);
    }
    p.addMediumRigMark?.();
  }
}

export function draw(g){
  for(const it of items) Theme.drawPowerup(g, it, R);
}

export function clearActive(){
  items.length = 0;
}

export function hasActive(){
  return items.length > 0;
}

export const Powerups = { reset, update, draw, clearActive, hasActive, spawnFromTurret, spawnBossBurst };
