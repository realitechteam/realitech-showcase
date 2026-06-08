#!/usr/bin/env node
/* Optimize raw showcase videos -> lightweight, web-ready loops + posters.
 *
 * Usage:
 *   1. Download the Google Drive folder and drop the files into videos/raw/
 *      (keep the original file names — do NOT rename them).
 *   2. npm run optimize
 *
 * Output:
 *   videos/<slug>.mp4            (H.264, muted, faststart)
 *   videos/posters/<slug>.jpg    (poster frame)
 *
 * Requires ffmpeg + ffprobe on PATH.
 */
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readdir, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, BY_SLUG } from "../src/videos.js";

const run = promisify(execFile);
const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const RAW = path.join(ROOT, "videos", "raw");
const OUT = path.join(ROOT, "videos");
const POSTERS = path.join(OUT, "posters");

const HERO_WIDTH = 1920;
const CARD_WIDTH = 1280;
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);

// Most clips open with a 3–5s partner logo intro we must NOT expose.
// Skip the first N seconds so playback starts on content. Override per slug below.
const INTRO_SKIP = 5;
const INTRO_OVERRIDE = {
  // "some-slug": 3,   // <- fine-tune individual clips here if 5s is wrong
};

const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function checkFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    console.error("\n✖ ffmpeg not found on PATH. Install it first: https://ffmpeg.org/download.html\n");
    process.exit(1);
  }
}

async function main() {
  checkFfmpeg();
  if (!existsSync(RAW)) {
    console.error(`✖ Missing ${RAW}. Create it and drop the Drive videos inside.`);
    process.exit(1);
  }
  await mkdir(POSTERS, { recursive: true });

  const files = (await readdir(RAW)).filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));
  if (!files.length) {
    console.log(`\nNo videos in ${RAW}.\nDownload the Drive folder, drop the files in, then re-run.\n`);
    return;
  }

  const known = new Set(Object.keys(BY_SLUG));
  let done = 0, skipped = 0;
  const unmatched = [];

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const slug = normalize(base);
    if (!known.has(slug)) {
      unmatched.push(file);
      continue;
    }
    const big = slug === BRAND.heroSlug || slug === BRAND.engineSlug;
    const width = big ? HERO_WIDTH : CARD_WIDTH;
    const crf = big ? "24" : "27";
    const preset = big ? "medium" : "fast";
    const src = path.join(RAW, file);
    const outMp4 = path.join(OUT, `${slug}.mp4`);
    const outJpg = path.join(POSTERS, `${slug}.jpg`);
    const skip = INTRO_OVERRIDE[slug] ?? INTRO_SKIP;

    process.stdout.write(`→ ${slug} (skip ${skip}s) … `);
    try {
      await run("ffmpeg", [
        "-y", "-ss", String(skip), "-i", src,
        "-vf", `scale='min(${width},iw)':-2`,
        "-c:v", "libx264", "-profile:v", "high", "-preset", preset,
        "-crf", crf, "-pix_fmt", "yuv420p",
        "-an", "-movflags", "+faststart",
        outMp4,
      ]);
      // poster: grab a content frame ~1s after the intro skip
      await run("ffmpeg", [
        "-y", "-ss", String(skip + 1), "-i", src,
        "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "4",
        outJpg,
      ]).catch(async () => {
        await run("ffmpeg", ["-y", "-ss", String(skip), "-i", src, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "4", outJpg]);
      });
      const { size } = await stat(outMp4);
      console.log(`ok (${(size / 1e6).toFixed(1)} MB)`);
      done++;
    } catch (err) {
      console.log("FAILED");
      console.error(`   ${String(err.stderr || err.message).split("\n").slice(-3).join("\n   ")}`);
      skipped++;
    }
  }

  console.log(`\n✔ ${done} optimized · ${skipped} failed`);
  if (unmatched.length) {
    console.log(`\n⚠ ${unmatched.length} file(s) had no matching slug (left untouched):`);
    unmatched.forEach((f) => console.log(`   · ${f}  → normalizes to "${normalize(path.basename(f, path.extname(f)))}"`));
    console.log(`   Fix: rename the file so it matches a slug in src/videos.js, or add an entry there.`);
  }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
