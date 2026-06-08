/**
 * REALITECH Showcase — private access gate Worker
 *
 * The whole showcase is private. A visitor must enter an access code to get in.
 * - One master code  (secret ACCESS_PASSWORD) opens the site for everyone you give it to.
 * - Optional per-client codes (KV: `code:<CODE>` -> {client}) tell you exactly WHO is viewing.
 * Every successful entry is logged + emailed to the team (deduped once per code per day).
 *
 * Full videos live in a PRIVATE R2 bucket and stream from here only with a valid token.
 *
 * Routes:
 *   POST /api/unlock  {code}                 -> { ok, token, exp, client }
 *   GET  /api/verify?t=<token>               -> { ok }
 *   GET  /v/<slug>.mp4?t=<token>             -> gated video stream (range)
 *
 * Bindings:  VIDEOS (R2), LEADS (KV), EMAIL (send_email)
 * Secrets:   ACCESS_PASSWORD, TOKEN_SECRET
 * Vars:      LEAD_TO, LEAD_FROM, ALLOWED_ORIGINS
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const enc = new TextEncoder();

/* ---------- base64url ---------- */
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlToBytes = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const bin = atob(s + "=".repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/* ---------- HMAC token: payload.signature ---------- */
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function mintToken(secret, sub) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS, sub: sub || "" })));
  const key = await hmacKey(secret);
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${payload}.${sig}`;
}
async function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(payload));
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/* ---------- CORS ---------- */
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
const json = (obj, status, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...extra } });

/* ---------- rate limit (per IP) ---------- */
async function rateLimited(env, ip, bucket, limit, windowSec) {
  if (!env.LEADS) return false;
  const key = `rl:${bucket}:${ip}`;
  const cur = parseInt((await env.LEADS.get(key)) || "0", 10);
  if (cur >= limit) return true;
  await env.LEADS.put(key, String(cur + 1), { expirationTtl: windowSec });
  return false;
}

/* ---------- resolve an entered code -> { ok, client } ---------- */
async function resolveCode(env, code) {
  if (!code) return { ok: false };
  if (env.ACCESS_PASSWORD && code === env.ACCESS_PASSWORD) return { ok: true, client: "Master link" };
  if (env.LEADS) {
    const rec = await env.LEADS.get(`code:${code}`);
    if (rec) {
      let client = code;
      try { client = JSON.parse(rec).client || code; } catch {}
      return { ok: true, client };
    }
  }
  return { ok: false };
}

/* ---------- log + notify an entry (deduped once / code / day) ---------- */
async function recordAccess(env, info) {
  if (env.LEADS) {
    try { await env.LEADS.put(`access:${Date.now()}:${info.code}`, JSON.stringify(info), { expirationTtl: 60 * 60 * 24 * 180 }); } catch {}
  }
  const day = new Date().toISOString().slice(0, 10);
  let firstToday = true;
  if (env.LEADS) {
    const seenKey = `seen:${info.code}:${day}`;
    if (await env.LEADS.get(seenKey)) firstToday = false;
    else { try { await env.LEADS.put(seenKey, "1", { expirationTtl: 60 * 60 * 36 }); } catch {} }
  }
  if (firstToday) await notify(env, info);
}

/* ---------- alert the team: Lark/Slack/Discord webhook and/or Resend email ---------- */
async function notify(env, info) {
  const line = `👁️ Showcase accessed — ${info.client}\nCode: ${info.code}\nIP: ${info.ip} (${info.geo})\nDevice: ${info.ua}\nWhen: ${info.ts}`;

  if (env.ALERT_WEBHOOK) {
    try {
      const u = env.ALERT_WEBHOOK;
      // Lark/Feishu: {msg_type,content.text} · Slack: {text} · Discord: {content}
      const body = /feishu|larksuite/i.test(u)
        ? { msg_type: "text", content: { text: line } }
        : /discord/i.test(u)
        ? { content: line }
        : { text: line };
      await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {}
  }

  if (env.RESEND_API_KEY && env.LEAD_TO && env.LEAD_FROM) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `REALITECH Showcase <${env.LEAD_FROM}>`,
          to: [env.LEAD_TO],
          subject: `👁️ Showcase accessed — ${info.client}`,
          text: line,
        }),
      });
    } catch {}
  }
}

/* ---------- handlers ---------- */
async function handleUnlock(req, env, cors, ctx) {
  const ip = req.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (await rateLimited(env, ip, "unlock", 12, 600)) return json({ ok: false, error: "rate_limited" }, 429, cors);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, cors); }
  const code = String(body.code ?? body.password ?? "").trim();

  const res = await resolveCode(env, code);
  if (!res.ok) return json({ ok: false, error: "invalid" }, 401, cors);

  const info = {
    client: res.client, code,
    ip,
    geo: [req.cf?.city, req.cf?.country].filter(Boolean).join(", ") || "—",
    ua: (req.headers.get("User-Agent") || "").slice(0, 240),
    ts: new Date().toISOString(),
  };
  // log + email in the background so the user isn't blocked
  if (ctx?.waitUntil) ctx.waitUntil(recordAccess(env, info));
  else await recordAccess(env, info);

  const token = await mintToken(env.TOKEN_SECRET, res.client);
  return json({ ok: true, token, exp: Date.now() + TOKEN_TTL_MS, client: res.client }, 200, cors);
}

async function handleVideo(slug, req, env, url) {
  if (!SLUG_RE.test(slug)) return new Response("Not found", { status: 404 });
  if (!(await verifyToken(url.searchParams.get("t"), env.TOKEN_SECRET))) return new Response("Locked", { status: 401 });

  const range = req.headers.get("Range");
  const opts = {};
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const offset = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : undefined;
      opts.range = end !== undefined ? { offset, length: end - offset + 1 } : { offset };
    }
  }
  const obj = await env.VIDEOS.get(`${slug}.mp4`, opts);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", "inline");
  const total = obj.size;
  if (range && obj.range) {
    const start = obj.range.offset ?? 0;
    const len = obj.range.length ?? total - start;
    headers.set("Content-Range", `bytes ${start}-${start + len - 1}/${total}`);
    headers.set("Content-Length", String(len));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(total));
  return new Response(obj.body, { status: 200, headers });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/api/unlock" && req.method === "POST") return handleUnlock(req, env, cors, ctx);
    if (url.pathname === "/api/verify") {
      const ok = await verifyToken(url.searchParams.get("t"), env.TOKEN_SECRET);
      return json({ ok }, ok ? 200 : 401, cors);
    }
    const vm = /^\/v\/([^/]+)\.mp4$/.exec(url.pathname);
    if (vm && req.method === "GET") return handleVideo(vm[1], req, env, url);

    if (url.pathname === "/" || url.pathname === "/health")
      return json({ service: "realitech-gate", ok: true }, 200, cors);
    return new Response("Not found", { status: 404 });
  },
};
