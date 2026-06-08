#!/usr/bin/env node
/* Generate light "GIF-style" preview loops from the full optimized videos.
 *
 * Public site shows these silent, low-res, ~7s loops ("ngó sơ thôi").
 * The full videos stay OUT of the public repo and live behind the Worker (R2).
 *
 *   videos/<slug>.mp4         (full, local only -> uploaded to R2)
 *     -> previews/<slug>.mp4         (640px, 15fps, muted, ~7s loop)
 *     -> previews/posters/<slug>.jpg (640px poster)
 *
 * Usage: npm run previews
 */
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readdir, mkdir, stat, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SRC = path.join(ROOT, "videos");
const SRC_POSTERS = path.join(SRC, "posters");
const OUT = path.join(ROOT, "previews");
const OUT_POSTERS = path.join(OUT, "posters");

const PREVIEW_WIDTH = 640;
const FPS = 15;
const START = "1";   // skip first second (often a black/intro frame)
const LEN = "7";     // 7-second taste

function checkFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); }
  catch { console.error("✖ ffmpeg not found on PATH."); process.exit(1); }
}

async function main() {
  checkFfmpeg();
  await mkdir(OUT_POSTERS, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith(".mp4"));
  if (!files.length) { console.log(`No full videos in ${SRC}.`); return; }

  let done = 0, failed = 0;
  for (const file of files) {
    const slug = path.basename(file, ".mp4");
    const src = path.join(SRC, file);
    const outMp4 = path.join(OUT, `${slug}.mp4`);
    const outJpg = path.join(OUT_POSTERS, `${slug}.jpg`);
    process.stdout.write(`→ ${slug} … `);
    try {
      await run("ffmpeg", [
        "-y", "-ss", START, "-t", LEN, "-i", src,
        "-vf", `scale=${PREVIEW_WIDTH}:-2,fps=${FPS}`,
        "-an",
        "-c:v", "libx264", "-profile:v", "main", "-preset", "veryfast",
        "-crf", "30", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        outMp4,
      ]);
      // poster: reuse the full poster if present, else grab a frame
      const fullPoster = path.join(SRC_POSTERS, `${slug}.jpg`);
      if (existsSync(fullPoster)) {
        await run("ffmpeg", ["-y", "-i", fullPoster, "-vf", `scale=${PREVIEW_WIDTH}:-2`, "-q:v", "5", outJpg]);
      } else {
        await run("ffmpeg", ["-y", "-ss", START, "-i", src, "-frames:v", "1", "-vf", `scale=${PREVIEW_WIDTH}:-2`, "-q:v", "5", outJpg]);
      }
      const { size } = await stat(outMp4);
      console.log(`ok (${(size / 1e6).toFixed(2)} MB)`);
      done++;
    } catch (err) {
      console.log("FAILED");
      console.error("  " + String(err.stderr || err.message).split("\n").slice(-2).join("\n  "));
      failed++;
    }
  }
  console.log(`\n✔ ${done} previews · ${failed} failed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
