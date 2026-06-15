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

## Marketing landing pages — ads / partner / affiliate

**Public** growth-funnel landing pages. Each is its own subdomain + Cloudflare Worker
(static assets, no code), all sharing the platform design system (Be Vietnam Pro + cyan,
Descript-style hero + framed video `.frame`), all feeding leads into cpn.realitech.vn with a
distinct `source`. NOT on GitHub Pages (Pages allows only one custom domain per repo).

| Folder | Domain | Worker | Lead `source` | Audience |
|---|---|---|---|---|
| `ads/` | ads.realitech.vn | realitech-ads | `ads` | paid traffic |
| `partner/` | partner.realitech.vn | realitech-partner | `partner` | agencies / resellers / SIs |
| `affiliate/` | affiliate.realitech.vn | realitech-affiliate | `affiliate` | referrers / creators |

Each: `<folder>/public/` (index.html, styles.css, app.js, assets/) + `<folder>/wrangler.jsonc`.
- **Leads** POST to `https://api.realitech.vn/leads` with the page's `source` + **UTM capture**
  (utm_source/campaign/term/gclid → `needs`/`demo_project`) for attribution in cpn.
- `partner/` & `affiliate/` share a generic `app.js` driven by `window.RT` (source + form copy)
  set in their index.html. `ads/` has its own app.js (video feature cards).
- **`ads/` is an industry-segmented PPC landing** (modeled on mywebar.com): hero with five
  industry tags → an audience grid (`.tcard` links, `.grid--auto`) → five `.seg` detail
  sections: **Retail** (ar-configurator), **Marketing** (webar), **Enterprise** (vr-training,
  folds in process training/equipment/onboarding), **Media & Art** (mr-hand-tracking),
  **Education** (mixed-reality walkthrough). Agency/reseller is NOT an industry — it's a
  separate `.reseller` band (`id="reseller"`) that funnels to partner.realitech.vn (resell at
  25–40%). The Book-Demo modal's role select IS the segment (`retail|marketing|enterprise|
  media|education|agency|other`); segment CTAs use `data-book="<seg>"` to preselect it and tag
  the lead (`role` + `[ads:<seg>]` in needs). Segment videos lazy-load via `video[data-seg]`
  + `data-src` (wireSegVideos). ads-only `.seg`/`.atags`/`.reseller`/`.grid--auto` CSS lives
  in ads/public/styles.css — do NOT cp partner's styles.css over it.
- **Per-segment ad URLs** (point each campaign at its own): pretty paths
  `ads.realitech.vn/{retail|marketing|enterprise|media|education}` (+ aliases ecommerce/shop,
  mkt/marketer, business/training/train, art/gallery/museum, edu/school/teacher) and
  `/agency` (+ reseller/partner) for the reseller band — all also as `?seg=<seg>` (composes
  with UTM). Enabled by `not_found_handling: "single-page-application"` in ads/wrangler.jsonc
  (SPA fallback → index.html); `routeSegment()` in app.js reads path-or-`?seg`, scrolls to +
  flashes the matching `.seg` section (or the `#reseller` band for agency), highlights the
  hero tag, and sets `landingSeg` so the Book-Demo form preselects that segment. **Asset refs
  in ads/ must stay root-absolute** (`/assets/…`, `/styles.css`, `/app.js`) so they resolve
  under a sub-path — do not make them relative.
- **Visual "wow" layer** (ads/partner/affiliate, all additive + `prefers-reduced-motion`
  safe — see the `wireWow()` block in each app.js + the "Visual wow layer" CSS block):
  animated cyan **aurora** blobs injected into `.atmos`; **pointer-reactive hero** (cursor
  glow `--px/--py` + 3D `.frame--hero` tilt; `.hero__title em` gradient shimmer); **holographic
  `.tcard`** (cursor spotlight `--mx/--my` + hover sheen sweep); **count-up** `.stat__num` on
  scroll-in (only values with exactly one integer animate — ranges like `25–40%` stay static);
  logo strip → slow **marquee** (`.proof__logos.marquee` + cloned `.proof__track`). The ads
  hero also has an **interactive WebGL viewport** (`ads/public/hero3d.js`, `type=module`,
  Three.js 0.160 from jsdelivr): a holographic icosahedron (wireframe + points) you drag-rotate
  inside a drifting point cloud. `initHeroWebGL()` in app.js only injects it on desktop with
  WebGL + no reduced-motion; the `<video>` is the fallback and old browsers never load the
  module. CSS: `.frame--hero.webgl` fades the canvas in / video out. The portal does NOT have
  this layer yet (functional app surface).
- `partner/` & `affiliate/` follow a **dual-track program layout** (modeled on
  magicblocks.ai/partner-program): hero with concrete numbers (partner margin 25%
  default up to 40% / affiliate commission 5% base up to 10% — the base values are the
  portal signup defaults, keep in sync),
  two-track comparison cards, how-it-works steps, industry use cases, FAQ (`<details>`
  accordion), and "Sign in to the portal" links. All CTAs (`data-book`) redirect to
  `portal.realitech.vn/signup?type=…`; the two styles.css files are identical — edit
  one, `cp` to the other (same for app.js).
- **i18n + theming** (ads/, partner/, affiliate/ AND the portal): Vietnamese is inline/default; English lives
  in `data-en` attributes (inner markup uses `&quot;` for quotes), swapped via
  `setLang()` in app.js (button `#langBtn`, localStorage `rt_lang`). Light/dark theme via
  `html[data-theme]` CSS variable overrides (light palette mirrors realitech.vn: white
  surfaces, navy `#002140` text, teal-ink `#2f8c9b` for accent TEXT — `--accent-ink`),
  toggle `#themeBtn`, localStorage `rt_theme`, default = OS preference (no-FOUC inline
  script in `<head>`). Logos swap white↔color via `img[data-logo]`. The portal renders the
  same pattern server-side (single-quoted `data-en='…'` attributes in template literals;
  bilingual error messages passed as `{vi,en}` objects; `UI_SCRIPT` in `page()` does the
  swapping; admin page intentionally stays English). ads/app.js holds bilingual JS strings
  (modal dict `L`, feature `CARDS` with `*_vi` fields).
- `assets/media/` are intro-trimmed preview loops copied from `previews/`.
- Deploy any page: `cd <folder> && CLOUDFLARE_ACCOUNT_ID=fdc3fa7b6f02edb0234b6f4bb12e2e98 npx wrangler deploy`

## Promotion portal + shared DB — portal.realitech.vn (`portal/`)

Self-serve portal for partners & affiliates, on **Cloudflare D1** (shared "promotion" DB,
decoupled from the platform MongoDB). Worker `realitech-portal`, server-rendered HTML + D1.

- **D1 `realitech-promo`** (id `dbfb2724-01fd-4c21-9998-fed75f95fc50`), schema in
  `portal/schema.sql`: `accounts` (partner|affiliate|admin, status, ref_code,
  commission_rate, discount_rate), `referrals` (lead + stage + deal_value + commission,
  `account_id` = referrer), `payouts` (account_id, amount, period, method, note),
  `events` (ads/showcase promo events).
- **Flows:** affiliate signup → **auto-active** + ref code → dashboard. partner signup →
  **pending** → admin approves (sets commission/discount) → active. Login = signed
  session cookie (`rt_portal`, HMAC `SESSION_SECRET`). Passwords = PBKDF2 (Web Crypto).
- **Pages:** `/login`, `/signup?type=affiliate|partner`, `/dashboard` (referrals + stage +
  commission/discount + share links + earned/paid/balance stats + payout history),
  `/admin` (approve partners, move pipeline → auto commission = deal_value × rate,
  record payouts per account via `POST /admin/payout`).
- **`POST /api/referral`** (public, CORS): landing pages write referrals here (with `?ref`
  attribution to an account) AND it forwards a copy to `api.realitech.vn/leads` (cpn).
  Wiring: `ads/` Book Demo → `/api/referral` (source `ads`); `partner/` & `affiliate/`
  CTAs → `portal.realitech.vn/signup?type=…` (via `window.RT.signupUrl`).
- **Secrets** (`portal/.secrets.local`, gitignored): `SESSION_SECRET`, `BOOTSTRAP_SECRET`,
  plus admin login (partner@realitech.dev). First admin created once via
  `POST /api/admin/bootstrap` (header `X-Bootstrap: <BOOTSTRAP_SECRET>`).
- Deploy: `cd portal && CLOUDFLARE_ACCOUNT_ID=fdc3fa7b6f02edb0234b6f4bb12e2e98 npx wrangler deploy`.
  Migrate schema: `npx wrangler d1 execute realitech-promo --remote --file schema.sql`.

> Showcase access events are mirrored into D1 `events` (type `showcase_access`) by the gate
> Worker (`DB` binding in `worker/wrangler.jsonc`) in addition to its KV log.

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
