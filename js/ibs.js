// js/ibs.js
import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';
import { Particles } from './particles.js';
import { Projectiles } from './projectiles.js';

// ---------------------------------------------------------------------------
// State
const ibs = [];     // walkers: {x,y,vx,dir,t,talk?,talkT,animT,swayMul,bobMul,hp,maxHp}
const splats = [];  // gore:   {x,y,t,life,blobs[],scrollY}
let accPx = 0;

// Flavor lines (optional bubble)
const LINES = [
  "Don't shoot","I'm too young","Why me?", "Think of the children", "Are you crazy?",
  "Yikes","Run","Watch out","Mind the gap","I'm innocent", "Help", "Why oh why?"
];

// ---------------------------------------------------------------------------
// Utils
function rand(a,b){ return a + Math.random()*(b-a); }

function playerOverlapsIBS(p){
  const pl = world.player;
  if (!pl) return false;
  const dx = p.x - pl.x, dy = p.y - pl.y;
  const r  = (CONFIG.PLAYER.SQUASH_R || 18) + CONFIG.IBS.R;
  return dx*dx + dy*dy <= r*r;
}

// Build a messy splat composed of overlapping circles
function makeSplat(x, y){
  const blobs = [];
  const n = 3 + (Math.random()*4|0); // 3–6 blobs (smaller than before)
  for (let i=0;i<n;i++){
    const ang  = Math.random() * Math.PI * 2;
    const dist = Math.random() * 10;
    const bx = x + Math.cos(ang)*dist;
    const by = y + Math.sin(ang)*dist;
    const r  = 3 + Math.random() * 10; // smaller blobs
    blobs.push({ x:bx, y:by, r });
  }
  return { x, y, t:0, life:6.0, blobs, scrollY:y };
}

// Try to spawn one IBS on a safe corridor; fallback center if none found
function spawnOne(forcedY = null){
  const cfg = CONFIG.IBS;
  const y = (forcedY !== null) ? forcedY : -cfg.R - 8;

  for (let i=0;i<24;i++){
    const x = 20 + Math.random() * (world.w - 40);
    if (Tiles.isSafe(x, y + 8)){
      const speed = rand(cfg.SPEED_MIN, cfg.SPEED_MAX);
      const dir   = Math.random() < 0.5 ? -1 : 1;
      const talk  = Math.random() < cfg.TALK_CHANCE ? LINES[(Math.random()*LINES.length)|0] : null;
      ibs.push({
        x, y, vx: speed, dir, t:0, talk, talkT:0,
        talkCD: 0,
        animT: 0,
        swayMul: 0.7 + Math.random()*0.8, // 0.7–1.5x
        bobMul:  0.7 + Math.random()*1.0, // 0.7-1.7x
        hp: cfg.HP,
        maxHp: cfg.HP
      });
      return;
    }
  }
  // fallback
  const speed = rand(cfg.SPEED_MIN, cfg.SPEED_MAX);
  ibs.push({
    x: world.w/2, y, vx: speed, dir:(Math.random()<0.5?-1:1), t:0, talk:null, talkT:0, talkCD: 0,
    animT: 0, swayMul: 0.7 + Math.random()*0.8, bobMul: 0.7 + Math.random()*1.0,
    hp: cfg.HP, maxHp: cfg.HP
  });
}

function spawnWave(n){ for (let i=0;i<Math.max(1,n|0);i++) spawnOne(); }

// ---------------------------------------------------------------------------
// API
export function reset(){
  ibs.length = 0;
  splats.length = 0;
  accPx = 0;

  // Pre-seed above the screen so it feels busy immediately
  const cfg = CONFIG.IBS;
  const rowH = CONFIG.TILE.H;
  for (let i=0;i<(cfg.SEED|0); i++){
    const y = - (rowH * (1 + Math.random()*6));
    spawnOne(y);
  }
}

export function update(dt){
  const cfg = CONFIG.IBS;

  // how much the world moved this frame
  const dy = world.dy;

  // Spawn cadence by scrolled pixels (waves)
  accPx += dy;
  const spacingPx = CONFIG.TILE.H * cfg.SPAWN_ROWS;
  while (accPx >= spacingPx){
    accPx -= spacingPx;
    spawnWave(cfg.PER_SPAWN|0);
  }

  // Gentle top-up toward MAX
  if (ibs.length < (cfg.MAX|0)){
    const deficit = (cfg.MAX|0) - ibs.length;
    const p = Math.min(0.9, (deficit / Math.max(1, cfg.MAX)) * (dy / CONFIG.TILE.H) * 4.0);
    if (Math.random() < p) spawnOne();
  }

  // Walkers
  for (let i = ibs.length - 1; i >= 0; i--){
    const p = ibs[i];
    p.t += dt;
    p.y += dy;

    // advance anim time (scale with speed so faster walkers swing more)
    p.animT += dt * (CONFIG.IBS.ANIM.WALK_FREQ * (0.6 + p.vx));

    // horizontal wander; flip if next pos not safe
    const nextX = p.x + p.dir * p.vx;
    if (Tiles.isSafe(nextX, p.y + 2)) p.x = nextX; else p.dir *= -1;

    // speech timer
    if (p.talk){
      p.talkT += dt;
      if (p.talkT > cfg.TALK_TIME) p.talk = null;
    }

    // --- Cooldown countdown ---
    p.talkCD = Math.max(0, (p.talkCD || 0) - dt);

    // --- Panic chatter trigger (starts new bubble) ---
    if (!p.talk && p.talkCD <= 0){
      const density = (CONFIG.IBS.TALK_DENSITY ?? 0);
      if (density > 0 && Math.random() < density * dt){
        p.talk = LINES[(Math.random()*LINES.length)|0];
        p.talkT = 0;
        p.talkCD = (CONFIG.IBS.TALK_COOLDOWN ?? 2.0);
      }
    }

    // offscreen cull
    if (p.y > world.h + 30){ ibs.splice(i,1); continue; }

    // 1) Player stomp (squash)
    if (playerOverlapsIBS(p)){
      Particles.spawnImpact(p.x, p.y, 'blood');
      splats.push(makeSplat(p.x, p.y));
      ibs.splice(i,1);
      world.ibsHit = (world.ibsHit|0) + 1;
      continue;
    }

    // 2) Projectile hits (consuming + damage-based)
    Projectiles.consumeHitsCircle(p.x, p.y, cfg.R, (proj)=>{
      const damage = Math.max(1, proj.damage ?? 1);
      p.hp -= damage;
      Particles.spawnImpact(proj.x, proj.y, 'blood', damage / 10);
      // Rockets should pierce through IBS instead of being blocked.
      return proj.type !== 'rocket';
    });

    if (p.hp <= 0){
      Particles.spawnImpact(p.x, p.y, 'blood', p.maxHp / 8);
      splats.push(makeSplat(p.x, p.y));
      ibs.splice(i,1);
      world.ibsHit = (world.ibsHit|0) + 1;
      continue;
    }
  }

  // Splats: scroll with world, expand a touch, fade over lifetime
  for (let i = splats.length - 1; i >= 0; i--){
    const s = splats[i];
    s.t += dt;

    // move center & all blobs together so splat rides with ground
    s.scrollY += dy;
    s.y = s.scrollY;
    if (s.blobs){
      for (const b of s.blobs) b.y += dy;
    }

    if (s.t >= s.life) splats.splice(i,1);
  }
}

export function draw(g){
  // Draw splats beneath walkers
  for (const s of splats) Theme.drawSplat(g, s);
  for (const p of ibs)   Theme.drawIBS(g, p, CONFIG.IBS.R);
}

export function drawBubbles(g){
  for (const p of ibs){
    if (!p.talk) continue;
    Theme.drawIBSBubble(g, p, CONFIG.IBS.R);
  }
}

export const IBS = { reset, update, draw, drawBubbles };

