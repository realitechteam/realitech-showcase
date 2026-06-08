# REALITECH — Showcase

An immersive, B2B-facing showcase for REALITECH's spatial-computing work:
Digital Twin, VR Training, AR Commerce, Spatial Navigation & Mixed Reality —
all framed around the in-house engine, **RealitechEditor**.

Pure front-end (HTML / CSS / vanilla JS modules). No build step. Deploys
anywhere static — Vercel, Netlify, Cloudflare Pages, or a `realitech.dev` subpath.

---

## 1. Run it now

```bash
npm run dev      # serves on http://localhost:5173
```

It works **immediately** — every clip shows a designed gradient poster until you
drop the real videos in. Open it to feel the layout, motion and copy first.

## 2. Add the real videos (the "ngầu" part)

The clips live in your Google Drive showcase folder. Web autoplay-loops need
light, self-hosted MP4 — so we transcode once:

```bash
# a) Download the Drive folder, drop every file into:
videos/raw/

#    Keep the ORIGINAL file names (e.g. "Digital Twin Smart Building.mp4").
#    The script maps each file name -> the right slot automatically.

# b) Transcode + generate posters (needs ffmpeg on PATH):
npm run optimize
```

That produces:

- `videos/<slug>.mp4` — H.264, muted, `+faststart` (hero/engine clips at 1080p, cards at 720p)
- `videos/posters/<slug>.jpg` — poster frame

Reload the page — cards swap from gradient posters to live, looping video, and the
hero + engine sections gain their cinematic backdrops. Nothing else to wire.

> Don't want to host the heavy 1.1 GB `RealitechEditor.mov` raw — `optimize`
> compresses it down for the engine section automatically. For production, push
> `videos/` to a CDN (Cloudflare R2 / Bunny) and the page just works.

## 3. Edit content

Everything is data-driven from **`src/videos.js`**:

- `CATEGORIES` — the five verticals, their order, copy, and the clips inside each.
- `BRAND.heroSlug` / `ENGINE.slug` — which clips power the hero + engine backdrops.
- Each item's `title`, `tag`, `line` — the B2B value copy shown on hover / in the lightbox.

`slug` **must** equal `normalize(originalDriveTitle)` (lowercase, non-alphanumerics
→ `-`) so `npm run optimize` can match downloaded files. If you rename a raw file,
update its slug to match.

## Structure

```
index.html        layout shell + fonts
styles.css        "blueprint of reality" design system
src/videos.js     content manifest (edit me)
src/app.js        rendering, autoplay-on-scroll, lightbox
scripts/optimize.mjs   ffmpeg pipeline (raw -> web mp4 + posters)
videos/raw/       <- drop Drive downloads here
videos/           <- optimized output (gitignore for production)
```

---

Reality, engineered. · partner@realitech.dev
