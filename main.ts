// Court of Embers: hand-in program for the make.fun card-game bounty.
// Node 22, standard library only, no installs, no network.
//
// What it does, in order: work out where this file lives and where the
// output goes, copy the playable game and the four screenshots into the
// output directory, then ask the vendored make.fun library to write the
// dossier the judge reads. The dossier is a deterministic function of the
// game and screenshot bytes, so running this program twice writes the
// same bytes twice.
//
// Local run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output instead.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file. The grader
// mounts the submitted commit read-only, so everything below is read
// from there and nothing is written back into it.
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));

// The grader sets /output; a local run overrides it with the env var.
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Scorer caps from the competition gate. The text cap shapes the
// dossier bytes; the other caps refuse an entry the scorer would refuse:
// more than 4 screenshots, one over 256 KiB, more than 993 game files,
// more than 48 MiB of game files, or a game path over 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

// Copy one directory tree into the output, replacing any stale copy
// left by an earlier run so the output never mixes two builds.
function copyTreeIntoOutput(name: string): void {
  const source = join(repoRoot, name);
  const target = join(outputDir, name);
  if (!existsSync(source)) {
    throw new Error(`Court of Embers: missing ${name}/ beside main.ts`);
  }
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

function handInGame(): void {
  mkdirSync(outputDir, { recursive: true });
  copyTreeIntoOutput('game');
  copyTreeIntoOutput('screenshots');
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const size = statSync(join(outputDir, 'dossier.json')).size;
  console.log(`Court of Embers handed in: dossier.json ${size} bytes in ${outputDir}`);
}

handInGame();
