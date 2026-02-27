import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';

const shots = [];
const beams = [];
const beamResolvers = [];
const punchBeamResolvers = [];

function closestPointOnSegment(px, py, x1, y1, x2, y2){
  const vx = x2 - x1;
  const vy = y2 - y1;
  const c2 = vx*vx + vy*vy;
  if (c2 <= 1e-6){
    const dx = px - x1;
    const dy = py - y1;
    return { distSq: dx*dx + dy*dy, u: 0 };
  }
  const wx = px - x1;
  const wy = py - y1;
  let u = (wx*vx + wy*vy) / c2;
  if (u < 0) u = 0;
  if (u > 1) u = 1;
  const cx = x1 + vx * u;
  const cy = y1 + vy * u;
  const dx = px - cx;
  const dy = py - cy;
  return { distSq: dx*dx + dy*dy, u };
}

function updateTrackedBeam(b){
  if (typeof b.track !== 'function') return;
  const next = b.track();
  if (!next) return;
  const x = next.x ?? b.x1;
  const y = next.y ?? b.y1;
  const angle = next.angle ?? Math.atan2(b.x2 - b.x1, -(b.y2 - b.y1));
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  b.x1 = x;
  b.y1 = y;
  b.x2 = x + dx * b.range;
  b.y2 = y + dy * b.range;
}

function makeBeamPayload(b, dt){
  const tickScale = dt / Math.max(0.001, b.life);
  const nearFrac = Math.max(0.05, Math.min(0.85, b.nearFrac ?? 0.25));
  const hitRangeFrac = Math.max(0.05, Math.min(1, b.hitRangeFrac ?? 1));
  const farDamageMul = Math.max(0, Math.min(1, b.farDamageMul ?? 0.15));
  const closeBoostFrac = Math.max(0.02, Math.min(nearFrac, b.closeBoostFrac ?? 0.16));
  const closeBoostMul = Math.max(1, b.closeBoostMul ?? 2.8);
  const coreRadius = Math.max(0, b.coreRadius ?? 6);
  const lightningRadius = Math.max(1, b.lightningRadius ?? 30);

  return {
    x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2,
    damage: b.damage,
    type: b.type || 'beamer',
    damageAt(px, py, targetRadius = 0){
      const hit = closestPointOnSegment(px, py, b.x1, b.y1, b.x2, b.y2);
      if (hit.u > hitRangeFrac) return 0;
      const radial = Math.max(0, Math.sqrt(hit.distSq) - Math.max(0, targetRadius));
      const fan = lightningRadius * (0.16 + 0.84 * hit.u);
      const edge = coreRadius + fan;
      if (radial > edge) return 0;

      const falloffT = hit.u <= nearFrac ? 0 : (hit.u - nearFrac) / Math.max(1e-6, 1 - nearFrac);
      const distMul = 1 - (1 - farDamageMul) * Math.min(1, Math.max(0, falloffT));
      const closeT = Math.min(1, hit.u / closeBoostFrac);
      const closeMul = closeBoostMul - (closeBoostMul - 1) * closeT;

      let radialMul = 1;
      if (radial > coreRadius){
        const rr = (radial - coreRadius) / Math.max(1e-6, edge - coreRadius);
        const edgeFade = 1 - Math.min(1, Math.max(0, rr));
        radialMul = edgeFade * (0.3 + Math.random() * 0.7);
      }

      return Math.max(0, b.damage * tickScale * distMul * closeMul * radialMul);
    }
  };
}

function makePunchBeamPayload(b, dt){
  const tickScale = dt / Math.max(0.001, b.life);
  const nearFrac = Math.max(0.05, Math.min(0.85, b.nearFrac ?? 0.25));
  const hitRangeFrac = Math.max(0.05, Math.min(1, b.hitRangeFrac ?? 1));
  const farDamageMul = Math.max(0, Math.min(1, b.farDamageMul ?? 0.15));
  const closeBoostFrac = Math.max(0.02, Math.min(nearFrac, b.closeBoostFrac ?? 0.16));
  const closeBoostMul = Math.max(1, b.closeBoostMul ?? 2.8);
  const coreRadius = Math.max(0, b.coreRadius ?? 6);
  const lightningRadius = Math.max(1, b.lightningRadius ?? 30);

  return {
    x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2,
    damage: b.damage,
    type: b.type || 'punchbeamer',
    damageAt(px, py, targetRadius = 0){
      const hit = closestPointOnSegment(px, py, b.x1, b.y1, b.x2, b.y2);
      if (hit.u > hitRangeFrac) return 0;
      const radial = Math.max(0, Math.sqrt(hit.distSq) - Math.max(0, targetRadius));
      const fan = lightningRadius * (0.16 + 0.84 * hit.u);
      const edge = coreRadius + fan;
      if (radial > edge) return 0;

      const falloffT = hit.u <= nearFrac ? 0 : (hit.u - nearFrac) / Math.max(1e-6, 1 - nearFrac);
      const distMul = 1 - (1 - farDamageMul) * Math.min(1, Math.max(0, falloffT));
      const closeT = Math.min(1, hit.u / closeBoostFrac);
      const closeMul = closeBoostMul - (closeBoostMul - 1) * closeT;

      let radialMul = 1;
      if (radial > coreRadius){
        const rr = (radial - coreRadius) / Math.max(1e-6, edge - coreRadius);
        const edgeFade = 1 - Math.min(1, Math.max(0, rr));
        // Keep punchbeamer edge hits deterministic and reliable.
        radialMul = 0.65 + edgeFade * 0.35;
      }

      return Math.max(0, b.damage * tickScale * distMul * closeMul * radialMul);
    }
  };
}

export function spawn(x, y, angle, type='rifle', mods={}){
  const def = CONFIG.PROJECTILES[type] || CONFIG.PROJECTILES.rifle;
  const speedMul = mods.speedMul ?? 1.0;
  const damageMul = mods.damageMul ?? 1.0;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const p = {
    type, x, y,
    vx: dx * def.speed * speedMul,
    vy: dy * def.speed * speedMul,
    damage: (def.damage ?? 1) * damageMul,
    t: 0,
    ...def
  };
  if (type === 'rocket' || type === 'rocketpod'){
    p.accel = def.accel;
    p.vmax = def.vmax * Math.max(1.0, speedMul);
    p.trail = []; p.trail_accum = 0;
  }
  shots.push(p);
}

export function registerBeamResolver(fn){
  if (typeof fn !== 'function') return;
  beamResolvers.push(fn);
}

export function registerPunchBeamResolver(fn){
  if (typeof fn !== 'function') return;
  punchBeamResolvers.push(fn);
}

export function fireBeam(x, y, angle, mods = {}){
  const beamType = mods.weaponType || 'beamer';
  const def = CONFIG.PROJECTILES[beamType] || CONFIG.PROJECTILES.beamer || {};
  const range = def.range ?? 980;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const x2 = x + dx * range;
  const y2 = y + dy * range;
  const damageMul = mods.damageMul ?? 1.0;
  const damage = Math.max(1, (def.damage ?? 20) * damageMul);

  const beam = {
    type: beamType,
    x1: x, y1: y, x2, y2,
    t: 0,
    life: def.life ?? 0.09,
    range,
    damage,
    jitter: def.jitter ?? 8,
    arcs: def.arcs ?? 3,
    coreRadius: def.coreRadius ?? 6,
    lightningRadius: def.lightningRadius ?? 30,
    nearFrac: def.nearFrac ?? 0.25,
    hitRangeFrac: def.hitRangeFrac ?? 1,
    farDamageMul: def.farDamageMul ?? 0.15,
    closeBoostFrac: def.closeBoostFrac ?? 0.16,
    closeBoostMul: def.closeBoostMul ?? 2.8,
    track: mods.track
  };
  beams.push(beam);
}

export function reset(){
  shots.length = 0;
  beams.length = 0;
}

export function update(dt){
  for(const s of shots){
    s.t += dt;

    if (s.type === 'rocket' || s.type === 'rocketpod'){
      const v = Math.hypot(s.vx, s.vy);
      const nx = v>0 ? s.vx/v : 0, ny = v>0 ? s.vy/v : -1;
      const k = Math.min(1, s.t / s.ramp_sec);
      const easeOutCubic = (x)=>1 - Math.pow(1-x,3);
      const factor = s.accel_base + (s.accel_peak - s.accel_base) * easeOutCubic(k);
      const accelNow = s.accel * factor;
      let newV = Math.min(s.vmax, v + accelNow * dt);
      s.vx = nx * newV; s.vy = ny * newV;

      s.trail_accum += dt;
      if (s.trail_accum >= s.trail_dt){
        s.trail_accum = 0;
        s.trail.push({ x:s.x, y:s.y, r:s.puff_r0, alpha:1, age:0 });
        if (s.trail.length > s.trail_len) s.trail.shift();
      }
      for(let i=s.trail.length-1;i>=0;i--){
        const n = s.trail[i];
        n.age += dt; n.r += s.puff_growth * dt; n.alpha -= s.puff_fade * dt;
        if (n.alpha <= 0) s.trail.splice(i,1);
      }
    }

    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  // cull
  for (let i=shots.length-1;i>=0;i--){
    const s = shots[i];
    if (s.t > s.life || s.x < -40 || s.x > world.w+40 || s.y < -80 || s.y > world.h+80){
      shots.splice(i,1);
    }
  }

  for (let i = beams.length - 1; i >= 0; i--){
    const b = beams[i];
    updateTrackedBeam(b);
    const tick = Math.min(dt, Math.max(0, b.life - b.t));
    if (tick > 0){
      const isPunchBeam = b.type === 'punchbeamer';
      const payload = isPunchBeam ? makePunchBeamPayload(b, tick) : makeBeamPayload(b, tick);
      const resolvers = isPunchBeam ? punchBeamResolvers : beamResolvers;
      for (const resolve of resolvers){
        try {
          resolve(payload);
        } catch {}
      }
    }
    b.t += dt;
    if (b.t >= b.life) beams.splice(i, 1);
  }
}

export function consumeHitsCircle(cx, cy, r, handler){
  for (let i = shots.length - 1; i >= 0; i--){
    const s = shots[i];
    const dx = s.x - cx, dy = s.y - cy;
    if (dx*dx + dy*dy <= r*r){
      // handler may return false to keep projectile alive (pierce behavior)
      const consume = handler(s);
      if (consume !== false){
        shots.splice(i,1);
      }
    }
  }
}

export function forEachHitsCircle(cx, cy, r, handler){
  // Calls handler(proj) for every projectile intersecting the circle,
  // but DOES NOT remove the projectile.
  for (const s of shots) {
    const dx = s.x - cx, dy = s.y - cy;
    if (dx*dx + dy*dy <= r*r) handler(s);
  }
}

export function draw(g){
  for(const s of shots){
    try { Theme.drawProjectile(g, s); } catch {}
  }
  for (const b of beams){
    try { Theme.drawBeam?.(g, b); } catch {}
  }
}

export const Projectiles = {
  spawn,
  fireBeam,
  registerBeamResolver,
  registerPunchBeamResolver,
  reset,
  update,
  draw,
  consumeHitsCircle,
  forEachHitsCircle
};

