import { CONFIG } from './config.js';

const INK = CONFIG.COLORS.INK;
const BG = CONFIG.COLORS.BG;
const RED = CONFIG.COLORS.ACCENT;

export const Theme = {
  // Tiles: draw white corridors (safe paths)
  drawTiles(g, rows){
    g.fillStyle = BG;
    for(const r of rows){
      for(const c of r.corridors){
        g.fillRect(c.x, r.y - r.h/2, c.w, r.h);
      }
    }
  },

  // Player + weapons visual
  drawPlayer(g, p){
    const P = CONFIG.PLAYER;

    // legs
    const legPhase = Math.sin(p.t * P.LEG_SPEED * Math.PI * 2);
    const baseLegY = Math.round(p.y + P.LEG_OFFSET_Y);
    const lift = Math.round(P.LEG_LIFT_Y * legPhase);
    const leftY = baseLegY - lift;
    const rightY = baseLegY + lift;
    const leftX = Math.round(p.x - P.LEG_OFFSET_X - P.LEG_W/2);
    const rightX = Math.round(p.x + P.LEG_OFFSET_X - P.LEG_W/2);

    g.fillStyle = INK;
    g.fillRect(leftX, leftY - P.LEG_H/2, P.LEG_W, P.LEG_H);
    g.fillRect(rightX, rightY - P.LEG_H/2, P.LEG_W, P.LEG_H);

    // torso + head + weapons (rotated)
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.angle);

    // torso: black with white outline
    g.fillStyle = INK;
    g.fillRect(-P.TORSO_W/2, -P.TORSO_H/2, P.TORSO_W, P.TORSO_H);
    //g.lineWidth = 2; g.strokeStyle = BG;
    //g.strokeRect(-P.TORSO_W/2+1, -P.TORSO_H/2+1, P.TORSO_W-2, P.TORSO_H-2);

    // head (bob)
    const headPhase = Math.sin(p.t * P.HEAD_BOB_SPEED * Math.PI * 2);
    const headX = P.HEAD_BOB_X * headPhase - P.HEAD/2;
    const headY = -P.TORSO_H/2 + P.HEAD_OFFSET_Y;
    g.fillStyle = INK;
    g.fillRect(headX, headY, P.HEAD, P.HEAD);

    // weapon mounts
    if (p.weapons.left)  drawWeapon(g, -P.MOUNT_OFFSET_X, P.MOUNT_OFFSET_Y, 'left', p.weapons.left);
    if (p.weapons.right) drawWeapon(g,  P.MOUNT_OFFSET_X, P.MOUNT_OFFSET_Y, 'right', p.weapons.right);

    g.restore();
  },

  drawProjectile(g, s){
    switch(s.type){
      case 'rifle':
      case 'cannon': {
        const r = s.r;
        g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI*2);
        g.fillStyle = INK; g.fill();
        g.lineWidth = 2; g.strokeStyle = BG; g.stroke();
        break;
      }
      case 'chaingun': {
        const v = Math.hypot(s.vx, s.vy) || 1;
        const nx = s.vx / v, ny = s.vy / v;
        const x2 = s.x + nx * s.len, y2 = s.y + ny * s.len;
        g.lineWidth = s.w + 2; g.strokeStyle = BG;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(x2, y2); g.stroke();
        g.lineWidth = s.w; g.strokeStyle = INK;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(x2, y2); g.stroke();
        break;
      }
      case 'rocket': {
        const v = Math.hypot(s.vx, s.vy) || 1;
        const nx = s.vx / v, ny = s.vy / v;
        const fx = s.x + nx * s.len, fy = s.y + ny * s.len;
        g.lineWidth = s.w + 2; g.strokeStyle = BG;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(fx, fy); g.stroke();
        g.lineWidth = s.w; g.strokeStyle = INK;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(fx, fy); g.stroke();
        if (s.trail && s.trail.length){
          for(const n of s.trail){
            g.save();
            g.globalAlpha = Math.max(0, Math.min(1, n.alpha));
            g.beginPath(); g.arc(n.x, n.y, n.r, 0, Math.PI*2);
            g.fillStyle = INK; g.fill();
            g.lineWidth = 1.5; g.strokeStyle = BG; g.stroke();
            g.restore();
          }
        }
        break;
      }
      default: break;
    }
  },

  drawTurret(g, t, size){
    g.save();
    g.translate(t.x, t.y);
    g.rotate(Math.PI/4);
    g.fillStyle = INK;
    g.fillRect(-size, -size, size*2, size*2);
    g.lineWidth = 2; g.strokeStyle = BG;
    g.strokeRect(-size+1, -size+1, size*2-2, size*2-2);
    g.restore();
  },

  drawEnemyBullet(g, s){
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI*2);
    g.fillStyle = RED; g.fill();
    g.lineWidth = 2; g.strokeStyle = BG; g.stroke();
  },

  drawPowerup(g, it, r){
    g.beginPath(); g.arc(it.x, it.y, r, 0, Math.PI*2);
    g.fillStyle = INK; g.fill();
    g.lineWidth = 2; g.strokeStyle = BG; g.stroke();

    const key = it.def.key;
    g.fillStyle = BG; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (key.includes('-')){
      const [side, code] = key.split('-');
      g.font = 'bold 12px monospace';
      g.fillText(side, it.x, it.y - 5);
      g.font = 'bold 13px monospace';
      g.fillText(code, it.x, it.y + 6);
    } else {
      g.font = 'bold 15px monospace';
      g.fillText(key, it.x, it.y + 1);
    }
  },

drawIBS(g, p, r){
  const INK = CONFIG.COLORS.INK;
  const A   = CONFIG.IBS.ANIM;

  // animation
  const phase = p.animT || 0;
  const sway  = (A.SWAY_DEG * Math.PI/180) * Math.sin(phase) * (p.swayMul || 1);
  const bob   = (A.BOB_PX * (p.bobMul || 1)) * Math.abs(Math.sin(phase));
  const legSwing = Math.sin(phase) * (r * 0.35);
  const armSwing = Math.sin(phase + Math.PI) * (r * 0.20);

  // body radius (slightly larger for nicer overlap)
  const R = r * 0.9;

  g.save();
  g.translate(p.x, p.y + bob);
  g.rotate(sway);
  g.fillStyle = INK;

  // --- LEGS (draw first, tucked under body) ---
  // anchor just below body center
  const legY = R * 0.15;
  const legW = r * 0.46;
  const legH = r * 0.55;

  // left leg (swings down when positive)
  g.fillRect(-R*0.55, legY + Math.max(0,  legSwing), legW, legH);
  // right leg
  g.fillRect( R*0.10, legY + Math.max(0, -legSwing), legW, legH);

  // --- BODY (on top of legs) ---
  g.beginPath();
  g.arc(0, 0, R * 0.8, 0, Math.PI*2);
  g.fill();

  // --- ARMS (draw last so they’re visible) ---
  // short outward “nubs” at sides
  const armY = -R * 0.9;       // slightly above center
  const armW = r * 0.30;
  const armH = r * 0.56;

  // left arm (tiny vertical swing)
  g.fillRect(-R*1.10, armY + armSwing*0.12, armW, armH);
  // right arm
  g.fillRect( R*0.40,  armY - armSwing*0.12, armW, armH);

  g.restore();

  // Optional speech bubble (unchanged)
  if (p.talk){
    g.save();
    g.fillStyle = CONFIG.COLORS.BG;
    g.strokeStyle = INK; g.lineWidth = 2;
    const txt = p.talk, pad = 6, w = Math.max(36, txt.length*7), h = 18;
    g.fillRect(p.x - w/2, p.y - r*2.1 - h, w, h);
    g.strokeRect(p.x - w/2, p.y - r*2.1 - h, w, h);
    g.fillStyle = INK; g.font = '12px monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, p.x, p.y - r*2.1 - h/2);
    g.restore();
  }
},




  drawSplat(g, s){
    // multiple overlapping red blobs with slight fade/expansion
    const t = Math.min(1, s.t / s.life);
    const alpha = 0.9 - t*1.5;

    g.save();
    g.globalAlpha = Math.max(0, alpha);

    // base smeared circle
    //g.beginPath();
    //g.arc(s.x, s.y, 8 + t*6, 0, Math.PI*2);
    //g.fillStyle = CONFIG.COLORS.ACCENT; g.fill();

    // blobs
    for (const b of (s.blobs || [])){
      g.beginPath();
      g.arc(b.x, b.y, b.r * (1.0 + t * 0.2), 0, Math.PI*2);
      g.fillStyle = CONFIG.COLORS.ACCENT;
      g.fill();
    }

    // optional thin white highlights to pop against pits
    g.globalAlpha *= 0.4;
    //g.lineWidth = 1.5; g.strokeStyle = CONFIG.COLORS.BG;
    //for (const b of (s.blobs || [])){
    //  g.beginPath();
    //  g.arc(b.x, b.y, Math.max(3, b.r*0.7), 0, Math.PI*2);
    //  g.stroke();
    //}

    g.restore();
  },


  drawParticle(g, p){
    const t = p.t / p.life;
    const alpha = Math.max(0, 1 - t);
    g.save();
    g.globalAlpha = alpha;

    if (p.type === 'spark'){
      g.beginPath(); g.arc(p.x, p.y, 2, 0, Math.PI*2);
      g.fillStyle = CONFIG.COLORS.ACCENT; g.fill();
      g.lineWidth = 1; g.strokeStyle = CONFIG.COLORS.BG; g.stroke();
    } else if (p.type === 'blood'){
      // pure red dots, no white halo
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      g.fillStyle = CONFIG.COLORS.ACCENT; g.fill();
    } else {
      // explosion
      g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI*2);
      g.fillStyle = CONFIG.COLORS.INK; g.fill();
      g.lineWidth = 2; g.strokeStyle = CONFIG.COLORS.ACCENT; g.stroke();
    }

    g.restore();
  },



};

// weapon visuals
function drawWeapon(g, ax, ay, side, type){
  const s = side === 'left' ? -1 : 1;
  g.save(); g.translate(ax, ay); g.scale(s,1);
  g.fillStyle = CONFIG.COLORS.INK;
  switch(type){
    case 'rifle':
      g.fillRect(-4, -14, 6, 30);
      g.fillRect(0, 4, 10, 10);
      break;
    case 'chaingun':
      g.fillRect(-2, -39, 12, 46);  // tall column
      g.fillRect(2, -42, 4, 6);    // tiny top nub
      g.fillRect(-4, 8, 18, 26);   // lower mass
      g.fillRect(4, 18, 18, 22);    // forward/right block
      g.fillRect(8, 40, 8, 4);    // little foot
      break;
    case 'cannon':
      g.fillRect(-4, -12, 22, 44); // main mass
      g.fillRect(-2, -18, 18, 4);   // forward protrusion
      g.fillRect(0, 30, 14, 4);     // base foot
      g.fillRect(18, -8, 4, 4); // vane 1
      g.fillRect(18, 20, 4, 4); // vane 1
      break;
    case 'rocket':
      g.fillRect(-5, -16, 10, 32);  // tube
      g.fillRect(-3, -20, 6, 6);    // tip
      g.fillRect(-3, 16, 6, 6);     // tail
      break;
  }
  g.restore();
}


