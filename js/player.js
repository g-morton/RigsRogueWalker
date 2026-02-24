import { CONFIG } from './config.js';
import { world, canvas, clamp } from './utils.js';
import { Theme } from './theme.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { getMuzzleLocal, getCooldownSec } from './weapons.js';

const MAX_TWIST = CONFIG.PLAYER.TWIST_DEG * Math.PI/180;
const MAX_TWIST_CANVAS = (CONFIG.PLAYER.TWIST_DEG_CANVAS ?? CONFIG.PLAYER.TWIST_DEG) * Math.PI/180;

export class Player{
  constructor(){
    this.x = world.w * CONFIG.PLAYER.START_X;
    this.y = world.h * CONFIG.PLAYER.START_Y;
    this.t = 0;
    this.angle = 0;

    this.weapons = { left: 'rifle', right: 'rifle' };
    this.cooldown = { left: 0, right: 0 };

    this.speedMul = 1.0;
    this.reloadMul = 1.0;
    this.projSpeedMul = 1.0;
    this.damageMul = 1.0;

    this.maxHp = CONFIG.PLAYER.HP ?? 120;
    this.hp = this.maxHp;
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

    // Chaingun autofire while mouse button is held.
    if (mouse.leftDown && this.weapons.left === 'chaingun') this.fire('left');
    if (mouse.rightDown && this.weapons.right === 'chaingun') this.fire('right');
  }

  draw(g){
    if (this.dead) return;
    Theme.drawPlayer(g, this);
  }

  setWeapon(side, type){
    if (side !== 'left' && side !== 'right') return;
    this.weapons[side] = type || null;
  }

  fire(side){
    if (this.dead) return;
    const type = this.weapons[side];
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

    Projectiles.spawn(wx, wy, a, type, {
      speedMul: this.projSpeedMul,
      damageMul: this.damageMul
    });
    this.cooldown[side] = getCooldownSec(type) * this.reloadMul;
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
