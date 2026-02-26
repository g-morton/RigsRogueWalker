import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { SFX } from './sfx.js';
import { Powerups } from './powerups.js';

const bosses = [];
const shots = [];

function rand(a, b){ return a + Math.random() * (b - a); }
function randi(a, b){ return (rand(a, b + 1)) | 0; }

function clamp(v, lo, hi){
  return Math.max(lo, Math.min(hi, v));
}

function resolveEncounter(level){
  const lv = Math.max(1, level | 0);
  const base = CONFIG.BOSS?.ENCOUNTER_DEFAULT || { type: 'float' };
  const rules = Array.isArray(CONFIG.BOSS?.ENCOUNTERS) ? CONFIG.BOSS.ENCOUNTERS : [];
  for (const rule of rules){
    if (!rule || typeof rule !== 'object') continue;
    const min = Math.max(1, rule.minLevel ?? 1);
    const max = Math.max(min, rule.maxLevel ?? Number.POSITIVE_INFINITY);
    if (lv >= min && lv <= max){
      return { ...base, ...rule };
    }
  }
  return { ...base };
}

function getTurretTypeDef(name){
  return CONFIG.ENEMIES?.TURRET?.TYPES?.[name] || CONFIG.ENEMIES?.TURRET?.TYPES?.medium || {};
}

function buildTurretBoss(level, opts = {}, encounter = {}, member = {}){
  const lv = Math.max(1, level | 0);
  const tcfg = CONFIG.BOSS?.TURRET || {};
  const turretType = member.turretType || encounter.turretType || 'large';
  const td = getTurretTypeDef(turretType);

  const hpMul = Math.max(0.2, (encounter.hpMul ?? 1.0) * (member.hpMul ?? 1.0));
  const sizeMul = Math.max(0.35, (encounter.sizeMul ?? 1.0) * (member.sizeMul ?? 1.0));
  const dmgMul = Math.max(0.2, (encounter.damageMul ?? 1.0) * (member.damageMul ?? 1.0));
  const projSpeedMul = Math.max(0.2, (encounter.projectileSpeedMul ?? 1.0) * (member.projectileSpeedMul ?? 1.0));
  const fireRateMul = Math.max(0.25, (encounter.fireRateMul ?? 1.0) * (member.fireRateMul ?? 1.0));

  const size = Math.round((td.size ?? 18) * (tcfg.SIZE_MULT ?? 1.5) * sizeMul);
  const hp = Math.round((td.hp ?? 70) * (tcfg.HP_MULT ?? 4.0) * hpMul);
  const xFrac = clamp(member.xFrac ?? encounter.xFrac ?? 0.5, 0.14, 0.86);
  const stopYFrac = clamp(member.stopYFrac ?? encounter.stopYFrac ?? (tcfg.STOP_Y_FRAC ?? 0.24), 0.12, 0.48);
  const stopY = Math.round(world.h * stopYFrac);
  const y = opts.fromTop ? (-size - 24) : stopY;

  const baseMin = td.fireCooldownMin ?? 1.4;
  const baseMax = td.fireCooldownMax ?? 2.1;
  const fireMin = Math.max(0.08, baseMin / fireRateMul);
  const fireMax = Math.max(fireMin + 0.04, baseMax / fireRateMul);

  return {
    type: 'turret',
    boss: true,
    level: lv,
    t: 0,
    turretType,
    x: Math.round(world.w * xFrac),
    y,
    entering: !!opts.fromTop,
    stopY,
    size,
    hp,
    maxHp: hp,
    bulletR: Math.max(2.6, td.bulletR ?? 4.5),
    bulletSpeed: Math.max(90, (td.bulletSpeed ?? 160) * projSpeedMul),
    bulletDamage: Math.max(2, (td.bulletDamage ?? 12) * dmgMul),
    fireMin,
    fireMax,
    cool: rand(fireMin, fireMax)
  };
}

function spawnPackBoss(level, opts = {}, encounter = {}){
  const members = Array.isArray(encounter.members) && encounter.members.length
    ? encounter.members
    : (CONFIG.BOSS?.PACK_DEFAULT_MEMBERS || []);
  if (!members.length){
    bosses.push(buildTurretBoss(level, opts, encounter, { turretType: 'large', xFrac: 0.5 }));
    return;
  }
  for (const m of members){
    bosses.push(buildTurretBoss(level, opts, encounter, m || {}));
  }
}

function placeOverlapRect(w, h, aw, ah, overhang){
  const hw = w * 0.5;
  const hh = h * 0.5;
  if (!overhang){
    return {
      ox: rand(-Math.max(4, hw - aw * 0.55), Math.max(4, hw - aw * 0.55)),
      oy: rand(-Math.max(4, hh - ah * 0.55), Math.max(4, hh - ah * 0.55))
    };
  }
  // Overhang but keep >= ~50% of the piece overlapping the hull.
  const side = (Math.random() * 4) | 0; // 0 left, 1 right, 2 top, 3 bottom
  if (side === 0) return { ox: -(hw - aw * 0.10), oy: rand(-hh * 0.62, hh * 0.62) };
  if (side === 1) return { ox: +(hw - aw * 0.10), oy: rand(-hh * 0.62, hh * 0.62) };
  if (side === 2) return { ox: rand(-hw * 0.62, hw * 0.62), oy: -(hh - ah * 0.10) };
  return { ox: rand(-hw * 0.62, hw * 0.62), oy: +(hh - ah * 0.10) };
}

function buildFloatBoss(level, opts = {}, encounter = {}){
  const def = CONFIG.BOSS?.FLOAT || {};
  const lv = Math.max(1, level | 0);
  const hpMul = Math.max(0.25, encounter.hpMul ?? 1.0);
  const sizeMul = Math.max(0.4, encounter.sizeMul ?? 1.0);
  const dmgMul = Math.max(0.3, encounter.damageMul ?? 1.0);
  const projSpeedMul = Math.max(0.3, encounter.projectileSpeedMul ?? 1.0);
  const fireRateMul = Math.max(0.25, encounter.fireRateMul ?? 1.0);
  const mountMul = Math.max(0.35, encounter.mountMul ?? 1.0);
  const largeMountBonus = clamp(encounter.largeMountBonus ?? 0.0, -0.5, 0.5);
  const hoverSpeedMul = Math.max(0.3, encounter.hoverSpeedMul ?? 1.0);

  const w = rand(def.W_MIN ?? 110, def.W_MAX ?? 180) * sizeMul;
  const h = rand(def.H_MIN ?? 60, def.H_MAX ?? 92) * sizeMul;
  const hp = Math.round(((def.HP_BASE ?? 220) + lv * (def.HP_PER_LEVEL ?? 85)) * hpMul);
  const x = world.w * 0.5;
  const stopY = world.h * (def.STOP_Y_FRAC ?? 0.26);
  const y = opts.fromTop ? (-h - 34) : stopY;
  const mountsBase = randi(def.MOUNTS_MIN ?? 3, def.MOUNTS_MAX ?? 6);
  const mountsN = Math.max(1, Math.round(mountsBase * mountMul));
  const decoN = randi(def.DECO_MIN ?? 8, def.DECO_MAX ?? 16);
  const forcedOverhangMounts = Math.max(1, Math.round(mountsN * 0.45));
  const forcedOverhangDeco = Math.max(3, Math.round(decoN * 0.45));
  const hoverAmpX = rand(def.HOVER_X_MIN ?? 28, def.HOVER_X_MAX ?? 55);
  const hoverAmpY = rand(def.HOVER_Y_MIN ?? 6, def.HOVER_Y_MAX ?? 18);
  const hoverSpeed = rand(def.HOVER_SPEED_MIN ?? 0.7, def.HOVER_SPEED_MAX ?? 1.25) * hoverSpeedMul;
  const turretDefs = CONFIG.ENEMIES?.TURRET?.TYPES || {};
  const smallDef = turretDefs.small || {};
  const largeDef = turretDefs.large || {};

  const mounts = [];
  for (let i = 0; i < mountsN; i++){
    const largeChance = clamp((def.LARGE_MOUNT_CHANCE ?? 0.32) + largeMountBonus, 0, 1);
    const isLarge = Math.random() < largeChance;
    const td = isLarge ? largeDef : smallDef;
    const baseMin = td.fireCooldownMin ?? (isLarge ? 1.4 : 0.9);
    const baseMax = td.fireCooldownMax ?? (isLarge ? 2.1 : 1.4);
    const levelBoost = Math.max(0.65, 1.0 - lv * (def.COOLDOWN_LEVEL_REDUCE ?? 0.035));
    const fireMin = Math.max(0.08, (baseMin * levelBoost) / fireRateMul);
    const fireMax = Math.max(fireMin + 0.03, (baseMax * levelBoost) / fireRateMul);
    const overhang = (i < forcedOverhangMounts) || Math.random() < 0.42;
    const size = isLarge ? rand(10.5, 14.2) : rand(6.5, 8.8);
    let ox = rand(-w * 0.40, w * 0.40);
    let oy = rand(-h * 0.18, h * 0.30);
    if (overhang){
      const sign = Math.random() < 0.5 ? -1 : 1;
      // Mount center near hull edge so it overhangs but remains attached.
      ox = sign * ((w * 0.5) - size * 0.20);
      oy = rand(-h * 0.34, h * 0.34);
    }
    mounts.push({
      type: isLarge ? 'large' : 'small',
      overhang,
      ox,
      oy,
      size,
      bulletR: Math.max(2.6, (td.bulletR ?? (isLarge ? 5.2 : 3.2))),
      bulletSpeed: Math.max(90, (td.bulletSpeed ?? (isLarge ? 110 : 180)) * (1 + lv * (isLarge ? 0.012 : 0.008)) * projSpeedMul),
      bulletDamage: Math.max(4, (td.bulletDamage ?? (isLarge ? 26 : 8)) * (1 + lv * (isLarge ? 0.09 : 0.06)) * dmgMul),
      fireMin,
      fireMax,
      cool: rand(fireMin, fireMax),
      alive: true
    });
  }

  const deco = [];
  for (let i = 0; i < decoN; i++){
    const kindRoll = Math.random();
    const overhang = (i < forcedOverhangDeco) || Math.random() < 0.35;
    if (kindRoll < 0.35){
      const dw = rand(9, 30);
      const dh = rand(6, 20);
      const p = placeOverlapRect(w, h, dw, dh, overhang);
      deco.push({
        kind: 'rect',
        overhang,
        ox: p.ox, oy: p.oy,
        w: dw,
        h: dh
      });
    } else if (kindRoll < 0.7){
      deco.push({
        kind: 'antenna',
        overhang,
        ox: rand(-w * (overhang ? 0.50 : 0.36), w * (overhang ? 0.50 : 0.36)),
        oy: -h * (overhang ? 0.48 : 0.42),
        len: rand(14, 34)
      });
    } else if (kindRoll < 0.88) {
      const pr = rand(4.5, 10.5);
      const p = placeOverlapRect(w, h, pr * 2, pr * 2, overhang);
      deco.push({
        kind: 'pod',
        overhang,
        ox: p.ox, oy: p.oy,
        r: pr
      });
    } else {
      const sw = rand(6, 16);
      const sh = rand(2.2, 5.2);
      const p = placeOverlapRect(w, h, sw, sh, overhang);
      deco.push({
        kind: 'slot',
        overhang,
        ox: p.ox, oy: p.oy,
        w: sw,
        h: sh
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

function fireTurretBoss(b){
  if (!world.player) return;
  const dx = world.player.x - b.x;
  const dy = world.player.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  shots.push({
    x: b.x,
    y: b.y,
    vx: (dx / d) * b.bulletSpeed,
    vy: (dy / d) * b.bulletSpeed,
    t: 0,
    life: CONFIG.ENEMIES.TURRET.BULLET_LIFE,
    r: b.bulletR,
    damage: b.bulletDamage
  });
}

function bossHitRadius(b){
  if (b.type === 'float') return Math.max(b.w, b.h) * 0.55;
  return (b.size ?? 18) * 0.9;
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

function destroyBossAt(i){
  const b = bosses[i];
  if (!b || b.hp > 0) return false;
  Powerups.spawnBossBurst?.(b.x, b.y, b.maxHp ?? 240);
  if (b.type === 'float'){
    for (const m of (b.mounts || [])){
      if (!m.alive) continue;
      Particles.spawnImpact(b.x + m.ox, b.y + m.oy, 'explosion', 1.5);
      Particles.spawnBotExplosion?.(b.x + m.ox, b.y + m.oy, 0.7);
    }
    Particles.spawnImpact(b.x, b.y, 'explosion', b.maxHp / 10);
    Particles.spawnBotExplosion?.(b.x, b.y, 1.8 + b.level * 0.14);
  } else {
    Particles.spawnImpact(b.x, b.y, 'explosion', Math.max(0.8, b.maxHp / 16));
    Particles.spawnBotExplosion?.(b.x, b.y, 0.9 + b.level * 0.08);
  }
  SFX.playEnemyExplode?.();
  world.enemyDestroyed = (world.enemyDestroyed | 0) + 1;
  bosses.splice(i, 1);
  return true;
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
  for (let i = bosses.length - 1; i >= 0; i--){
    const b = bosses[i];
    const hitR = bossHitRadius(b);
    const damage = Math.max(0, beam.damageAt?.(b.x, b.y, hitR) ?? 0);
    if (damage <= 0.01) continue;
    b.hp -= damage;
    if (Math.random() < Math.min(0.55, 0.09 + damage * 0.45)){
      Particles.spawnImpact(b.x, b.y, 'damage', Math.max(0.3, damage / 5));
    }
    if (destroyBossAt(i)) continue;
  }
});

export function reset(){
  bosses.length = 0;
  shots.length = 0;
}

export function startEncounter(level = 1, opts = {}){
  bosses.length = 0;
  shots.length = 0;
  const encounter = resolveEncounter(level);
  const type = encounter.type || 'float';
  if (type === 'float'){
    bosses.push(buildFloatBoss(level, opts, encounter));
    return;
  }
  if (type === 'turret'){
    bosses.push(buildTurretBoss(level, opts, encounter));
    return;
  }
  if (type === 'pack'){
    spawnPackBoss(level, opts, encounter);
    return;
  }
  // Fallback while other boss types are being added.
  bosses.push(buildFloatBoss(level, opts, encounter));
}

export function hasActiveBoss(){
  return bosses.length > 0;
}

export function getStatus(){
  if (!bosses.length) return null;
  let hp = 0, maxHp = 0, entered = true, level = 1;
  for (const b of bosses){
    hp += Math.max(0, b.hp ?? 0);
    maxHp += Math.max(1, b.maxHp ?? 1);
    entered = entered && !b.entering;
    level = Math.max(level, b.level ?? 1);
  }
  const type = bosses.length > 1 ? 'pack' : bosses[0].type;
  return { hp, maxHp, entered, type, level };
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
    } else if (b.type === 'float'){
      b.x = b.baseX + Math.sin(b.t * b.hoverSpeed) * b.hoverAmpX;
      b.y = b.baseY + Math.sin(b.t * b.hoverSpeed * 1.7) * b.hoverAmpY;
    }

    // Player projectile hits.
    const hitR = bossHitRadius(b);
    Projectiles.consumeHitsCircle(b.x, b.y, hitR, (proj) => {
      const damage = Math.max(1, proj.damage ?? 1);
      b.hp -= damage;
      Particles.spawnImpact(proj.x, proj.y, 'playerShot', 0.8);
      Particles.spawnImpact(proj.x, proj.y, 'damage', damage / 10);
      if (proj.type !== 'beamer' && proj.type !== 'punchbeamer') SFX.playHit?.(damage);
      return true;
    });

    if (destroyBossAt(i)) continue;

    const hpRatio = b.hp / Math.max(1, b.maxHp);
    if (b.type === 'float'){
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
    } else {
      if (hpRatio <= 0.75 && Math.random() < dt * 3.2){
        Particles.spawnImpact(b.x + rand(-b.size * 0.35, b.size * 0.35), b.y + rand(-b.size * 0.35, b.size * 0.35), 'warnSpark', 0.35);
      }
      if (hpRatio <= 0.5 && Math.random() < dt * 2.1){
        Particles.spawnImpact(b.x + rand(-b.size * 0.3, b.size * 0.3), b.y - b.size * 0.35, 'smoke', 0.48);
      }
      if (!b.entering){
        b.cool -= dt;
        if (b.cool <= 0){
          fireTurretBoss(b);
          b.cool = rand(b.fireMin, b.fireMax);
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
    if (b.type === 'float'){
      Theme.drawFloatBoss?.(g, b);
    } else {
      Theme.drawTurret?.(g, b, b.size ?? 18);
    }
  }
  for (const s of shots){
    Theme.drawEnemyBullet(g, s);
  }
}

export const Bosses = { reset, startEncounter, hasActiveBoss, getStatus, update, draw };
