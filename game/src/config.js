// Shared constants for Nightshift: The Meridian Vault.
// One place for every number the game balances on, so tuning never
// means hunting through the gameplay files.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Player movement, in pixels per second.
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 238;
export const PLAYER_RADIUS = 11;

// A running player is heard this far away (pixels).
export const NOISE_RUN_RADIUS = 135;
// How often a running player emits a noise pulse (seconds).
export const NOISE_PULSE_INTERVAL = 0.34;

// Guard senses.
export const GUARD_VIEW_RANGE = 185;
export const GUARD_VIEW_HALF_ANGLE = 0.58; // radians, about 33 degrees each side
export const GUARD_PATROL_SPEED = 68;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_SUSPICIOUS_SPEED = 95;
export const GUARD_CATCH_RADIUS = 20;
export const GUARD_WAYPOINT_PAUSE = 1.1;

// Detection meter: 0 is unseen, 1 is fully spotted.
export const DETECTION_BASE_RATE = 1.15; // per second at mid range, standing, lit
export const DETECTION_CLOSE_BOOST = 1.5; // extra rate multiplier at point blank
export const DETECTION_FAR_FALLOFF = 0.45; // rate multiplier at the edge of the cone
export const DETECTION_RUN_MULTIPLIER = 1.5;
export const DETECTION_SHADOW_MULTIPLIER = 0.32;
export const DETECTION_DECAY_RATE = 0.55; // per second while unseen
export const SUSPICION_THRESHOLD = 0.35; // guard turns and stares
export const SEARCH_AFTER_LOST = 2.6; // seconds of lost sight before a chase gives up
export const SEARCH_LOOK_TIME = 3.0; // seconds a guard searches the last seen spot

// Security cameras (level 3).
export const CAMERA_VIEW_RANGE = 175;
export const CAMERA_VIEW_HALF_ANGLE = 0.5;
export const CAMERA_DETECTION_RATE = 1.35;

// Palette: a night facility, teal agent against amber guards.
export const COLORS = {
  floorA: '#262b38',
  floorB: '#20242f',
  floorLine: '#2e3444',
  shadowFloor: '#16233a',
  shadowEdge: '#0d1119',
  wall: '#3a4152',
  wallTop: '#565f73',
  wallSide: '#2b3040',
  crate: '#8a6a33',
  crateEdge: '#c9a45c',
  crateDark: '#6b4f24',
  shard: '#59e3ff',
  shardCore: '#d8fbff',
  exitLocked: '#c23b3b',
  exitOpen: '#3ddc84',
  player: '#2ee6c8',
  playerDark: '#0e8f7c',
  guard: '#ff5a4e',
  guardDark: '#8f1f16',
  guardSuspicious: '#ffb02e',
  conePatrol: 'rgba(255, 214, 90, 0.26)',
  coneSuspicious: 'rgba(255, 176, 46, 0.34)',
  coneAlert: 'rgba(255, 70, 60, 0.38)',
  camera: '#ffcf3f',
  darkness: 'rgba(4, 6, 16, 0.44)',
  hudText: '#e8ecf4',
  hudDim: '#9aa3b5',
};
