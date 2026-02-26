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
    MOVE_PX_PER_SEC: 80,
    TWIST_DEG: 50,
    TWIST_DEG_CANVAS: 115,
    TWIST_LERP: 0.15,
    TWIST_LERP_CANVAS: 0.36,
    SQUASH_R: 18
  },
  WEAPONS: {
    rifle:   { cooldown: 0.50, muzzle:{x:6, y:-12} },
    shotgun: { cooldown: 1.50, muzzle:{x:8, y:-6}, pellets: 5, spreadDeg: 3 },
    beamer:  { cooldown: 1.50, muzzle:{x:6, y:-12} },
    chaingun:{
      cooldown: 0.08, muzzle:{x:0, y:-60},
      windup: 0.80,
      heatPerSec: 0.20,
      coolPerSec: 0.10
    },
    cannon:  { cooldown: 2.00, muzzle:{x:18,y:-2}  },
    rocket:  { cooldown: 1.50, muzzle:{x:0, y:-18} }
  },
  PROJECTILES: {
    rifle:    { speed: 950, life: 3, r: 3, damage: 8 },
    shotgun:  { speed: 950, life: 3, r: 3, damage: 5 },
    beamer:   {
      range: 980, life: 0.50, damage: 30, jitter: 22, arcs: 5,
      coreRadius: 7, lightningRadius: 20,
      nearFrac: 0.25, farDamageMul: 0.10,
      closeBoostFrac: 0.25, closeBoostMul: 2.8
    },
    chaingun: { speed: 600, life: 2, len: 12, w: 3, damage: 6 },
    cannon:   { speed: 900, life: 2.0, r: 5, damage: 70 },
    rocket: {
      speed: 200, life: 2.6, accel: 950, vmax: 1000, len: 16, w: 6, damage: 50,
      ramp_sec: 0.6, accel_base: 0.2, accel_peak: 3.0,
      trail_dt: 0.03, trail_len: 12, puff_r0: 2.0, puff_growth: 24, puff_fade: 1.8
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
    TALK_CHANCE: 0.03,
    TALK_TIME: 1.4,
    TALK_DENSITY: 0.08,       // NEW: per-second chance an IBS starts talking mid-run
    TALK_COOLDOWN: 3.5,       // NEW: minimum seconds between lines for the same IBS

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
          size: 15,
          hp: 35,
          fireCooldownMin: 0.8,
          fireCooldownMax: 1.5,
          bulletSpeed: 180,
          bulletDamage: 7,
          bulletR: 3,
          weight: 0.45
        },
        medium: {
          size: 22,
          hp: 70,
          fireCooldownMin: 1.2,
          fireCooldownMax: 2.4,
          bulletSpeed: 170,
          bulletDamage: 15,
          bulletR: 4.0,
          weight: 0.35
        },
        large: {
          size: 30,
          hp: 130,
          fireCooldownMin: 1.8,
          fireCooldownMax: 2.1,
          bulletSpeed: 120,
          bulletDamage: 30,
          bulletR: 6.0,
          weight: 0.20
        }
      }
    }
  },
  BOSS: {
    INTERVAL_DIST: 4000,
    ARENA_ROWS: 7,
    // Boss encounter configuration:
    // - `ENCOUNTER_DEFAULT` is used when no rule in ENCOUNTERS matches the level.
    // - Rules are matched top-to-bottom against `minLevel`/`maxLevel` (inclusive).
    // - Currently implemented encounter type: `float`.
    ENCOUNTER_DEFAULT: {
      type: 'float',
      hpMul: 1.0,
      sizeMul: 1.0,
      damageMul: 1.0,
      projectileSpeedMul: 1.0,
      fireRateMul: 1.0,
      mountMul: 1.0,
      largeMountBonus: 0.0,
      hoverSpeedMul: 1.0
    },
    // Encounter cookbook (copy/paste into ENCOUNTERS):
    // 1) Single heavy turret:
    // { minLevel: 1, maxLevel: 1, type: 'turret', turretType: 'large', hpMul: 1.25, sizeMul: 1.45 }
    //
    // 2) Heavy + 2 fast light flankers:
    // {
    //   minLevel: 2, maxLevel: 2, type: 'pack',
    //   members: [
    //     { turretType: 'large', xFrac: 0.50, hpMul: 1.2, sizeMul: 1.4 },
    //     { turretType: 'small', xFrac: 0.30, fireRateMul: 1.5, damageMul: 0.72 },
    //     { turretType: 'small', xFrac: 0.70, fireRateMul: 1.5, damageMul: 0.72 }
    //   ]
    // }
    //
    // 3) Durable float with extra guns:
    // { minLevel: 3, maxLevel: 5, type: 'float', hpMul: 1.15, mountMul: 1.2, fireRateMul: 1.08, damageMul: 1.05 }
    //
    // 4) Late aggressive float:
    // { minLevel: 6, type: 'float', hpMul: 1.35, fireRateMul: 1.2, damageMul: 1.2, projectileSpeedMul: 1.12, mountMul: 1.25, largeMountBonus: 0.16, hoverSpeedMul: 1.1 }
    //
    // Notes:
    // - `xFrac` is horizontal position: 0.0 left, 0.5 center, 1.0 right.
    // - `fireRateMul` > 1 fires faster (lower cooldown).
    // - Most multipliers support either encounter-level or per-pack-member overrides.
    ENCOUNTERS: [
      // Examples:
      // `type:'turret'` uses one turret boss (supports `turretType`).
      // `type:'pack'` uses `members` with per-member overrides.
      { minLevel: 1, maxLevel: 1, type: 'turret', turretType: 'large', hpMul: 1.5, sizeMul: 1.4, damageMul: 1.5, fireRateMul: 1.5 },
      {
        minLevel: 2, maxLevel: 2, type: 'pack',
        members: [
          { turretType: 'large', xFrac: 0.50, hpMul: 1.5, sizeMul: 1.5 },
          { turretType: 'small', xFrac: 0.30, hpMul: 1.3, fireRateMul: 2.0, damageMul: 0.75 },
          { turretType: 'small', xFrac: 0.70, hpMul: 1.3, fireRateMul: 2.0, damageMul: 0.75 }
        ]
      },
      { minLevel: 3, maxLevel: 5, type: 'float', hpMul: 1.5, fireRateMul: 1.2, damageMul: 1.5, mountMul: 1.5 },
      { minLevel: 6, type: 'float', hpMul: 2.0, fireRateMul: 1.3, damageMul: 1.5, mountMul: 1.5, largeMountBonus: 0.25, hoverSpeedMul: 1.10 }
    ],
    TURRET: {
      STOP_Y_FRAC: 0.24,
      HP_MULT: 4.0,
      SIZE_MULT: 1.5
    },
    PACK_DEFAULT_MEMBERS: [
      { turretType: 'large', xFrac: 0.50 },
      { turretType: 'small', xFrac: 0.32, fireRateMul: 1.35, damageMul: 0.78 },
      { turretType: 'small', xFrac: 0.68, fireRateMul: 1.35, damageMul: 0.78 }
    ],
    FLOAT: {
      HP_BASE: 220,
      HP_PER_LEVEL: 85,
      W_MIN: 72,
      W_MAX: 118,
      H_MIN: 120,
      H_MAX: 186,
      STOP_Y_FRAC: 0.26,
      HOVER_X_MIN: 28,
      HOVER_X_MAX: 55,
      HOVER_Y_MIN: 6,
      HOVER_Y_MAX: 18,
      HOVER_SPEED_MIN: 0.7,
      HOVER_SPEED_MAX: 1.25,
      COOLDOWN_LEVEL_REDUCE: 0.045,
      MOUNTS_MIN: 3,
      MOUNTS_MAX: 6,
      LARGE_MOUNT_CHANCE: 0.32,
      DECO_MIN: 10,
      DECO_MAX: 20
    }
  },
  POWERUPS: {
    RADIUS: 30,
    MINOR_REPAIR_HEAL_FRAC: 0.10,
    MINOR_WALKER_FACTOR: 1.00
  },
  SFX: {
    IBS_SPLAT_COUNT: 13,
    ENEMY_EXPLODE_COUNT: 10,
    HIT_SMALL_COUNT: 4,
    HIT_BIG_COUNT: 4
  }
};
