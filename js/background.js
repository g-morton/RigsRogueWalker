import { CONFIG } from './config.js';
import { world } from './utils.js';

let y = 0;

export const Background = {
  reset(){ y = 0; },

  // Keep motion out of draw(); tie parallax to world scroll.
  update(dt){
    if (!bgImg) return;
    const h = bgImg.height * (world.w / bgImg.width);
    if (h <= 0) return;

    const ratio = (CONFIG.BACKGROUND?.PARALLAX_RATIO ?? 0.5);
    y = (y + (world.dy * ratio)) % h;
    if (y < 0) y += h;
  },

  draw(g){
    // plain background
    g.fillStyle = CONFIG.COLORS.BG;
    g.fillRect(0, 0, world.w, world.h);

    // Parallax city image support (optional)
    if (bgImg){
      const h = bgImg.height * (world.w / bgImg.width);
      for (let yy = -h; yy < world.h + h; yy += h){
        g.drawImage(bgImg, 0, yy + y, world.w, h);
      }
    }
  }
};

let bgImg = null;
(function preload(){
  const img = new Image();
  img.onload = () => { bgImg = img; };
  img.src = './assets/bg-city.jpg'; // if present
})();