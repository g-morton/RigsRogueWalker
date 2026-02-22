import { CONFIG } from './config.js';

export function getMuzzleLocal(type){
  const w = CONFIG.WEAPONS[type] || CONFIG.WEAPONS.rifle;
  return w.muzzle || {x:10,y:0};
}
export function getCooldownSec(type){
  const w = CONFIG.WEAPONS[type] || CONFIG.WEAPONS.rifle;
  return w.cooldown ?? 0.2;
}
