/**
 * REALITECH Promotion Portal (portal.realitech.vn)
 * Cloudflare Worker + D1. Self-serve portal for partners & affiliates.
 *
 * - Affiliate signup -> auto-active account + referral code.
 * - Partner signup   -> pending; REALITECH admin approves (sets commission/discount).
 * - Dashboard: my referrals + stage + commission/discount + share links.
 * - Admin: approve partners, update referral stage / deal value (auto commission).
 * - POST /api/referral: landing pages (ads/partner/affiliate/showcase) write here
 *   (shared promo DB) and it forwards a copy to the platform leads API (cpn).
 *
 * Bindings: DB (D1).  Secrets: SESSION_SECRET, BOOTSTRAP_SECRET.
 * Vars: CPN_LEADS_URL, ALLOWED_ORIGINS.
 */

const enc = new TextEncoder();
const SESSION_TTL = 1000 * 60 * 60 * 24 * 14; // 14 days
const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const now = () => new Date().toISOString();

/* ---------- small utils ---------- */
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (s) => new Uint8Array(s.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
const esc = (s) => String(s == null ? "" : s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
const uuid = () => crypto.randomUUID();
function refCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(7))].map((b) => a[b % 32]).join("");
}
const money = (n) => "₫" + Math.round(n || 0).toLocaleString("en-US");
const pct = (r) => Math.round((r || 0) * 100) + "%";

/* ---------- password (PBKDF2) ---------- */
async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256));
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: hex(await pbkdf2(password, salt)) };
}
async function verifyPassword(password, saltHex, hashHex) {
  return hex(await pbkdf2(password, fromHex(saltHex))) === hashHex;
}

/* ---------- session (HMAC cookie) ---------- */
async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function b64uToBytes(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); const p = s.length % 4 ? 4 - (s.length % 4) : 0; const bin = atob(s + "=".repeat(p)); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
async function signSession(payload, secret) {
  const p = b64u(enc.encode(JSON.stringify(payload)));
  const sig = b64u(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(p)));
  return p + "." + sig;
}
async function readSession(req, env) {
  const m = (req.headers.get("Cookie") || "").match(/rt_portal=([^;]+)/);
  if (!m) return null;
  const [p, sig] = m[1].split(".");
  if (!p || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), b64uToBytes(sig), enc.encode(p));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(b64uToBytes(p)));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}
function cookie(value, maxAge) {
  return `rt_portal=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/* ---------- responses ---------- */
const redirect = (to, headers = {}) => new Response(null, { status: 302, headers: { Location: to, ...headers } });
const html = (body, status = 200, headers = {}) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...headers } });
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...headers } });

function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  return { "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*", "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}

/* ============================== HTML SHELL ============================== */
const CSS = `
:root{--ink:#07090c;--ink2:#0c1117;--ink3:#131922;--line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.16);--text:#f5f7fa;--muted:#b0bcc8;--muted2:#6e7c8a;--cyan:#57cedb;--cyan2:#82e1e8;--onc:#053640;--green:#a0d911;--r:14px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--ink);color:var(--text);font-family:"Be Vietnam Pro",-apple-system,Segoe UI,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:24px clamp(16px,4vw,32px)}
.auth{max-width:440px;margin:0 auto;padding:7vh clamp(16px,4vw,24px)}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:26px}
.brand img{height:26px}
.topnav{display:flex;align-items:center;justify-content:space-between;padding:14px clamp(16px,4vw,32px);border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(7,9,12,.85);backdrop-filter:blur(12px);z-index:5}
.topnav img{height:24px}.topnav nav{display:flex;gap:18px;align-items:center}
.topnav nav a,.topnav nav span{font-size:.85rem;color:var(--muted)}
h1{font-weight:800;letter-spacing:-.02em;font-size:1.8rem}h2{font-weight:700;letter-spacing:-.01em;font-size:1.25rem;margin:0 0 14px}
.sub{color:var(--muted);margin:8px 0 22px}
.mono{font-family:"JetBrains Mono",monospace}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px}
label{display:block;font-size:.8rem;color:var(--muted);margin:12px 0 6px}
input,select,textarea{width:100%;background:var(--ink3);border:1px solid var(--line2);border-radius:10px;color:var(--text);padding:.72em .9em;font:inherit}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--cyan)}
.btn{display:inline-flex;align-items:center;gap:.4em;border:1px solid var(--line2);background:transparent;color:var(--text);border-radius:999px;padding:.62em 1.2em;font:600 .9rem "Be Vietnam Pro",sans-serif;cursor:pointer;transition:.25s}
.btn:hover{background:rgba(255,255,255,.06);text-decoration:none}
.btn-p{background:var(--cyan);color:var(--onc);border-color:var(--cyan)}.btn-p:hover{background:var(--cyan2)}
.btn-sm{padding:.4em .8em;font-size:.8rem}
.card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r);padding:22px}
.grid{display:grid;gap:16px}.g4{grid-template-columns:repeat(4,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
@media(max-width:760px){.g4{grid-template-columns:repeat(2,1fr)}.g2{grid-template-columns:1fr}}
.stat .n{font-size:1.9rem;font-weight:800;color:var(--cyan);letter-spacing:-.02em}
.stat .l{font-family:"JetBrains Mono",monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th{text-align:left;font-family:"JetBrains Mono",monospace;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted2);padding:10px 10px;border-bottom:1px solid var(--line)}
td{padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tag{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:.62rem;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid var(--line2);color:var(--muted)}
.st-new{color:#8aa0b3}.st-contacted{color:#d8c45a}.st-qualified{color:var(--cyan)}.st-proposal{color:#c79bf0}.st-won{color:var(--green);border-color:rgba(160,217,17,.4)}.st-lost{color:#ff6b6b}
.pending{color:#d8c45a}.active{color:var(--green)}.suspended{color:#ff6b6b}
.copy{display:inline-flex;align-items:center;gap:8px;background:var(--ink3);border:1px solid var(--line2);border-radius:8px;padding:.5em .7em;font-family:"JetBrains Mono",monospace;font-size:.8rem}
.err{color:#ff6b6b;font-size:.85rem;margin-top:10px}.ok{color:var(--green);font-size:.85rem;margin-top:10px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.muted{color:var(--muted)}.right{margin-left:auto}
.foot{color:var(--muted2);font-family:"JetBrains Mono",monospace;font-size:.7rem;text-align:center;padding:30px}
form.inline{display:flex;gap:6px;align-items:center}form.inline input,form.inline select{width:auto;padding:.4em .6em;font-size:.82rem}
`;
function page(title, body, opts = {}) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/><title>${esc(title)} · REALITECH Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>${CSS}</style></head><body>${opts.nav || ""}${body}<div class="foot">REALITECH Promotion Portal · partner@realitech.dev</div></body></html>`;
}
const LOGO = `<img src="https://showcase.realitech.vn/assets/logo-realitech-white.png" alt="REALITECH"/>`;
function topnav(acc) {
  return `<div class="topnav">${LOGO}<nav>
    ${acc.role === "admin" ? '<a href="/admin">Admin</a>' : '<a href="/dashboard">Dashboard</a>'}
    <span class="muted">${esc(acc.name)} · ${esc(acc.type)}</span>
    <a href="/logout" class="btn btn-sm">Log out</a></nav></div>`;
}

/* ============================== PAGES ============================== */
function loginPage(msg) {
  return page("Log in", `<div class="auth"><div class="brand">${LOGO}</div>
    <h1>Partner &amp; Affiliate Portal</h1><p class="sub">Log in to track your referrals, stages and commission.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
    <form method="POST" action="/login">
      <label>Email</label><input name="email" type="email" required/>
      <label>Password</label><input name="password" type="password" required/>
      <div class="row" style="margin-top:18px"><button class="btn btn-p" type="submit">Log in</button>
      <span class="right muted" style="font-size:.85rem">New? <a href="/signup?type=affiliate">Join as affiliate</a> · <a href="/signup?type=partner">Apply as partner</a></span></div>
    </form></div>`);
}
function signupPage(type, msg) {
  const isAff = type === "affiliate";
  return page(isAff ? "Join as affiliate" : "Apply as partner", `<div class="auth"><div class="brand">${LOGO}</div>
    <p class="eyebrow">${isAff ? "Affiliate program" : "Partner program"}</p>
    <h1>${isAff ? "Join the affiliate program" : "Apply to partner"}</h1>
    <p class="sub">${isAff ? "Instant account — get your referral link right away." : "We review every partner application by hand and reply within a business day."}</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
    <form method="POST" action="/signup?type=${esc(type)}">
      <label>${isAff ? "Your name / brand" : "Company / studio name"}</label><input name="name" required/>
      <label>Work email</label><input name="email" type="email" required/>
      <label>Phone / Zalo / WhatsApp</label><input name="phone"/>
      <label>Password</label><input name="password" type="password" minlength="8" required placeholder="At least 8 characters"/>
      <label>${isAff ? "Your audience / channels (optional)" : "About your business &amp; clients (optional)"}</label><textarea name="company" rows="2"></textarea>
      <div class="row" style="margin-top:18px"><button class="btn btn-p" type="submit">${isAff ? "Create account" : "Submit application"}</button>
      <span class="right muted" style="font-size:.85rem">Have an account? <a href="/login">Log in</a></span></div>
    </form></div>`);
}
function pendingPage() {
  return page("Application received", `<div class="auth"><div class="brand">${LOGO}</div>
    <h1>Application received ✓</h1>
    <p class="sub">Thanks for applying to the REALITECH Partner Program. Our team reviews every application by hand — we'll email you once your account is approved, usually within a business day.</p>
    <a class="btn" href="/login">Back to login</a></div>`);
}

function dashboardPage(acc, refs, totals) {
  const links = ["ads", "partner", "affiliate"].map((s) => `https://${s}.realitech.vn/?ref=${acc.ref_code}`);
  const rateLabel = acc.type === "affiliate" ? "Commission rate" : "Reseller discount";
  const rateVal = acc.type === "affiliate" ? pct(acc.commission_rate) : pct(acc.discount_rate);
  const rows = refs.length ? refs.map((r) => `<tr>
      <td>${esc(r.business_name)}<div class="muted" style="font-size:.78rem">${esc(r.email || r.phone || "")}</div></td>
      <td><span class="tag st-${r.stage}">${r.stage}</span></td>
      <td>${esc(r.source)}</td>
      <td>${r.deal_value ? money(r.deal_value) : "—"}</td>
      <td>${r.commission_amount ? money(r.commission_amount) : "—"}</td>
      <td class="muted mono" style="font-size:.75rem">${(r.created_at || "").slice(0, 10)}</td></tr>`).join("")
    : `<tr><td colspan="6" class="muted" style="padding:24px;text-align:center">No referrals yet. Share your link below to get started.</td></tr>`;
  return page("Dashboard", `<div class="wrap">
    <h1>Welcome, ${esc(acc.name)}</h1><p class="sub">Your ${esc(acc.type)} dashboard · status <span class="${acc.status}">${acc.status}</span></p>
    <div class="grid g4" style="margin-bottom:22px">
      <div class="card stat"><div class="n">${totals.count}</div><div class="l">Referrals</div></div>
      <div class="card stat"><div class="n">${totals.won}</div><div class="l">Won</div></div>
      <div class="card stat"><div class="n">${money(totals.earned)}</div><div class="l">Commission earned</div></div>
      <div class="card stat"><div class="n">${rateVal}</div><div class="l">${rateLabel}</div></div>
    </div>
    <div class="card" style="margin-bottom:22px"><h2>Your referral link</h2>
      <p class="muted" style="font-size:.85rem;margin-bottom:12px">Share any of these — anyone who books a demo through your link is attributed to you. Your code: <b class="mono">${acc.ref_code}</b></p>
      ${links.map((l) => `<div class="copy" style="margin:6px 8px 6px 0"><span>${esc(l)}</span></div>`).join("")}
    </div>
    <div class="card"><h2>Referrals</h2>
      <table><thead><tr><th>Business</th><th>Stage</th><th>Source</th><th>Deal value</th><th>Commission</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
    </div></div>`, { nav: topnav(acc) });
}

function adminPage(acc, pending, refs, accounts) {
  const pRows = pending.length ? pending.map((p) => `<tr>
      <td>${esc(p.name)}<div class="muted" style="font-size:.78rem">${esc(p.email)} · ${esc(p.phone || "")}</div>${p.company ? `<div class="muted" style="font-size:.78rem">${esc(p.company)}</div>` : ""}</td>
      <td>${esc(p.type)}</td>
      <td><form class="inline" method="POST" action="/admin/approve"><input type="hidden" name="id" value="${p.id}"/>
        <input name="commission_rate" type="number" step="0.01" min="0" max="1" value="${p.commission_rate}" title="commission rate" style="width:70px"/>
        <input name="discount_rate" type="number" step="0.01" min="0" max="1" value="${p.discount_rate}" title="discount rate" style="width:70px"/>
        <button class="btn btn-p btn-sm" type="submit">Approve</button></form></td>
      <td><form method="POST" action="/admin/reject"><input type="hidden" name="id" value="${p.id}"/><button class="btn btn-sm" type="submit">Reject</button></form></td></tr>`).join("")
    : `<tr><td colspan="4" class="muted" style="padding:18px;text-align:center">No pending applications.</td></tr>`;
  const rRows = refs.map((r) => `<tr>
      <td>${esc(r.business_name)}<div class="muted" style="font-size:.78rem">${esc(r.email || r.phone || "")}</div></td>
      <td>${esc(r.source)}${r.ref_name ? `<div class="muted" style="font-size:.74rem">via ${esc(r.ref_name)}</div>` : ""}</td>
      <td><form class="inline" method="POST" action="/admin/referral"><input type="hidden" name="id" value="${r.id}"/>
        <select name="stage">${STAGES.map((s) => `<option ${s === r.stage ? "selected" : ""}>${s}</option>`).join("")}</select>
        <input name="deal_value" type="number" step="1000" min="0" value="${r.deal_value || 0}" style="width:110px"/>
        <button class="btn btn-sm" type="submit">Save</button></form></td>
      <td>${r.commission_amount ? money(r.commission_amount) : "—"}</td></tr>`).join("");
  return page("Admin", `<div class="wrap">
    <h1>Admin</h1><p class="sub">Approve partners, set rates, and move referrals through the pipeline.</p>
    <div class="card" style="margin-bottom:22px"><h2>Pending applications (${pending.length})</h2>
      <table><thead><tr><th>Applicant</th><th>Type</th><th>Approve (comm / disc)</th><th></th></tr></thead><tbody>${pRows}</tbody></table></div>
    <div class="card"><h2>Referrals (${refs.length})</h2>
      <table><thead><tr><th>Business</th><th>Source</th><th>Stage / deal</th><th>Commission</th></tr></thead><tbody>${rRows}</tbody></table></div>
    </div>`, { nav: topnav(acc) });
}

/* ============================== HANDLERS ============================== */
async function getAccount(env, id) { return env.DB.prepare("SELECT * FROM accounts WHERE id=?").bind(id).first(); }

async function doSignup(req, env, url) {
  const type = url.searchParams.get("type") === "partner" ? "partner" : "affiliate";
  const f = await req.formData();
  const name = (f.get("name") || "").toString().trim();
  const email = (f.get("email") || "").toString().trim().toLowerCase();
  const phone = (f.get("phone") || "").toString().trim();
  const company = (f.get("company") || "").toString().trim().slice(0, 1000);
  const password = (f.get("password") || "").toString();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8)
    return html(signupPage(type, "Please enter a name, valid email and 8+ char password."), 400);
  const existing = await env.DB.prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();
  if (existing) return html(signupPage(type, "That email is already registered. Try logging in."), 400);
  const { salt, hash } = await hashPassword(password);
  const id = uuid();
  const active = type === "affiliate";
  const code = active ? refCode() : null;
  const commission = type === "affiliate" ? 0.1 : 0.0;
  const discount = type === "partner" ? 0.2 : 0.0;
  await env.DB.prepare(
    `INSERT INTO accounts (id,type,name,email,phone,company,password_hash,password_salt,status,ref_code,commission_rate,discount_rate,created_at,approved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, type, name, email, phone, company, hash, salt, active ? "active" : "pending", code, commission, discount, now(), active ? now() : null).run();
  if (active) {
    const token = await signSession({ sub: id, role: "affiliate", type, name, exp: Date.now() + SESSION_TTL }, env.SESSION_SECRET);
    return redirect("/dashboard", { "Set-Cookie": cookie(token, SESSION_TTL / 1000) });
  }
  return redirect("/pending");
}

async function doLogin(req, env) {
  const f = await req.formData();
  const email = (f.get("email") || "").toString().trim().toLowerCase();
  const password = (f.get("password") || "").toString();
  const acc = await env.DB.prepare("SELECT * FROM accounts WHERE email=?").bind(email).first();
  if (!acc || !(await verifyPassword(password, acc.password_salt, acc.password_hash)))
    return html(loginPage("Wrong email or password."), 401);
  if (acc.status !== "active") return html(loginPage(acc.status === "pending" ? "Your account is pending approval." : "Your account is not active."), 403);
  const role = acc.type === "admin" ? "admin" : acc.type;
  const token = await signSession({ sub: acc.id, role, type: acc.type, name: acc.name, exp: Date.now() + SESSION_TTL }, env.SESSION_SECRET);
  return redirect(role === "admin" ? "/admin" : "/dashboard", { "Set-Cookie": cookie(token, SESSION_TTL / 1000) });
}

async function showDashboard(env, sess) {
  const acc = await getAccount(env, sess.sub);
  if (!acc) return redirect("/logout");
  const refs = (await env.DB.prepare("SELECT * FROM referrals WHERE account_id=? ORDER BY created_at DESC LIMIT 200").bind(acc.id).all()).results || [];
  const totals = { count: refs.length, won: refs.filter((r) => r.stage === "won").length, earned: refs.reduce((s, r) => s + (r.stage === "won" ? r.commission_amount || 0 : 0), 0) };
  return html(dashboardPage(acc, refs, totals));
}

async function showAdmin(env, sess) {
  const acc = await getAccount(env, sess.sub);
  if (!acc || acc.type !== "admin") return new Response("Forbidden", { status: 403 });
  const pending = (await env.DB.prepare("SELECT * FROM accounts WHERE status='pending' ORDER BY created_at DESC").all()).results || [];
  const refs = (await env.DB.prepare(`SELECT r.*, a.name AS ref_name FROM referrals r LEFT JOIN accounts a ON a.id=r.account_id ORDER BY r.created_at DESC LIMIT 300`).all()).results || [];
  return html(adminPage(acc, pending, refs));
}

async function adminApprove(req, env, sess) {
  const acc = await getAccount(env, sess.sub); if (!acc || acc.type !== "admin") return new Response("Forbidden", { status: 403 });
  const f = await req.formData();
  const id = (f.get("id") || "").toString();
  const comm = Math.max(0, Math.min(1, parseFloat(f.get("commission_rate")) || 0));
  const disc = Math.max(0, Math.min(1, parseFloat(f.get("discount_rate")) || 0));
  const target = await getAccount(env, id);
  if (target) await env.DB.prepare("UPDATE accounts SET status='active', ref_code=COALESCE(ref_code,?), commission_rate=?, discount_rate=?, approved_at=? WHERE id=?")
    .bind(refCode(), comm, disc, now(), id).run();
  return redirect("/admin");
}
async function adminReject(req, env, sess) {
  const acc = await getAccount(env, sess.sub); if (!acc || acc.type !== "admin") return new Response("Forbidden", { status: 403 });
  const f = await req.formData();
  await env.DB.prepare("UPDATE accounts SET status='suspended' WHERE id=?").bind((f.get("id") || "").toString()).run();
  return redirect("/admin");
}
async function adminReferral(req, env, sess) {
  const acc = await getAccount(env, sess.sub); if (!acc || acc.type !== "admin") return new Response("Forbidden", { status: 403 });
  const f = await req.formData();
  const id = (f.get("id") || "").toString();
  const stage = STAGES.includes((f.get("stage") || "").toString()) ? f.get("stage").toString() : "new";
  const deal = Math.max(0, parseFloat(f.get("deal_value")) || 0);
  const r = await env.DB.prepare("SELECT * FROM referrals WHERE id=?").bind(id).first();
  if (r) {
    let commission = r.commission_amount || 0;
    if (stage === "won" && r.account_id) {
      const owner = await getAccount(env, r.account_id);
      commission = deal * ((owner && owner.commission_rate) || 0);
    } else if (stage !== "won") commission = 0;
    await env.DB.prepare("UPDATE referrals SET stage=?, deal_value=?, commission_amount=?, updated_at=? WHERE id=?").bind(stage, deal, commission, now(), id).run();
  }
  return redirect("/admin");
}

/* public: landing pages post referrals here */
async function apiReferral(req, env, cors, ctx) {
  let b; try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, cors); }
  const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const business_name = clean(b.business_name, 200);
  const phone = clean(b.phone, 40);
  const email = clean(b.email, 160);
  if (!business_name || !phone) return json({ ok: false, error: "missing_fields" }, 400, cors);
  // resolve referral code -> account
  let account_id = null;
  const ref = clean(b.ref, 16).toUpperCase();
  if (ref) { const a = await env.DB.prepare("SELECT id FROM accounts WHERE ref_code=? AND status='active'").bind(ref).first(); if (a) account_id = a.id; }
  const source = clean(b.source, 24) || "direct";
  const utm = clean(typeof b.utm === "string" ? b.utm : JSON.stringify(b.utm || {}), 1000);
  const id = uuid();
  await env.DB.prepare(`INSERT INTO referrals (id,account_id,business_name,contact_name,email,phone,role,needs,source,utm,stage,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'new', ?, ?)`)
    .bind(id, account_id, business_name, clean(b.contact_name, 120), email, phone, clean(b.role, 40), clean(b.needs, 2000), source, utm, now(), now()).run();
  // forward a copy to the platform CRM (cpn) so nothing is lost there
  if (env.CPN_LEADS_URL) {
    const fwd = fetch(env.CPN_LEADS_URL, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name, phone, email, role: clean(b.role, 40), needs: (ref ? "[ref " + ref + "] " : "") + clean(b.needs, 1800), demo_project: clean(b.demo_project, 120) || source, source }) }).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(fwd);
  }
  return json({ ok: true, attributed: !!account_id }, 200, cors);
}

async function bootstrapAdmin(req, env) {
  if (!env.BOOTSTRAP_SECRET || req.headers.get("X-Bootstrap") !== env.BOOTSTRAP_SECRET) return json({ ok: false }, 401);
  const existing = await env.DB.prepare("SELECT id FROM accounts WHERE type='admin' LIMIT 1").first();
  if (existing) return json({ ok: false, error: "admin_exists" }, 409);
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  if (!b.email || !b.password || String(b.password).length < 8) return json({ ok: false, error: "bad_input" }, 400);
  const { salt, hash } = await hashPassword(String(b.password));
  await env.DB.prepare(`INSERT INTO accounts (id,type,name,email,phone,company,password_hash,password_salt,status,created_at,approved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(uuid(), "admin", b.name || "Admin", String(b.email).toLowerCase(), "", "", hash, salt, "active", now(), now()).run();
  return json({ ok: true });
}

/* ============================== ROUTER ============================== */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req, env) });

    // public API (cross-origin from landing pages)
    if (path === "/api/referral" && req.method === "POST") return apiReferral(req, env, corsHeaders(req, env), ctx);
    if (path === "/api/admin/bootstrap" && req.method === "POST") return bootstrapAdmin(req, env);

    // auth pages
    if (path === "/login") return req.method === "POST" ? doLogin(req, env) : html(loginPage());
    if (path === "/signup") return req.method === "POST" ? doSignup(req, env, url) : html(signupPage(url.searchParams.get("type") === "partner" ? "partner" : "affiliate"));
    if (path === "/pending") return html(pendingPage());
    if (path === "/logout") return redirect("/login", { "Set-Cookie": cookie("", 0) });

    const sess = await readSession(req, env);
    if (path === "/" ) return redirect(sess ? (sess.role === "admin" ? "/admin" : "/dashboard") : "/login");
    if (!sess) return redirect("/login");

    if (path === "/dashboard") return showDashboard(env, sess);
    if (path === "/admin") return showAdmin(env, sess);
    if (path === "/admin/approve" && req.method === "POST") return adminApprove(req, env, sess);
    if (path === "/admin/reject" && req.method === "POST") return adminReject(req, env, sess);
    if (path === "/admin/referral" && req.method === "POST") return adminReferral(req, env, sess);

    return new Response("Not found", { status: 404 });
  },
};
