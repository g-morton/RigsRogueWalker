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

// Replace ONLY Theme.drawIBS with this version
drawIBS(g, p, r){
  // Top-down “running stick person”
  // Facing “north” (toward top of screen), with a subtle lean toward horizontal wander.
  const INK = CONFIG.COLORS.INK;
  const A   = CONFIG.IBS.ANIM;

  const phase = p.animT || 0;

  // Stride: legs + arms alternate. Bob: small vertical bounce.
  const stride = Math.sin(phase);
  const lift   = Math.abs(stride);

  const bob = (A.BOB_PX * (p.bobMul || 1)) * lift;

  // Very small yaw toward wander direction (keeps it top-down, not side-on)
  const yaw = (p.dir || 0) * 0.08;

  // Proportions derived from radius
  const headR = r * 0.32;
  const chestY = r * 0.05;
  const hipY  = r * 0.55;

  const shoulderW = r * 0.55;
  const hipW      = r * 0.45;

  // limb reach
  const armLen = r * 0.60;
  const legLen = r * 0.70;

  // limb angles (top-down: splayed V-shape)
  const armSplay = 0.85;
  const legSplay = 0.95;

  // forward/back swing (subtle from top-down)
  const armSwing = stride * r * 0.18;
  const legSwing = stride * r * 0.26;

  // line style
  const lw = Math.max(1.5, r * 0.14);

  g.save();
  g.translate(p.x, p.y + bob);
  g.rotate(yaw);

  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.fillStyle = INK;

  // Head slightly “ahead” to suggest facing up-screen
  const headY = -r * 0.55;
  g.beginPath();
  g.arc(0, headY, headR, 0, Math.PI * 2);
  g.fill();

  // Body spine
  g.beginPath();
  g.moveTo(0, headY + headR * 0.6);
  g.lineTo(0, hipY);
  g.stroke();

  // Shoulders / hips bars (helps top-down readability)
  g.beginPath();
  g.moveTo(-shoulderW * 0.5, chestY);
  g.lineTo( shoulderW * 0.5, chestY);
  g.stroke();

  g.beginPath();
  g.moveTo(-hipW * 0.5, hipY);
  g.lineTo( hipW * 0.5, hipY);
  g.stroke();

  // Arms (PANIC MODE — longer, wider, slower, more flail)

  const lShoulder = { x: -shoulderW * 0.5, y: chestY };
  const rShoulder = { x:  shoulderW * 0.5, y: chestY };

  // Slower base wave (closer to run speed)
  const baseWave = Math.sin(phase * 1.2);

  // Small personality offset so they don’t sync
  const jitter = Math.sin(phase * 2.1 + (p.x * 0.03)) * 0.4;

  const wave = baseWave + jitter;

  // Arms lifted up in panic
  const armLift = -r * 0.45;

  // Much wider lateral swing
  const lateralSwing = wave * r * 0.55;

  // Vertical waving (not too fast)
  const verticalSwing = wave * r * 0.35;

  const lHand = {
    x: lShoulder.x - armLen * 0.6 + lateralSwing,
    y: lShoulder.y + armLift + verticalSwing
  };

  const rHand = {
    x: rShoulder.x + armLen * 0.6 - lateralSwing,
    y: rShoulder.y + armLift - verticalSwing
  };

  // Elbow bend to keep them from looking rigid
  const lElbow = {
    x: (lShoulder.x + lHand.x) * 0.5 - r * 0.25,
    y: (lShoulder.y + lHand.y) * 0.5
  };

  const rElbow = {
    x: (rShoulder.x + rHand.x) * 0.5 + r * 0.25,
    y: (rShoulder.y + rHand.y) * 0.5
  };

  g.beginPath();
  g.moveTo(lShoulder.x, lShoulder.y);
  g.lineTo(lElbow.x, lElbow.y);
  g.lineTo(lHand.x, lHand.y);

  g.moveTo(rShoulder.x, rShoulder.y);
  g.lineTo(rElbow.x, rElbow.y);
  g.lineTo(rHand.x, rHand.y);
  g.stroke();



  // Legs (running V)
  const lHip = { x: -hipW * 0.5, y: hipY };
  const rHip = { x:  hipW * 0.5, y: hipY };

  const lLegF =  legSwing;
  const rLegF = -legSwing;

  const lFoot = {
    x: lHip.x - Math.cos(legSplay) * legLen,
    y: lHip.y + Math.sin(legSplay) * legLen + lLegF
  };
  const rFoot = {
    x: rHip.x + Math.cos(legSplay) * legLen,
    y: rHip.y + Math.sin(legSplay) * legLen + rLegF
  };

  g.beginPath();
  g.moveTo(lHip.x, lHip.y);
  g.lineTo(lFoot.x, lFoot.y);
  g.moveTo(rHip.x, rHip.y);
  g.lineTo(rFoot.x, rFoot.y);
  g.stroke();

  // Tiny foot taps
  const footW = r * 0.14;
  g.beginPath();
  g.moveTo(lFoot.x - footW, lFoot.y);
  g.lineTo(lFoot.x + footW, lFoot.y);
  g.moveTo(rFoot.x - footW, rFoot.y);
  g.lineTo(rFoot.x + footW, rFoot.y);
  g.stroke();

  g.restore();

  // Speech bubble (kept compatible with your existing p.talk)
  if (p.talk){
    g.save();

    const txt = p.talk;
    const paddingX = 10;
    const paddingY = 6;

    g.font = '12px monospace';
    const textW = g.measureText(txt).width;
    const w = textW + paddingX * 2;
    const h = 14 + paddingY * 2;

    const bx = p.x - w/2;
    const by = p.y - r*2.2 - h;

    const radius = 8;

    // --- Rounded rectangle ---
    g.beginPath();
    g.moveTo(bx + radius, by);
    g.lineTo(bx + w - radius, by);
    g.quadraticCurveTo(bx + w, by, bx + w, by + radius);
    g.lineTo(bx + w, by + h - radius);
    g.quadraticCurveTo(bx + w, by + h, bx + w - radius, by + h);
    g.lineTo(bx + radius, by + h);
    g.quadraticCurveTo(bx, by + h, bx, by + h - radius);
    g.lineTo(bx, by + radius);
    g.quadraticCurveTo(bx, by, bx + radius, by);
    g.closePath();

    g.fillStyle = CONFIG.COLORS.BG;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();

    // --- Text ---
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(txt, p.x, by + h/2 + 1);

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


