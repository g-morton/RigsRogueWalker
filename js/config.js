export const CONFIG = {
  COLORS: {
    BG: '#ffffff',
    INK: '#000000',
    ACCENT: '#e01a1a',
    ENEMY: '#2a66ff',
    SMOKE: '#6f6f6f'
  },
  CANVAS: {
    W: 768,
    H: 1024
  },
  SCROLL: {
    // All scroll/movement rates are in pixels per second (px/s)
    PX_PER_SEC: 60
  },
  BACKGROUND: {
    // Background scroll is tied to world scroll via this ratio (0 = fixed, 1 = same speed as ground)
    PARALLAX_RATIO: 0.5
  },
  TILE: {
    H: 200,           // row height
    GAP_MIN: 50,    // min gap between two corridors horizontally
    GAP_MAX: 200,    // max gap
    PATH_W_MIN: 300, // min corridor width
    PATH_W_MAX: 800, // max corridor width
    START_SAFE_ROWS: 3  // rows with full-width safe start
  },
  PLAYER: {
    START_X: 0.5,  // fraction of screen width
    START_Y: 0.90, // fraction of screen height
    HP: 120,
    LEG_W: 13, LEG_H: 26, LEG_OFFSET_X: 20, LEG_OFFSET_Y: 10, LEG_LIFT_Y: 8,
    TORSO_W: 40, TORSO_H: 26,
    HEAD: 16, HEAD_BOB_X: 4,
    HEAD_OFFSET_Y: -18,
    BASE_STEP: 1.0, LEG_SPEED: 0.7, HEAD_BOB_SPEED: 0.5,
    MOUNT_OFFSET_X: 30, MOUNT_OFFSET_Y: 4,
    MOVE_PX_PER_SEC: 120,
    TWIST_DEG: 60,
    TWIST_DEG_CANVAS: 115,
    TWIST_LERP: 0.15,
    TWIST_LERP_CANVAS: 0.36,
    SQUASH_R: 18
  },
  WEAPONS: {
    rifle:   { cooldown: 0.18, muzzle:{x:6, y:-12} },
    chaingun:{ cooldown: 0.08, muzzle:{x:0, y:-60} },
    cannon:  { cooldown: 0.50, muzzle:{x:18,y:-2}  },
    rocket:  { cooldown: 0.90, muzzle:{x:0, y:-18} }
  },
  PROJECTILES: {
    rifle:    { speed: 420, life: 3, r: 3, damage: 10 },
    chaingun: { speed: 520, life: 2, len: 18, w: 3, damage: 6 },
    cannon:   { speed: 360, life: 2.0, r: 5, damage: 40 },
    rocket: {
      speed: 220, life: 2.6, accel: 800, vmax: 1000, len: 16, w: 6, damage: 55,
      ramp_sec: 0.6, accel_base: 0.2, accel_peak: 3.0,
      trail_dt: 0.03, trail_len: 12, puff_r0: 2.0, puff_growth: 22, puff_fade: 1.6
    }
  },
    IBS: {
    SPAWN_ROWS: 2,     // spawn cadence (rows per wave) — lower = more often
    PER_SPAWN: 3,      // how many IBS per wave
    MAX: 30,           // soft cap on concurrent IBS
    SEED: 6,          // how many to pre-seed above screen on start
    R: 10,
    HP: 1,
    SPEED_MIN: 0.1,
    SPEED_MAX: 1.6,
    TALK_CHANCE: 0.05,
    TALK_TIME: 1.2,
    TALK_DENSITY: 0.12,       // NEW: per-second chance an IBS starts talking mid-run
    TALK_COOLDOWN: 3.0,       // NEW: minimum seconds between lines for the same IBS

    ANIM: {
        WALK_FREQ: 8.0,     // base step frequency (higher = faster swing)
        SWAY_DEG:  8,       // max torso sway in degrees (scaled per IBS)
        BOB_PX:    2.0      // vertical bob amplitude (px, scaled per IBS)
        }
    },
  ENEMIES: {
    TURRET: {
      SPAWN_ROWS: 2,
      BULLET_LIFE: 8,
      TYPES: {
        small: {
          size: 13,
          hp: 35,
          fireCooldownMin: 0.9,
          fireCooldownMax: 1.5,
          bulletSpeed: 180,
          bulletDamage: 7,
          bulletR: 3.2,
          weight: 0.45
        },
        medium: {
          size: 18,
          hp: 70,
          fireCooldownMin: 1.5,
          fireCooldownMax: 2.4,
          bulletSpeed: 175,
          bulletDamage: 14,
          bulletR: 4.5,
          weight: 0.35
        },
        large: {
          size: 26,
          hp: 130,
          fireCooldownMin: 1.4,
          fireCooldownMax: 2.1,
          bulletSpeed: 105,
          bulletDamage: 28,
          bulletR: 6.2,
          weight: 0.20
        }
      }
    }
  },
  BOSS: {
    INTERVAL_DIST: 2000,
    TURRET_TYPE: 'large',
    HP_MULT: 4.0,
    SIZE_MULT: 1.5,
    ARENA_ROWS: 7
  },
  POWERUPS: {
    RADIUS: 16,
    EVERY_ROWS: 5,
    REPAIR_HEAL_FRAC: 0.35,
    REPAIR_BASE_CHANCE: 0.08,
    REPAIR_MAX_BONUS_CHANCE: 0.55,
    REPAIR_GUARANTEE_MIN: 4,
    REPAIR_GUARANTEE_MAX: 5
  },
  SFX: {
    IBS_SPLAT_COUNT: 4
  }
};
