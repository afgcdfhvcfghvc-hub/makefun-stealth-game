[![make.fun competition](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/afgcdfhvcfghvc-hub/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/afgcdfhvcfghvc-hub/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Nightshift: The Meridian Vault

A top-down stealth game for the make.fun "best stealth game" bounty. You are Wren, an infiltrator in the Meridian Archive after dark. Lift every data shard on the floor, slip past patrolling guards and their vision cones, and reach the exit unseen — across three floors, the last guarded by sweeping security cameras.

## How it plays

- **Move** with WASD or arrow keys. **Shift** runs — faster, but guards hear it.
- **Guards** patrol fixed routes with visible vision cones (walls and crates block their sight). Being seen fills a detection meter: a glimpse makes them stop and stare, a full meter means a chase. Break line of sight and they search your last seen spot, then return to patrol.
- **Shadow tiles** hide you — detection fills three times slower in the dark.
- **Shards** (cyan diamonds) are the job: collect them all and the exit turns green.
- **Cameras** on the final floor sweep back and forth; being seen by one alarms every guard.
- **HUD** shows the level, shards, timer, alert state, and a live detection meter. **P** pauses, **R** restarts the floor, **M** mutes, **H** opens help. All sound is synthesized with WebAudio — no audio files.

## Run it

Serve `game/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and play in a desktop browser. No build step, no network requests.

## Hand in

`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` writes the entry to `out/` (game, screenshots, dossier.json).
