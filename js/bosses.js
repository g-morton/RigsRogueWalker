import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { SFX } from './sfx.js';

const bosses = [];
const shots = [];

function rand(a, b){ return a + Math.random() * (b - a); }
function randi(a, b){ return (rand(a, b + 1)) | 0; }

function buildFloatBoss(level, opts = {}){
  const def = CONFIG.BOSS?.FLOAT || {};
  const lv = Math.max(1, level | 0);
  const w = rand(def.W_MIN ?? 110, def.W_MAX ?? 180);
  const h = rand(def.H_MIN ?? 60, def.H_MAX ?? 92);
  const hp = Math.round((def.HP_BASE ?? 220) + lv * (def.HP_PER_LEVEL ?? 85));
  const x = world.w * 0.5;
  const stopY = world.h * (def.STOP_Y_FRAC ?? 0.26);
  const y = opts.fromTop ? (-h - 34) : stopY;
  const mountsN = randi(def.MOUNTS_MIN ?? 3, def.MOUNTS_MAX ?? 6);
  const decoN = randi(def.DECO_MIN ?? 8, def.DECO_MAX ?? 16);
  const hoverAmpX = rand(def.HOVER_X_MIN ?? 28, def.HOVER_X_MAX ?? 55);
  const hoverAmpY = rand(def.HOVER_Y_MIN ?? 6, def.HOVER_Y_MAX ?? 18);
  const hoverSpeed = rand(def.HOVER_SPEED_MIN ?? 0.7, def.HOVER_SPEED_MAX ?? 1.25);
  const turretDefs = CONFIG.ENEMIES?.TURRET?.TYPES || {};
  const smallDef = turretDefs.small || {};
  const largeDef = turretDefs.large || {};

  const mounts = [];
  for (let i = 0; i < mountsN; i++){
    const isLarge = Math.random() < (def.LARGE_MOUNT_CHANCE ?? 0.32);
    const td = isLarge ? largeDef : smallDef;
    const baseMin = td.fireCooldownMin ?? (isLarge ? 1.4 : 0.9);
    const baseMax = td.fireCooldownMax ?? (isLarge ? 2.1 : 1.4);
    const levelBoost = Math.max(0.65, 1.0 - lv * (def.COOLDOWN_LEVEL_REDUCE ?? 0.035));
    const fireMin = Math.max(0.12, baseMin * levelBoost);
    const fireMax = Math.max(fireMin + 0.04, baseMax * levelBoost);
    mounts.push({
      type: isLarge ? 'large' : 'small',
      ox: rand(-w * 0.42, w * 0.42),
      oy: rand(-h * 0.2, h * 0.32),
      size: isLarge ? rand(8, 11.5) : rand(5, 7.2),
      bulletR: Math.max(2.6, (td.bulletR ?? (isLarge ? 5.2 : 3.2))),
      bulletSpeed: Math.max(90, (td.bulletSpeed ?? (isLarge ? 110 : 180)) * (1 + lv * (isLarge ? 0.012 : 0.008))),
      bulletDamage: Math.max(4, (td.bulletDamage ?? (isLarge ? 26 : 8)) * (1 + lv * (isLarge ? 0.09 : 0.06))),
      fireMin,
      fireMax,
      cool: rand(fireMin, fireMax),
      alive: true
    });
  }

  const deco = [];
  for (let i = 0; i < decoN; i++){
    const kindRoll = Math.random();
    if (kindRoll < 0.35){
      deco.push({
        kind: 'rect',
        ox: rand(-w * 0.45, w * 0.45),
        oy: rand(-h * 0.42, h * 0.42),
        w: rand(6, 22),
        h: rand(4, 16)
      });
    } else if (kindRoll < 0.7){
      deco.push({
        kind: 'antenna',
        ox: rand(-w * 0.4, w * 0.4),
        oy: -h * 0.5,
        len: rand(10, 28)
      });
    } else if (kindRoll < 0.88) {
      deco.push({
        kind: 'pod',
        ox: rand(-w * 0.45, w * 0.45),
        oy: rand(-h * 0.42, h * 0.42),
        r: rand(3, 8)
      });
    } else {
      deco.push({
        kind: 'slot',
        ox: rand(-w * 0.45, w * 0.45),
        oy: rand(-h * 0.42, h * 0.42),
        w: rand(4, 12),
        h: rand(2, 4)
      });
    }
  }

  return {
    type: 'float',
    boss: true,
    level: lv,
    x, y,
    baseX: x, baseY: stopY,
    stopY,
    entering: !!opts.fromTop,
    w, h,
    hp, maxHp: hp,
    t: 0,
    hoverAmpX, hoverAmpY, hoverSpeed,
    shadowOffsetX: rand(-18, 18),
    mounts,
    deco,
    mountPopT: 0
  };
}

function pickBossType(){
  const pool = CONFIG.BOSS?.TYPE_POOL;
  if (!Array.isArray(pool) || !pool.length) return 'float';
  const valid = pool.filter(Boolean);
  if (!valid.length) return 'float';
  return valid[(Math.random() * valid.length) | 0];
}

function fireMount(b, m){
  if (!world.player) return;
  const gx = b.x + m.ox;
  const gy = b.y + m.oy;
  const dx = world.player.x - gx;
  const dy = world.player.y - gy;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  shots.push({
    x: gx, y: gy,
    vx: nx * m.bulletSpeed,
    vy: ny * m.bulletSpeed,
    t: 0,
    life: CONFIG.ENEMIES.TURRET.BULLET_LIFE,
    r: m.bulletR,
    damage: m.bulletDamage
  });
}

function aliveMounts(b){
  return (b.mounts || []).filter(m => m.alive);
}

function popOneMount(b){
  const alive = aliveMounts(b);
  if (alive.length <= 1) return false;
  const m = alive[(Math.random() * alive.length) | 0];
  m.alive = false;
  Particles.spawnImpact(b.x + m.ox, b.y + m.oy, 'explosion', 1.6);
  SFX.playEnemyExplode?.();
  return true;
}

export function reset(){
  bosses.length = 0;
  shots.length = 0;
}

export function startEncounter(level = 1, opts = {}){
  bosses.length = 0;
  shots.length = 0;
  const type = pickBossType();
  if (type === 'float'){
    bosses.push(buildFloatBoss(level, opts));
    return;
  }
  // Fallback while other boss types are being added.
  bosses.push(buildFloatBoss(level, opts));
}

export function hasActiveBoss(){
  return bosses.length > 0;
}

export function getStatus(){
  const b = bosses[0];
  if (!b) return null;
  return { hp: b.hp, maxHp: b.maxHp, entered: !b.entering, type: b.type, level: b.level };
}

export function update(dt){
  const dy = world.dy;

  for (let i = bosses.length - 1; i >= 0; i--){
    const b = bosses[i];
    b.t += dt;
    b.y += dy;

    if (b.entering){
      if (b.y >= b.stopY){
        b.y = b.stopY;
        b.entering = false;
      }
    } else {
      b.x = b.baseX + Math.sin(b.t * b.hoverSpeed) * b.hoverAmpX;
      b.y = b.baseY + Math.sin(b.t * b.hoverSpeed * 1.7) * b.hoverAmpY;
    }

    // Player projectile hits.
    const hitR = Math.max(b.w, b.h) * 0.55;
    Projectiles.consumeHitsCircle(b.x, b.y, hitR, (proj) => {
      const damage = Math.max(1, proj.damage ?? 1);
      b.hp -= damage;
      Particles.spawnImpact(proj.x, proj.y, 'playerShot', 0.8);
      Particles.spawnImpact(proj.x, proj.y, 'damage', damage / 10);
      SFX.playHit?.(damage);
      return true;
    });

    if (b.hp <= 0){
      for (const m of (b.mounts || [])){
        if (!m.alive) continue;
        Particles.spawnImpact(b.x + m.ox, b.y + m.oy, 'explosion', 1.5);
      }
      Particles.spawnImpact(b.x, b.y, 'explosion', b.maxHp / 14);
      SFX.playEnemyExplode?.();
      world.enemyDestroyed = (world.enemyDestroyed | 0) + 1;
      bosses.splice(i, 1);
      continue;
    }

    const hpRatio = b.hp / Math.max(1, b.maxHp);
    if (hpRatio <= 0.75 && Math.random() < dt * 4.5){
      Particles.spawnImpact(b.x + rand(-b.w * 0.35, b.w * 0.35), b.y + rand(-b.h * 0.35, b.h * 0.35), 'warnSpark', 0.5);
    }
    if (hpRatio <= 0.5 && Math.random() < dt * 2.8){
      Particles.spawnImpact(b.x + rand(-b.w * 0.35, b.w * 0.35), b.y - b.h * 0.25, 'smoke', 0.75);
    }

    // As boss weakens, fixed mounts blow off progressively (but keep at least one).
    b.mountPopT = Math.max(0, (b.mountPopT || 0) - dt);
    if (b.mountPopT <= 0){
      const totalMounts = Math.max(1, (b.mounts || []).length);
      const desiredAlive = Math.max(1, Math.ceil(totalMounts * hpRatio));
      if (aliveMounts(b).length > desiredAlive){
        if (popOneMount(b)){
          b.mountPopT = 0.24;
        }
      }
    }

    // Mounts fire only once fully entered.
    if (!b.entering){
      for (const m of (b.mounts || [])){
        if (!m.alive) continue;
        m.cool -= dt;
        if (m.cool <= 0){
          fireMount(b, m);
          m.cool = rand(m.fireMin, m.fireMax);
        }
      }
    }
  }

  // Enemy bullets integrate
  for (const s of shots){
    s.t += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  // Enemy bullets vs player
  if (world.player){
    const px = world.player.x, py = world.player.y;
    const pr = 18;
    for (let i = shots.length - 1; i >= 0; i--){
      const s = shots[i];
      const dx = s.x - px, dy = s.y - py;
      if (dx*dx + dy*dy <= pr*pr){
        const damage = Math.max(1, s.damage ?? 1);
        world.player.hp = Math.max(0, (world.player.hp ?? world.player.maxHp ?? 1) - damage);
        Particles.spawnImpact(s.x, s.y, 'damage', damage / 12);
        SFX.playHit?.(damage);
        shots.splice(i, 1);
      }
    }
  }

  // cull shots
  for (let i = shots.length - 1; i >= 0; i--){
    const s = shots[i];
    if (s.t > s.life || s.x < -40 || s.x > world.w + 40 || s.y < -80 || s.y > world.h + 80){
      shots.splice(i, 1);
    }
  }
}

export function draw(g){
  for (const b of bosses){
    Theme.drawFloatBoss?.(g, b);
  }
  for (const s of shots){
    Theme.drawEnemyBullet(g, s);
  }
}

export const Bosses = { reset, startEncounter, hasActiveBoss, getStatus, update, draw };
