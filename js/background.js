import { CONFIG } from './config.js';
import { ctx, world } from './utils.js';

let y = 0;

export const Background = {
  reset(){
    y = 0;
  },
  draw(g){
    // plain white background – city image can be added here if needed
    g.fillStyle = CONFIG.COLORS.BG;
    g.fillRect(0,0, world.w, world.h);

    // Parallax city image support (optional)
    if (bgImg){
      const h = bgImg.height * (world.w / bgImg.width);
      // scroll downward slowly; show only in pits since tiles overwrite with white
      y = (y + 0.5) % h;
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
