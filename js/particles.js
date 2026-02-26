// js/particles.js
import { Theme } from './theme.js';

const pool = []; // {x,y,vx,vy,t,life,type}

export function reset(){
  pool.length = 0;
}

export function spawnImpact(x, y, type = 'playerShot', amount = 1, opts = {}){
  // type: 'blood' | 'damage' | 'explosion' | 'playerShot' | 'enemyShot' | 'warnSpark' | 'smoke' | 'pickupFlash'
  const isExplosion = (type === 'explosion');
  const isDamage = (type === 'damage');
  const isBlood = (type === 'blood');
  const isEnemyShot = (type === 'enemyShot');
  const isWarnSpark = (type === 'warnSpark');
  const isSmoke = (type === 'smoke');
  const isPickupFlash = (type === 'pickupFlash');

  const baseCount = isExplosion ? 20 : (isDamage ? 14 : (isBlood ? 10 : (isEnemyShot ? 10 : (isWarnSpark ? 5 : (isSmoke ? 4 : (isPickupFlash ? 10 : 8))))));
  const baseSpeed = isExplosion ? 220 : (isDamage ? 170 : (isBlood ? 140 : (isEnemyShot ? 130 : (isWarnSpark ? 95 : (isSmoke ? 42 : (isPickupFlash ? 90 : 120))))));
  const baseLife  = isExplosion ? 0.8 : (isDamage ? 0.65 : (isBlood ? 0.5 : (isEnemyShot ? 0.5 : (isWarnSpark ? 0.32 : (isSmoke ? 0.95 : (isPickupFlash ? 0.23 : 0.4))))));
  const intensity = Math.max(0.35, Math.min(3.0, amount));
  const count = Math.max(4, Math.round(baseCount * intensity));
  const speed = baseSpeed * (0.85 + intensity * 0.3);
  const life  = baseLife * (0.85 + intensity * 0.2);
  const directional = !!opts.directional;
  const dirX = opts.dirX ?? 0;
  const dirY = opts.dirY ?? -1;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  const dnx = dirX / dirLen;
  const dny = dirY / dirLen;
  const baseDir = Math.atan2(dny, dnx);

  for (let i=0;i<count;i++){
    let a = Math.random() * Math.PI * 2;
    let s = (0.45 + Math.random()*0.7) * speed;
    if (isSmoke){
      // Bias smoke to drift up with a wide cone and low speed.
      a = (-Math.PI/2) + (Math.random() - 0.5) * (Math.PI * 0.7);
      s *= 0.7;
    } else if (isBlood && directional && dirLen > 0.001){
      // Blood spray follows projectile travel with variable cone width.
      const cone = Math.PI * clamp(0.12 + 0.28 / Math.max(0.5, intensity), 0.12, 0.45);
      a = baseDir + (Math.random() - 0.5) * cone;
      s *= 0.9 + Math.random() * 0.55;
    }
    pool.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      t: 0,
      life: life * (0.6 + Math.random()*0.6),
      type
    });
  }
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

export function spawnBotExplosion(x, y, amount = 1){
  const intensity = Math.max(0.5, Math.min(2.5, amount));

  // Big shower of sparks and impact debris.
  spawnImpact(x, y, 'warnSpark', 2.0 * intensity);
  spawnImpact(x, y, 'damage', 1.8 * intensity);
  spawnImpact(x, y, 'explosion', 1.6 * intensity);

  // Chunky bot parts that fly out and tumble.
  const partCount = Math.round(10 * intensity);
  for (let i = 0; i < partCount; i++){
    const a = Math.random() * Math.PI * 2;
    const s = (120 + Math.random() * 240) * intensity;
    pool.push({
      type: 'botPart',
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 80,
      t: 0,
      life: 1.2 + Math.random() * 0.8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 12,
      w: 6 + Math.random() * 12,
      h: 4 + Math.random() * 9
    });
  }
}

export function spawnShellEject(x, y, vx, vy, opts = {}){
  pool.push({
    type: 'shell',
    x, y,
    vx, vy,
    t: 0,
    life: 0.9 + Math.random() * 0.45,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 20,
    w: opts.w ?? (4 + Math.random() * 2.2),
    h: opts.h ?? (2 + Math.random() * 1.2)
  });
}

export function spawnPickupBurst(x, y, amount = 1){
  const intensity = Math.max(0.6, Math.min(2.4, amount));

  // Legacy flash backbone plus stronger pickup-specific visuals.
  spawnImpact(x, y, 'pickupFlash', 1.25 * intensity);

  pool.push({ type: 'pickupGlow', x, y, vx: 0, vy: 0, t: 0, life: 0.34 + intensity * 0.04 });
  pool.push({ type: 'pickupRing', x, y, vx: 0, vy: 0, t: 0, life: 0.28 + intensity * 0.05, r0: 4, r1: 22 + intensity * 9 });
  pool.push({ type: 'pickupRing', x, y, vx: 0, vy: 0, t: 0, life: 0.42 + intensity * 0.06, r0: 2, r1: 34 + intensity * 13 });

  const shardCount = Math.round(12 + intensity * 6);
  for (let i = 0; i < shardCount; i++){
    const a = (i / Math.max(1, shardCount)) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
    const s = 110 + Math.random() * 150 + intensity * 40;
    pool.push({
      type: 'pickupShard',
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      t: 0,
      life: 0.34 + Math.random() * 0.22,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 18,
      w: 3 + Math.random() * 3.5,
      h: 1.3 + Math.random() * 1.7
    });
  }
}

export function update(dt){
  for (let i=pool.length-1;i>=0;i--){
    const p = pool[i];
    p.t += dt;
    if (p.type === 'botPart'){
      p.vy += 320 * dt;
      p.angle += (p.spin || 0) * dt;
      p.vx *= 0.992;
      p.vy *= 0.996;
    } else if (p.type === 'pickupShard'){
      p.vy += 260 * dt;
      p.angle += (p.spin || 0) * dt;
      p.vx *= 0.986;
      p.vy *= 0.989;
    } else if (p.type === 'shell'){
      p.vy += 420 * dt;
      p.angle += (p.spin || 0) * dt;
      p.vx *= 0.985;
      p.vy *= 0.992;
    } else {
      // a little drag to make it feel juicy
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t >= p.life) pool.splice(i,1);
  }
}

export function draw(g){
  for (const p of pool){
    Theme.drawParticle(g, p);
  }
}

export const Particles = {
  reset,
  update,
  draw,
  spawnImpact,
  spawnBotExplosion,
  spawnShellEject,
  spawnPickupBurst
};
