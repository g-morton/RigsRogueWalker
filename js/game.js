import { CONFIG } from './config.js';
import { world, ctx } from './utils.js';
import { Tiles } from './tiles.js';
import { Background } from './background.js';
import { Player } from './player.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { Powerups } from './powerups.js';
import { Turrets } from './turrets.js';
import { IBS } from './ibs.js';
import { HUD } from './hud.js';
import { SFX } from './sfx.js';

let lastT = 0;
let player = null;
let rafId = null;
let loopSeq = 0;

function evaluateRun(){
  const distance = (world.dist | 0);
  const enemies = (world.enemyDestroyed | 0);
  const ibs = (world.ibsHit | 0);

  const score = Math.max(0, Math.round(
    distance * 0.55 +
    enemies * 160 -
    ibs * 120
  ));

  let message = 'Rough outing. Keep moving and limit collateral.';
  if (score >= 800) message = 'Clean run. Efficient and controlled.';
  if (score >= 1600) message = 'Excellent operation. Precision under pressure.';
  if (score >= 2600) message = 'Legendary run. Clinical execution.';

  return { score, message, distance, enemies, ibs };
}

function startRAF(){
  const mySeq = ++loopSeq;
  function frame(t){
    if (!world.running || mySeq !== loopSeq) return;
    rafId = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    const dt = Math.min(0.033, (t - lastT)/1000);
    lastT = t;

    // Per-frame scroll delta in px
    world.dy = world.scroll * dt;

    Background.update?.(dt);
    Background.draw(ctx);

    Tiles.update(dt); Tiles.draw(ctx);
    Powerups.update(dt); Powerups.draw(ctx);
    IBS.update(dt); IBS.draw(ctx);
    Turrets.update(dt); Turrets.draw(ctx);
    player.update(dt);
    if (!player.dead && player.hp <= 0){
      player.destroy();
    }
    player.draw(ctx);
    Projectiles.update(dt); Projectiles.draw(ctx);
    Particles.update(dt); Particles.draw(ctx);
    IBS.drawBubbles?.(ctx);

    if (player.isDeathAnimDone?.()){
      gameOver('Your bot exploded!');
      return;
    }

    // fall check
    if (!player.dead && !Tiles.isSafe(player.x, player.y)){
      gameOver('You fell!');
      return;
    }

    // Distance is tracked in scrolled pixels (simple, stable across refresh rates)
    world.dist += world.dy;
    HUD.tick();
  }
  rafId = requestAnimationFrame(frame);
}

export function startGame(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; world.dy = 0; world.ibsHit = 0; world.enemyDestroyed = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  player = new Player(); world.player = player;

  HUD.setRestartLabel('Restart ↻');
  HUD.hideSplash?.();
  HUD.hideGameOver?.();

  world.running = true;
  startRAF();
}

export function boot(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; world.dy = 0; world.enemyDestroyed = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  if (!player){ player = new Player(); world.player = player; }
  HUD.showSplash?.();
  HUD.hideGameOver?.();

  Background.draw(ctx);
  Tiles.draw(ctx);
  Powerups.draw(ctx);
  Turrets.draw(ctx);
  player.draw(ctx);
  IBS.drawBubbles?.(ctx);

  HUD.tick();
}

export function gameOver(msg){
  world.running = false;
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  HUD.setRestartLabel('Restart ↻');
  const r = evaluateRun();
  HUD.showGameOver?.({
    title: 'Game Over',
    reason: msg || 'Mission failed.',
    score: r.score,
    message: r.message,
    distance: r.distance,
    enemies: r.enemies,
    ibs: r.ibs
  });
}

export function wireUI(){
  HUD.init();
  SFX.warmup?.();
  // Prevent browser context menu from interrupting right-click fire.
  window.addEventListener('contextmenu', (e)=>{ e.preventDefault(); });
  const btn = document.getElementById('restart');
  if (btn){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); startGame(); });
  }
  const splashPlay = document.getElementById('splashPlay');
  if (splashPlay){
    splashPlay.addEventListener('click', (e)=>{ e.preventDefault(); startGame(); });
  }
  const again = document.getElementById('playAgain');
  if (again){
    again.addEventListener('click', (e)=>{ e.preventDefault(); startGame(); });
  }
  const cvs = document.getElementById('game');
  if (cvs){
    cvs.addEventListener('contextmenu', e=>e.preventDefault());
    cvs.addEventListener('mousedown', (e)=>{
      if (!world.player) return;
      if (e.button === 0) world.player.fire('left');
      if (e.button === 2) world.player.fire('right');
    });
  }
}
