// js/hud.js
// Small DOM-only module: keeps UI concerns out of engine systems.

import { world } from './utils.js';

const BEST_SCORE_KEY = 'rrw_best_score_v1';

let elScoreNow = null;
let elScoreBest = null;
let elDistNow = null;
let elLevelNow = null;
let elPlayerHpFill = null;
let elPlayerHpValue = null;
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

let lastPlayerBarRatio = -1;
let lastScoreNow = -1;
let lastDistNow = -1;
let lastLevelNow = -1;
let bestScore = 0;

function computeScore(){
  const distance = (world.dist | 0);
  const enemies = (world.enemyDestroyed | 0);
  const ibs = (world.ibsHit | 0);
  return Math.max(0, Math.round(distance * 0.55 + enemies * 160 - ibs * 120));
}

function loadBestScore(){
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const val = Number(raw);
    return Number.isFinite(val) && val > 0 ? (val | 0) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(v){
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(v | 0));
  } catch {}
}

export const HUD = {
  init(){
    elScoreNow = document.getElementById('scoreNow');
    elScoreBest = document.getElementById('scoreBest');
    elDistNow = document.getElementById('distNow');
    elLevelNow = document.getElementById('levelNow');
    elPlayerHpFill = document.getElementById('playerHpFill');
    elPlayerHpValue = document.getElementById('playerHpValue');
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
    lastScoreNow = -1;
    lastDistNow = -1;
    lastLevelNow = -1;
    bestScore = loadBestScore();
    if (elScoreBest) elScoreBest.textContent = String(bestScore);
    lastPlayerBarRatio = -1;
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
        `Distance: ${payload.distance | 0}  |  Enemies: ${payload.enemies | 0}  |  IBS: ${payload.ibs | 0}  |  Best: ${bestScore | 0}`;
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
    if (elPlayerHpFill) elPlayerHpFill.style.width = '100%';
    lastPlayerBarRatio = -1;
  },

  setPowerKeyVisible(visible){
    if (!elPowerKey) return;
    elPowerKey.style.display = visible ? 'block' : 'none';
  },

  // Call once per frame (cheap, only writes when values change)
  tick(){
    const score = computeScore();
    if (elScoreNow && score !== lastScoreNow){
      elScoreNow.textContent = String(score);
      lastScoreNow = score;
    }
    if (score > bestScore){
      bestScore = score;
      saveBestScore(bestScore);
      if (elScoreBest) elScoreBest.textContent = String(bestScore);
    }
    const dist = (world.dist | 0);
    if (elDistNow && dist !== lastDistNow){
      elDistNow.textContent = String(dist);
      lastDistNow = dist;
    }
    const level = Math.max(1, world.level | 0);
    if (elLevelNow && level !== lastLevelNow){
      elLevelNow.textContent = String(level);
      lastLevelNow = level;
    }

    const p = world.player;
    if (p && !p.dead){
      const max = Math.max(1, p.maxHp ?? 1);
      const cur = Math.max(0, p.hp ?? 0);
      const ratio = Math.max(0, Math.min(1, cur / max));
      if (elPlayerHpFill && Math.abs(ratio - lastPlayerBarRatio) > 0.001){
        elPlayerHpFill.style.width = `${(ratio * 100).toFixed(1)}%`;
        lastPlayerBarRatio = ratio;
      }
      if (elPlayerHpValue) elPlayerHpValue.textContent = `HP ${Math.round(cur)}/${Math.round(max)}`;
    } else {
      if (elPlayerHpFill) elPlayerHpFill.style.width = '100%';
      if (elPlayerHpValue) elPlayerHpValue.textContent = 'HP 0/0';
      lastPlayerBarRatio = -1;
    }
  }
};
