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

  /* ---------- feature cards (VI inline · EN in data-en, swapped by setLang) ---------- */
  var CARDS = [
    { tag: "Digital Twin", title: "Smart building & city twins", title_vi: "Bản sao số toà nhà & đô thị thông minh", line: "Sensor-linked 3D replicas you can operate and explore.", line_vi: "Bản sao 3D kết nối cảm biến — vận hành và khám phá được.", slug: "digital-twin-smart-building" },
    { tag: "AR Commerce", title: "Configure & try, true-scale", title_vi: "Cấu hình & ướm thử, đúng tỷ lệ thật", line: "Every product variant, materialized in the room.", line_vi: "Mọi biến thể sản phẩm hiện hữu ngay trong căn phòng.", slug: "ar-configurator" },
    { tag: "VR Training", title: "Risk-free, repeatable training", title_vi: "Đào tạo không rủi ro, lặp lại được", line: "High-stakes procedures rehearsed with full telemetry.", line_vi: "Diễn tập quy trình rủi ro cao với telemetry đầy đủ.", slug: "vr-training-lab-room" },
    { tag: "Spatial Nav", title: "AR wayfinding", title_vi: "Dẫn đường AR", line: "Turn-by-turn guidance anchored to real space.", line_vi: "Chỉ dẫn từng bước neo vào không gian thật.", slug: "ar-find-way-in-mall" },
    { tag: "Mixed Reality", title: "Hand-tracked & holographic", title_vi: "Hand-tracking & holographic", line: "Controller-free, natural, direct manipulation.", line_vi: "Thao tác trực tiếp, tự nhiên, không cần tay cầm.", slug: "mr-hand-tracking" },
    { tag: "WebAR", title: "No-app, in the browser", title_vi: "Không cần app, chạy trên trình duyệt", line: "True-scale AR straight from a link.", line_vi: "AR đúng tỷ lệ thật mở thẳng từ một đường link.", slug: "webar-home-shopping" },
  ];
  function buildCards() {
    var wrap = $("#cards");
    CARDS.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="frame">' +
          '<div class="frame__bar"><span class="frame__dots"><i></i><i></i><i></i></span><span class="frame__title">' + esc(c.tag.toLowerCase()) + '</span></div>' +
          '<div class="frame__media"><video class="frame__video" muted loop playsinline preload="none" poster="/assets/media/' + c.slug + '.jpg"></video></div>' +
        '</div>' +
        '<div class="card__cap"><span class="card__tag">' + esc(c.tag) + '</span>' +
          '<h3 class="card__title" data-en="' + esc(c.title) + '">' + esc(c.title_vi) + '</h3>' +
          '<p class="card__line" data-en="' + esc(c.line) + '">' + esc(c.line_vi) + '</p></div>';
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
        if (e.isIntersecting) { if (!v.src) v.src = "/assets/media/" + e.target._slug + ".mp4"; v.play().catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.4 });
    var reveal = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.15 });
    cards.forEach(function (c, i) { c.style.transitionDelay = (i % 3) * 70 + "ms"; play.observe(c); reveal.observe(c); });
  }

  /* ---------- Book Demo modal → leads (bilingual) ---------- */
  var L = {
    vi: { eyebrow: "[ Đặt demo miễn phí ]", title: "Xem trải nghiệm 3D cho nhóm của bạn", sub: "Cho chúng tôi biết đôi chút về bạn — chúng tôi sẽ làm demo riêng theo nhóm. Xét duyệt thủ công, phản hồi trong 1 ngày làm việc.",
      company: "Tên công ty / tổ chức *", phone: "Điện thoại / Zalo / WhatsApp *", email: "Email công việc *", rolePh: "Bạn thuộc nhóm nào…",
      roles: [["retail", "Bán lẻ / TMĐT"], ["marketing", "Marketing"], ["enterprise", "Doanh nghiệp"], ["media", "Nghệ thuật & Truyền thông"], ["education", "Giáo dục"], ["agency", "Agency / Reseller"], ["other", "Khác"]],
      needs: "Bạn đang tìm hiểu gì? (không bắt buộc)", submit: "Gửi yêu cầu →", fine: "Đến thẳng đội ngũ. Không ràng buộc.",
      errFill: "Vui lòng điền công ty, số điện thoại và email hợp lệ.", err429: "Quá nhiều yêu cầu — thử lại sau ít phút.", errGeneric: "Có lỗi xảy ra. Email partner@realitech.dev", errNet: "Lỗi mạng. Email partner@realitech.dev",
      sending: "Đang gửi…", doneTitle: "Đã nhận yêu cầu", done1: "Cảm ơn — chúng tôi sẽ sớm liên hệ ", done2: ".", close: "Đóng" },
    en: { eyebrow: "[ Book a free demo ]", title: "See a 3D experience built for your team", sub: "Tell us a little about you — we will tailor the demo to your segment. Reviewed by hand, reply within a business day.",
      company: "Company / organization *", phone: "Phone / Zalo / WhatsApp *", email: "Work email *", rolePh: "Which group are you…",
      roles: [["retail", "Retail / e-commerce"], ["marketing", "Marketing"], ["enterprise", "Enterprise"], ["media", "Media & Art"], ["education", "Education"], ["agency", "Agency / Reseller"], ["other", "Other"]],
      needs: "What are you exploring? (optional)", submit: "Send request →", fine: "Straight to our team. No commitment.",
      errFill: "Please fill company, phone and a valid email.", err429: "Too many requests — try again shortly.", errGeneric: "Something went wrong. Email partner@realitech.dev", errNet: "Network error. Email partner@realitech.dev",
      sending: "Sending…", doneTitle: "Request received", done1: "Thanks — we will reach out to ", done2: " shortly.", close: "Close" },
  };
  function lang() { return document.documentElement.lang === "en" ? "en" : "vi"; }
  function t() { return L[lang()]; }

  var leadModal = $("#leadModal"), leadBody = $("#leadBody"), currentSeg = "", landingSeg = "";
  function openBook(seg) {
    var s = t();
    currentSeg = seg || landingSeg || "";
    leadBody.innerHTML =
      '<p class="lead__eyebrow">' + s.eyebrow + '</p>' +
      '<h3 class="lead__title">' + s.title + '</h3>' +
      '<p class="lead__sub">' + s.sub + '</p>' +
      '<form id="leadForm" novalidate>' +
        '<div class="lead__row"><input name="business_name" placeholder="' + s.company + '" autocomplete="organization" required />' +
        '<input name="phone" placeholder="' + s.phone + '" autocomplete="tel" inputmode="tel" required /></div>' +
        '<div class="lead__row"><input name="email" type="email" placeholder="' + s.email + '" autocomplete="email" required />' +
        '<select name="role" aria-label="Role"><option value="">' + s.rolePh + '</option>' +
        s.roles.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === currentSeg ? " selected" : "") + '>' + r[1] + '</option>'; }).join("") + '</select></div>' +
        '<textarea name="needs" placeholder="' + s.needs + '" rows="3"></textarea>' +
        '<input class="lead__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<button class="btn btn--primary btn--lg" type="submit" id="leadSubmit">' + s.submit + '</button>' +
        '<p class="lead__fine" id="leadErr">' + s.fine + '</p>' +
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
      errEl.textContent = t().errFill; errEl.classList.add("err"); return;
    }
    var ad = adSummary();
    var seg = d.role || currentSeg || "";
    var needs = (d.needs || "").trim();
    var tag = "[ads" + (seg ? ":" + seg : "") + "]";
    needs = tag + (needs ? " " + needs : "") + (ad ? "\n" + ad : "");
    var payload = {
      business_name: d.business_name.trim(),
      phone: d.phone.trim(),
      email: d.email.trim(),
      role: seg,
      needs: needs,
      demo_project: seg || AD.utm_campaignname || AD.utm_campaign || AD.utm_term || "ads",
      source: "ads",
      ref: REF,
      utm: ad,
    };
    var btn = $("#leadSubmit"); btn.disabled = true; btn.textContent = t().sending;
    fetch(LEADS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) {
        if (r.ok) { done(payload.email); return; }
        if (r.status === 429) throw new Error(t().err429);
        return r.json().catch(function () { return {}; }).then(function (res) { throw new Error((res.errors && res.errors[0] && res.errors[0].message) || t().errGeneric); });
      })
      .catch(function (err) { errEl.textContent = err.message || t().errNet; errEl.classList.add("err"); })
      .then(function () { btn.disabled = false; btn.textContent = t().submit; });
  }
  function done(email) {
    var s = t();
    leadBody.innerHTML =
      '<div class="lead__done"><div class="lead__check">✓</div>' +
      '<h3 class="lead__title">' + s.doneTitle + '</h3>' +
      '<p class="lead__sub">' + s.done1 + '<b>' + esc(email) + '</b>' + s.done2 + '</p>' +
      '<button class="btn btn--primary" id="leadOk">' + s.close + '</button></div>';
    $("#leadOk").addEventListener("click", closeBook);
  }

  /* ---------- lazy-load + autoplay segment videos on scroll ---------- */
  function wireSegVideos() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.35 });
    [].slice.call(document.querySelectorAll("video[data-seg]")).forEach(function (v) { io.observe(v); });
  }

  /* ---------- theme (dark default · light mirrors realitech.vn) ---------- */
  function applyTheme(th) {
    document.documentElement.setAttribute("data-theme", th);
    [].slice.call(document.querySelectorAll("img[data-logo]")).forEach(function (im) {
      im.src = "/assets/logo-realitech-" + (th === "light" ? "light" : "white") + ".png";
    });
    var b = $("#themeBtn"); if (b) b.textContent = th === "light" ? "🌙" : "☀️";
    try { localStorage.setItem("rt_theme", th); } catch (e) {}
  }

  /* ---------- language (vi default · en via data-en attributes) ---------- */
  function setLang(l) {
    document.documentElement.lang = l;
    [].slice.call(document.querySelectorAll("[data-en]")).forEach(function (n) {
      if (n.__vi == null) n.__vi = n.innerHTML;
      n.innerHTML = l === "en" ? n.getAttribute("data-en") : n.__vi;
    });
    var b = $("#langBtn"); if (b) b.textContent = l === "en" ? "VI" : "EN";
    try { localStorage.setItem("rt_lang", l); } catch (e) {}
  }

  /* ---------- per-segment URL routing (/retail, /enterprise, ... or ?seg=) ---------- */
  // five content segments scroll to their #seg-… section; "agency" goes to the #reseller band.
  var SEGS = { retail: 1, marketing: 1, enterprise: 1, media: 1, education: 1, agency: 1 };
  var SEG_ALIAS = {
    ecommerce: "retail", "e-commerce": "retail", shop: "retail", store: "retail", retailer: "retail",
    mkt: "marketing", marketer: "marketing", marketers: "marketing",
    business: "enterprise", corporate: "enterprise", corp: "enterprise", training: "enterprise", train: "enterprise",
    art: "media", arts: "media", "media-art": "media", gallery: "media", museum: "media",
    edu: "education", school: "education", schools: "education", teacher: "education",
    agencies: "agency", reseller: "agency", resellers: "agency", partner: "agency"
  };
  function detectSeg() {
    var q = (new URLSearchParams(location.search).get("seg") || "").toLowerCase();
    var p = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    var c = q || p;
    return SEGS[c] ? c : (SEG_ALIAS[c] || "");
  }
  function routeSegment() {
    landingSeg = detectSeg();
    if (!landingSeg) return;
    var tag = document.querySelector('.atags a[href="#seg-' + landingSeg + '"]');
    if (tag) tag.classList.add("is-active");
    var target = landingSeg === "agency" ? document.getElementById("reseller") : document.getElementById("seg-" + landingSeg);
    if (target) requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: "auto", block: landingSeg === "agency" ? "center" : "start" });
      target.classList.add("is-target");
      setTimeout(function () { target.classList.remove("is-target"); }, 2400);
    });
  }

  /* ===================== visual "wow" layer ===================== */
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  function injectAurora() {
    var atmos = document.querySelector(".atmos");
    if (!atmos || reduceMotion || atmos.querySelector(".atmos__aurora")) return;
    var au = document.createElement("div");
    au.className = "atmos__aurora"; au.setAttribute("aria-hidden", "true");
    au.innerHTML = "<i></i><i></i><i></i>";
    atmos.insertBefore(au, atmos.firstChild);
  }

  function wirePointerHero() {
    var hero = document.querySelector(".hero");
    if (!hero || !finePointer || reduceMotion) return;
    var frame = hero.querySelector(".frame--hero");
    var tiltFrame = frame && !frame.querySelector("canvas"); // ads hero uses canvas drag instead
    var raf = 0, px = 50, py = 50, tx = 0, ty = 0;
    function apply() {
      raf = 0;
      hero.style.setProperty("--px", px + "%"); hero.style.setProperty("--py", py + "%");
      if (tiltFrame) frame.style.transform = "perspective(1100px) rotateX(" + tx.toFixed(2) + "deg) rotateY(" + ty.toFixed(2) + "deg)";
    }
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      px = x * 100; py = y * 100; tx = (0.5 - y) * 6; ty = (x - 0.5) * 8;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerenter", function () { hero.classList.add("spot"); });
    hero.addEventListener("pointerleave", function () { hero.classList.remove("spot"); if (tiltFrame) frame.style.transform = ""; });
  }

  function wireCardSpotlight() {
    if (!finePointer) return;
    [].slice.call(document.querySelectorAll(".tcard")).forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  function wireCountUp() {
    var nums = [].slice.call(document.querySelectorAll(".stat__num"));
    if (!nums.length || reduceMotion) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); countOne(e.target); });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }
  function countOne(el) {
    var m = el.textContent.trim().match(/^(\D*)(\d+)(\D*)$/); // exactly one integer → animate
    if (!m) return;
    var pre = m[1], target = parseInt(m[2], 10), suf = m[3];
    if (target <= 0) return;
    var t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1100), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(eased * target) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = pre + "0" + suf; requestAnimationFrame(step);
  }

  function wireMarquee() {
    var strip = document.querySelector(".proof__logos");
    if (!strip || reduceMotion || strip.classList.contains("marquee")) return;
    var imgs = [].slice.call(strip.children);
    if (imgs.length < 4) return;
    var track = document.createElement("div"); track.className = "proof__track";
    imgs.forEach(function (im) { track.appendChild(im); });
    [].slice.call(track.children).forEach(function (im) { track.appendChild(im.cloneNode(true)); });
    strip.appendChild(track); strip.classList.add("marquee");
  }

  /* interactive WebGL hero (ads only) — guarded here; heavy ESM lives in /hero3d.js
     (type=module so old browsers skip it and never touch this classic script). */
  function initHeroWebGL() {
    if (reduceMotion || !finePointer) return;            // desktop + motion ok only
    var canvas = document.getElementById("heroCanvas");
    if (!canvas || document.getElementById("hero3d")) return;
    try { var tc = document.createElement("canvas"); if (!(tc.getContext("webgl") || tc.getContext("experimental-webgl"))) return; } catch (e) { return; }
    var s = document.createElement("script");
    s.type = "module"; s.id = "hero3d"; s.src = "/hero3d.js";
    document.body.appendChild(s);
  }

  function wireWow() { injectAurora(); wirePointerHero(); wireCardSpotlight(); wireCountUp(); wireMarquee(); }

  /* ---------- wire ---------- */
  buildCards();
  wireCards();
  wireSegVideos();
  wireWow();
  if (window.addEventListener) addEventListener("load", initHeroWebGL);
  var savedTheme; try { savedTheme = localStorage.getItem("rt_theme"); } catch (e) {}
  applyTheme(savedTheme || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  var savedLang; try { savedLang = localStorage.getItem("rt_lang"); } catch (e) {}
  setLang(savedLang === "en" ? "en" : "vi");
  routeSegment();
  var tBtn = $("#themeBtn"); if (tBtn) tBtn.addEventListener("click", function () { applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light"); });
  var lBtn = $("#langBtn"); if (lBtn) lBtn.addEventListener("click", function () { setLang(document.documentElement.lang === "en" ? "vi" : "en"); });
  [].slice.call(document.querySelectorAll("[data-book]")).forEach(function (b) { b.addEventListener("click", function () { openBook(b.getAttribute("data-book") || ""); }); });
  $("#leadClose").addEventListener("click", closeBook);
  leadModal.addEventListener("click", function (e) { if (e.target === leadModal) closeBook(); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && leadModal.classList.contains("open")) closeBook(); });
  addEventListener("scroll", function () { $("#nav").classList.toggle("scrolled", scrollY > 40); }, { passive: true });
  $("#year").textContent = "2026";
})();
