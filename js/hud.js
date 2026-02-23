// js/hud.js
// Small DOM-only module: keeps UI concerns out of engine systems.

import { world } from './utils.js';

let elDist = null;
let elIBS = null;
let elRestart = null;

let lastDist = -1;
let lastIBS = -1;

export const HUD = {
  init(){
    elDist = document.getElementById('scoreDist');
    elIBS = document.getElementById('scoreIBS');
    elRestart = document.getElementById('restart');
    lastDist = -1;
    lastIBS = -1;
  },

  setRestartLabel(text){
    if (elRestart) elRestart.textContent = text;
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
  }
};