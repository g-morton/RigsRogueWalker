import { CONFIG } from './config.js';
import { world, ctx } from './utils.js';
import { Tiles } from './tiles.js';
import { Background } from './background.js';
import { Player } from './player.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { Powerups } from './powerups.js';
import { Turrets } from './turrets.js';
import { Bosses } from './bosses.js';
import { IBS } from './ibs.js';
import { HUD } from './hud.js';
import { SFX } from './sfx.js';

let lastT = 0;
let player = null;
let rafId = null;
let loopSeq = 0;
let bossPhase = 'none'; // none | clearing | approach | fight
let godMode = false;

const DEBUG_WEAPON_ORDER = ['rifle', 'shotgun', 'chaingun', 'beamer', 'rocket', 'cannon'];

function syncGodModeUI(){
  const tag = document.getElementById('godModeTag');
  if (!tag) return;
  tag.style.display = godMode ? 'inline-block' : 'none';
}

function currentBossLevel(){
  const interval = Math.max(1, CONFIG.BOSS?.INTERVAL_DIST ?? 5000);
  return Math.max(1, Math.floor((world.nextBossDist | 0) / interval));
}

function cycleWeapon(side){
  const p = world.player;
  if (!p || p.dead) return;
  const cur = p.weapons?.[side] ?? null;
  const idx = DEBUG_WEAPON_ORDER.indexOf(cur);
  const next = DEBUG_WEAPON_ORDER[(idx + 1 + DEBUG_WEAPON_ORDER.length) % DEBUG_WEAPON_ORDER.length];
  p.setWeapon?.(side, next);
}

function applyCosmeticUpgrade(){
  const p = world.player;
  if (!p || p.dead) return;
  p.addMediumRigMark?.();
}

function handleDebugHotkey(e){
  if (!e || e.repeat) return;
  const key = String(e.key || '').toLowerCase();
  if (key === 'g'){
    godMode = !godMode;
    if (godMode && world.player && !world.player.dead){
      const maxHp = Math.max(1, world.player.maxHp ?? 1);
      world.player.hp = maxHp;
      world.player.lastHp = maxHp;
      world.player.damageBucket = 0;
    }
    syncGodModeUI();
    e.preventDefault();
    return;
  }
  if (key === 'l'){
    cycleWeapon('left');
    e.preventDefault();
    return;
  }
  if (key === 'r'){
    cycleWeapon('right');
    e.preventDefault();
    return;
  }
  if (key === 'u'){
    applyCosmeticUpgrade();
    e.preventDefault();
  }
}

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
  // Keep floor generation active, but switch to full-width white floor.
  Tiles.setFullMode?.(true);
  Tiles.setGenerationEnabled?.(true);
}

function maybeAdvanceBossSequence(){
  if (!world.bossActive) return;

  if (bossPhase === 'clearing'){
    const clear = !IBS.hasActive?.() &&
      !Powerups.hasActive?.() &&
      !Turrets.hasActiveNonBoss?.();
    if (clear){
      HUD.showBossBanner?.('Boss Approaching', 1500);
      Bosses.startEncounter?.(currentBossLevel(), { fromTop: true });
      bossPhase = 'approach';
    }
    return;
  }

  if (bossPhase === 'approach'){
    const boss = Bosses.getStatus?.();
    if (boss?.entered){
      bossPhase = 'fight';
    }
    return;
  }

  if (bossPhase !== 'fight') return;
  if (Bosses.hasActiveBoss?.()) return;
  const interval = Math.max(1, CONFIG.BOSS?.INTERVAL_DIST ?? 5000);
  world.bossActive = false;
  world.spawnLocked = false;
  world.spawnScale = 0;
  bossPhase = 'none';
  Tiles.setFullMode?.(false);
  Tiles.setGenerationEnabled?.(true);
  world.nextBossDist = Math.max(
    ((world.nextBossDist | 0) + interval),
    ((world.dist | 0) + interval)
  );
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
    Bosses.update(dt); Bosses.draw(ctx);
    const boss = Bosses.getStatus?.();
    if (bossPhase === 'fight' && boss) HUD.setBossBar?.(boss.hp, boss.maxHp);
    else HUD.setBossBar?.(0, 1);
    if (godMode && player && !player.dead){
      const maxHp = Math.max(1, player.maxHp ?? 1);
      player.hp = maxHp;
      player.lastHp = maxHp;
      player.damageBucket = 0;
    }
    player.update(dt);
    if (!godMode && !player.dead && player.hp <= 0){
      player.destroy();
    }
    Projectiles.update(dt);
    player.draw(ctx);
    Projectiles.draw(ctx);
    Particles.update(dt); Particles.draw(ctx);
    IBS.drawBubbles?.(ctx);

    maybeAdvanceBossSequence();

    if (player.isDeathAnimDone?.()){
      gameOver('Your bot exploded!');
      return;
    }

    // fall check
    if (!godMode && !player.dead && !world.bossActive && !Tiles.isCleared?.() && !Tiles.isSafe(player.x, player.y)){
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
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Bosses.reset?.(); Particles.reset?.();

  player = new Player(); world.player = player;

  HUD.setRestartLabel('Restart ↻');
  HUD.hideSplash?.();
  HUD.hideGameOver?.();
  HUD.hideBossUI?.();
  HUD.setPowerKeyVisible?.(false);

  world.running = true;
  startRAF();
}

export function boot(){
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  loopSeq++;
  world.running = false; world.dist = 0; world.dy = 0; world.enemyDestroyed = 0; world.bossActive = false; world.nextBossDist = (CONFIG.BOSS?.INTERVAL_DIST ?? 5000); world.spawnLocked = false; world.spawnScale = 1; bossPhase = 'none'; lastT = 0;

  Background.reset?.(); Tiles.reset?.(); Tiles.regen?.(); IBS.reset?.();
  Projectiles.reset?.(); Powerups.reset?.(); Turrets.reset?.(); Bosses.reset?.(); Particles.reset?.();

  if (!player){ player = new Player(); world.player = player; }
  HUD.showSplash?.();
  HUD.hideGameOver?.();
  HUD.hideBossUI?.();
  HUD.setPowerKeyVisible?.(true);

  Background.draw(ctx);
  Tiles.draw(ctx);
  Powerups.draw(ctx);
  Turrets.draw(ctx);
  Bosses.draw(ctx);
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
  HUD.setPowerKeyVisible?.(true);
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
  syncGodModeUI();
  window.addEventListener('keydown', handleDebugHotkey);
  window.addEventListener('contextmenu', (e)=> e.preventDefault());
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
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle){
    const syncSoundLabel = () => {
      soundToggle.textContent = `Sound: ${SFX.isMuted?.() ? 'Off' : 'On'}`;
    };
    syncSoundLabel();
    soundToggle.addEventListener('click', (e)=>{
      e.preventDefault();
      SFX.toggleMuted?.();
      syncSoundLabel();
    });
  }
  const cvs = document.getElementById('game');
  if (cvs){
    cvs.addEventListener('mousedown', (e)=>{
      if (!world.player) return;
      if (e.button === 0) world.player.fire('left');
      if (e.button === 2) world.player.fire('right');
    });
  }
}
