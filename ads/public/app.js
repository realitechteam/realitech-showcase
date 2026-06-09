/* REALITECH ads landing — feature cards, Book Demo → cpn Leads (source: ads) + UTM capture */
(function () {
  "use strict";
  var LEADS_API = "https://portal.realitech.vn/api/referral";  // promo DB (forwards to cpn)
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[<>&"]/g, function (c) { return ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]; }); };

  /* ---------- UTM / ad attribution ---------- */
  function adContext() {
    var p = new URLSearchParams(location.search);
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_campaignname", "utm_term", "utm_content", "gclid", "gbraid", "gad_campaignid", "utm_ad_id"];
    var out = {};
    keys.forEach(function (k) { var v = p.get(k); if (v) out[k] = v; });
    return out;
  }
  var AD = adContext();
  var REF = new URLSearchParams(location.search).get("ref") || "";
  function adSummary() {
    return Object.keys(AD).map(function (k) { return k + "=" + AD[k]; }).join(" · ");
  }

  /* ---------- feature cards ---------- */
  var CARDS = [
    { tag: "Digital Twin", title: "Smart building & city twins", line: "Sensor-linked 3D replicas you can operate and explore.", slug: "digital-twin-smart-building" },
    { tag: "AR Commerce", title: "Configure & try, true-scale", line: "Every product variant, materialized in the room.", slug: "ar-configurator" },
    { tag: "VR Training", title: "Risk-free, repeatable training", line: "High-stakes procedures rehearsed with full telemetry.", slug: "vr-training-lab-room" },
    { tag: "Spatial Nav", title: "AR wayfinding", line: "Turn-by-turn guidance anchored to real space.", slug: "ar-find-way-in-mall" },
    { tag: "Mixed Reality", title: "Hand-tracked & holographic", line: "Controller-free, natural, direct manipulation.", slug: "mr-hand-tracking" },
    { tag: "WebAR", title: "No-app, in the browser", line: "True-scale AR straight from a link.", slug: "webar-home-shopping" },
  ];
  function buildCards() {
    var wrap = $("#cards");
    CARDS.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="frame">' +
          '<div class="frame__bar"><span class="frame__dots"><i></i><i></i><i></i></span><span class="frame__title">' + esc(c.tag.toLowerCase()) + '</span></div>' +
          '<div class="frame__media"><video class="frame__video" muted loop playsinline preload="none" poster="assets/media/' + c.slug + '.jpg"></video></div>' +
        '</div>' +
        '<div class="card__cap"><span class="card__tag">' + esc(c.tag) + '</span>' +
          '<h3 class="card__title">' + esc(c.title) + '</h3>' +
          '<p class="card__line">' + esc(c.line) + '</p></div>';
      card._slug = c.slug;
      wrap.appendChild(card);
    });
  }

  /* ---------- autoplay-on-scroll + reveal ---------- */
  function wireCards() {
    var cards = [].slice.call(document.querySelectorAll(".card"));
    var play = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target.querySelector("video");
        if (!v) return;
        if (e.isIntersecting) { if (!v.src) v.src = "assets/media/" + e.target._slug + ".mp4"; v.play().catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.4 });
    var reveal = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.15 });
    cards.forEach(function (c, i) { c.style.transitionDelay = (i % 3) * 70 + "ms"; play.observe(c); reveal.observe(c); });
  }

  /* ---------- Book Demo modal → leads ---------- */
  var leadModal = $("#leadModal"), leadBody = $("#leadBody");
  function openBook() {
    leadBody.innerHTML =
      '<p class="lead__eyebrow">[ Book a demo ]</p>' +
      '<h3 class="lead__title">See your brand in immersive 3D</h3>' +
      '<p class="lead__sub">Tell us a little about you. We review every request by hand and reply within a business day.</p>' +
      '<form id="leadForm" novalidate>' +
        '<div class="lead__row"><input name="business_name" placeholder="Company / business name *" autocomplete="organization" required />' +
        '<input name="phone" placeholder="Phone / Zalo / WhatsApp *" autocomplete="tel" inputmode="tel" required /></div>' +
        '<div class="lead__row"><input name="email" type="email" placeholder="Work email *" autocomplete="email" required />' +
        '<select name="role" aria-label="Your role"><option value="">Your role…</option><option value="ceo">CEO / Founder</option><option value="marketing">Marketing</option><option value="developer">Developer</option><option value="designer">Designer</option><option value="other">Other</option></select></div>' +
        '<textarea name="needs" placeholder="What are you exploring? (optional)" rows="3"></textarea>' +
        '<input class="lead__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<button class="btn btn--primary btn--lg" type="submit" id="leadSubmit">Send request →</button>' +
        '<p class="lead__fine" id="leadErr">Straight to our team. No commitment.</p>' +
      '</form>';
    $("#leadForm").addEventListener("submit", onSubmit);
    leadModal.classList.add("open");
    leadModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeBook() { leadModal.classList.remove("open"); leadModal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target, errEl = $("#leadErr");
    var d = {}; new FormData(form).forEach(function (v, k) { d[k] = v; });
    errEl.classList.remove("err");
    if (d.website) { done(d.email); return; }
    if (!d.business_name || !d.business_name.trim() || !d.phone || !d.phone.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "")) {
      errEl.textContent = "Please fill company, phone and a valid email."; errEl.classList.add("err"); return;
    }
    var ad = adSummary();
    var needs = (d.needs || "").trim();
    if (ad) needs = (needs ? needs + "\n\n" : "") + "[ad] " + ad;
    var payload = {
      business_name: d.business_name.trim(),
      phone: d.phone.trim(),
      email: d.email.trim(),
      role: d.role || "",
      needs: needs,
      demo_project: AD.utm_campaignname || AD.utm_campaign || AD.utm_term || "ads",
      source: "ads",
      ref: REF,
      utm: ad,
    };
    var btn = $("#leadSubmit"); btn.disabled = true; btn.textContent = "Sending…";
    fetch(LEADS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) {
        if (r.ok) { done(payload.email); return; }
        if (r.status === 429) throw new Error("Too many requests — try again shortly.");
        return r.json().catch(function () { return {}; }).then(function (res) { throw new Error((res.errors && res.errors[0] && res.errors[0].message) || "Something went wrong. Email partner@realitech.dev"); });
      })
      .catch(function (err) { errEl.textContent = err.message || "Network error. Email partner@realitech.dev"; errEl.classList.add("err"); })
      .then(function () { btn.disabled = false; btn.textContent = "Send request →"; });
  }
  function done(email) {
    leadBody.innerHTML =
      '<div class="lead__done"><div class="lead__check">✓</div>' +
      '<h3 class="lead__title">Request received</h3>' +
      '<p class="lead__sub">Thanks — we\'ll reach out to <b>' + esc(email) + '</b> shortly.</p>' +
      '<button class="btn btn--primary" id="leadOk">Close</button></div>';
    $("#leadOk").addEventListener("click", closeBook);
  }

  /* ---------- wire ---------- */
  buildCards();
  wireCards();
  [].slice.call(document.querySelectorAll("[data-book]")).forEach(function (b) { b.addEventListener("click", openBook); });
  $("#leadClose").addEventListener("click", closeBook);
  leadModal.addEventListener("click", function (e) { if (e.target === leadModal) closeBook(); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && leadModal.classList.contains("open")) closeBook(); });
  addEventListener("scroll", function () { $("#nav").classList.toggle("scrolled", scrollY > 40); }, { passive: true });
  $("#year").textContent = "2026";
})();
