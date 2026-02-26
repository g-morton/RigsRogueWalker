// js/turrets.js
import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js'; // player shots
import { Particles } from './particles.js';     // impact effects
import { SFX } from './sfx.js';
import { Powerups } from './powerups.js';

// --- State -------------------------------------------------------------------
const turrets = [];   // { x, y, type, size, cool, hp, maxHp, fxSparkT, fxSmokeT }
const shots = [];     // enemy bullets { x,y,vx,vy,t,life,r,damage,type }
let accPx = 0;        // pixel accumulator for spawn cadence

// --- Helpers -----------------------------------------------------------------
function getTurretTypeDef(name){
  return CONFIG.ENEMIES.TURRET.TYPES?.[name] || CONFIG.ENEMIES.TURRET.TYPES.medium;
}

function pickTurretTypeName(){
  const types = CONFIG.ENEMIES.TURRET.TYPES || {};
  const entries = Object.entries(types);
  if (!entries.length) return 'medium';

  let total = 0;
  for (const [, def] of entries) total += Math.max(0, def.weight ?? 1);
  if (total <= 0) return entries[0][0];

  let r = Math.random() * total;
  for (const [name, def] of entries){
    r -= Math.max(0, def.weight ?? 1);
    if (r <= 0) return name;
  }
  return entries[entries.length - 1][0];
}

function randCooldown(typeDef){
  const a = typeDef.fireCooldownMin;
  const b = typeDef.fireCooldownMax;
  return a + Math.random() * (b - a);
}

function spawnTurret(){
  const typeName = pickTurretTypeName();
  const typeDef = getTurretTypeDef(typeName);
  const size = typeDef.size;
  const y = -size - 8; // just above screen
  const turretBase = {
    type: typeName,
    size,
    hp: typeDef.hp,
    maxHp: typeDef.hp,
    cool: randCooldown(typeDef),
    fxSparkT: 0,
    fxSmokeT: 0
  };

  // Try to land on a safe (white) corridor; fall back to center if none
  for (let i = 0; i < 24; i++){
    const x = 20 + Math.random() * (world.w - 40);
    if (Tiles.isSafe(x, y + 10)){
      turrets.push({ x, y, ...turretBase });
      return;
    }
  }
  turrets.push({ x: world.w / 2, y, ...turretBase });
}

function spawnBoss(typeName = (CONFIG.BOSS?.TURRET_TYPE ?? 'large'), opts = {}){
  const typeDef = getTurretTypeDef(typeName);
  const hpMult = Math.max(1, CONFIG.BOSS?.HP_MULT ?? 4.0);
  const sizeMult = Math.max(1, CONFIG.BOSS?.SIZE_MULT ?? 1.5);
  const hp = Math.round(typeDef.hp * hpMult);
  const size = Math.round(typeDef.size * sizeMult);
  const stopY = Math.round(world.h * 0.24);
  const y = opts.fromTop ? (-size - 24) : stopY;
  const x = Math.round(world.w * 0.5);
  turrets.push({
    x, y,
    type: typeName,
    size,
    hp,
    maxHp: hp,
    cool: randCooldown(typeDef) * 0.85,
    fxSparkT: 0,
    fxSmokeT: 0,
    entering: !!opts.fromTop,
    stopY,
    boss: true
  });
}

function fireAt(t, x1, y1){
  const typeDef = getTurretTypeDef(t.type);
  const x0 = t.x, y0 = t.y;
  const dx = x1 - x0, dy = y1 - y0;
  const v = Math.hypot(dx, dy) || 1;
  const nx = dx / v, ny = dy / v;
  shots.push({
    x: x0, y: y0,
    vx: nx * typeDef.bulletSpeed,
    vy: ny * typeDef.bulletSpeed,
    t: 0,
    r: typeDef.bulletR,
    damage: typeDef.bulletDamage,
    life: CONFIG.ENEMIES.TURRET.BULLET_LIFE,
    type: t.type
  });
}

function overlapsPlayer(t, p){
  if (!p) return false;
  const pr = CONFIG.PLAYER?.SQUASH_R ?? 18;
  const tr = t.size * 0.9;
  const dx = t.x - p.x;
  const dy = t.y - p.y;
  const r = pr + tr;
  return dx*dx + dy*dy <= r*r;
}

function distPointToSegmentSq(px, py, x1, y1, x2, y2){
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const c1 = vx*wx + vy*wy;
  if (c1 <= 0) return (px-x1)*(px-x1) + (py-y1)*(py-y1);
  const c2 = vx*vx + vy*vy;
  if (c2 <= c1) return (px-x2)*(px-x2) + (py-y2)*(py-y2);
  const b = c1 / c2;
  const bx = x1 + b * vx, by = y1 + b * vy;
  return (px-bx)*(px-bx) + (py-by)*(py-by);
}

Projectiles.registerBeamResolver?.((beam)=>{
  for (let i = turrets.length - 1; i >= 0; i--){
    const t = turrets[i];
    const hitRadius = t.size * 0.9;
    const damage = Math.max(0, beam.damageAt?.(t.x, t.y, hitRadius) ?? 0);
    if (damage <= 0.01) continue;
    t.hp -= damage;
    if (Math.random() < Math.min(0.45, 0.07 + damage * 0.5)){
      Particles.spawnImpact(t.x, t.y, 'damage', Math.max(0.25, damage / 5));
    }
    if (t.hp <= 0){
      if (!t.boss) Powerups.spawnFromTurret?.(t.x, t.y, t.type);
      Particles.spawnImpact(t.x, t.y, 'explosion', t.maxHp / 16);
      SFX.playEnemyExplode?.();
      world.enemyDestroyed = (world.enemyDestroyed | 0) + 1;
      turrets.splice(i, 1);
    }
  }
});

// --- API ---------------------------------------------------------------------
export function reset(){
  turrets.length = 0;
  shots.length = 0;
  accPx = 0;
}

export function startBoss(typeName, opts = {}){
  turrets.length = 0;
  shots.length = 0;
  spawnBoss(typeName, opts);
}

export function hasActiveBoss(){
  return turrets.some(t => !!t.boss);
}

export function hasActiveNonBoss(){
  if (shots.length > 0) return true;
  return turrets.some(t => !t.boss);
}

export function getBossStatus(){
  const b = turrets.find(t => !!t.boss);
  if (!b) return null;
  return { hp: b.hp, maxHp: b.maxHp, entered: !b.entering };
}

export function update(dt){
  const dy = world.dy;
  // Spawn cadence measured in scrolled pixels (matches Tiles behavior)
  if (!world.spawnLocked){
    accPx += dy;
    const spacingPx = CONFIG.TILE.H * CONFIG.ENEMIES.TURRET.SPAWN_ROWS;
    while (accPx >= spacingPx){
      accPx -= spacingPx;
      if (Math.random() <= (world.spawnScale ?? 1)) spawnTurret();
    }
  }

  // Move turrets with world scroll + fire on cooldown
  for (let i = turrets.length - 1; i >= 0; i--){
    const t = turrets[i];
    t.y += dy;
    if (t.boss && t.entering && t.y >= t.stopY){
      t.y = t.stopY;
      t.entering = false;
    }
    t.fxSparkT = Math.max(0, t.fxSparkT - dt);
    t.fxSmokeT = Math.max(0, t.fxSmokeT - dt);

    // cull off-screen
    if (t.y > world.h + t.size + 20){
      turrets.splice(i, 1);
      continue;
    }

    // Body collision: walking over a turret hurts the player and crushes the turret.
    if (world.player && !world.player.dead && overlapsPlayer(t, world.player)){
      const typeDef = getTurretTypeDef(t.type);
      const collisionDamage = Math.max(3, Math.round((typeDef.bulletDamage ?? 8) * 0.8));
      world.player.hp = Math.max(0, (world.player.hp ?? world.player.maxHp ?? 1) - collisionDamage);
      Particles.spawnImpact(t.x, t.y, 'damage', Math.max(0.45, collisionDamage / 10));
      Particles.spawnImpact(t.x, t.y, 'explosion', t.maxHp / 16);
      SFX.playHit?.(collisionDamage);
      SFX.playEnemyExplode?.();
      if (!t.boss) Powerups.spawnFromTurret?.(t.x, t.y, t.type);
      world.enemyDestroyed = (world.enemyDestroyed | 0) + 1;
      turrets.splice(i, 1);
      continue;
    }

    // player bullets hitting turrets
    const hitRadius = t.size * 0.9;
    Projectiles.consumeHitsCircle(t.x, t.y, hitRadius, (proj) => {
      const damage = Math.max(1, proj.damage ?? 1);
      t.hp -= damage;
      Particles.spawnImpact(proj.x, proj.y, 'playerShot', 0.6);
      Particles.spawnImpact(proj.x, proj.y, 'damage', damage / 12);
      if (proj.type !== 'beamer' && proj.type !== 'punchbeamer') SFX.playHit?.(damage);
    });

    if (t.hp <= 0){
      if (!t.boss) Powerups.spawnFromTurret?.(t.x, t.y, t.type);
      Particles.spawnImpact(t.x, t.y, 'explosion', t.maxHp / 16);
      SFX.playEnemyExplode?.();
      world.enemyDestroyed = (world.enemyDestroyed | 0) + 1;
      turrets.splice(i, 1);
      continue;
    }

    const hpRatio = t.hp / Math.max(1, t.maxHp);
    if (hpRatio <= 0.75 && t.fxSparkT <= 0){
      Particles.spawnImpact(t.x + (Math.random()*10 - 5), t.y + (Math.random()*10 - 5), 'warnSpark', 0.3);
      t.fxSparkT = 0.14 + Math.random() * 0.22;
    }
    if (hpRatio <= 0.5 && t.fxSmokeT <= 0){
      Particles.spawnImpact(t.x + (Math.random()*12 - 6), t.y - t.size * 0.4, 'smoke', 0.5);
      t.fxSmokeT = 0.24 + Math.random() * 0.34;
    }

    // Fire at player
    t.cool -= dt;
    if (!t.entering && t.cool <= 0 && world.player){
      fireAt(t, world.player.x, world.player.y);
      t.cool = randCooldown(getTurretTypeDef(t.type));
    }
  }

  // Enemy bullets integrate
  for (const s of shots){
    s.t += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  // Enemy bullets hitting player
  if (world.player){
    const px = world.player.x, py = world.player.y;
    const pr = 18; // simple player hit radius
    for (let i = shots.length - 1; i >= 0; i--){
      const s = shots[i];
      const dx = s.x - px, dy = s.y - py;
      if (dx*dx + dy*dy <= pr*pr){
        const damage = Math.max(1, s.damage ?? 1);
        world.player.hp = Math.max(0, (world.player.hp ?? world.player.maxHp ?? 1) - damage);
        Particles.spawnImpact(s.x, s.y, 'damage');
        SFX.playHit?.(damage);
        shots.splice(i, 1);
        // Optional: apply `s.damage` to player HP system here.
      }
    }
  }

  // Cull enemy bullets
  for (let i = shots.length - 1; i >= 0; i--){
    const s = shots[i];
    if (s.t > CONFIG.ENEMIES.TURRET.BULLET_LIFE ||
        s.x < -40 || s.x > world.w + 40 ||
        s.y < -80 || s.y > world.h + 80){
      shots.splice(i, 1);
    }
  }
}

export function draw(g){
  for (const t of turrets) Theme.drawTurret(g, t, t.size);
  for (const s of shots)  Theme.drawEnemyBullet(g, s);
}

export const Turrets = { reset, update, draw, startBoss, hasActiveBoss, hasActiveNonBoss, getBossStatus };
