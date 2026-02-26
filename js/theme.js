import { CONFIG } from './config.js';

const INK = CONFIG.COLORS.INK;
const BG = CONFIG.COLORS.BG;
const RED = CONFIG.COLORS.ACCENT;
const BLUE = CONFIG.COLORS.ENEMY;
const SMOKE = CONFIG.COLORS.SMOKE;
const TILE = '#e6e6e6';

export const Theme = {
  // Tiles: draw light-gray corridors (safe paths)
  drawTiles(g, rows){
    g.fillStyle = TILE;
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

    drawRigMarks(g, p);

    // weapon mounts
    if (p.weapons.left){
      const heatL = p.chaingun?.left?.heat ?? 0;
      drawWeapon(g, -P.MOUNT_OFFSET_X, P.MOUNT_OFFSET_Y, 'left', p.weapons.left, heatL);
    }
    if (p.weapons.right){
      const heatR = p.chaingun?.right?.heat ?? 0;
      drawWeapon(g,  P.MOUNT_OFFSET_X, P.MOUNT_OFFSET_Y, 'right', p.weapons.right, heatR);
    }

    g.restore();
  },

  drawProjectile(g, s){
    switch(s.type){
      case 'rifle':
      case 'longrifle':
      case 'shotgun':
      case 'heavyshotgun':
      case 'cannon': {
        const r = s.r;
        g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI*2);
        g.fillStyle = INK; g.fill();
        g.lineWidth = 2; g.strokeStyle = BG; g.stroke();
        break;
      }
      case 'chaingun':
      case 'chaincannon': {
        const v = Math.hypot(s.vx, s.vy) || 1;
        const nx = s.vx / v, ny = s.vy / v;
        const x2 = s.x + nx * s.len, y2 = s.y + ny * s.len;
        g.lineWidth = s.w + 2; g.strokeStyle = BG;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(x2, y2); g.stroke();
        g.lineWidth = s.w; g.strokeStyle = INK;
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(x2, y2); g.stroke();
        break;
      }
      case 'rocket':
      case 'rocketpod': {
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
    // Muzzle marker: projectile origin.
    g.beginPath();
    g.arc(0, 0, Math.max(2.5, size * 0.22), 0, Math.PI * 2);
    g.lineWidth = Math.max(1.4, size * 0.12);
    g.strokeStyle = BG;
    g.stroke();
    g.restore();
  },

  drawBeam(g, b){
    const t = b.t / Math.max(0.001, b.life);
    const nearFrac = Math.max(0.05, Math.min(0.85, b.nearFrac ?? 0.25));
    const fade = Math.max(0, 1 - t);
    const alpha = fade * (0.72 + Math.random() * 0.45);
    const dx = b.x2 - b.x1;
    const dy = b.y2 - b.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const hx = b.x1 + dx * nearFrac;
    const hy = b.y1 + dy * nearFrac;
    const tailStart = Math.max(0.06, nearFrac);
    const tx = b.x1 + dx * tailStart;
    const ty = b.y1 + dy * tailStart;
    const arcEndK = Math.min(1, nearFrac + 0.05);
    const ax2 = b.x1 + dx * arcEndK;
    const ay2 = b.y1 + dy * arcEndK;

    g.save();
    g.globalAlpha = alpha;
    g.lineCap = 'round';

    // Core beam, split into strong near segment and faded tail segment.
    g.strokeStyle = 'rgba(42,102,255,0.40)';
    g.lineWidth = 15.5;
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(tx, ty);
    g.stroke();
    g.strokeStyle = 'rgba(42,102,255,0.04)';
    g.lineWidth = 6.6;
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(b.x2, b.y2);
    g.stroke();

    g.strokeStyle = 'rgba(255,255,255,0.44)';
    g.lineWidth = 10.5;
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(tx, ty);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(b.x2, b.y2);
    g.stroke();

    g.strokeStyle = 'rgba(255,255,255,0.98)';
    g.lineWidth = 5.4;
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(tx, ty);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(b.x2, b.y2);
    g.stroke();

    // The first section is intentionally heavier to telegraph max damage.
    g.strokeStyle = 'rgba(255,255,255,0.78)';
    g.lineWidth = 8.2;
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(hx, hy);
    g.stroke();

    g.strokeStyle = 'rgba(42,102,255,0.62)';
    g.lineWidth = 11.8;
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(hx, hy);
    g.stroke();

    // Side crackles near muzzle (wide here, then quickly taper).
    const muzzleArcs = 7 + ((Math.random() * 4) | 0);
    for (let j = 0; j < muzzleArcs; j++){
      const k0 = Math.random() * Math.max(0.02, arcEndK - 0.02);
      const side = Math.random() < 0.5 ? -1 : 1;
      const startEdgeJitter = (Math.random() * 2 - 1) * 4.5;
      const sx = b.x1 + dx * k0 + nx * side * startEdgeJitter;
      const sy = b.y1 + dy * k0 + ny * side * startEdgeJitter;
      const lenSide = 20 + Math.random() * 24;
      const lenForward = 2 + Math.random() * 8;
      const mx = sx + nx * side * lenSide * 0.42 + dx * lenForward * 0.25;
      const my = sy + ny * side * lenSide * 0.42 + dy * lenForward * 0.25;
      const ex = sx + nx * side * lenSide + dx * lenForward;
      const ey = sy + ny * side * lenSide + dy * lenForward;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(mx, my);
      g.lineTo(ex, ey);
      g.strokeStyle = 'rgba(42,102,255,0.98)';
      g.lineWidth = 3.0 + Math.random() * 1.2;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.96)';
      g.lineWidth = 1.2 + Math.random() * 0.8;
      g.stroke();
    }

    // Main lightning filaments: widest at muzzle, but constrained to the effective range window.
    const arcs = Math.max(1, b.arcs ?? 3);
    const wildness = Math.max(6, b.jitter ?? 8) * (1.1 + Math.random() * 0.9);
    for (let j = 0; j < arcs; j++){
      const points = 10 + ((Math.random() * 8) | 0);
      const phase = b.t * 30 + j * 1.7;
      const arcStartK = Math.random() * Math.max(0.04, arcEndK * 0.45);
      const arcStartEdge = (Math.random() * 2 - 1) * 3.6;
      g.beginPath();
      for (let i = 0; i <= points; i++){
        const k = arcStartK + (arcEndK - arcStartK) * (i / points);
        const tailT = k <= nearFrac ? 0 : (k - nearFrac) / Math.max(1e-6, 1 - nearFrac);
        const px = b.x1 + dx * k;
        const py = b.y1 + dy * k;
        const pulse = 0.6 + Math.abs(Math.sin(phase + k * 14.5));
        const startWide = Math.pow(1 - k, 0.72);      // high near muzzle
        const nearWindow = Math.max(0, 1 - (k / Math.max(0.08, nearFrac))); // extra wide in optimal range
        const tailFade = 1 - tailT * 0.78;
        const fan = (0.18 + 1.05 * startWide + 0.85 * nearWindow) * Math.max(0.14, tailFade);
        const jmag = ((Math.random() - 0.5) * wildness * pulse * fan) + (arcStartEdge * (1 - i / points));
        const x = px + nx * jmag;
        const y = py + ny * jmag;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);

        if (i > 0 && i < points && Math.random() < (0.22 * (1 - k) + 0.03) * (1 - tailT * 0.8)){
          const branchLen = 6 + Math.random() * 18;
          const branchSign = Math.random() < 0.5 ? -1 : 1;
          const bx = x + nx * branchSign * branchLen + dx * (Math.random() - 0.5) * 0.04;
          const by = y + ny * branchSign * branchLen + dy * (Math.random() - 0.5) * 0.04;
          g.moveTo(x, y);
          g.lineTo(bx, by);
          g.moveTo(x, y);
        }
      }
      // Blue outer filament with white hot center for contrast.
      g.strokeStyle = 'rgba(42,102,255,0.74)';
      g.lineWidth = 1.9 + Math.random() * 1.5;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.88)';
      g.lineWidth = 1.0 + Math.random() * 1.0;
      g.stroke();
    }

    // Hard visual cue for power drop: faint tail after arc/falloff zone.
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 2.0;
    g.beginPath();
    g.moveTo(ax2, ay2);
    g.lineTo(b.x2, b.y2);
    g.stroke();

    g.restore();
  },

  drawFloatBoss(g, b){
    g.save();
    g.translate(b.x, b.y);

    // Off-center rectangular shadow matching hull footprint size.
    g.save();
    g.translate((b.shadowOffsetX || 0) * 1.15, (b.h || 60) * 0.80);
    const sw = (b.w || 120) * 1.08;
    const sh = (b.h || 70) * 1.08;
    g.scale(1.0, 1.0);
    g.filter = 'blur(8px)';
    g.fillStyle = 'rgba(90,90,90,0.45)';
    g.fillRect(-sw * 0.5, -sh * 0.5, sw, sh);
    g.restore();
    g.filter = 'none';

    // Main hull.
    const hw = (b.w || 120) * 0.5;
    const hh = (b.h || 70) * 0.5;
    g.fillStyle = INK;
    g.fillRect(-hw, -hh, hw * 2, hh * 2);
    g.lineWidth = 2;
    g.strokeStyle = BG;
    g.strokeRect(-hw + 1, -hh + 1, hw * 2 - 2, hh * 2 - 2);

    // Panel lines + rivet dots to break up large flat surfaces.
    g.lineWidth = 1;
    g.strokeStyle = BG;
    g.beginPath();
    g.moveTo(-hw * 0.75, -hh * 0.1);
    g.lineTo(hw * 0.75, -hh * 0.1);
    g.moveTo(-hw * 0.65, hh * 0.28);
    g.lineTo(hw * 0.65, hh * 0.28);
    g.stroke();
    for (let i = 0; i < 7; i++){
      const rx = -hw * 0.75 + (i / 6) * hw * 1.5;
      g.beginPath();
      g.arc(rx, -hh * 0.44, 1.2, 0, Math.PI * 2);
      g.fillStyle = BG;
      g.fill();
    }

    // Random primitive add-ons.
    for (const d of (b.deco || [])){
      if (d.kind === 'rect'){
        g.fillStyle = INK;
        g.fillRect(d.ox - d.w/2, d.oy - d.h/2, d.w, d.h);
        g.lineWidth = 1.2;
        g.strokeStyle = BG;
        g.strokeRect(d.ox - d.w/2, d.oy - d.h/2, d.w, d.h);
      } else if (d.kind === 'antenna'){
        g.lineWidth = 2;
        g.strokeStyle = INK;
        g.beginPath();
        g.moveTo(d.ox, d.oy);
        g.lineTo(d.ox, d.oy - d.len);
        g.stroke();
        g.beginPath();
        g.arc(d.ox, d.oy - d.len, 2.3, 0, Math.PI * 2);
        g.fillStyle = BG;
        g.fill();
      } else if (d.kind === 'pod'){
        g.beginPath();
        g.arc(d.ox, d.oy, d.r, 0, Math.PI * 2);
        g.fillStyle = INK;
        g.fill();
        g.lineWidth = 1.2;
        g.strokeStyle = BG;
        g.stroke();
      } else if (d.kind === 'slot'){
        g.fillStyle = BG;
        g.fillRect(d.ox - d.w/2, d.oy - d.h/2, d.w, d.h);
      }
    }

    // Mount turrets and muzzle ports.
    for (const m of (b.mounts || [])){
      if (!m.alive){
        g.beginPath();
        g.arc(m.ox, m.oy, 2.2, 0, Math.PI * 2);
        g.fillStyle = BG;
        g.fill();
        continue;
      }
      g.save();
      g.translate(m.ox, m.oy);
      g.rotate(Math.PI/4);
      const s = m.size || 6;
      g.fillStyle = INK;
      g.fillRect(-s, -s, s*2, s*2);
      g.lineWidth = 1.4;
      g.strokeStyle = BG;
      g.strokeRect(-s + 0.8, -s + 0.8, s*2 - 1.6, s*2 - 1.6);
      g.restore();
      g.beginPath();
      g.arc(m.ox, m.oy, Math.max(1.8, (m.size || 6) * 0.32), 0, Math.PI * 2);
      g.fillStyle = BG;
      g.fill();
    }

    g.restore();
  },

  drawEnemyBullet(g, s){
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI*2);
    g.fillStyle = BLUE; g.fill();
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
},

drawIBSBubble(g, p, r){
  if (!p.talk) return;

  g.save();

  const txt = p.talk;
  const paddingX = 10;
  const paddingY = 6;

  g.font = '12px monospace';
  const textW = g.measureText(txt).width;
  const w = textW + paddingX * 2;
  const h = 14 + paddingY * 2;

  const bx = p.x - w / 2;
  const by = p.y - r * 2.2 - h;
  const radius = 8;

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

  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(txt, p.x, by + h / 2 + 1);

  g.restore();
},




  drawSplat(g, s){
    // multiple overlapping red blobs with slight fade/expansion
    const t = Math.min(1, s.t / s.life);
    const alpha = 0.9 - t*1.5;

    g.save();
    g.globalAlpha = Math.max(0, alpha);

    if (s.mode === 'smear' && s.smear){
      const sm = s.smear;
      g.save();
      g.translate(s.x, s.y);
      g.rotate(sm.rot || 0);
      g.fillStyle = CONFIG.COLORS.ACCENT;
      g.beginPath();
      g.ellipse(0, 0, sm.len * (1.0 + t * 0.12), sm.width * (1.0 + t * 0.08), 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.globalAlpha *= 0.85;
    }

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

    if (p.type === 'blood'){
      // pure red dots, no white halo
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      g.fillStyle = CONFIG.COLORS.ACCENT; g.fill();
    } else if (p.type === 'playerShot'){
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      g.fillStyle = INK; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = BG; g.stroke();
    } else if (p.type === 'enemyShot'){
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      g.fillStyle = BLUE; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = BG; g.stroke();
    } else if (p.type === 'warnSpark'){
      g.beginPath(); g.arc(p.x, p.y, 1.8, 0, Math.PI*2);
      g.fillStyle = INK; g.fill();
      g.lineWidth = 1; g.strokeStyle = BG; g.stroke();
    } else if (p.type === 'smoke'){
      g.beginPath(); g.arc(p.x, p.y, 4.8, 0, Math.PI*2);
      g.fillStyle = SMOKE; g.fill();
    } else if (p.type === 'botPart'){
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle || 0);
      const w = p.w || 8;
      const h = p.h || 6;
      g.fillStyle = INK;
      g.fillRect(-w/2, -h/2, w, h);
      g.lineWidth = 1.2;
      g.strokeStyle = BG;
      g.strokeRect(-w/2, -h/2, w, h);
      g.restore();
    } else if (p.type === 'shell'){
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle || 0);
      const w = p.w || 5;
      const h = p.h || 2.6;
      g.fillStyle = '#b58a3c';
      g.fillRect(-w/2, -h/2, w, h);
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.strokeRect(-w/2, -h/2, w, h);
      g.restore();
    } else if (p.type === 'pickupGlow'){
      const rr = 10 + t * 20;
      g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI*2);
      g.fillStyle = BG; g.fill();
      g.beginPath(); g.arc(p.x, p.y, rr * 0.42, 0, Math.PI*2);
      g.fillStyle = INK; g.fill();
    } else if (p.type === 'pickupRing'){
      const t2 = p.t / Math.max(0.001, p.life);
      const rr = (p.r0 ?? 4) + ((p.r1 ?? 28) - (p.r0 ?? 4)) * t2;
      g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI*2);
      g.lineWidth = 2.3;
      g.strokeStyle = BG;
      g.stroke();
      g.beginPath(); g.arc(p.x, p.y, Math.max(0, rr - 2), 0, Math.PI*2);
      g.lineWidth = 1.1;
      g.strokeStyle = INK;
      g.stroke();
    } else if (p.type === 'pickupShard'){
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle || 0);
      const w = p.w || 4;
      const h = p.h || 1.8;
      g.fillStyle = BG;
      g.fillRect(-w/2, -h/2, w, h);
      g.lineWidth = 0.9;
      g.strokeStyle = INK;
      g.strokeRect(-w/2, -h/2, w, h);
      g.restore();
    } else if (p.type === 'pickupFlash'){
      const t2 = p.t / Math.max(0.001, p.life);
      const rr = 2 + t2 * 8;
      g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI*2);
      g.strokeStyle = BG;
      g.lineWidth = 1.6;
      g.stroke();
      g.beginPath(); g.arc(p.x, p.y, 1.6, 0, Math.PI*2);
      g.fillStyle = BG;
      g.fill();
    } else if (p.type === 'damage' || p.type === 'explosion'){
      g.beginPath(); g.arc(p.x, p.y, 1.5, 0, Math.PI*2);
      g.fillStyle = INK; g.fill();
    } else {
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      g.fillStyle = INK; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = BG; g.stroke();
    }

    g.restore();
  },



};

function drawRigMarks(g, p){
  const marks = p.rigMarks;
  if (!Array.isArray(marks) || !marks.length) return;
  for (const m of marks){
    if (m.group !== 'protrusion') continue;
    drawRigProtrusion(g, m);
  }
}

function drawRigProtrusion(g, m){
  const ox = m.ox ?? 0;
  const oy = m.oy ?? 0;
  const size = m.size ?? 1;
  const rot = m.rot ?? 0;
  g.save();
  g.translate(ox, oy);
  g.rotate(rot);
  g.fillStyle = INK;
  g.strokeStyle = BG;
  if (m.kind === 'mast_orb'){
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-0.2 * size, -0.1 * size);
    g.lineTo(14.6 * size, -0.1 * size);
    g.moveTo(2.8 * size, -1.9 * size);
    g.lineTo(12.8 * size, -1.9 * size);
    g.lineWidth = 3.2;
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 1.9;
    g.stroke();
    g.strokeStyle = BG;
    g.beginPath();
    g.arc(17.4 * size, 0, 1.15 + size * 0.36, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 0.9;
    g.stroke();
  } else if (m.kind === 'u_shroud'){
    const w = 7.8 * size, h = 5.9 * size;
    g.fillRect(-w * 0.5, -h * 0.5, w, h * 0.34);
    g.fillRect(-w * 0.5, -h * 0.5, w * 0.21, h);
    g.fillRect(w * 0.29, -h * 0.5, w * 0.21, h);
    g.lineWidth = 0.95;
    g.strokeRect(-w * 0.5, -h * 0.5, w, h);
  } else if (m.kind === 'orbital_pod'){
    g.beginPath();
    g.arc(1.6 * size, -0.45 * size, 2.65 * size, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(4.35 * size, 1.35 * size, 1.45 * size, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 1.0;
    g.strokeStyle = BG;
    g.stroke();
  } else if (m.kind === 'l_bracket'){
    g.fillRect(-0.75 * size, -3.1 * size, 1.8 * size, 7.6 * size);
    g.fillRect(-1.9 * size, 2.45 * size, 3.0 * size, 1.9 * size);
    g.lineWidth = 0.95;
    g.strokeRect(-1.9 * size, -3.1 * size, 3.0 * size, 7.45 * size);
  } else if (m.kind === 'ribbed_pack'){
    const w = 4.9 * size, h = 8.9 * size;
    g.fillRect(-w * 0.5, -h * 0.5, w, h);
    g.fillRect(-w * 0.76, -h * 0.24, 1.25 * size, 1.8 * size);
    g.fillRect(w * 0.50, -h * 0.24, 1.25 * size, 1.8 * size);
    g.fillRect(-w * 0.76, h * 0.06, 1.25 * size, 1.8 * size);
    g.fillRect(w * 0.50, h * 0.06, 1.25 * size, 1.8 * size);
    g.lineWidth = 0.9;
    g.strokeRect(-w * 0.76, -h * 0.5, w + (w * 0.52), h);
  } else if (m.kind === 'capsule_cell'){
    const w = 3.6 * size, h = 8.3 * size;
    g.fillRect(-w * 0.5, -h * 0.36, w, h * 0.72);
    g.beginPath();
    g.arc(0, -h * 0.36, w * 0.5, Math.PI, 0);
    g.arc(0, h * 0.36, w * 0.5, 0, Math.PI);
    g.closePath();
    g.fill();
    g.lineWidth = 0.85;
    g.strokeStyle = BG;
    g.beginPath();
    g.moveTo(-w * 0.46, -h * 0.2);
    g.lineTo(w * 0.46, -h * 0.2);
    g.moveTo(-w * 0.46, h * 0.2);
    g.lineTo(w * 0.46, h * 0.2);
    g.stroke();
  } else if (m.kind === 'node_spine'){
    g.lineWidth = 1.05;
    g.beginPath();
    g.moveTo(0, -5.4 * size);
    g.lineTo(0, 5.4 * size);
    g.stroke();
    g.beginPath();
    g.arc(0, -2.15 * size, 0.82 * size, 0, Math.PI * 2);
    g.arc(0, 2.05 * size, 1.25 * size, 0, Math.PI * 2);
    g.fill();
  } else if (m.kind === 'ring_port'){
    g.lineWidth = 1.0 + size * 0.42;
    g.beginPath();
    g.arc(0, 0, 2.35 * size, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 1.55 * size, 0, Math.PI * 2);
    g.fill();
  } else {
    // pointed_mag
    const w = 3.4 * size, h = 6.7 * size;
    g.fillRect(-w * 0.5, -h * 0.5, w, h * 0.72);
    g.beginPath();
    g.moveTo(-w * 0.5, h * 0.29);
    g.lineTo(0, h * 0.52);
    g.lineTo(w * 0.5, h * 0.29);
    g.closePath();
    g.fill();
    g.lineWidth = 0.9;
    g.stroke();
  }
  g.restore();
}

// weapon visuals
function drawWeapon(g, ax, ay, side, type, heat = 0){
  const s = side === 'left' ? -1 : 1;
  g.save(); g.translate(ax, ay); g.scale(s,1);
  const h = Math.max(0, Math.min(1, heat || 0));
  const heatColor = `rgb(${Math.round(224 * h)},0,0)`;
  g.fillStyle = (type === 'chaingun' || type === 'chaincannon') ? heatColor : CONFIG.COLORS.INK;
  switch(type){
    case 'rifle':
      g.fillRect(-4, -14, 6, 30);
      g.fillRect(0, 4, 10, 10);
      break;
    case 'longrifle':
      g.fillRect(-4, -26, 6, 42);
      g.fillRect(-1, -31, 4, 5);
      g.fillRect(0, 6, 11, 9);
      break;
    case 'shotgun':
      g.fillRect(0, -14, 22, 18); // near-square main body
      g.fillRect(3, -24, 10, 10);  // short top block
      g.fillRect(0, 0, 16, 20);   // compact lower block
      g.beginPath();                 // short tapered muzzle/foot
      g.moveTo(0, 24);
      g.lineTo(16, 24);
      g.lineTo(12, 30);
      g.lineTo(4, 30);
      g.closePath();
      g.fill();
      break;
    case 'heavyshotgun':
      g.fillRect(-2, -12, 26, 18);
      g.fillRect(4, -20, 12, 8);
      g.fillRect(2, 6, 18, 16);
      g.beginPath();
      g.moveTo(0, 24);
      g.lineTo(20, 24);
      g.lineTo(16, 32);
      g.lineTo(4, 32);
      g.closePath();
      g.fill();
      break;
    case 'beamer':
      // Shorter, wider body with rounded emitter.
      g.fillRect(-2, -11, 14, 21);   // main body
      g.fillRect(5, -4, 10, 10);     // rear/lower mass
      g.fillRect(2, 8, 6, 6);      // grip
      g.beginPath();
      g.arc(5, -13, 5.2, Math.PI, Math.PI * 2);
      g.fill();
      break;
    case 'chaingun':
      g.fillRect(-2, -39, 12, 46);  // tall column
      g.fillRect(2, -42, 4, 6);    // tiny top nub
      g.fillRect(-4, 8, 18, 26);   // lower mass
      g.fillRect(4, 18, 18, 22);    // forward/right block
      g.fillRect(8, 40, 8, 4);    // little foot
      break;
    case 'chaincannon':
      g.fillRect(-3, -35, 14, 40);
      g.fillRect(1, -40, 6, 6);
      g.fillRect(-6, 8, 22, 24);
      g.fillRect(5, 16, 24, 20);
      g.fillRect(12, 37, 10, 5);
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
    case 'rocketpod':
      g.fillRect(-6, -10, 12, 24);
      g.fillRect(-8, -12, 16, 6);
      g.fillRect(-8, 12, 16, 6);
      g.fillRect(-12, 0, 24, 8);
      break;
  }
  g.restore();
}


