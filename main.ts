// Nightshift: The Meridian Vault — hand-in program (Node 22, stdlib only).
//
// It hands the entry in: it copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json there,
// using the vendored make.fun library's buildDossier. The grader runs
// this same program twice in a fresh container with a read-only copy
// of the repository and a writable /output; outside that container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The caps below mirror the competition's gate so this program fails
// locally exactly where the scorer would refuse the entry.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a stale file from an older
// run can never ride along with this one.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The game itself: plain static files, game/index.html at the root.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// The screenshots, first by name the cover. The dossier is built from
// exactly what lands here, so copy first and build second.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier the judge reads, built from the output just written.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
