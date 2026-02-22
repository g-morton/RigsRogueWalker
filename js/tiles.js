import { CONFIG } from './config.js';
import { world } from './utils.js';
import { Theme } from './theme.js';

const rows = []; // each row: { y, h, corridors:[{x,w},{x,w}] }

function newRow(y, full=false){
  const h = CONFIG.TILE.H;
  if (full){
    rows.push({ y, h, corridors:[{x:0, w:world.w}] });
    return;
  }
  const gap = Math.round(CONFIG.TILE.GAP_MIN + Math.random()*(CONFIG.TILE.GAP_MAX - CONFIG.TILE.GAP_MIN));
  const w1 = Math.round(CONFIG.TILE.PATH_W_MIN + Math.random()*(CONFIG.TILE.PATH_W_MAX - CONFIG.TILE.PATH_W_MIN));
  const w2 = Math.round(CONFIG.TILE.PATH_W_MIN + Math.random()*(CONFIG.TILE.PATH_W_MAX - CONFIG.TILE.PATH_W_MIN));
  const total = w1 + gap + w2;
  let start = Math.round(Math.random() * Math.max(0, world.w - total));
  const c1 = { x:start,        w:w1 };
  const c2 = { x:start + w1 + gap, w:w2 };
  rows.push({ y, h, corridors:[c1, c2] });
}

  function topMostY(){
    // the last element has the smallest y (top-most) because we seed bottom→top
    return rows.length ? rows[rows.length - 1].y : world.h;
  }

export const Tiles = {
  reset(){
    rows.length = 0;
  },
  regen(){
    rows.length = 0;
    // Seed rows from bottom up so that last element is top-most offscreen
    let y = world.h + CONFIG.TILE.H/2;
    for (let i=0;i<20;i++){
      const full = i < CONFIG.TILE.START_SAFE_ROWS;
      newRow(y, full);
      y -= CONFIG.TILE.H;
    }
  },
  update(){
    // scroll rows downward
    for(const r of rows){ r.y += world.scroll; }

    // remove off-screen rows at bottom
    while (rows.length && rows[0].y - rows[0].h/2 > world.h + 4){
      rows.shift();
    }
    // add rows at top as needed
    let guard = 0;
    while (topMostY() > -CONFIG.TILE.H/2 && guard++ < 200){
      newRow(topMostY() - CONFIG.TILE.H);
    }
  },
  draw(g){
    Theme.drawTiles(g, rows);
  },
  isSafe(px, py){
    for (const r of rows){
      if (py >= r.y - r.h/2 && py <= r.y + r.h/2){
        for(const c of r.corridors){
          if (px >= c.x && px <= c.x + c.w) return true;
        }
        return false;
      }
    }
    return false;
  },
  debugRows: rows
};
