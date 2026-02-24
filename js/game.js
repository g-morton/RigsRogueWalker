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
let bossPhase = 'none'; // none | clearing | approach | fight

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

function maybeStartBossEncounter(){
  if (world.bossActive || bossPhase !== 'none') return;
  const interval = Math.max(1, CONFIG.BOSS?.INTERVAL_DIST ?? 5000);
  if ((world.dist | 0) < (world.nextBossDist | 0)) return;
  world.bossActive = true;
  world.spawnLocked = true;
  world.spawnScale = 0;
  bossPhase = 'clearing';
  HUD.showBossBanner?.('Boss Approaching', 1800);
  Tiles.setGenerationEnabled?.(false);
}

function maybeAdvanceBossSequence(){
  if (!world.bossActive) return;

  if (bossPhase === 'clearing'){
    const clear = !!Tiles.isCleared?.() &&
      !IBS.hasActive?.() &&
      !Powerups.hasActive?.() &&
      !Turrets.hasActiveNonBoss?.();
    if (clear){
      Turrets.startBoss?.(CONFIG.BOSS?.TURRET_TYPE ?? 'large', { fromTop: true });
      bossPhase = 'approach';
    }
    return;
  }

  if (bossPhase === 'approach'){
    const boss = Turrets.getBossStatus?.();
    if (boss?.entered){
      bossPhase = 'fight';
    }
    return;
  }

  if (bossPhase !== 'fight') return;
  if (Turrets.hasActiveBoss?.()) return;
  const interval = Math.max(1, CONFIG.BOSS?.INTERVAL_DIST ?? 5000);
  world.bossActive = false;
  world.spawnLocked = false;
  world.spawnScale = 0;
  bossPhase = 'none';
  Tiles.setGenerationEnabled?.(true);
  while ((world.nextBossDist | 0) <= (world.dist | 0)){
    world.nextBossDist = (world.nextBossDist | 0) + interval;
  }
}

function startRAF(){
  const mySeq = ++loopSeq;
  function frame(t){
    if (!world.running || mySeq !== loopSeq) return;
    rafId = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    const dt = Math.min(0.033, (t - lastT)/1000);
    lastT = t;

    maybeStartBossEncounter();
    if (!world.spawnLocked && (world.spawnScale ?? 1) < 1){
      world.spawnScale = Math.min(1, (world.spawnScale ?? 1) + dt / 6);
    }

    // Per-frame scroll delta in px
    world.dy = (world.bossActive && bossPhase === 'fight') ? 0 : (world.scroll * dt);

    Background.update?.(dt);
    Background.draw(ctx);

    Tiles.update(dt); Tiles.draw(ctx);
    Powerups.update(dt); Powerups.draw(ctx);
    IBS.update(dt); IBS.draw(ctx);
    Turrets.update(dt); Turrets.draw(ctx);
    const boss = Turrets.getBossStatus?.();
    if (bossPhase === 'fight' && boss) HUD.setBossBar?.(boss.hp, boss.maxHp);
    else HUD.setBossBar?.(0, 1);
    player.update(dt);
    if (!player.dead && player.hp <= 0){
      player.destroy();
    }
    player.draw(ctx);
    Projectiles.update(dt); Projectiles.draw(ctx);
    Particles.update(dt); Particles.draw(ctx);
    IBS.drawBubbles?.(ctx);

    maybeAdvanceBossSequence();

    if (player.isDeathAnimDone?.()){
      gameOver('Your bot exploded!');
      return;
    }

    // fall check
    if (!player.dead && !world.bossActive && !Tiles.isSafe(player.x, player.y)){
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
  world.running = false; world.dist = 0; world.dy = 0; world.ibsHit = 0; world.enemyDestroyed = 0; world.bossActive = false; world.nextBossDist = (CONFIG.BOSS?.INTERVAL_DIST ?? 5000); world.spawnLocked = false; world.spawnScale = 1; bossPhase = 'none'; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  player = new Player(); world.player = player;

  HUD.setRestartLabel('Restart ↻');
  HUD.hideSplash?.();
  HUD.hideGameOver?.();
  HUD.hideBossUI?.();

  world.running = true;
  startRAF();
}

export function boot(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; world.dy = 0; world.enemyDestroyed = 0; world.bossActive = false; world.nextBossDist = (CONFIG.BOSS?.INTERVAL_DIST ?? 5000); world.spawnLocked = false; world.spawnScale = 1; bossPhase = 'none'; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Particles.reset?.();

  if (!player){ player = new Player(); world.player = player; }
  HUD.showSplash?.();
  HUD.hideGameOver?.();
  HUD.hideBossUI?.();

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
  HUD.hideBossUI?.();
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
