# REALITECH Showcase — project guide

A **private, invitation-gated** showcase of REALITECH's delivered projects, live at
**https://showcase.realitech.vn**. Visitors must enter an access code; full demo videos
are served only through a Cloudflare Worker after unlocking.

> Standalone repo (`github.com/realitechteam/realitech-showcase`). NOT part of the
> `realitech-platform` monorepo (`github.com/realitechteam/realitech-platform`), but under
> the same `realitechteam` account. They share brand, the `realitech.vn` domain, and the
> Cloudflare account.

## Stack & layout

Pure front-end (HTML/CSS/vanilla JS ES modules, no build step) on **GitHub Pages**, plus a
**Cloudflare Worker** for the access gate and a **private R2 bucket** for full videos.

```
index.html            shell: entry gate, hero, sections, engine, CTA, lightbox, lead modal
styles.css            design system — tokens mirror the platform (see "Design system")
src/videos.js         content manifest + config (GATE.api, LEADS.api, BRAND, CATEGORIES)
src/app.js            rendering, entry gate, gated playback, Book Demo lead form
previews/             light intro-trimmed preview loops (~6MB) + posters  [COMMITTED]
videos/               full optimized videos + raw sources  [GITIGNORED → live in R2]
scripts/optimize.mjs  raw → full optimized mp4 + poster (skips INTRO_SKIP=5s logo intro)
scripts/make-previews.mjs  full → silent ~7s 640px preview loops
worker/               Cloudflare Worker (the access gate)
  src/index.js        /api/unlock, /api/verify, /v/<slug>.mp4 (R2 stream, range)
  wrangler.jsonc      bindings + custom domain gate.realitech.vn
  .secrets.local      ACCESS_PASSWORD + TOKEN_SECRET  [GITIGNORED — never commit]
assets/               official logo (white/light/color), favicon, OG
CNAME, .nojekyll      GitHub Pages custom domain + raw serving
```

## Commands

```bash
npm run dev        # serve locally on :5173
npm run optimize   # raw videos/raw/ → videos/<slug>.mp4 + posters (intro-trimmed)
npm run previews   # videos/<slug>.mp4 → previews/<slug>.mp4 + posters
```
`slug` MUST equal `normalize(originalDriveFilename)` (lowercase, non-alphanumerics → `-`)
so the scripts map files automatically. Edit content in `src/videos.js`.

## Architecture

**Entry gate (whole site).** `index.html` head adds `html.locked` before paint unless a
valid token is in `localStorage.rt_access`. The `#entryGate` overlay covers everything;
unlocking removes the lock. noindex.

**Access gate Worker** (`worker/`, name `realitech-gate`, → **gate.realitech.vn**):
- `POST /api/unlock {code}` → resolves the master `ACCESS_PASSWORD` secret OR a per-client
  KV code `code:<CODE>` → `{client}`. Logs each entry to KV (`access:<ts>:<code>`) and
  alerts the team (deduped per code/day) via `ALERT_WEBHOOK` (Lark) / `RESEND_API_KEY`.
  Returns a 7-day HMAC token.
- `GET /v/<slug>.mp4?t=<token>` → streams the full video from private R2 with Range support;
  401 without a valid token.
- Full videos live in R2 bucket `realitech-showcase-videos` (NOT in the repo).

**Book Demo → platform Leads.** The Book Demo form (entry gate + CTA) POSTs directly to the
platform's public endpoint `POST https://api.realitech.vn/leads` (fields: `business_name*`,
`phone*`, `email?`, `role?`, `needs?`, `demo_project?`, `source:"showcase"`). Leads land in
MongoDB and show in **cpn.realitech.vn/leads**; the API auto-emails partner@realitech.dev.
CORS already allows the showcase origin. Config in `src/videos.js` → `LEADS`.

## Design system

Tokens/fonts mirror the platform's
`realitech-platform/realitech-homepage/components/Style/GlobalStyles.js` (there is no shared
package — values are copied, keep in sync manually): brand cyan `#57CEDB` / `#3ba8b5`,
surfaces `--bg-0..3`, text `--fg-0..3`, spacing `--s-*`, radius `--r-*`, `--glow-cyan`;
fonts **Be Vietnam Pro** + **JetBrains Mono**.

## Deploy

**Frontend (Pages):** commit, then push `main` as the **`realitechteam`** account:
```bash
gh auth switch --user realitechteam
git push "https://x-access-token:$(gh auth token)@github.com/realitechteam/realitech-showcase.git" main
```
GitHub Pages auto-rebuilds; custom domain `showcase.realitech.vn` (Cloudflare CNAME, DNS-only).

**Worker:** from `worker/`, with `CLOUDFLARE_ACCOUNT_ID=fdc3fa7b6f02edb0234b6f4bb12e2e98`:
```bash
npx wrangler deploy
npx wrangler secret put ACCESS_PASSWORD     # change master code
npx wrangler secret put TOKEN_SECRET        # rotate to force all sessions to re-login
```

## Ads landing — ads.realitech.vn (`ads/`)

A **public** paid-ads marketing landing page (Descript-style: hero + framed video, client
logos, feature cards, Book Demo CTA). Separate from the gated showcase. Lives in `ads/`:
```
ads/public/   index.html, styles.css, app.js, assets/ (logo, client logos, preview media)
ads/wrangler.jsonc   Workers-static-assets config → custom domain ads.realitech.vn
```
- Same platform design tokens (Be Vietnam Pro + cyan). The framed-video look is `.frame`.
- **Book Demo** posts to `https://api.realitech.vn/leads` with `source:"ads"` and captures
  **UTM params** (utm_source/campaign/term/gclid…) into the lead's `needs`/`demo_project`
  for ad attribution → visible in cpn.realitech.vn/leads.
- Served by a **second Cloudflare Worker `realitech-ads`** (static assets, no code), NOT
  GitHub Pages (Pages allows only one custom domain per repo). Deploy:
  ```bash
  cd ads && CLOUDFLARE_ACCOUNT_ID=fdc3fa7b6f02edb0234b6f4bb12e2e98 npx wrangler deploy
  ```
  Media in `ads/public/assets/media/` are intro-trimmed preview loops copied from `previews/`.

## Operations

```bash
# from worker/, CLOUDFLARE_ACCOUNT_ID=fdc3fa7b6f02edb0234b6f4bb12e2e98, KV id below
NS=9a9b94da77b3441894cf0269908f5e42
# issue a per-client code (so the access log shows their name):
npx wrangler kv key put --namespace-id $NS "code:VINHOMES" '{"client":"Vinhomes"}' --remote
# see who has accessed:
npx wrangler kv key list --namespace-id $NS --prefix "access:" --remote
```
Master access code lives in `worker/.secrets.local` (gitignored). Lark alerts go to the
team group (webhook in the `ALERT_WEBHOOK` secret).

## Gotchas

- **Two GitHub accounts** on this machine: `realitechteam` (owns this repo AND the platform)
  and `datnpq` (personal, not used for this project). Push as `realitechteam`.
- **VR STEAM is excluded (NDA)** — never re-add the `screenrecording-*` clips to the public
  repo. Their raw/optimized files stay local in `videos/_private/` (gitignored).
- **Intro trim:** `optimize.mjs` skips the first 5s (old partner-logo intro). Per-clip
  override via `INTRO_OVERRIDE` if 5s is wrong; then re-run `optimize` + `previews`.
- **Entry gate is client-side** — preview/HTML files are still URL-fetchable from Pages;
  only the full videos are hard-gated (R2 + token). For bulletproof, put the site behind
  Cloudflare Access (not done).
- The Worker custom domain is **gate.realitech.vn** (`api.realitech.vn` was already taken).
