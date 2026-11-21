// Guard patrol AI for Nightshift: The Meridian Vault.
// A guard walks a loop of waypoints, pausing at each, and watches a
// cone in front of it. Spotting the player fills a detection meter:
//   meter < suspicion  — patrol, meter decays
//   meter >= suspicion — the guard stops, stares, and walks over to look
//   meter = 1          — full alarm: the guard chases the player
// Losing sight starts a countdown; the guard then searches the last
// seen spot and walks back to its patrol. Running players are spotted
// faster, shadowed players slower, and a loud noise draws a guard over.

import { TILE } from './config.js';
import {
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CATCH_RADIUS,
  GUARD_WAYPOINT_PAUSE,
  DETECTION_BASE_RATE,
  DETECTION_CLOSE_BOOST,
  DETECTION_FAR_FALLOFF,
  DETECTION_RUN_MULTIPLIER,
  DETECTION_SHADOW_MULTIPLIER,
  DETECTION_DECAY_RATE,
  SUSPICION_THRESHOLD,
  SEARCH_AFTER_LOST,
  SEARCH_LOOK_TIME,
} from './config.js';
import { circleHitsSolid, hasLineOfSight } from './levels.js';

const TWO_PI = Math.PI * 2;

function angleDiff(a, b) {
  let d = (a - b) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints.map(([c, r]) => ({
      x: c * TILE + TILE / 2,
      y: r * TILE + TILE / 2,
    }));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.waypointIndex = 1 % this.waypoints.length;
    this.dir = 0;
    this.state = 'patrol'; // patrol | suspicious | chase | search | return
    this.meter = 0;
    this.pauseTimer = 0;
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.investigate = null; // {x, y} a noise or a glimpse sent us to
    this.justSpotted = false; // set the frame the meter first hits 1
    this.justSuspicious = false; // set the frame the meter first crosses the threshold
    this._faceTimer = 0;
  }

  reset() {
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.waypointIndex = 1 % this.waypoints.length;
    this.dir = 0;
    this.state = 'patrol';
    this.meter = 0;
    this.pauseTimer = 0;
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.investigate = null;
  }

  /** Whether the player is inside this guard's cone with a clear view. */
  seesPlayer(level, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return { sees: false, dist };
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angle, this.dir)) > GUARD_VIEW_HALF_ANGLE) return { sees: false, dist };
    if (!hasLineOfSight(level, this.x, this.y, player.x, player.y)) return { sees: false, dist };
    return { sees: true, dist };
  }

  /** A noise pulse at (x, y) with the given radius: investigate it. */
  hearNoise(x, y, radius) {
    if (this.state === 'chase') return;
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist > radius) return;
    this.investigate = { x, y };
    if (this.state === 'patrol') this.state = 'suspicious';
  }

  /** A camera alarm: every guard chases the player's position. */
  raiseAlarm(player) {
    this.lastSeen = { x: player.x, y: player.y };
    this.meter = 1;
    if (this.state !== 'chase') {
      this.state = 'chase';
      this.justSpotted = true;
    }
    this.lostTimer = 0;
  }

  _moveToward(level, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const r = 11;
    if (!circleHitsSolid(level, nx, this.y, r)) this.x = nx;
    if (!circleHitsSolid(level, this.x, ny, r)) this.y = ny;
    this.dir = turnToward(this.dir, Math.atan2(dy, dx), 6 * dt);
    return dist <= step + 0.5;
  }

  update(dt, level, player, events) {
    this.justSpotted = false;
    this.justSuspicious = false;
    const seen = this.seesPlayer(level, player);

    // ---- detection meter ----
    if (seen.sees) {
      const closeness = 1 - seen.dist / GUARD_VIEW_RANGE; // 0 far, 1 point blank
      let rate = DETECTION_BASE_RATE * (DETECTION_FAR_FALLOFF + closeness * DETECTION_CLOSE_BOOST);
      if (player.running) rate *= DETECTION_RUN_MULTIPLIER;
      if (player.hidden) rate *= DETECTION_SHADOW_MULTIPLIER;
      const before = this.meter;
      this.meter = Math.min(1, this.meter + rate * dt);
      if (before < SUSPICION_THRESHOLD && this.meter >= SUSPICION_THRESHOLD && this.state === 'patrol') {
        this.justSuspicious = true;
      }
      this.lastSeen = { x: player.x, y: player.y };
      this.lostTimer = 0;
      if (this.meter >= 1 && this.state !== 'chase') {
        this.state = 'chase';
        this.justSpotted = true;
        if (events) events.onSpotted(this);
      }
    } else {
      this.meter = Math.max(0, this.meter - DETECTION_DECAY_RATE * dt);
      if (this.state === 'chase') {
        this.lostTimer += dt;
        if (this.lostTimer >= SEARCH_AFTER_LOST) {
          this.state = 'search';
          this.searchTimer = SEARCH_LOOK_TIME;
        }
      }
    }

    // ---- behaviour ----
    if (this.state === 'patrol') {
      const target = this.waypoints[this.waypointIndex];
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        this.dir = turnToward(this.dir, this.dir + Math.sin(this._faceTimer * 0.8) * 0.01, 1);
      } else if (this._moveToward(level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
        this.pauseTimer = GUARD_WAYPOINT_PAUSE;
      }
      this._faceTimer += dt;
      // A glimpse makes the guard stop and stare at the player.
      if (this.meter >= SUSPICION_THRESHOLD) {
        this.state = 'suspicious';
        this.investigate = { x: player.x, y: player.y };
      }
    } else if (this.state === 'suspicious') {
      const lookAt = seen.sees ? { x: player.x, y: player.y } : this.investigate || this.lastSeen;
      this.dir = turnToward(this.dir, Math.atan2(lookAt.y - this.y, lookAt.x - this.x), 3.2 * dt);
      if (!seen.sees && this.investigate) {
        // Walk over to check the noise or glimpse.
        if (this._moveToward(level, this.investigate.x, this.investigate.y, GUARD_SUSPICIOUS_SPEED, dt)) {
          this.investigate = null;
          this.searchTimer = 1.6;
          this.state = 'search';
        }
      } else if (!seen.sees && !this.investigate) {
        this.state = 'patrol';
      }
      if (this.meter < SUSPICION_THRESHOLD * 0.5 && !seen.sees) {
        this.state = 'patrol';
        this.investigate = null;
      }
    } else if (this.state === 'chase') {
      const target = seen.sees ? { x: player.x, y: player.y } : this.lastSeen;
      this._moveToward(level, target.x, target.y, GUARD_CHASE_SPEED, dt);
      // Caught: a chasing guard reaches the player.
      if (Math.hypot(player.x - this.x, player.y - this.y) < GUARD_CATCH_RADIUS) {
        if (events) events.onCaught(this);
      }
    } else if (this.state === 'search') {
      this.searchTimer -= dt;
      this.dir += 1.8 * dt; // look around the spot
      if (this.searchTimer <= 0) {
        this.state = 'return';
      }
    } else if (this.state === 'return') {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = 0;
      let bestDist = Infinity;
      this.waypoints.forEach((w, i) => {
        const d = Math.hypot(w.x - this.x, w.y - this.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const target = this.waypoints[best];
      if (this._moveToward(level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        this.waypointIndex = (best + 1) % this.waypoints.length;
        this.state = 'patrol';
      }
    }
  }
}
