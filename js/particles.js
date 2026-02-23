// js/particles.js
import { Theme } from './theme.js';

const pool = []; // {x,y,vx,vy,t,life,type}

export function reset(){
  pool.length = 0;
}

export function spawnImpact(x, y, type = 'playerShot', amount = 1){
  // type: 'blood' | 'damage' | 'explosion' | 'playerShot' | 'enemyShot' | 'warnSpark' | 'smoke'
  const isExplosion = (type === 'explosion');
  const isDamage = (type === 'damage');
  const isBlood = (type === 'blood');
  const isEnemyShot = (type === 'enemyShot');
  const isWarnSpark = (type === 'warnSpark');
  const isSmoke = (type === 'smoke');

  const baseCount = isExplosion ? 20 : (isDamage ? 14 : (isBlood ? 10 : (isEnemyShot ? 10 : (isWarnSpark ? 5 : (isSmoke ? 4 : 8)))));
  const baseSpeed = isExplosion ? 220 : (isDamage ? 170 : (isBlood ? 140 : (isEnemyShot ? 130 : (isWarnSpark ? 95 : (isSmoke ? 42 : 120)))));
  const baseLife  = isExplosion ? 0.8 : (isDamage ? 0.65 : (isBlood ? 0.5 : (isEnemyShot ? 0.5 : (isWarnSpark ? 0.32 : (isSmoke ? 0.95 : 0.4)))));
  const intensity = Math.max(0.35, Math.min(3.0, amount));
  const count = Math.max(4, Math.round(baseCount * intensity));
  const speed = baseSpeed * (0.85 + intensity * 0.3);
  const life  = baseLife * (0.85 + intensity * 0.2);

  for (let i=0;i<count;i++){
    const a = Math.random() * Math.PI * 2;
    const s = (0.45 + Math.random()*0.7) * speed;
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

export function update(dt){
  for (let i=pool.length-1;i>=0;i--){
    const p = pool[i];
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // a little drag to make it feel juicy
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.t >= p.life) pool.splice(i,1);
  }
}

export function draw(g){
  for (const p of pool){
    Theme.drawParticle(g, p);
  }
}

export const Particles = { reset, update, draw, spawnImpact };
