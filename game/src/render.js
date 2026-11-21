// Rendering for Nightshift: The Meridian Vault.
// Everything is drawn on one canvas: tiled floor, walls, crates and
// shadow pools, then a night darkness layer with light cut around the
// player, then the guards' vision cones (raycast so walls occlude
// them), the entities, and particles on top.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, CAMERA_VIEW_RANGE, CAMERA_VIEW_HALF_ANGLE } from './config.js';
import { tileAt, raycast } from './levels.js';

const CONE_RAYS = 26;

/** The visible cone as a polygon: one ray per slice, stopped by walls. */
export function conePolygon(level, x, y, dir, halfAngle, range) {
  const pts = [{ x, y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = dir - halfAngle + (2 * halfAngle * i) / CONE_RAYS;
    const d = raycast(level, x, y, a, range);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

function drawCone(ctx, level, x, y, dir, halfAngle, range, fill) {
  const pts = conePolygon(level, x, y, dir, halfAngle, range);
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, fill.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawFloor(ctx, level) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') continue; // walls are drawn later
      // A subtle checker so the floor reads as tiles, not a flat void.
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 's') {
        // Shadow pools must read at a glance: a blue tint, a brighter
        // edge and a dot pattern mark the tiles that hide the player.
        ctx.fillStyle = COLORS.shadowFloor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(130, 170, 255, 0.30)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        ctx.fillStyle = 'rgba(130, 170, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 1.8, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 10, 1.8, 0, Math.PI * 2);
        ctx.arc(x + 10, y + 22, 1.8, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 22, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
}

function drawWalls(ctx, level) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(level, col, row) !== '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      // A lit top edge where the wall meets open floor above it.
      if (tileAt(level, col, row - 1) !== '#') {
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
      }
      ctx.fillStyle = COLORS.wallSide;
      ctx.fillRect(x, y + TILE - 3, TILE, 3);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawCrates(ctx, level) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(level, col, row) !== 'C') continue;
      const x = col * TILE + 3;
      const y = row * TILE + 3;
      const s = TILE - 6;
      ctx.fillStyle = COLORS.crate;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = COLORS.crateDark;
      ctx.fillRect(x, y + s - 6, s, 6);
      ctx.strokeStyle = COLORS.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + s - 2, y + s - 2);
      ctx.moveTo(x + s - 2, y + 2);
      ctx.lineTo(x + 2, y + s - 2);
      ctx.stroke();
    }
  }
}

function drawShards(ctx, level, time) {
  for (const shard of level.shards) {
    if (shard.taken) continue;
    const bob = Math.sin(time * 2.4 + shard.bob) * 3;
    const cx = shard.x;
    const cy = shard.y + bob;
    const pulse = 0.55 + 0.35 * Math.sin(time * 3 + shard.bob);
    ctx.save();
    ctx.shadowColor = COLORS.shard;
    ctx.shadowBlur = 14 * pulse;
    ctx.fillStyle = COLORS.shard;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 9);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.shardCore;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawExit(ctx, level, open, time) {
  const { x, y } = level.exit;
  const color = open ? COLORS.exitOpen : COLORS.exitLocked;
  const pulse = open ? 0.7 + 0.3 * Math.sin(time * 4) : 0.5;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = open ? 22 * pulse : 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 13, y - 13, 26, 26);
  ctx.globalAlpha = 0.25 + 0.2 * pulse;
  ctx.fillStyle = color;
  ctx.fillRect(x - 13, y - 13, 26, 26);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', x, y - 22);
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  const { x, y } = player;
  const bob = player.moving ? Math.sin(time * 14) * 1.5 : 0;
  ctx.save();
  ctx.translate(x, y + bob * 0.4);
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Facing tick and a dark visor line so the direction reads.
  ctx.strokeStyle = COLORS.playerDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.dir) * 5, Math.sin(player.dir) * 5);
  ctx.lineTo(Math.cos(player.dir) * (player.radius + 4), Math.sin(player.dir) * (player.radius + 4));
  ctx.stroke();
  ctx.fillStyle = 'rgba(6, 40, 34, 0.85)';
  ctx.beginPath();
  ctx.arc(Math.cos(player.dir) * 3, Math.sin(player.dir) * 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (player.hidden) {
    ctx.fillStyle = 'rgba(160, 190, 255, 0.9)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', 0, -player.radius - 9);
  }
  ctx.restore();
}

function drawGuard(ctx, guard) {
  const { x, y } = guard;
  const alerted = guard.state === 'chase';
  const suspicious = guard.state === 'suspicious' || guard.state === 'search';
  const body = alerted ? COLORS.guard : suspicious ? COLORS.guardSuspicious : COLORS.guard;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = body;
  ctx.shadowBlur = 10;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Visor shows which way the guard looks.
  ctx.fillStyle = COLORS.guardDark;
  ctx.beginPath();
  ctx.arc(Math.cos(guard.dir) * 4, Math.sin(guard.dir) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(guard.dir) * 6, Math.sin(guard.dir) * 6);
  ctx.lineTo(Math.cos(guard.dir) * 16, Math.sin(guard.dir) * 16);
  ctx.stroke();
  // Detection meter arc above the guard.
  if (guard.meter > 0.02) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 17, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.meter >= 1 ? '#ff3b30' : guard.meter >= 0.35 ? '#ffb02e' : '#ffe27a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + guard.meter * Math.PI * 2);
    ctx.stroke();
  }
  if (alerted) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -20);
  } else if (suspicious) {
    ctx.fillStyle = '#ffb02e';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, -20);
  }
  ctx.restore();
}

function drawCamera(ctx, camera) {
  const { x, y } = camera;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2a2f3a';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = camera.alarmed ? '#ff3b30' : COLORS.camera;
  ctx.lineWidth = 2;
  ctx.stroke();
  // A short tick shows which way the lens points.
  ctx.strokeStyle = camera.alarmed ? '#ff3b30' : COLORS.camera;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(camera.dir) * 5, Math.sin(camera.dir) * 5);
  ctx.lineTo(Math.cos(camera.dir) * 15, Math.sin(camera.dir) * 15);
  ctx.stroke();
  ctx.fillStyle = camera.alarmed ? '#ff3b30' : COLORS.camera;
  ctx.beginPath();
  ctx.arc(Math.cos(camera.dir) * 4, Math.sin(camera.dir) * 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (camera.meter > 0.02 && !camera.alarmed) {
    ctx.strokeStyle = '#ffb02e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + camera.meter * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The night layer: darkness everywhere except pools of light. */
const darkCanvas = document.createElement('canvas');
darkCanvas.width = VIEW_W;
darkCanvas.height = VIEW_H;
const darkCtx = darkCanvas.getContext('2d');

function drawDarkness(ctx, player, level, open) {
  // Holes are punched on an offscreen layer first: punching them on the
  // main canvas would erase the floor and walls underneath.
  darkCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  darkCtx.globalCompositeOperation = 'source-over';
  darkCtx.fillStyle = COLORS.darkness;
  darkCtx.fillRect(0, 0, VIEW_W, VIEW_H);
  darkCtx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, alpha) => {
    const grad = darkCtx.createRadialGradient(x, y, r * 0.15, x, y, r);
    grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    darkCtx.fillStyle = grad;
    darkCtx.beginPath();
    darkCtx.arc(x, y, r, 0, Math.PI * 2);
    darkCtx.fill();
  };
  hole(player.x, player.y, 150, 0.95);
  hole(level.exit.x, level.exit.y, open ? 95 : 55, 0.7);
  for (const shard of level.shards) {
    if (!shard.taken) hole(shard.x, shard.y, 42, 0.5);
  }
  darkCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
}

/** Draw one frame of the playing level. */
export function drawGame(ctx, state, time) {
  const { level, player, guards, cameras, particles } = state;
  const exitOpen = level.shards.every((s) => s.taken);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, level);
  drawCrates(ctx, level);
  drawShards(ctx, level, time);
  drawExit(ctx, level, exitOpen, time);
  drawWalls(ctx, level);
  drawDarkness(ctx, player, level, exitOpen);

  // Vision cones sit above the darkness so they always read.
  for (const camera of cameras) {
    const fill = camera.alarmed ? COLORS.coneAlert : camera.meter > 0.02 ? COLORS.coneSuspicious : COLORS.conePatrol;
    drawCone(ctx, level, camera.x, camera.y, camera.dir, CAMERA_VIEW_HALF_ANGLE, CAMERA_VIEW_RANGE, fill);
  }
  for (const guard of guards) {
    const fill =
      guard.state === 'chase'
        ? COLORS.coneAlert
        : guard.state === 'suspicious' || guard.state === 'search'
          ? COLORS.coneSuspicious
          : COLORS.conePatrol;
    drawCone(ctx, level, guard.x, guard.y, guard.dir, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, fill);
  }

  for (const camera of cameras) drawCamera(ctx, camera);
  for (const guard of guards) drawGuard(ctx, guard);
  drawPlayer(ctx, player, time);
  particles.draw(ctx);

  // A red flash at the screen edge while any guard is chasing.
  if (state.alarm) {
    const pulse = 0.1 + 0.06 * Math.sin(time * 6);
    ctx.strokeStyle = `rgba(255, 59, 48, ${pulse + 0.12})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
  }
}
