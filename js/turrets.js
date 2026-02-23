// js/turrets.js
import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Tiles } from './tiles.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js'; // player shots
import { Particles } from './particles.js';     // impact effects

// --- State -------------------------------------------------------------------
const turrets = [];   // { x, y, cool }
const shots = [];     // enemy bullets { x,y,vx,vy,t }
let accPx = 0;        // pixel accumulator for spawn cadence

// --- Helpers -----------------------------------------------------------------
function randCooldown(){
  const a = CONFIG.ENEMIES.TURRET.FIRE_COOLDOWN_MIN;
  const b = CONFIG.ENEMIES.TURRET.FIRE_COOLDOWN_MAX;
  return a + Math.random() * (b - a);
}

function spawnTurret(){
  const size = CONFIG.ENEMIES.TURRET.SIZE;
  const y = -size - 8; // just above screen
  // Try to land on a safe (white) corridor; fall back to center if none
  for (let i = 0; i < 24; i++){
    const x = 20 + Math.random() * (world.w - 40);
    if (Tiles.isSafe(x, y + 10)){
      turrets.push({ x, y, cool: randCooldown() });
      return;
    }
  }
  turrets.push({ x: world.w / 2, y, cool: randCooldown() });
}

function fireAt(x0, y0, x1, y1){
  const dx = x1 - x0, dy = y1 - y0;
  const v = Math.hypot(dx, dy) || 1;
  const nx = dx / v, ny = dy / v;
  shots.push({
    x: x0, y: y0,
    vx: nx * CONFIG.ENEMIES.TURRET.BULLET_SPEED,
    vy: ny * CONFIG.ENEMIES.TURRET.BULLET_SPEED,
    t: 0,
    r: CONFIG.ENEMIES.TURRET.BULLET_R,          // <- needed for draw
    life: CONFIG.ENEMIES.TURRET.BULLET_LIFE     // <- optional, but tidy
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

    // cull off-screen
    if (t.y > world.h + CONFIG.ENEMIES.TURRET.SIZE + 20){
      turrets.splice(i, 1);
      continue;
    }

    // player bullets hitting turrets
    const hitRadius = CONFIG.ENEMIES.TURRET.SIZE * 0.9;
    let destroyed = false;
    Projectiles.consumeHitsCircle(t.x, t.y, hitRadius, (proj) => {
      // Impact effect chosen by projectile type
      if (proj.type === 'rifle' || proj.type === 'chaingun'){
        Particles.spawnImpact(proj.x, proj.y, 'spark');
      } else {
        Particles.spawnImpact(proj.x, proj.y, 'explosion');
      }
      destroyed = true;
    });

    if (destroyed){
      turrets.splice(i, 1);
      continue;
    }

    // Fire at player
    t.cool -= dt;
    if (t.cool <= 0 && world.player){
      fireAt(t.x, t.y, world.player.x, world.player.y);
      t.cool = randCooldown();
    }
  }

  // Enemy bullets integrate
  for (const s of shots){
    s.t += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  // Enemy bullets hitting player (spark-only effect by design)
  if (world.player){
    const px = world.player.x, py = world.player.y;
    const pr = 18; // simple player hit radius
    for (let i = shots.length - 1; i >= 0; i--){
      const s = shots[i];
      const dx = s.x - px, dy = s.y - py;
      if (dx*dx + dy*dy <= pr*pr){
        Particles.spawnImpact(s.x, s.y, 'spark');
        shots.splice(i, 1);
        // Optional: apply damage/lives/game over here later
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
  const size = CONFIG.ENEMIES.TURRET.SIZE;
  for (const t of turrets) Theme.drawTurret(g, t, size);
  for (const s of shots)  Theme.drawEnemyBullet(g, s);
}

export const Turrets = { reset, update, draw };