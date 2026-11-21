// Nightshift: The Meridian Vault — game loop and state machine.
// States: title, briefing, playing, paused, leveldone, caught, complete.
// Keyboard: WASD/arrows to move, Shift to run (loud), P/Esc to pause,
// R to restart the level, M to mute, H for help. Mouse: menu buttons.
// A ?shot= URL parameter stages a fixed scene for screenshots:
// title, play, alert, vault, win.

import { VIEW_W, VIEW_H, TILE } from './config.js';
import { LEVEL_DEFS, buildLevel } from './levels.js';
import { Player } from './player.js';
import { Guard } from './guard.js';
import { Camera } from './camera.js';
import { Particles } from './particles.js';
import { SoundEngine } from './audio.js';
import { drawGame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();
const particles = new Particles();

const el = (id) => document.getElementById(id);
const hud = {
  level: el('hud-level'),
  shards: el('hud-shards'),
  time: el('hud-time'),
  alert: el('hud-alert'),
  meter: el('hud-meter-fill'),
  meterWrap: el('hud-meter'),
  state: el('hud-state'),
};

const game = {
  state: 'title', // title | briefing | playing | paused | leveldone | caught | complete
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  cameras: [],
  time: 0, // level timer (seconds)
  elapsed: 0, // wall-clock time for animation
  detections: 0, // times fully spotted this level
  totalDetections: 0,
  totalTime: 0,
  alarm: false,
  muted: false,
  helpOpen: false,
  frozen: false, // screenshot staging holds the simulation still
};

const input = { up: false, down: false, left: false, right: false, run: false };

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function showOverlay(id) {
  for (const o of document.querySelectorAll('.overlay')) o.classList.add('hidden');
  if (id) el(id).classList.remove('hidden');
}

function setHud() {
  if (!game.level) return;
  const taken = game.level.shards.filter((s) => s.taken).length;
  hud.level.textContent = game.level.name;
  hud.shards.textContent = `◆ ${taken} / ${game.level.shards.length}`;
  hud.time.textContent = formatTime(game.time);
  const maxMeter = Math.max(0, ...game.guards.map((g) => g.meter), ...game.cameras.map((c) => c.meter));
  hud.meter.style.width = `${Math.round(maxMeter * 100)}%`;
  hud.meter.style.background = maxMeter >= 1 ? '#ff3b30' : maxMeter >= 0.35 ? '#ffb02e' : '#ffe27a';
  hud.meterWrap.title = `Detection ${Math.round(maxMeter * 100)}%`;
  if (game.alarm) {
    hud.alert.textContent = '⚠ ALARM';
    hud.alert.className = 'pill alarm';
  } else if (maxMeter >= 0.35) {
    hud.alert.textContent = 'SUSPICIOUS';
    hud.alert.className = 'pill suspicious';
  } else {
    hud.alert.textContent = 'UNSEEN';
    hud.alert.className = 'pill unseen';
  }
  hud.state.textContent = game.player && game.player.hidden ? 'In shadow — hard to spot' : game.player && game.player.running ? 'Running — loud!' : 'Exposed — stay out of the cones';
}

function loadLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(LEVEL_DEFS[index]);
  game.player = new Player(game.level.playerStart);
  game.guards = game.level.guardDefs.map((d) => new Guard(d));
  game.cameras = game.level.cameraDefs.map((d) => new Camera(d));
  game.time = 0;
  game.detections = 0;
  game.alarm = false;
  game.frozen = false;
  particles.list.length = 0;
  setHud();
}

function startLevel(index) {
  loadLevel(index);
  el('briefing-title').textContent = game.level.name;
  el('briefing-text').textContent = game.level.briefing;
  game.state = 'briefing';
  showOverlay('overlay-briefing');
  setHud();
}

function beginPlay() {
  game.state = 'playing';
  showOverlay(null);
}

function levelComplete() {
  game.state = 'leveldone';
  game.totalTime += game.time;
  game.totalDetections += game.detections;
  sound.levelWin();
  el('leveldone-stats').textContent = `Time ${formatTime(game.time)} · Spotted ${game.detections} time${game.detections === 1 ? '' : 's'} · Shards ${game.level.shards.length}/${game.level.shards.length}`;
  el('btn-next').textContent = game.levelIndex + 1 < LEVEL_DEFS.length ? 'Next level →' : 'Finish the job →';
  showOverlay('overlay-leveldone');
  setHud();
}

function caught(guard) {
  if (game.state !== 'playing') return;
  game.state = 'caught';
  game.totalDetections += 1;
  sound.caught();
  particles.burst(game.player.x, game.player.y, '#ff5a4e', 26, 140);
  el('caught-text').textContent = `${guard.name} caught you in the open. The vault keeps its secrets — this time.`;
  showOverlay('overlay-caught');
}

function campaignComplete() {
  game.state = 'complete';
  sound.campaignWin();
  el('complete-stats').textContent = `All ${LEVEL_DEFS.length} levels cleared in ${formatTime(game.totalTime)} · Spotted ${game.totalDetections} time${game.totalDetections === 1 ? '' : 's'} total.`;
  showOverlay('overlay-complete');
}

function restartLevel() {
  loadLevel(game.levelIndex);
  beginPlay();
}

function togglePause() {
  if (game.state === 'playing') {
    game.state = 'paused';
    showOverlay('overlay-pause');
  } else if (game.state === 'paused') {
    beginPlay();
  }
}

function toggleMute() {
  game.muted = !game.muted;
  sound.setMuted(game.muted);
  el('btn-mute').textContent = game.muted ? '🔇 Muted' : '🔊 Sound';
}

function toggleHelp() {
  game.helpOpen = !game.helpOpen;
  el('overlay-help').classList.toggle('hidden', !game.helpOpen);
  if (game.helpOpen) {
    // Opening help mid-game pauses the action; closing it resumes.
    if (game.state === 'playing') {
      game.state = 'paused';
      game._helpPaused = true;
    }
  } else if (game._helpPaused && game.state === 'paused') {
    game._helpPaused = false;
    beginPlay();
  }
}

// ---- events from guards and cameras ----
const events = {
  onSpotted(guard) {
    game.detections += 1;
    game.alarm = true;
    sound.alert();
    particles.textPop(guard.x, guard.y - 24, '!', '#ff3b30');
    particles.ring(game.player.x, game.player.y, 'rgba(255, 59, 48, 0.9)', 90);
  },
  onCaught(guard) {
    caught(guard);
  },
  onCameraAlarm(camera) {
    game.detections += 1;
    game.alarm = true;
    sound.alert();
    particles.textPop(camera.x, camera.y - 22, '!', '#ff3b30');
    for (const guard of game.guards) guard.raiseAlarm(game.player);
  },
};

function update(dt) {
  game.elapsed += dt;
  if (game.frozen) {
    // Screenshot staging: the scene holds still while animations run.
    particles.update(dt);
    return;
  }
  if (game.state === 'title') {
    // Attract mode: the guards walk their patrols behind the title card.
    // The player waits at the start, far from every route, so no alarm
    // can fire here; the no-op events keep it that way by construction.
    const quiet = { onSpotted() {}, onCaught() {}, onCameraAlarm() {} };
    for (const guard of game.guards) guard.update(dt, game.level, game.player, quiet);
    for (const camera of game.cameras) camera.update(dt, game.level, game.player, quiet);
    particles.update(dt);
    return;
  }
  if (game.state !== 'playing') {
    particles.update(dt);
    return;
  }
  game.time += dt;

  const noise = game.player.update(dt, input, game.level, (running) => {
    sound.footstep(running);
    if (running && Math.random() < 0.4) particles.dust(game.player.x, game.player.y + 8);
  });
  if (noise) {
    particles.ring(noise.x, noise.y, 'rgba(200, 210, 230, 0.55)', noise.radius);
    for (const guard of game.guards) guard.hearNoise(noise.x, noise.y, noise.radius);
  }

  for (const guard of game.guards) {
    guard.update(dt, game.level, game.player, events);
    if (guard.justSuspicious) sound.suspicious();
  }
  for (const camera of game.cameras) camera.update(dt, game.level, game.player, events);

  // Alarm clears once no guard is chasing and no camera is alarmed.
  game.alarm = game.guards.some((g) => g.state === 'chase') || game.cameras.some((c) => c.alarmed);

  // Shard pickup.
  for (const shard of game.level.shards) {
    if (shard.taken) continue;
    if (Math.hypot(shard.x - game.player.x, shard.y - game.player.y) < TILE * 0.75) {
      shard.taken = true;
      sound.pickup();
      particles.burst(shard.x, shard.y, '#59e3ff', 16, 110);
      if (game.level.shards.every((s) => s.taken)) {
        sound.unlock();
        particles.textPop(game.level.exit.x, game.level.exit.y - 30, 'EXIT OPEN', '#3ddc84');
      }
    }
  }

  // Exit: only open once every shard is taken.
  const exitOpen = game.level.shards.every((s) => s.taken);
  if (exitOpen && Math.hypot(game.level.exit.x - game.player.x, game.level.exit.y - game.player.y) < TILE * 0.7) {
    if (game.levelIndex + 1 < LEVEL_DEFS.length) {
      levelComplete();
    } else {
      game.totalTime += game.time;
      game.totalDetections += game.detections;
      campaignComplete();
    }
    return;
  }

  particles.update(dt);
  setHud();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing' || game.state === 'paused' || game.state === 'leveldone' || game.state === 'caught' || game.state === 'complete' || game.state === 'title') {
    update(dt);
    drawGame(ctx, game, game.elapsed);
  } else if (game.state === 'briefing') {
    // A live backdrop behind the briefing card.
    update(0);
    drawGame(ctx, game, game.elapsed);
  }
  requestAnimationFrame(loop);
}

// ---- input ----
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  const mapped = KEYMAP[e.code];
  if (mapped) {
    input[mapped] = true;
    sound.ensure();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.state === 'playing' || game.state === 'paused') togglePause();
  } else if (e.code === 'KeyR') {
    if (game.state === 'playing' || game.state === 'paused' || game.state === 'caught') restartLevel();
  } else if (e.code === 'KeyM') {
    toggleMute();
  } else if (e.code === 'KeyH') {
    toggleHelp();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    sound.ensure();
    if (game.state === 'title') startLevel(0);
    else if (game.state === 'briefing') beginPlay();
    else if (game.state === 'leveldone') {
      if (game.levelIndex + 1 < LEVEL_DEFS.length) startLevel(game.levelIndex + 1);
      else campaignComplete();
    } else if (game.state === 'caught') restartLevel();
    else if (game.state === 'complete') startLevel(0);
  }
});

window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = false;
});

window.addEventListener('blur', () => {
  input.up = input.down = input.left = input.right = input.run = false;
});

// ---- menu buttons (mouse) ----
el('btn-start').addEventListener('click', () => {
  sound.ensure();
  sound.click();
  startLevel(0);
});
el('btn-begin').addEventListener('click', () => {
  sound.ensure();
  sound.click();
  beginPlay();
});
el('btn-resume').addEventListener('click', () => {
  sound.click();
  beginPlay();
});
el('btn-restart-pause').addEventListener('click', () => {
  sound.click();
  restartLevel();
});
el('btn-next').addEventListener('click', () => {
  sound.click();
  if (game.levelIndex + 1 < LEVEL_DEFS.length) startLevel(game.levelIndex + 1);
  else campaignComplete();
});
el('btn-retry').addEventListener('click', () => {
  sound.click();
  restartLevel();
});
el('btn-again').addEventListener('click', () => {
  sound.click();
  game.totalTime = 0;
  game.totalDetections = 0;
  startLevel(0);
});
el('btn-mute').addEventListener('click', () => {
  sound.ensure();
  toggleMute();
});
el('btn-help').addEventListener('click', () => {
  sound.ensure();
  sound.click();
  toggleHelp();
});
el('btn-close-help').addEventListener('click', () => {
  sound.click();
  toggleHelp();
});
el('btn-title-quit').addEventListener('click', () => {
  sound.click();
  game.totalTime = 0;
  game.totalDetections = 0;
  game.state = 'title';
  showOverlay('overlay-title');
});

// ---- screenshot staging (?shot=...) ----
function stageShot(kind) {
  if (kind === 'title') {
    loadLevel(0);
    game.state = 'title';
    showOverlay('overlay-title');
    return;
  }
  if (kind === 'play') {
    loadLevel(0);
    // The player is inside Rook's cone: Rook is already suspicious.
    game.player.x = 11 * TILE + TILE / 2;
    game.player.y = 8 * TILE + TILE / 2;
    game.guards[0].x = 8 * TILE + TILE / 2;
    game.guards[0].y = 8 * TILE + TILE / 2;
    game.guards[0].dir = 0;
    game.guards[0].meter = 0.55;
    game.guards[0].state = 'suspicious';
    game.guards[1].x = 24 * TILE + TILE / 2;
    game.guards[1].y = 5 * TILE + TILE / 2;
    game.guards[1].dir = Math.PI / 2;
    game.level.shards[0].taken = true;
    game.frozen = true;
    game.state = 'playing';
    showOverlay(null);
    return;
  }
  if (kind === 'alert') {
    loadLevel(0);
    game.player.x = 16 * TILE + TILE / 2;
    game.player.y = 9 * TILE + TILE / 2;
    const guard = game.guards[0];
    guard.x = 12 * TILE + TILE / 2;
    guard.y = 9 * TILE + TILE / 2;
    guard.dir = 0;
    guard.state = 'chase';
    guard.meter = 1;
    guard.lastSeen = { x: game.player.x, y: game.player.y };
    game.guards[1].x = 22 * TILE + TILE / 2;
    game.guards[1].y = 8 * TILE + TILE / 2;
    game.guards[1].dir = Math.PI;
    game.guards[1].meter = 0.8;
    game.alarm = true;
    game.detections = 1;
    game.level.shards[0].taken = true;
    game.level.shards[1].taken = true;
    game.frozen = true;
    game.state = 'playing';
    showOverlay(null);
    return;
  }
  if (kind === 'vault') {
    loadLevel(2);
    game.player.x = 12 * TILE + TILE / 2;
    game.player.y = 10 * TILE + TILE / 2;
    game.guards[0].x = 20 * TILE + TILE / 2;
    game.guards[0].y = 8 * TILE + TILE / 2;
    game.guards[0].dir = Math.PI;
    game.guards[0].meter = 0.4;
    game.guards[2].x = 4 * TILE + TILE / 2;
    game.guards[2].y = 15 * TILE + TILE / 2;
    game.guards[2].dir = -Math.PI / 2;
    game.level.shards[0].taken = true;
    game.level.shards[1].taken = true;
    game.level.shards[2].taken = true;
    game.frozen = true;
    game.state = 'playing';
    showOverlay(null);
    return;
  }
  if (kind === 'win') {
    loadLevel(0);
    for (const shard of game.level.shards) shard.taken = true;
    game.player.x = game.level.exit.x - 40;
    game.player.y = game.level.exit.y;
    game.frozen = true;
    game.state = 'playing';
    showOverlay(null);
  }
}

// ---- boot ----
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot);
} else {
  loadLevel(0);
  game.state = 'title';
  showOverlay('overlay-title');
}
setHud();
requestAnimationFrame(loop);

// Exposed for debugging and play-testing in the console.
window.__nightshift = { game, loadLevel, startLevel };
