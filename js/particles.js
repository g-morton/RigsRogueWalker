// js/particles.js
import { Theme } from './theme.js';

const pool = []; // {x,y,vx,vy,t,life,type}

export function reset(){
  pool.length = 0;
}

export function spawnImpact(x, y, type = 'spark'){
  // type: 'spark' (rifle/chaingun) | 'explosion' (cannon/rocket)
  const count = (type === 'explosion') ? 20 : 8;
  const speed = (type === 'explosion') ? 220 : 120;
  const life  = (type === 'explosion') ? 0.8  : 0.4;

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
