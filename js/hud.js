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
    lastDist = -1;
    lastIBS = -1;
    lastEnemies = -1;
    this.hideGameOver();
    this.showSplash();
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
