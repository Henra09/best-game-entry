// Prism Warden — best-game-01 entry packaging script (Node 22, standard library only).
//
// The deliverable is a self-contained "entry" directory: the static game lives in game/,
// the judge-facing images in screenshots/, and dossier.json is the summary document the
// make.fun scorer compares against its own rebuild. This script assembles all three from
// whatever sits next to it on disk. In the grader's container the entry lands at /output;
// everywhere else MAKEFUN_OUTPUT_DIR points at a staging folder, defaulting to /output.
//
// Local check:  MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve & play: node serve.ts  →  http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this script lives — game/ and screenshots/ are resolved relative to it, so the
// script can be invoked from any working directory.
function resolvePaths() {
  const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
  const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  return { sourceRoot, outputRoot };
}

// Recursively materialise a directory (and its contents) from sourceRoot into outRoot,
// creating the destination first. Returns true when the source existed and was copied.
function copyTree(sourceRoot: string, relDir: string, outRoot: string): boolean {
  const from = join(sourceRoot, relDir);
  if (!existsSync(from)) return false;
  const to = join(outRoot, relDir);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  return true;
}

// Serialize the dossier and drop it at the output root. The caps mirror the bounty's
// gate.json: text_max_bytes actually shapes the emitted bytes; the rest are refusal
// thresholds the scorer would enforce anyway, so tripping them here fails fast.
function writeDossier(outputRoot: string, caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
}): void {
  writeFileSync(join(outputRoot, 'dossier.json'), buildDossier(outputRoot, caps));
}

function main(): void {
  const { sourceRoot, outputRoot } = resolvePaths();
  mkdirSync(outputRoot, { recursive: true });

  const gameCopied = copyTree(sourceRoot, 'game', outputRoot);
  if (!gameCopied) throw new Error(`missing game/ next to main.ts (looked in ${sourceRoot})`);
  // screenshots/ is optional at build time; the dossier just records fewer images.
  copyTree(sourceRoot, 'screenshots', outputRoot);

  writeDossier(outputRoot);
}

main();
