// Security cameras for Nightshift: The Meridian Vault.
// A camera is fixed to the ceiling and sweeps its cone back and forth
// across an arc. Spotting the player fills its own meter; a full meter
// sounds the alarm and sends every guard after the player.

import { TILE } from './config.js';
import { CAMERA_VIEW_RANGE, CAMERA_VIEW_HALF_ANGLE, CAMERA_DETECTION_RATE } from './config.js';
import { hasLineOfSight } from './levels.js';

const TWO_PI = Math.PI * 2;

function angleDiff(a, b) {
  let d = (a - b) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

export class Camera {
  constructor(def) {
    this.x = def.x * TILE + TILE / 2;
    this.y = def.y * TILE + TILE / 2;
    this.arcMin = def.arc[0];
    this.arcMax = def.arc[1];
    this.speed = def.speed;
    this.dir = (this.arcMin + this.arcMax) / 2;
    this._sweepDir = 1;
    this.meter = 0;
    this.alarmed = false;
    this.justAlarmed = false;
  }

  reset() {
    this.dir = (this.arcMin + this.arcMax) / 2;
    this._sweepDir = 1;
    this.meter = 0;
    this.alarmed = false;
  }

  seesPlayer(level, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA_VIEW_RANGE) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.dir)) > CAMERA_VIEW_HALF_ANGLE) return false;
    return hasLineOfSight(level, this.x, this.y, player.x, player.y);
  }

  update(dt, level, player, events) {
    this.justAlarmed = false;
    // Sweep the cone across its arc, reversing at each end.
    this.dir += this.speed * this._sweepDir * dt;
    if (this.dir >= this.arcMax) {
      this.dir = this.arcMax;
      this._sweepDir = -1;
    } else if (this.dir <= this.arcMin) {
      this.dir = this.arcMin;
      this._sweepDir = 1;
    }
    if (this.alarmed) return;
    if (this.seesPlayer(level, player)) {
      let rate = CAMERA_DETECTION_RATE;
      if (player.hidden) rate *= 0.32;
      this.meter = Math.min(1, this.meter + rate * dt);
      if (this.meter >= 1) {
        this.alarmed = true;
        this.justAlarmed = true;
        if (events) events.onCameraAlarm(this);
      }
    } else {
      this.meter = Math.max(0, this.meter - 0.5 * dt);
    }
  }
}
