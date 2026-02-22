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

    Background.draw(ctx);

    Tiles.update(); Tiles.draw(ctx);
    Powerups.update(dt); Powerups.draw(ctx);
    IBS.update(dt); IBS.draw(ctx);
    Turrets.update(dt); Turrets.draw(ctx);
    player.update(dt); player.draw(ctx);
    Projectiles.update(dt); Projectiles.draw(ctx);
    Particles.update(dt); Particles.draw(ctx);

    // fall check
    if (!Tiles.isSafe(player.x, player.y)){
      gameOver('You fell!');
      return;
    }

    world.dist += dt * world.scroll * 60;
    const el = document.getElementById('scoreDist'); if (el) el.textContent = Math.floor(world.dist);
  }
  rafId = requestAnimationFrame(frame);
}

export function startGame(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  player = new Player(); world.player = player;

  const status = document.getElementById('status'); if (status) status.textContent = 'Running…';
  const btn = document.getElementById('restart'); if (btn) btn.textContent = 'Restart ↻';

    world.ibsHit = 0;
    const h2 = document.getElementById('scoreIBS');
    if (h2) h2.textContent = 0;

  world.running = true;
  startRAF();
}

export function boot(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  if (!player){ player = new Player(); world.player = player; }

  Background.draw(ctx);
  Tiles.draw(ctx);
  Powerups.draw(ctx);
  Turrets.draw(ctx);
  player.draw(ctx);
}

export function gameOver(msg){
  world.running = false;
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  const status = document.getElementById('status'); if (status) status.textContent = msg + ' — Game Over';
  const btn = document.getElementById('restart'); if (btn) btn.textContent = 'Restart ↻';
}

export function wireUI(){
  const btn = document.getElementById('restart');
  if (btn){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); if (!world.running) startGame(); else startGame(); });
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
