/* REALITECH program landing (partner / affiliate) — shared logic.
   Page sets window.RT = { source, formTitle, formSub, nameLabel, roles:[[v,l]...], needsPlaceholder } */
(function () {
  "use strict";
  var LEADS_API = "https://api.realitech.vn/leads";
  var RT = window.RT || { source: "program" };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[<>&"]/g, function (c) { return ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]; }); };

  /* ---------- UTM / attribution ---------- */
  var AD = (function () {
    var p = new URLSearchParams(location.search), o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_campaignname", "utm_term", "utm_content", "gclid", "ref"].forEach(function (k) { var v = p.get(k); if (v) o[k] = v; });
    return o;
  })();
  function adSummary() { return Object.keys(AD).map(function (k) { return k + "=" + AD[k]; }).join(" · "); }

  /* ---------- reveal-on-scroll ---------- */
  function wireReveal() {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.14 });
    [].slice.call(document.querySelectorAll(".reveal")).forEach(function (n, i) { n.style.transitionDelay = (i % 3) * 60 + "ms"; io.observe(n); });
  }

  /* ---------- hero / section videos ---------- */
  function wireVideos() {
    [].slice.call(document.querySelectorAll("video[data-auto]")).forEach(function (v) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? v.play().catch(function () {}) : v.pause(); }); }, { threshold: 0.3 });
      io.observe(v);
    });
  }

  /* ---------- lead modal ---------- */
  var leadModal = $("#leadModal"), leadBody = $("#leadBody");
  function rolesHtml() {
    var r = RT.roles || [["other", "Other"]];
    return '<select name="role" aria-label="Role"><option value="">' + (RT.roleLabel || "I am a…") + '</option>' +
      r.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join("") + '</select>';
  }
  function openLead() {
    leadBody.innerHTML =
      '<p class="lead__eyebrow">[ ' + esc(RT.eyebrow || "Apply") + ' ]</p>' +
      '<h3 class="lead__title">' + esc(RT.formTitle || "Get in touch") + '</h3>' +
      '<p class="lead__sub">' + (RT.formSub || "We review every application by hand and reply within a business day.") + '</p>' +
      '<form id="leadForm" novalidate>' +
        '<div class="lead__row"><input name="business_name" placeholder="' + esc(RT.nameLabel || "Name / company *") + '" required />' +
        '<input name="phone" placeholder="Phone / Zalo / WhatsApp *" autocomplete="tel" inputmode="tel" required /></div>' +
        '<div class="lead__row"><input name="email" type="email" placeholder="Email *" autocomplete="email" required />' + rolesHtml() + '</div>' +
        '<textarea name="needs" placeholder="' + esc(RT.needsPlaceholder || "Tell us a bit about you (optional)") + '" rows="3"></textarea>' +
        '<input class="lead__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<button class="btn btn--primary btn--lg" type="submit" id="leadSubmit">' + esc(RT.submitText || "Submit application") + ' →</button>' +
        '<p class="lead__fine" id="leadErr">Straight to our team. No commitment.</p>' +
      '</form>';
    $("#leadForm").addEventListener("submit", onSubmit);
    leadModal.classList.add("open"); leadModal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  }
  function closeLead() { leadModal.classList.remove("open"); leadModal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

  function onSubmit(e) {
    e.preventDefault();
    var errEl = $("#leadErr"), d = {}; new FormData(e.target).forEach(function (v, k) { d[k] = v; });
    errEl.classList.remove("err");
    if (d.website) { done(d.email); return; }
    if (!d.business_name || !d.business_name.trim() || !d.phone || !d.phone.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "")) {
      errEl.textContent = "Please fill the name, phone and a valid email."; errEl.classList.add("err"); return;
    }
    var ad = adSummary(), needs = (d.needs || "").trim();
    needs = "[" + RT.source + "] application" + (ad ? "\n" + ad : "") + (needs ? "\n\n" + needs : "");
    var payload = { business_name: d.business_name.trim(), phone: d.phone.trim(), email: d.email.trim(), role: d.role || "", needs: needs, demo_project: AD.utm_campaign || RT.source, source: RT.source };
    var btn = $("#leadSubmit"); btn.disabled = true; btn.textContent = "Sending…";
    fetch(LEADS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) {
        if (r.ok) { done(payload.email); return; }
        if (r.status === 429) throw new Error("Too many requests — try again shortly.");
        return r.json().catch(function () { return {}; }).then(function (res) { throw new Error((res.errors && res.errors[0] && res.errors[0].message) || "Something went wrong. Email partner@realitech.dev"); });
      })
      .catch(function (err) { errEl.textContent = err.message || "Network error. Email partner@realitech.dev"; errEl.classList.add("err"); })
      .then(function () { btn.disabled = false; btn.textContent = (RT.submitText || "Submit application") + " →"; });
  }
  function done(email) {
    leadBody.innerHTML = '<div class="lead__done"><div class="lead__check">✓</div><h3 class="lead__title">' + esc(RT.doneTitle || "Application received") + '</h3>' +
      '<p class="lead__sub">' + (RT.doneSub || ("Thanks — we'll reach out to <b>" + esc(email) + "</b> shortly.")) + '</p>' +
      '<button class="btn btn--primary" id="leadOk">Close</button></div>';
    $("#leadOk").addEventListener("click", closeLead);
  }

  /* ---------- wire ---------- */
  wireReveal(); wireVideos();
  [].slice.call(document.querySelectorAll("[data-book]")).forEach(function (b) { b.addEventListener("click", openLead); });
  $("#leadClose").addEventListener("click", closeLead);
  leadModal.addEventListener("click", function (e) { if (e.target === leadModal) closeLead(); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && leadModal.classList.contains("open")) closeLead(); });
  addEventListener("scroll", function () { $("#nav").classList.toggle("scrolled", scrollY > 40); }, { passive: true });
  var y = $("#year"); if (y) y.textContent = "2026";
})();
