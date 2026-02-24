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
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function playerOverlapsIBS(p){
  const pl = world.player;
  if (!pl) return false;
  const dx = p.x - pl.x, dy = p.y - pl.y;
  const r  = (CONFIG.PLAYER.SQUASH_R || 18) + CONFIG.IBS.R;
  return dx*dx + dy*dy <= r*r;
}

// Build a messy splat composed of overlapping circles
function makeSplat(x, y, opts = {}){
  const mode = opts.mode || 'impact';
  const damage = Math.max(1, opts.damage ?? 1);
  const vx = opts.dirX ?? 0;
  const vy = opts.dirY ?? -1;
  const vm = Math.hypot(vx, vy) || 1;
  const nx = vx / vm, ny = vy / vm;

  const blobs = [];
  if (mode === 'smear'){
    const len = 18 + Math.random() * 20;
    const width = 5 + Math.random() * 5;
    const rot = (Math.random() - 0.5) * 0.45;
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++){
      const bx = x + (Math.random() - 0.5) * len * 0.4;
      const by = y + (Math.random() - 0.5) * width * 1.8;
      const r = 3 + Math.random() * 5;
      blobs.push({ x: bx, y: by, r });
    }
    return { x, y, t:0, life:5.0, mode:'smear', smear:{ len, width, rot }, blobs, scrollY:y };
  }

  const spread = clamp(0.7 + damage / 22, 0.8, 3.5);
  const n = 4 + (Math.random() * (5 + spread * 2) | 0);
  for (let i = 0; i < n; i++){
    const forward = 2 + Math.random() * (18 * spread);
    const lateral = (Math.random() - 0.5) * (10 * spread);
    const jitter = Math.random() * 3 * spread;
    const bx = x + (nx * forward) + (-ny * lateral) + (Math.random() - 0.5) * jitter;
    const by = y + (ny * forward) + ( nx * lateral) + (Math.random() - 0.5) * jitter;
    const r = 2.5 + Math.random() * (5 + spread * 1.7);
    blobs.push({ x:bx, y:by, r });
  }
  return { x, y, t:0, life:6.2, mode:'impact', blobs, scrollY:y };
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
      Particles.spawnImpact(p.x, p.y, 'blood', 0.55);
      splats.push(makeSplat(p.x, p.y, { mode:'smear' }));
      ibs.splice(i,1);
      world.ibsHit = (world.ibsHit|0) + 1;
      continue;
    }

    // 2) Projectile hits (consuming + damage-based)
    Projectiles.consumeHitsCircle(p.x, p.y, cfg.R, (proj)=>{
      const damage = Math.max(1, proj.damage ?? 1);
      p.hp -= damage;
      p.lastHit = { damage, vx: proj.vx, vy: proj.vy };
      Particles.spawnImpact(
        proj.x, proj.y, 'blood',
        Math.max(0.45, damage / 9),
        { directional: true, dirX: proj.vx, dirY: proj.vy }
      );
      // Heavy rounds should pierce through IBS instead of being blocked.
      return proj.type !== 'rocket' && proj.type !== 'cannon';
    });

    if (p.hp <= 0){
      const hit = p.lastHit || { damage: 1, vx: 0, vy: -1 };
      Particles.spawnImpact(
        p.x, p.y, 'blood',
        Math.max(0.6, hit.damage / 7),
        { directional: true, dirX: hit.vx, dirY: hit.vy }
      );
      splats.push(makeSplat(p.x, p.y, {
        mode: 'impact',
        damage: hit.damage,
        dirX: hit.vx,
        dirY: hit.vy
      }));
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


