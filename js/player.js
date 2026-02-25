import { CONFIG } from './config.js';
import { world, canvas, clamp } from './utils.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { SFX } from './sfx.js';
import { getMuzzleLocal, getCooldownSec } from './weapons.js';

const MAX_TWIST = CONFIG.PLAYER.TWIST_DEG * Math.PI/180;
const MAX_TWIST_CANVAS = (CONFIG.PLAYER.TWIST_DEG_CANVAS ?? CONFIG.PLAYER.TWIST_DEG) * Math.PI/180;
const WEAPON_SIZE = { rifle: 1, beamer: 2, chaingun: 2, rocket: 3, cannon: 4 };

export class Player{
  constructor(){
    this.x = world.w * CONFIG.PLAYER.START_X;
    this.y = world.h * CONFIG.PLAYER.START_Y;
    this.t = 0;
    this.angle = 0;

    this.weapons = { left: 'rifle', right: null };
    this.cooldown = { left: 0, right: 0 };
    this.chaingun = {
      left:  { heat: 0, windupT: 0, spinning: false, overheated: false, windupPlayed: false },
      right: { heat: 0, windupT: 0, spinning: false, overheated: false, windupPlayed: false }
    };

    this.speedMul = 1.0;
    this.reloadMul = 1.0;
    this.projSpeedMul = 1.0;
    this.damageMul = 1.0;

    this.maxHp = CONFIG.PLAYER.HP ?? 120;
    this.hp = this.maxHp;
    this.lastHp = this.hp;
    this.damageBucket = 0;
    this.rigMarks = [];
    this.fxSparkT = 0;
    this.fxSmokeT = 0;
    this.dead = false;
    this.deathT = 0;
  }

  update(dt){
    if (this.dead){
      this.deathT = Math.max(0, this.deathT - dt);
      return;
    }

    const sp = (CONFIG.PLAYER.MOVE_PX_PER_SEC * this.speedMul) * dt;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) this.x -= sp;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) this.x += sp;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) this.y -= sp;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) this.y += sp;

    this.x = clamp(this.x, 14, world.w-14);
    this.y = clamp(this.y, 14, world.h - 14);

    // walking time
    this.t += dt * (CONFIG.PLAYER.BASE_STEP || 1.0);

    // aim at mouse (canvas-relative), straight up is 0
    const rect = canvas.getBoundingClientRect();
    const cx = mouse.x - rect.left;
    const cy = mouse.y - rect.top;
    const insideCanvas = (cx >= 0 && cx <= rect.width && cy >= 0 && cy <= rect.height);

    // Convert from CSS pixel space to game world pixel space.
    const mx = cx * (world.w / Math.max(1, rect.width));
    const my = cy * (world.h / Math.max(1, rect.height));
    const absolute = Math.atan2(my - this.y, mx - this.x);
    const relative = absolute + Math.PI/2;
    const maxTwist = insideCanvas ? MAX_TWIST_CANVAS : MAX_TWIST;
    const twistLerp = insideCanvas
      ? (CONFIG.PLAYER.TWIST_LERP_CANVAS ?? 0.24)
      : (CONFIG.PLAYER.TWIST_LERP ?? 0.15);
    const limited = Math.max(-maxTwist, Math.min(maxTwist, relative));
    this.angle += (limited - this.angle) * twistLerp;

    // cooldown tick
    this.cooldown.left = Math.max(0, this.cooldown.left - dt);
    this.cooldown.right = Math.max(0, this.cooldown.right - dt);

    // Damage-bucket weapon loss: every 20% max HP damage can pop one larger weapon.
    const hpNow = Math.max(0, this.hp ?? this.maxHp);
    if (hpNow < this.lastHp){
      this.damageBucket += (this.lastHp - hpNow);
    }
    this.lastHp = hpNow;
    const threshold = this.maxHp * 0.20;
    if (this.damageBucket >= threshold){
      const broke = this.breakLargestWeapon();
      if (broke){
        this.damageBucket -= threshold;
      } else {
        // Keep below threshold when no valid break is possible (e.g. only one weapon equipped).
        this.damageBucket = Math.min(this.damageBucket, threshold * 0.95);
      }
    }

    // Damage-state feedback (sparks/smoke as HP drops)
    const hpRatio = this.hp / Math.max(1, this.maxHp);
    this.fxSparkT = Math.max(0, this.fxSparkT - dt);
    this.fxSmokeT = Math.max(0, this.fxSmokeT - dt);

    if (hpRatio <= 0.75 && this.fxSparkT <= 0){
      Particles.spawnImpact(this.x + (Math.random()*10 - 5), this.y - 10 + (Math.random()*8 - 4), 'warnSpark', 0.35);
      this.fxSparkT = 0.12 + Math.random() * 0.2;
    }
    if (hpRatio <= 0.5 && this.fxSmokeT <= 0){
      const heavy = hpRatio <= 0.25;
      Particles.spawnImpact(
        this.x + (Math.random()*14 - 7),
        this.y - 16 + (Math.random()*10 - 5),
        'smoke',
        heavy ? 1.35 : 0.55
      );
      this.fxSmokeT = heavy ? (0.06 + Math.random() * 0.08) : (0.22 + Math.random() * 0.3);
    }

    // Chaingun state machine: windup -> sustain fire -> overheat -> cooldown.
    this.updateChaingun('left', mouse.leftDown, dt);
    this.updateChaingun('right', mouse.rightDown, dt);
  }

  draw(g){
    if (this.dead) return;
    Theme.drawPlayer(g, this);
  }

  setWeapon(side, type){
    if (side !== 'left' && side !== 'right') return;
    this.weapons[side] = type || null;
    if (type !== 'chaingun'){
      const st = this.chaingun[side];
      st.heat = 0; st.windupT = 0; st.spinning = false; st.overheated = false; st.windupPlayed = false;
    }
  }

  grantWeaponFromPickup(side, type){
    this.setWeapon(side, type);
    const maxHp = Math.max(1, this.maxHp ?? 1);
    this.hp = Math.min(maxHp, (this.hp ?? maxHp) + maxHp * 0.25);
    const threshold = maxHp * 0.20;
    this.damageBucket = Math.max(0, (this.damageBucket ?? 0) - threshold);
    this.lastHp = Math.max(0, this.hp ?? maxHp);
  }

  addMediumRigMark(){
    const marks = this.rigMarks || (this.rigMarks = []);
    const protrusionCount = marks.reduce((n, e)=> n + (e?.group === 'protrusion' ? 1 : 0), 0);
    const side = (protrusionCount % 2 === 0) ? -1 : 1;
    const weightedPick = (entries)=>{
      let total = 0;
      for (const e of entries) total += Math.max(0, e.w ?? 1);
      let r = Math.random() * Math.max(1, total);
      for (const e of entries){
        r -= Math.max(0, e.w ?? 1);
        if (r <= 0) return e.k;
      }
      return entries[entries.length - 1].k;
    };
    const forwardKinds = [{ k:'mast_orb', w:1 }];
    const rearKinds = [
      { k:'pointed_mag', w:1.35 },
      { k:'capsule_cell', w:1.25 },
      { k:'l_bracket', w:1.15 },
      { k:'u_shroud', w:1.00 },
      { k:'ribbed_pack', w:0.95 },
      { k:'node_spine', w:0.85 },
      { k:'orbital_pod', w:0.78 },
      { k:'ring_port', w:0.55 }
    ];
    const chooseForward = Math.random() < 0.22;
    const pool = chooseForward ? forwardKinds : rearKinds;
    const pk = weightedPick(pool);
    const isForward = chooseForward;

    // Expanding rear lattice: as upgrades accumulate, sockets grow farther back and wider out.
    const pairIdx = (protrusionCount / 2) | 0;      // left/right pair index
    const depth = (pairIdx / 3) | 0;                // every 3 pairs pushes to a deeper "ring"
    const lane = pairIdx % 3;                       // 0..2 side lanes per ring
    const laneBase = 5.2 + lane * 2.4;              // start wider from body centerline
    const spreadGrow = depth * 1.25;                // widen with depth
    const rearY = 13.0 + pairIdx * 1.65 + depth * 1.15; // start outside torso, then keep extending rearward

    const ox = side * (isForward ? (4 + Math.random() * 8) : (laneBase + spreadGrow + Math.random() * 0.85));
    const oy = isForward
      ? (-8 + Math.random() * 10)        // front half for mast/antenna styles
      : (rearY + (Math.random() * 1.0 - 0.5)); // progressively farther rear with slight jitter
    const rot = isForward ? (-Math.PI * 0.5) : (Math.PI * 0.5);
    marks.push({
      group: 'protrusion',
      kind: pk,
      side,
      ox,
      oy,
      rot,
      size: isForward ? (1.05 + Math.random() * 0.85) : (1.28 + Math.random() * 0.95)
    });

    const maxMarks = 36;
    if (marks.length > maxMarks) marks.splice(0, marks.length - maxMarks);
  }

  fire(side){
    if (this.dead) return;
    const type = this.weapons[side];
    if (!type) return;
    if (type === 'chaingun') return;
    if (this.cooldown[side] > 0) return;
    this.shoot(side, type);
  }

  getBeamerPose(side){
    const m = getMuzzleLocal('beamer');
    const s = (side === 'left') ? -1 : 1;
    const ax = s * CONFIG.PLAYER.MOUNT_OFFSET_X;
    const ay = CONFIG.PLAYER.MOUNT_OFFSET_Y;
    const lx = ax + s * m.x;
    const ly = ay + m.y;
    const a = this.angle;
    const rx = lx * Math.cos(a) - ly * Math.sin(a);
    const ry = lx * Math.sin(a) + ly * Math.cos(a);
    const wx = this.x + rx;
    const wy = this.y + ry;
    const forwardX = Math.sin(a);
    const forwardY = -Math.cos(a);
    return { x: wx + forwardX * 20, y: wy + forwardY * 20, angle: a };
  }

  shoot(side, type){
    if (this.dead) return;
    if (!type) return;
    if (this.cooldown[side] > 0) return;

    const m = getMuzzleLocal(type);
    const s = (side === 'left') ? -1 : 1;
    const ax = s * CONFIG.PLAYER.MOUNT_OFFSET_X;
    const ay = CONFIG.PLAYER.MOUNT_OFFSET_Y;
    let lx = ax + s * m.x;
    let ly = ay + m.y;

    const a = this.angle;
    const rx =  lx * Math.cos(a) - ly * Math.sin(a);
    const ry =  lx * Math.sin(a) + ly * Math.cos(a);
    const wx = this.x + rx;
    const wy = this.y + ry;

    if (type === 'beamer'){
      const pose = this.getBeamerPose(side);
      Projectiles.fireBeam?.(pose.x, pose.y, pose.angle, {
        damageMul: this.damageMul,
        track: () => this.getBeamerPose(side)
      });
      SFX.playShot(type);
      this.cooldown[side] = getCooldownSec(type) * this.reloadMul;
      return;
    }

    Projectiles.spawn(wx, wy, a, type, {
      speedMul: this.projSpeedMul,
      damageMul: this.damageMul
    });
    if (type === 'chaingun'){
      const rightX = Math.cos(a);
      const rightY = Math.sin(a);
      const outX = rightX * s;
      const outY = rightY * s;
      const forwardX = Math.sin(a);
      const forwardY = -Math.cos(a);
      // Chaingun muzzle sits far forward; pull shell spawn back to weapon rear.
      const rearOffset = Math.abs(m.y) + 40;
      const ejX = wx - forwardX * rearOffset + outX * 4 + (Math.random() * 2 - 1);
      const ejY = wy - forwardY * rearOffset + outY * 4 + (Math.random() * 2 - 1);
      const evx = outX * (90 + Math.random() * 65) - forwardX * (85 + Math.random() * 55);
      const evy = outY * (90 + Math.random() * 65) - forwardY * (85 + Math.random() * 55) - (10 + Math.random() * 20);
      Particles.spawnShellEject?.(ejX, ejY, evx, evy);
    } else if (type === 'cannon'){
      const rightX = Math.cos(a);
      const rightY = Math.sin(a);
      const outX = rightX * s;
      const outY = rightY * s;
      const forwardX = Math.sin(a);
      const forwardY = -Math.cos(a);
      const rearOffset = 16;
      const ejX = wx - forwardX * rearOffset + outX * 7 + (Math.random() * 1.5 - 0.75);
      const ejY = wy - forwardY * rearOffset + outY * 7 + (Math.random() * 1.5 - 0.75);
      const evx = outX * (75 + Math.random() * 40) - forwardX * (62 + Math.random() * 36);
      const evy = outY * (75 + Math.random() * 40) - forwardY * (62 + Math.random() * 36) - (8 + Math.random() * 16);
      Particles.spawnShellEject?.(ejX, ejY, evx, evy, {
        w: 8 + Math.random() * 3,
        h: 3.8 + Math.random() * 1.5
      });
    }
    SFX.playShot(type);
    this.cooldown[side] = getCooldownSec(type) * this.reloadMul;
  }

  updateChaingun(side, holding, dt){
    const st = this.chaingun[side];
    const isChain = this.weapons[side] === 'chaingun';
    const def = CONFIG.WEAPONS.chaingun || {};
    const windup = Math.max(0.05, def.windup ?? 0.32);
    const heatPerSec = Math.max(0.05, def.heatPerSec ?? 0.64);
    const coolPerSec = Math.max(0.05, def.coolPerSec ?? 0.45);

    if (!isChain){
      st.heat = Math.max(0, st.heat - coolPerSec * dt * 1.25);
      st.windupT = 0;
      st.spinning = false;
      st.overheated = false;
      st.windupPlayed = false;
      return;
    }

    if (st.overheated){
      st.spinning = false;
      st.windupT = 0;
      st.windupPlayed = false;
      st.heat = Math.max(0, st.heat - coolPerSec * dt);
      if (st.heat <= 0.02){
        st.heat = 0;
        st.overheated = false;
      }
      return;
    }

    if (!holding){
      st.spinning = false;
      st.windupT = 0;
      st.windupPlayed = false;
      st.heat = Math.max(0, st.heat - coolPerSec * dt);
      return;
    }

    if (!st.spinning){
      if (!st.windupPlayed){
        SFX.playChaingunWindup?.();
        st.windupPlayed = true;
      }
      st.windupT += dt;
      if (st.windupT < windup) return;
      st.spinning = true;
    }

    this.shoot(side, 'chaingun');
    st.heat = Math.min(1, st.heat + heatPerSec * dt);
    if (st.heat >= 1){
      st.overheated = true;
      st.spinning = false;
      st.windupT = 0;
      st.windupPlayed = false;
    }
  }

  getMountWorld(side){
    const s = (side === 'left') ? -1 : 1;
    const ax = s * CONFIG.PLAYER.MOUNT_OFFSET_X;
    const ay = CONFIG.PLAYER.MOUNT_OFFSET_Y;
    const a = this.angle;
    const rx = ax * Math.cos(a) - ay * Math.sin(a);
    const ry = ax * Math.sin(a) + ay * Math.cos(a);
    return { x: this.x + rx, y: this.y + ry };
  }

  breakLargestWeapon(){
    const entries = [];
    for (const side of ['left', 'right']){
      const w = this.weapons[side];
      if (!w) continue;
      entries.push({ side, type: w, size: WEAPON_SIZE[w] ?? 1 });
    }
    if (entries.length <= 1) return false; // always keep at least one weapon

    entries.sort((a, b) => b.size - a.size);
    const drop = entries[0];

    const p = this.getMountWorld(drop.side);
    Particles.spawnBotExplosion?.(p.x, p.y, 0.7);
    Particles.spawnImpact?.(p.x, p.y, 'explosion', 0.8);
    SFX.playEnemyExplode?.();

    this.weapons[drop.side] = null;
    this.cooldown[drop.side] = 0;
    const st = this.chaingun[drop.side];
    st.heat = 0; st.windupT = 0; st.spinning = false; st.overheated = false; st.windupPlayed = false;
    return true;
  }

  destroy(){
    if (this.dead) return;
    this.dead = true;
    this.deathT = 1.1;
    Particles.spawnBotExplosion(this.x, this.y - 6, 1.4);
  }

  isDeathAnimDone(){
    return this.dead && this.deathT <= 0;
  }
}

// simple input module embedded (kept small)
const keys = new Set();
const mouse = { x:0, y:0, leftDown:false, rightDown:false };
window.addEventListener('keydown', e => keys.add(e.key));
window.addEventListener('keyup', e => keys.delete(e.key));
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => {
  if (e.button === 0) mouse.leftDown = true;
  if (e.button === 2) mouse.rightDown = true;
});
window.addEventListener('mouseup', e => {
  if (e.button === 0) mouse.leftDown = false;
  if (e.button === 2) mouse.rightDown = false;
});
window.addEventListener('blur', () => {
  mouse.leftDown = false;
  mouse.rightDown = false;
});
