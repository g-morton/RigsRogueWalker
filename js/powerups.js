import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';
import { Particles } from './particles.js';

const items = [];

const R = CONFIG.POWERUPS.RADIUS;

const SIDE_WEAPON_DROPS = [
  { key:'L-Ri', type:'weapon', side:'left',  weapon:'rifle'    },
  { key:'R-Ri', type:'weapon', side:'right', weapon:'rifle'    },
  { key:'L-Ch', type:'weapon', side:'left',  weapon:'chaingun' },
  { key:'R-Ch', type:'weapon', side:'right', weapon:'chaingun' },
  { key:'L-Be', type:'weapon', side:'left',  weapon:'beamer'   },
  { key:'R-Be', type:'weapon', side:'right', weapon:'beamer'   },
  { key:'L-Ro', type:'weapon', side:'left',  weapon:'rocket'   },
  { key:'R-Ro', type:'weapon', side:'right', weapon:'rocket'   },
  { key:'L-Ca', type:'weapon', side:'left',  weapon:'cannon'   },
  { key:'R-Ca', type:'weapon', side:'right', weapon:'cannon'   }
];
const MINOR_REPAIR = {
  key: 'HP+',
  type: 'repair',
  healFrac: CONFIG.POWERUPS.MINOR_REPAIR_HEAL_FRAC ?? 0.15
};
const minorWalkerBase = Math.max(1.01, CONFIG.POWERUPS.MINOR_WALKER_FACTOR ?? 1.08);
const minorReloadFactor = Math.max(0.82, 1 - (minorWalkerBase - 1) * 0.75);
const MINOR_WALKER_DROPS = [
  { key: 'MW', type: 'upgrade', stat: 'speedMul', factor: minorWalkerBase, mediumTier: true },
  { key: 'MD', type: 'upgrade', stat: 'damage', factor: 1 + (minorWalkerBase - 1) * 0.80, mediumTier: true },
  { key: 'MF', type: 'upgrade', stat: 'projSpeedMul', factor: 1 + (minorWalkerBase - 1) * 0.95, mediumTier: true },
  { key: 'MR', type: 'upgrade', stat: 'reloadMul', factor: minorReloadFactor, mediumTier: true }
];

function chooseWeaponDrop(){
  return SIDE_WEAPON_DROPS[(Math.random() * SIDE_WEAPON_DROPS.length) | 0];
}

function chooseMinorWalkerDrop(){
  return MINOR_WALKER_DROPS[(Math.random() * MINOR_WALKER_DROPS.length) | 0];
}

function chooseDropFromTurretType(type){
  if (type === 'small') return MINOR_REPAIR;
  if (type === 'medium') return chooseMinorWalkerDrop();
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
  const repairChance = Math.max(0.12, 0.32 - hpFactor * 0.14);
  const r = Math.random();
  if (r < weaponChance) return chooseWeaponDrop();
  if (r < weaponChance + repairChance) return MINOR_REPAIR;
  return chooseMinorWalkerDrop();
}

export function spawnBossBurst(x, y, maxHp = 260){
  const hp = Math.max(1, maxHp ?? 1);
  const hpFactor = Math.max(0, Math.min(1, (hp - 180) / 540)); // ~180..720 maps to 0..1
  const count = Math.max(3, Math.min(10, 3 + Math.round(hp / 180)));

  // Guarantee at least one repair and one weapon from larger bosses.
  const guaranteed = [];
  if (count >= 4) guaranteed.push(MINOR_REPAIR);
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
        Particles.spawnImpact(it.x, it.y, 'pickupFlash', 1.0);
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
  } else if (def.type === 'upgrade'){
    if (def.mediumTier) p.addMediumRigMark?.();
    switch(def.stat){
      case 'speedMul':      p.speedMul       = Math.min(2.0, p.speedMul * (def.factor ?? 1.12)); break;
      case 'projSpeedMul':  p.projSpeedMul   = Math.min(2.5, p.projSpeedMul * (def.factor ?? 1.15)); break;
      case 'reloadMul':     p.reloadMul      = Math.max(0.4, p.reloadMul * (def.factor ?? 0.88)); break;
      case 'damage':        p.damageMul      = Math.min(3.0, p.damageMul * (def.factor ?? 1.10)); break;
      default: break;
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

export function clearActive(){
  items.length = 0;
}

export function hasActive(){
  return items.length > 0;
}

export const Powerups = { reset, update, draw, clearActive, hasActive, spawnFromTurret, spawnBossBurst };
