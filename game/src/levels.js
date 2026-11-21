// Level data for Nightshift: The Meridian Vault.
// Each level is an ASCII map plus patrol routes. Tiles:
//   '#' wall   '.' floor   's' shadow floor (hides the player)
//   'C' crate (blocks sight and movement)   '*' data shard
//   'E' exit   'P' player start
// Guard waypoints are tile coordinates; a guard walks the straight
// corridor between consecutive waypoints, pausing at each end.

import { TILE, COLS, ROWS } from './config.js';

const LEVEL_1_MAP = [
  '##############################',
  '#P...ss....#........#.......E#',
  '#....ss....#....*...#........#',
  '#..C.......#........#....C...#',
  '#..........#...C....#........#',
  '#...ss...C.#........#...ss...#',
  '#..........#....*...#...ss...#',
  '####...######...#######...####',
  '#............................#',
  '#...*...ss....C.....ss.......#',
  '#...................ss.......#',
  '#.....##########.########....#',
  '#...........#.....#..........#',
  '#...ss......#..*..#....C...*.#',
  '#...ss......#.....#..........#',
  '#.....C.....#.....#.....ss...#',
  '#...........#.....#.....ss...#',
  '#...ss...C..#.....#..C..ss...#',
  '#...........#.....#.....ss...#',
  '##############################',
];

const LEVEL_2_MAP = [
  '##############################',
  '#P....#....ss.......#.......E#',
  '#.....#..*.ss.......#....C...#',
  '#..C..#..........C..#........#',
  '#.....#.............#...ss...#',
  '#...ss#...C......*..#...ss...#',
  '#...ss#.............#...C....#',
  '###.####..###########..####.##',
  '#............................#',
  '#...*...ss....C.....ss.......#',
  '#.......ss..........ss.......#',
  '######...####.#####...########',
  '#.......#........#...........#',
  '#...ss..#....*...#....C...*..#',
  '#...ss..#........#...........#',
  '#....C..#..ss....#......ss...#',
  '#.......#..ss....#......ss...#',
  '#.......#...C....#...C..ss...#',
  '#.......#........#...........#',
  '##############################',
];

const LEVEL_3_MAP = [
  '##############################',
  '#P...#.....ss.......#.......E#',
  '#....#..*..ss....C..#....C...#',
  '#.C..#.......ss.....#........#',
  '#....#.......ss...*.#...ss...#',
  '#.ss.#..............#...ss...#',
  '#.ss.#...C..........#....C...#',
  '###.####..###########..####.##',
  '#............................#',
  '#...*..ss.....C.....ss.......#',
  '#......ss...........ss.......#',
  '####....#####.###########....#',
  '#.......#........#...........#',
  '#.ss....#....*...#....C...*..#',
  '#.ss....#........#...........#',
  '#....C..#..ss....#......ss...#',
  '#.......#..ss....#......ss...#',
  '#.......#...C....#...C..ss...#',
  '#.......#........#...........#',
  '##############################',
];

export const LEVEL_DEFS = [
  {
    name: 'Level 1 — Lobby After Hours',
    briefing:
      'The Meridian Archive sleeps, but two guards walk the floor. Slip through the dark, lift every data shard, then reach the exit on the far side. Stay out of the yellow cones — and out of the light.',
    map: LEVEL_1_MAP,
    guards: [
      { name: 'Rook', waypoints: [[4, 8], [26, 8]] },
      { name: 'Vesper', waypoints: [[24, 2], [24, 9]] },
    ],
    cameras: [],
  },
  {
    name: 'Level 2 — Server Floor',
    briefing:
      'Three guards now, and the server racks leave fewer shadows. Running is fast but loud: guards hear it. Patience opens routes that speed cannot.',
    map: LEVEL_2_MAP,
    guards: [
      { name: 'Bishop', waypoints: [[3, 8], [26, 8]] },
      { name: 'Knight', waypoints: [[14, 2], [14, 6]] },
      { name: 'Pawn', waypoints: [[24, 12], [24, 18]] },
    ],
    cameras: [],
  },
  {
    name: 'Level 3 — The Vault',
    briefing:
      'Four guards and two sweeping cameras guard the vault shards. A camera that spots you sounds the alarm for everyone. Use the crates, use the dark, and be gone before the light finds you.',
    map: LEVEL_3_MAP,
    guards: [
      { name: 'Rook', waypoints: [[3, 8], [26, 8]] },
      { name: 'Vesper', waypoints: [[24, 2], [24, 6]] },
      { name: 'Bishop', waypoints: [[4, 12], [4, 18]] },
      { name: 'Pawn', waypoints: [[20, 12], [20, 18]] },
    ],
    cameras: [
      { x: 15, y: 9, arc: [0.35, Math.PI - 0.35], speed: 0.55 },
      { x: 15, y: 17, arc: [Math.PI + 0.35, Math.PI * 2 - 0.35], speed: 0.5 },
    ],
  },
];

/** A parsed level: tile grids plus the entities the map spells out. */
export function buildLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const shards = [];
  let exit = null;
  let playerStart = null;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === '*') shards.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false, bob: Math.random() * 6 });
      if (ch === 'E') exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      if (ch === 'P') playerStart = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
    }
  }
  return {
    name: def.name,
    briefing: def.briefing,
    grid,
    shards,
    exit,
    playerStart,
    guardDefs: def.guards,
    cameraDefs: def.cameras,
  };
}

export function tileAt(level, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return level.grid[row][col];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C';
}

/** Whether the pixel point stands on a shadow tile. */
export function isShadowAt(level, x, y) {
  return tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)) === 's';
}

/** Whether a circle of radius r at (x, y) overlaps a solid tile. */
export function circleHitsSolid(level, x, y, r) {
  const c0 = Math.floor((x - r) / TILE);
  const c1 = Math.floor((x + r) / TILE);
  const r0 = Math.floor((y - r) / TILE);
  const r1 = Math.floor((y + r) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isSolidTile(tileAt(level, col, row))) continue;
      const nearestX = Math.max(col * TILE, Math.min(x, col * TILE + TILE));
      const nearestY = Math.max(row * TILE, Math.min(y, row * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

/** Distance along a ray before it hits a sight-blocking tile, or maxDist. */
export function raycast(level, x0, y0, angle, maxDist) {
  const step = 4;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let x = x0;
  let y = y0;
  for (let d = 0; d < maxDist; d += step) {
    x += dx;
    y += dy;
    if (blocksSightTile(tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)))) return d;
  }
  return maxDist;
}

/** True when no wall or crate stands between the two pixel points. */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const step = 4;
  const steps = Math.ceil(dist / step);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSightTile(tileAt(level, Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE)))) return false;
  }
  return true;
}

/** Walkable tiles reachable from the player start (flood fill). */
export function reachableTiles(level) {
  const seen = new Set();
  const startCol = Math.floor(level.playerStart.x / TILE);
  const startRow = Math.floor(level.playerStart.y / TILE);
  const queue = [[startCol, startRow]];
  while (queue.length > 0) {
    const [c, r] = queue.pop();
    const key = `${c},${r}`;
    if (seen.has(key)) continue;
    if (isSolidTile(tileAt(level, c, r))) continue;
    seen.add(key);
    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return seen;
}
