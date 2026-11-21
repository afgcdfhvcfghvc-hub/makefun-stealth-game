// The player: Wren, the infiltrator.
// Walks with WASD or arrows, runs with Shift (fast but loud), and is
// harder to spot while standing in a shadow tile. Movement collides
// against walls and crates, sliding along them axis by axis.

import {
  TILE,
  PLAYER_WALK_SPEED,
  PLAYER_RUN_SPEED,
  PLAYER_RADIUS,
  NOISE_RUN_RADIUS,
  NOISE_PULSE_INTERVAL,
} from './config.js';
import { circleHitsSolid, isShadowAt } from './levels.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER_RADIUS;
    this.dir = -Math.PI / 2; // facing up at the start
    this.moving = false;
    this.running = false;
    this.hidden = false; // standing in shadow
    this._noiseTimer = 0;
    this._stepTimer = 0;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = -Math.PI / 2;
    this.moving = false;
    this.running = false;
    this.hidden = false;
  }

  /**
   * Move from the input vector. Returns a noise event when a running
   * step pulses, or null. `onStep` fires for footstep sounds.
   */
  update(dt, input, level, onStep) {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = mx !== 0 || my !== 0;
    if (!this.moving) {
      this.running = false;
      this.hidden = isShadowAt(level, this.x, this.y);
      return null;
    }
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    this.dir = Math.atan2(my, mx);
    this.running = !!input.run;
    const speed = this.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    const dx = mx * speed * dt;
    const dy = my * speed * dt;
    // Axis-separated movement so the player slides along walls.
    if (!circleHitsSolid(level, this.x + dx, this.y, this.radius)) this.x += dx;
    if (!circleHitsSolid(level, this.x, this.y + dy, this.radius)) this.y += dy;
    this.hidden = isShadowAt(level, this.x, this.y);

    // Footstep sounds, quicker while running.
    this._stepTimer -= dt;
    if (this._stepTimer <= 0) {
      this._stepTimer = this.running ? 0.26 : 0.38;
      if (onStep) onStep(this.running);
    }
    // Running pulses noise guards can hear.
    let noise = null;
    if (this.running) {
      this._noiseTimer -= dt;
      if (this._noiseTimer <= 0) {
        this._noiseTimer = NOISE_PULSE_INTERVAL;
        noise = { x: this.x, y: this.y, radius: NOISE_RUN_RADIUS };
      }
    }
    return noise;
  }

  tile() {
    return { col: Math.floor(this.x / TILE), row: Math.floor(this.y / TILE) };
  }
}
