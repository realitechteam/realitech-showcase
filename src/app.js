import {
  BRAND, CATEGORIES, ENGINE, BY_SLUG, GATE, LEADS,
  previewSrc, posterSrc, fullVideoUrl,
} from "./videos.js";

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

/* ---------- access token ---------- */
const TKEY = "rt_access";
function getToken() {
  try {
    const v = JSON.parse(localStorage.getItem(TKEY) || "null");
    if (v && v.token && v.exp && v.exp > Date.now()) return v.token;
  } catch {}
  return null;
}
const setToken = (token, exp) => { try { localStorage.setItem(TKEY, JSON.stringify({ token, exp })); } catch {} };
const clearToken = () => { try { localStorage.removeItem(TKEY); } catch {} };

/* card span rhythm */
function spanClass(i, total) {
  if (i === 0 && total > 2) return "card card--wide";
  if (i === 1 && total > 2) return "card card--half";
  if (i === 2 && total > 2) return "card card--half";
  return "card";
}

/* ---------- index ---------- */
function buildIndex() {
  const list = $("#indexList");
  CATEGORIES.forEach((c) => {
    const li = el("li", "index__item");
    li.innerHTML = `
      <span class="ix">${c.index}</span>
      <span class="ix-title">${c.title}</span>
      <span class="ix-count">${String(c.items.length).padStart(2, "0")} builds →</span>`;
    li.addEventListener("click", () => document.getElementById(c.id)?.scrollIntoView({ behavior: "smooth" }));
    list.appendChild(li);
  });
}

/* ---------- sections ---------- */
function buildSections() {
  const root = $("#sections");
  CATEGORIES.forEach((c) => {
    const sec = el("section", "cat");
    sec.id = c.id;
    const wrap = el("div", "cat__wrap");
    wrap.innerHTML = `
      <div class="cat__head">
        <div>
          <span class="cat__ix">${c.index} / ${String(CATEGORIES.length).padStart(2, "0")}</span>
          <h2 class="cat__title">${c.title}</h2>
        </div>
        <p class="cat__blurb">${c.blurb}</p>
      </div>`;
    const grid = el("div", "grid");
    c.items.forEach((it, i) => grid.appendChild(buildCard(it, i, c.items.length)));
    wrap.appendChild(grid);
    sec.appendChild(wrap);
    root.appendChild(sec);
  });
}

function buildCard(it, i, total) {
  const card = el("div", spanClass(i, total));
  card.innerHTML = `
    <div class="card__frame">
      <div class="card__poster card__poster--gen"><span class="ph">${it.tag}</span></div>
      <video class="card__media" muted loop playsinline preload="none" poster="${posterSrc(it.slug)}"></video>
      <div class="card__scrim"></div>
      <span class="card__tag">${it.tag}</span>
      <span class="card__play">▶</span>
      <div class="card__cap">
        <h3 class="card__title">${it.title}</h3>
        <p class="card__line">${it.line}</p>
      </div>
    </div>`;
  card.addEventListener("click", () => openLightbox(it.slug));
  card._slug = it.slug;
  return card;
}

/* ---------- card preview loops ---------- */
let cardIO = null;
function wireVideos() {
  const cards = [...document.querySelectorAll(".card")];
  cardIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target.querySelector(".card__media");
      if (!v) return;
      if (e.isIntersecting) {
        if (!v.src) {
          v.src = previewSrc(e.target._slug);
          v.addEventListener("loadeddata", () => v.classList.add("ready"), { once: true });
        }
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.4 });
  cards.forEach((c) => cardIO.observe(c));

  const reveal = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.12 }
  );
  cards.forEach((c, i) => { c.style.transitionDelay = `${(i % 4) * 60}ms`; reveal.observe(c); });
}

/* ---------- hero + engine backdrops ---------- */
function wireBackdrop(mountId, slug, emptyClass) {
  const mount = document.getElementById(mountId);
  const v = el("video");
  Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: "metadata" });
  v.setAttribute("playsinline", "");
  v.addEventListener("error", () => mount.classList.add(emptyClass), { once: true });
  v.src = previewSrc(slug);
  v.play().catch(() => {});
  mount.appendChild(v);
}

/* ---------- ticker ---------- */
function buildTicker() {
  const track = $("#tickerTrack");
  const words = ["Digital Twin", "VR Training", "AR Commerce", "Mixed Reality", "WebAR",
    "Hand Tracking", "Visual Positioning", "Holographic", "Smart City",
    "Markerless Tracking", "Object → 3D", "Spatial Computing"];
  const make = () => words.map((w) => `<span>${w} <b>/</b></span>`).join("");
  track.innerHTML = make() + make();
}

/* ================= LIGHTBOX (full video, token already granted at entry) ================= */
const lb = $("#lb");
const lbPlayer = $("#lbPlayer");
let currentSlug = null;

function openLightbox(slug) {
  const it = BY_SLUG[slug];
  if (!it) return;
  currentSlug = slug;
  $("#lbCat").textContent = it.category || "";
  $("#lbTitle").textContent = it.title;
  $("#lbLine").textContent = it.line;

  const token = getToken();
  const v = el("video", "lb__video");
  v.setAttribute("playsinline", "");
  v.poster = posterSrc(slug);
  if (token && GATE.api) {
    Object.assign(v, { controls: true, autoplay: true, playsInline: true, preload: "metadata" });
    v.src = fullVideoUrl(slug, token);
    v.addEventListener("error", () => {
      // token expired/revoked mid-session -> bounce back to the entry gate
      clearToken();
      closeLightbox();
      showEntry("Your session expired — please re-enter your access code.");
    }, { once: true });
  } else {
    // safety fallback (shouldn't happen behind the gate): silent preview
    Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true });
    v.src = previewSrc(slug);
  }
  v.play().catch(() => {});
  lbPlayer.replaceChildren(v);

  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
  lbPlayer.replaceChildren();
  document.body.style.overflow = "";
  currentSlug = null;
}
$("#lbClose").addEventListener("click", closeLightbox);
lb.addEventListener("click", (e) => e.target === lb && closeLightbox());
addEventListener("keydown", (e) => e.key === "Escape" && lb.classList.contains("open") && closeLightbox());

/* ================= ENTRY GATE (whole-site private wall) ================= */
const entry = $("#entryGate");

function hideEntry() {
  document.documentElement.classList.remove("locked");
  entry.classList.add("done");
  entry.setAttribute("aria-hidden", "true");
}
function showEntry(msg) {
  document.documentElement.classList.add("locked");
  entry.classList.remove("done");
  entry.setAttribute("aria-hidden", "false");
  if (msg) $("#entryErr").textContent = msg;
  setTimeout(() => $("#entryInput")?.focus(), 60);
}

async function onEntrySubmit(e) {
  e.preventDefault();
  const errEl = $("#entryErr");
  errEl.textContent = "";
  const code = $("#entryInput").value.trim();
  if (!code) return;
  if (!GATE.api) { errEl.textContent = "Gate not configured."; return; }
  const btn = $("#entrySubmit");
  btn.disabled = true; btn.textContent = "Checking…";
  try {
    const r = await fetch(`${GATE.api}/api/unlock`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.ok && data.token) {
      setToken(data.token, data.exp);
      hideEntry();
      // nudge first in-view previews to start
      requestAnimationFrame(() => window.dispatchEvent(new Event("scroll")));
    } else if (r.status === 429) {
      errEl.textContent = "Too many attempts. Please try again later.";
    } else {
      errEl.textContent = "Invalid access code.";
      $("#entryInput").select();
    }
  } catch {
    errEl.textContent = "Network error. Please try again.";
  } finally {
    btn.disabled = false; btn.textContent = "Enter →";
  }
}
$("#entryForm").addEventListener("submit", onEntrySubmit);

/* ================= BOOK DEMO / LEAD MODAL → cpn Leads ================= */
const leadModal = $("#leadModal");
const leadBody = $("#leadBody");
let leadDemo = "";

function openBookDemo(demoTitle = "") {
  leadDemo = demoTitle;
  renderLeadForm(demoTitle);
  leadModal.classList.add("open");
  leadModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeLead() {
  leadModal.classList.remove("open");
  leadModal.setAttribute("aria-hidden", "true");
  if (!lb.classList.contains("open") && !document.documentElement.classList.contains("locked")) {
    document.body.style.overflow = "";
  }
}
function renderLeadForm(demoTitle) {
  leadBody.innerHTML = `
    <p class="lead__eyebrow">[ Book a demo ]</p>
    <h3 class="lead__title">Let's talk about your space</h3>
    <p class="lead__sub">Tell us a little about you${demoTitle ? ` — re: <b>${esc(demoTitle)}</b>` : ""}. We review every request by hand and get back within a business day.</p>
    <form id="leadForm" novalidate>
      <div class="lead__row">
        <input name="business_name" placeholder="Company / business name *" autocomplete="organization" required />
        <input name="phone" placeholder="Phone / Zalo / WhatsApp *" autocomplete="tel" inputmode="tel" required />
      </div>
      <div class="lead__row">
        <input name="email" type="email" placeholder="Work email *" autocomplete="email" required />
        <select name="role" aria-label="Your role">
          <option value="">Your role…</option>
          <option value="ceo">CEO / Founder</option>
          <option value="marketing">Marketing</option>
          <option value="developer">Developer</option>
          <option value="designer">Designer</option>
          <option value="other">Other</option>
        </select>
      </div>
      <textarea name="needs" placeholder="What are you exploring? (optional)" rows="3"></textarea>
      <input class="lead__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <button class="btn btn--primary btn--lg" type="submit" id="leadSubmit">Send request →</button>
      <p class="lead__fine" id="leadErr">Your details go straight to our team.</p>
    </form>`;
  $("#leadForm").addEventListener("submit", onLeadSubmit);
}
async function onLeadSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = $("#leadErr");
  const d = Object.fromEntries(new FormData(form).entries());
  errEl.classList.remove("err");
  if (d.website) { renderLeadSuccess(d.email); return; } // honeypot
  if (!d.business_name?.trim() || !d.phone?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "")) {
    errEl.textContent = "Please fill company, phone and a valid email.";
    errEl.classList.add("err");
    return;
  }
  const payload = {
    business_name: d.business_name.trim(),
    phone: d.phone.trim(),
    email: d.email.trim(),
    role: d.role || "",
    needs: (d.needs || "").trim(),
    demo_project: leadDemo || "",
    source: LEADS.source,
  };
  const btn = $("#leadSubmit");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const r = await fetch(LEADS.api, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (r.ok) renderLeadSuccess(payload.email);
    else if (r.status === 429) { errEl.textContent = "Too many requests — try again shortly."; errEl.classList.add("err"); }
    else {
      const res = await r.json().catch(() => ({}));
      errEl.textContent = res?.errors?.[0]?.message || `Something went wrong. Email ${BRAND.contact}`;
      errEl.classList.add("err");
    }
  } catch {
    errEl.textContent = "Network error. Email " + BRAND.contact;
    errEl.classList.add("err");
  } finally {
    btn.disabled = false; btn.textContent = "Send request →";
  }
}
function renderLeadSuccess(email) {
  leadBody.innerHTML = `
    <div class="lead__done">
      <div class="lead__check">✓</div>
      <h3 class="lead__title">Request received</h3>
      <p class="lead__sub">Thanks — we'll reach out to <b>${esc(email)}</b> shortly. If it's about access, we'll send your code too.</p>
      <button class="btn btn--primary" id="leadOk">Close</button>
    </div>`;
  $("#leadOk").addEventListener("click", closeLead);
}
$("#leadClose").addEventListener("click", closeLead);
leadModal.addEventListener("click", (e) => e.target === leadModal && closeLead());
$("#entryBookDemo")?.addEventListener("click", () => openBookDemo("Showcase access request"));
$("#ctaBookDemo")?.addEventListener("click", () => openBookDemo(""));
addEventListener("keydown", (e) => e.key === "Escape" && leadModal.classList.contains("open") && closeLead());

/* ---------- nav + stats ---------- */
function wireChrome() {
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 40), { passive: true });
  $("#year").textContent = "2026";
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const n = e.target, target = +n.dataset.count;
      if (!target) return;
      let cur = 0; const step = Math.max(1, Math.round(target / 28));
      const t = setInterval(() => { cur = Math.min(target, cur + step); n.textContent = cur; if (cur >= target) clearInterval(t); }, 28);
      statIO.unobserve(n);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".stat__num[data-count]").forEach((n) => statIO.observe(n));
}

/* ---------- init ---------- */
buildIndex();
buildSections();
buildTicker();
wireVideos();
wireChrome();
wireBackdrop("heroMedia", BRAND.heroSlug, "hero__media--empty");
wireBackdrop("engineMedia", ENGINE.slug, "engine__media--empty");

if (getToken()) hideEntry();
else showEntry();
