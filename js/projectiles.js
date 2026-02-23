import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';

const shots = [];

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
  if (type === 'rocket'){
    p.accel = def.accel;
    p.vmax = def.vmax * Math.max(1.0, speedMul);
    p.trail = []; p.trail_accum = 0;
  }
  shots.push(p);
}

export function reset(){ shots.length = 0; }

export function update(dt){
  for(const s of shots){
    s.t += dt;

    if (s.type === 'rocket'){
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
  for(const s of shots) Theme.drawProjectile(g, s);
}

export const Projectiles = { spawn, reset, update, draw, consumeHitsCircle, forEachHitsCircle };

