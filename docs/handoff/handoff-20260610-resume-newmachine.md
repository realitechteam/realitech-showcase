# Handoff — Resume on a new machine

**Created:** 2026-06-10 · **Topic:** REALITECH Showcase + Growth ecosystem · **Status:** All live; Phase-1 portal done
**Repo:** `github.com/realitechteam/realitech-showcase` (push as the **`realitechteam`** GitHub account)

> This file is for picking the project up on a DIFFERENT computer. For full history/context
> read `docs/handoff/handoff-20260608-1530.md`; for architecture/commands read `CLAUDE.md`.
> Secret VALUES are intentionally NOT in this file (the repo is public) — see "Carry over" below.

---

## What's live right now

| Surface | URL | Host | Notes |
|---|---|---|---|
| Showcase (gated) | showcase.realitech.vn | GitHub Pages (this repo) | entry code; master code is in `worker/.secrets.local` |
| Video gate | gate.realitech.vn | Worker `realitech-gate` | R2 video stream + access log + Lark alert |
| Ads landing | ads.realitech.vn | Worker `realitech-ads` | Book Demo → promo DB |
| Partner landing | partner.realitech.vn | Worker `realitech-partner` | CTA → portal signup |
| Affiliate landing | affiliate.realitech.vn | Worker `realitech-affiliate` | CTA → portal signup |
| Promotion portal | portal.realitech.vn | Worker `realitech-portal` + D1 | partner/affiliate accounts, dashboard, admin |

All marketing leads → **Cloudflare D1 `realitech-promo`** (shared promo DB) and forwarded to
`api.realitech.vn/leads` (platform cpn). Admin of the portal: `partner@realitech.dev`.

---

## Resume steps on the new machine

1. **Clone:** `git clone https://github.com/realitechteam/realitech-showcase.git`
2. **GitHub auth:** log in as **realitechteam** (owns this repo). `gh auth login` (or add the
   account). Push using:
   `git push "https://x-access-token:$(gh auth token)@github.com/realitechteam/realitech-showcase.git" main`
   (The machine may also have a `datnpq` account — do NOT push as datnpq.)
3. **Cloudflare auth:** `npx wrangler login` → pick the account that owns `realitech.vn`
   (**account id `fdc3fa7b6f02edb0234b6f4bb12e2e98`**). Needed for any `wrangler deploy`.
4. **ffmpeg + node** required only if re-processing video (`npm run optimize` / `previews`).

## Carry over (NOT in git — copy from the old machine, or you don't need them)

These are gitignored and will be MISSING after a fresh clone:

- **`worker/.secrets.local`** — showcase gate master code + `TOKEN_SECRET`.
- **`portal/.secrets.local`** — portal `SESSION_SECRET`, `BOOTSTRAP_SECRET`, admin email + password.
- **`videos/`** — full + raw video (≈3 GB). Source of truth for R2; the optimized full clips
  are already uploaded to R2 and the public site uses `previews/` (committed). You only need
  `videos/` again to re-optimize/re-upload.

**Important:** the live Workers already hold their secrets on Cloudflare — you do NOT need the
secret values to keep the system running or to `wrangler deploy` again (secrets persist on CF).
You only need the values to (a) log into the portal admin / showcase, or (b) rotate them.
Those values are in the two `.secrets.local` files above and in the chat history. If you don't
copy them, you can rotate instead: `wrangler secret put <NAME>` per Worker, and re-bootstrap a
portal admin via `POST /api/admin/bootstrap` after setting a new `BOOTSTRAP_SECRET`.

## Infra IDs (not secret)

- Cloudflare account: `fdc3fa7b6f02edb0234b6f4bb12e2e98` · zone `realitech.vn`: `bb24733f5fa24ad6944c6efd476289d6`
- D1 `realitech-promo`: `dbfb2724-01fd-4c21-9998-fed75f95fc50` (binding `DB` in `portal/wrangler.jsonc`)
- KV `LEADS` (gate): `9a9b94da77b3441894cf0269908f5e42`
- R2 bucket: `realitech-showcase-videos`
- Workers: realitech-gate, realitech-ads, realitech-partner, realitech-affiliate, realitech-portal

## Repo map

```
index.html styles.css src/ previews/   → showcase (GitHub Pages)
worker/                                 → gate Worker (R2 video access)
ads/ partner/ affiliate/                → landing pages (Workers, static assets)
portal/  (src/index.js, schema.sql)     → portal Worker + D1 promo DB
scripts/ optimize.mjs make-previews.mjs → video pipeline
CLAUDE.md                               → architecture, commands, deploy, ops
docs/handoff/                           → handoffs
```

---

## Pending / next

- 🧹 Delete test leads in **cpn.realitech.vn/leads**: "SMOKE TEST", "ADS TEST", "PORTAL TEST Biz".
- 🔑 Rotate the old Cloudflare **Global API Key** (was pasted in chat during DNS setup).
- 💰 Finalize commission/discount numbers (defaults: affiliate 10%, partner 20% — placeholders).
- 🔗 Wire **showcase access events → D1 `events`** (currently only in the gate Worker's KV) so
  the promo DB fully covers "ads + showcase" too.
- 📈 Portal Phase 2: payouts, auto-emails (account approved / referral won), reporting, per-account
  rate editing, multi-tier.
- 🎬 Optional: produce the real sizzle reel from `SIZZLE-REEL.md`; issue per-client showcase codes;
  Cloudflare Access for full lockdown.

To continue in a new conversation: `/continue` (or reference this file).
