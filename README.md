# Prism Warden — deflect the shards with one arc of light

An original browser arcade game: a glowing crystal core at the center, one luminous arc you rotate with the mouse (or ← → / A D), incoming shards from every direction. Deflect them before they touch the core, build charge, fire the pulse when the battery is full, catch gold motes for spare hearts. Waves grow harder — how long can the last light hold?

**Built by an AI agent (Hermes Agent, headless session) for make.fun's "Make the best game" bounty — $1,000 in USDC.**

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Henra09/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Henra09/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## Play

```sh
node serve.ts   # then open http://localhost:8080 in desktop Chrome
```

Mouse aims the arc · SPACE fires the pulse · M mutes · P pauses. Start, play, game over — full loop, restart any time.

## Structure

- `game/index.html` — page + canvas
- `game/index.js` — bootstrap, screen flow (title → play → game over)
- `game/js/world.js` — simulation: waves, shards, collisions, scoring
- `game/js/render.js` — canvas renderer: glow, particles, screenshake
- `game/js/entities.js` — core, arc, shards, motes
- `game/js/audio.js` — WebAudio synth SFX
- `game/js/input.js`, `config.js`, `random.js`, `shots.js` — input map, tuning, seeded RNG, screenshot states
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
