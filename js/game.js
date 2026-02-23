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

let lastT = 0;
let player = null;
let rafId = null;
let loopSeq = 0;

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
    player.update(dt); player.draw(ctx);
    Projectiles.update(dt); Projectiles.draw(ctx);
    Particles.update(dt); Particles.draw(ctx);
    IBS.drawBubbles?.(ctx);

    // fall check
    if (!Tiles.isSafe(player.x, player.y)){
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
  world.running = false; world.dist = 0; world.dy = 0; world.ibsHit = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  player = new Player(); world.player = player;

  HUD.setRestartLabel('Restart ↻');

  world.running = true;
  startRAF();
}

export function boot(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; world.dy = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  if (!player){ player = new Player(); world.player = player; }

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
}

export function wireUI(){
  HUD.init();
  const btn = document.getElementById('restart');
  if (btn){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); startGame(); });
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
