// js/turrets.js
import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js'; // player shots
import { Particles } from './particles.js';     // impact effects

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

// --- API ---------------------------------------------------------------------
export function reset(){
  turrets.length = 0;
  shots.length = 0;
  accPx = 0;
}

export function update(dt){
  const dy = world.dy;
  // Spawn cadence measured in scrolled pixels (matches Tiles behavior)
  accPx += dy;
  const spacingPx = CONFIG.TILE.H * CONFIG.ENEMIES.TURRET.SPAWN_ROWS;
  while (accPx >= spacingPx){
    accPx -= spacingPx;
    spawnTurret();
  }

  // Move turrets with world scroll + fire on cooldown
  for (let i = turrets.length - 1; i >= 0; i--){
    const t = turrets[i];
    t.y += dy;
    t.fxSparkT = Math.max(0, t.fxSparkT - dt);
    t.fxSmokeT = Math.max(0, t.fxSmokeT - dt);

    // cull off-screen
    if (t.y > world.h + t.size + 20){
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
    });

    if (t.hp <= 0){
      Particles.spawnImpact(t.x, t.y, 'explosion', t.maxHp / 16);
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
    if (t.cool <= 0 && world.player){
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

export const Turrets = { reset, update, draw };
