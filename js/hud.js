// js/hud.js
// Small DOM-only module: keeps UI concerns out of engine systems.

import { world } from './utils.js';

let elDist = null;
let elIBS = null;
let elEnemies = null;
let elRestart = null;
let elGameOver = null;
let elGoTitle = null;
let elGoReason = null;
let elGoScore = null;
let elGoMsg = null;
let elGoStats = null;
let elSplash = null;
let elBossHud = null;
let elBossBarFill = null;
let elBossBanner = null;
let elPowerKey = null;
let bossBannerTimer = null;

let lastDist = -1;
let lastIBS = -1;
let lastEnemies = -1;

export const HUD = {
  init(){
    elDist = document.getElementById('scoreDist');
    elIBS = document.getElementById('scoreIBS');
    elEnemies = document.getElementById('scoreEnemies');
    elRestart = document.getElementById('restart');
    elGameOver = document.getElementById('gameOver');
    elGoTitle = document.getElementById('gameOverTitle');
    elGoReason = document.getElementById('gameOverReason');
    elGoScore = document.getElementById('gameOverScore');
    elGoMsg = document.getElementById('gameOverMsg');
    elGoStats = document.getElementById('gameOverStats');
    elSplash = document.getElementById('splash');
    elBossHud = document.getElementById('bossHud');
    elBossBarFill = document.getElementById('bossBarFill');
    elBossBanner = document.getElementById('bossBanner');
    elPowerKey = document.getElementById('powerKey');
    lastDist = -1;
    lastIBS = -1;
    lastEnemies = -1;
    this.hideGameOver();
    this.showSplash();
    this.hideBossUI();
  },

  setRestartLabel(text){
    if (elRestart) elRestart.textContent = text;
  },

  showGameOver(payload){
    if (!payload) return;
    if (elGoTitle) elGoTitle.textContent = payload.title || 'Game Over';
    if (elGoReason) elGoReason.textContent = payload.reason || '';
    if (elGoScore) elGoScore.textContent = `Score: ${payload.score | 0}`;
    if (elGoMsg) elGoMsg.textContent = payload.message || '';
    if (elGoStats){
      elGoStats.textContent =
        `Distance: ${payload.distance | 0}  |  Enemies: ${payload.enemies | 0}  |  IBS: ${payload.ibs | 0}`;
    }
    if (elGameOver) elGameOver.style.display = 'flex';
  },

  hideGameOver(){
    if (elGameOver) elGameOver.style.display = 'none';
  },

  showSplash(){
    if (elSplash) elSplash.style.display = 'flex';
  },

  hideSplash(){
    if (elSplash) elSplash.style.display = 'none';
  },

  showBossBanner(text = 'Boss Approaching', ms = 1800){
    if (!elBossBanner) return;
    if (bossBannerTimer){
      clearTimeout(bossBannerTimer);
      bossBannerTimer = null;
    }
    elBossBanner.textContent = text;
    elBossBanner.style.display = 'block';
    bossBannerTimer = setTimeout(() => {
      if (elBossBanner) elBossBanner.style.display = 'none';
      bossBannerTimer = null;
    }, Math.max(0, ms | 0));
  },

  setBossBar(hp, maxHp){
    const max = Math.max(1, maxHp ?? 1);
    const cur = Math.max(0, hp ?? 0);
    const ratio = Math.max(0, Math.min(1, cur / max));
    if (elBossHud) elBossHud.style.display = ratio > 0 ? 'block' : 'none';
    if (elBossBarFill) elBossBarFill.style.width = `${(ratio * 100).toFixed(1)}%`;
  },

  hideBossUI(){
    if (bossBannerTimer){
      clearTimeout(bossBannerTimer);
      bossBannerTimer = null;
    }
    if (elBossBanner) elBossBanner.style.display = 'none';
    if (elBossHud) elBossHud.style.display = 'none';
    if (elBossBarFill) elBossBarFill.style.width = '100%';
  },

  setPowerKeyVisible(visible){
    if (!elPowerKey) return;
    elPowerKey.style.display = visible ? 'block' : 'none';
  },

  // Call once per frame (cheap, only writes when values change)
  tick(){
    const d = (world.dist | 0);
    if (elDist && d !== lastDist){
      elDist.textContent = d;
      lastDist = d;
    }

    const i = (world.ibsHit | 0);
    if (elIBS && i !== lastIBS){
      elIBS.textContent = i;
      lastIBS = i;
    }

    const e = (world.enemyDestroyed | 0);
    if (elEnemies && e !== lastEnemies){
      elEnemies.textContent = e;
      lastEnemies = e;
    }
  }
};
