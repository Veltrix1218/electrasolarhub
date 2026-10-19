/* ==========================================================================
   ELECTRA SOLAR HUB — script.js
   1 Config · 2 Utils · 3 Header · 4 Announcement marquee · 5 Hero slider · 6 Reveal/FAQ/Video
   7 WhatsApp float · 8 Newsletter · 9 Reviews · 10 Modals · 11 Calculator · 12 Assessment · 13 Boot
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. CONFIG ---------- */
  var CONFIG = {
    whatsapp: '2348144206866',
    business: 'Electra Solar Hub',
    email: 'Electrasolarhub@gmail.com',
    // OPTIONAL: paste a Formspree / Google Apps Script / Supabase edge-function URL to ALSO receive
    // leads by email or sheet. Leave '' to use WhatsApp (assessment) / email app (newsletter) only.
    endpoints: { assessment: '', newsletter: '', review: '' },
    hero: { interval: 6500, fade: 1500 }
  };

  /* ---------- 2. UTILS ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function store(kind) {
    var area; try { area = window[kind]; area.setItem('__t', '1'); area.removeItem('__t'); } catch (e) { area = null; }
    return {
      get: function (k) { try { return area ? JSON.parse(area.getItem(k)) : null; } catch (e) { return null; } },
      set: function (k, v) { try { if (area) { area.setItem(k, JSON.stringify(v)); return true; } } catch (e) { /* quota */ } return false; }
    };
  }
  var local = store('localStorage'), session = store('sessionStorage');
  function postJSON(url, data) {
    if (!url) return Promise.resolve(null);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data), keepalive: true })
      .then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  function waUrl(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }
  function pageName() {
    var f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return f.indexOf('about') === 0 ? 'About' : f.indexOf('assessment') === 0 ? 'Assessment' : 'Home';
  }
  function setStatus(node, msg, kind) { if (!node) return; node.textContent = msg || ''; node.className = 'form-status' + (kind ? ' ' + kind : ''); }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- 3. HEADER + MOBILE NAV ---------- */
  function initHeader() {
    var header = $('#header'), btn = $('#energy-menu'), nav = $('#mobile-nav');
    if (!header) return;
    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 10); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (btn && nav) {
      var setTop = function () { nav.style.setProperty('--nav-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px'); };
      var toggle = function (open) {
        if (open) setTop();
        nav.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      btn.addEventListener('click', function () { toggle(btn.getAttribute('aria-expanded') !== 'true'); });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
      document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !e.target.closest('#mobile-nav, #energy-menu')) toggle(false); });
      window.addEventListener('resize', function () { if (window.innerWidth > 960) toggle(false); });
      window.addEventListener('scroll', function () { if (nav.classList.contains('open')) setTop(); }, { passive: true });
      document.addEventListener('electra:modal-open', function () { toggle(false); });
    }
    // mark current page
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase(), path = href.split('#')[0];
      var isHome = /^index\.html#home$/.test(href) && file === 'index.html';
      if (isHome || (path && path !== 'index.html' && path === file)) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- 4. ANNOUNCEMENT MARQUEE (auto-scroll, seamless, pauses on hover) ---------- */
  function initMarquee() {
    var bar = $('.announcement-bar'); if (!bar || reduceMotion) return;
    var track = $('.announcement-track', bar), group = $('.announcement-group', bar);
    if (!track || !group) return;
    var original = group.innerHTML;
    function decor(root) { $$('a', root).forEach(function (a) { a.tabIndex = -1; }); }
    function build() {
      $$('.announcement-group[data-clone]', track).forEach(function (n) { n.remove(); });
      group.innerHTML = original;
      var guard = 0;
      while (group.scrollWidth < bar.clientWidth + 40 && guard++ < 10) {
        var rep = document.createElement('span'); rep.setAttribute('aria-hidden', 'true'); rep.style.display = 'contents'; rep.innerHTML = original; decor(rep); group.appendChild(rep);
      }
      var clone = group.cloneNode(true); clone.setAttribute('data-clone', '1'); clone.setAttribute('aria-hidden', 'true'); decor(clone);
      track.appendChild(clone);
      bar.style.setProperty('--marquee-dur', Math.max(18, group.scrollWidth / 55).toFixed(1) + 's'); // ~55px per second
      bar.classList.add('is-ready');
    }
    build();
    window.addEventListener('resize', debounce(build, 250));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  }

  /* ---------- 5. HERO SLIDER (auto fade + slow zoom, dots, arrows, swipe) ---------- */
  function initHero() {
    var hero = $('.hero'); if (!hero) return;
    var slides = $$('.hero-slide', hero), dots = $$('.hero-dot', hero);
    var prev = $('#hero-prev'), next = $('#hero-next');
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-ready'); }); });
    if (slides.length < 2) return;
    var interval = CONFIG.hero.interval, i = 0, timer = null, remaining = interval, started = 0, holds = {};
    hero.style.setProperty('--hero-interval', interval + 'ms');
    hero.style.setProperty('--hero-zoom', (interval + CONFIG.hero.fade + 800) + 'ms');

    function show(n) {
      n = (n + slides.length) % slides.length; if (n === i) return;
      slides[i].classList.remove('active'); if (dots[i]) { dots[i].classList.remove('active'); dots[i].removeAttribute('aria-current'); }
      i = n;
      slides[i].classList.add('active'); if (dots[i]) { dots[i].classList.add('active'); dots[i].setAttribute('aria-current', 'true'); }
    }
    function schedule() { clearTimeout(timer); started = Date.now(); timer = setTimeout(advance, remaining); }
    function advance() { remaining = interval; show(i + 1); schedule(); }
    function isHeld() { return Object.keys(holds).some(function (k) { return holds[k]; }); }
    function apply() {
      if (isHeld()) { clearTimeout(timer); if (!hero.classList.contains('is-paused')) { remaining = Math.max(400, remaining - (Date.now() - started)); } hero.classList.add('is-paused'); }
      else if (hero.classList.contains('is-paused') || !timer) { hero.classList.remove('is-paused'); schedule(); }
    }
    function hold(k, v) { holds[k] = v; apply(); }
    function go(n) { remaining = interval; show(n); if (!isHeld()) schedule(); }

    if (prev) prev.addEventListener('click', function () { go(i - 1); });
    if (next) next.addEventListener('click', function () { go(i + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-index'), 10) || 0); }); });
    hero.addEventListener('mouseenter', function () { hold('hover', true); });
    hero.addEventListener('mouseleave', function () { hold('hover', false); });
    hero.addEventListener('focusin', function (e) { if (e.target.closest('.hero-controls')) hold('focus', true); });
    hero.addEventListener('focusout', function () { hold('focus', false); });
    document.addEventListener('visibilitychange', function () { hold('hidden', document.hidden); });
    document.addEventListener('electra:modal-open', function () { hold('modal', true); });
    document.addEventListener('electra:modal-close', function () { hold('modal', false); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { hold('offscreen', !en[0].isIntersecting); }, { threshold: 0.15 }).observe(hero);
    var x0 = null;
    hero.addEventListener('pointerdown', function (e) { x0 = e.target.closest('a,button') ? null : e.clientX; });
    hero.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; if (Math.abs(dx) > 55) go(dx < 0 ? i + 1 : i - 1); x0 = null; });
    schedule();
  }

  /* ---------- 6. REVEAL · FAQ · VIDEO · YEAR ---------- */
  function initReveal() {
    var els = $$('.reveal'); if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (e) {
      var sibs = $$(':scope > .reveal', e.parentElement), idx = Math.max(0, sibs.indexOf(e));
      e.style.setProperty('--d', Math.min(idx, 5) * 70 + 'ms'); io.observe(e);
    });
  }
  function initFaq() {
    var items = $$('.faq-item');
    items.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; }); }); });
  }
  function initVideos() {
    $$('video[data-autoplay]').forEach(function (v) {
      var btn = v.parentElement.querySelector('.video-toggle'), icon = btn && btn.querySelector('i'), userPaused = reduceMotion;
      function sync() { if (!btn) return; var playing = !v.paused; icon.className = 'fa-solid ' + (playing ? 'fa-pause' : 'fa-play'); btn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video'); }
      v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
      if (btn) btn.addEventListener('click', function () { if (v.paused) { userPaused = false; v.play().catch(function () {}); } else { userPaused = true; v.pause(); } });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!userPaused) v.play().catch(function () {}); } else v.pause();
      }, { threshold: 0.35 }).observe(v);
    });
  }
  function initYear() { var y = $('#current-year'); if (y) y.textContent = new Date().getFullYear(); }

  /* ---------- 7. FLOATING WHATSAPP BUTTON ---------- */
  function initWhatsApp() {
    var root = $('#wa-float'); if (!root) return;
    var fab = $('#wa-fab'), teaser = $('#wa-teaser'), tLink = $('#wa-teaser-link'), tClose = $('#wa-teaser-close');
    var msg = 'Hello ' + CONFIG.business + ', I would like to discuss a solar system for my property. (Sent from your ' + pageName() + ' page)';
    fab.href = tLink.href = waUrl(msg);
    function clearBadge() { root.classList.remove('has-badge'); }
    function dismiss() {
      clearBadge(); session.set('electra_wa_teaser', 1);
      if (teaser.hidden) return;
      teaser.classList.add('is-leaving');
      setTimeout(function () { teaser.hidden = true; teaser.classList.remove('is-leaving'); }, 300);
    }
    tClose.addEventListener('click', dismiss);
    tLink.addEventListener('click', function () { clearBadge(); session.set('electra_wa_teaser', 1); });
    fab.addEventListener('click', clearBadge);
    // 1) the label "Chat with us" peeks out, then 2) badge, then 3) friendly teaser bubble
    setTimeout(function () { fab.classList.add('is-expanded'); setTimeout(function () { fab.classList.remove('is-expanded'); }, 3600); }, 2800);
    if (!session.get('electra_wa_teaser')) {
      setTimeout(function () { root.classList.add('has-badge'); }, 5200);
      setTimeout(function () { if (!document.documentElement.classList.contains('modal-open')) teaser.hidden = false; }, 7500);
    }
    // keep the chat message in sync with the latest calculator estimate
    document.addEventListener('electra:estimate', function (e) {
      var r = e.detail; if (!r) return;
      var m = msg + '\n\nMy estimate: ' + r.summary + '.';
      fab.href = tLink.href = waUrl(m);
    });
  }

  /* ---------- 8. NEWSLETTER ---------- */
  function initNewsletter() {
    $$('.newsletter-form').forEach(function (form) {
      var input = $('input[type="email"]', form), status = $('.form-status', form), btn = $('button[type="submit"]', form);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if ($('.hp-field', form).value) return;                       // bot trap
        var email = input.value.trim();
        if (!EMAIL_RE.test(email)) { input.classList.add('is-invalid'); setStatus(status, 'Please enter a valid email address.', 'error'); input.focus(); return; }
        input.classList.remove('is-invalid');
        if (CONFIG.endpoints.newsletter) {
          btn.classList.add('is-loading'); setStatus(status, 'Subscribing…');
          postJSON(CONFIG.endpoints.newsletter, { email: email, source: location.href, at: new Date().toISOString() }).then(function (ok) {
            btn.classList.remove('is-loading');
            if (ok) { form.reset(); setStatus(status, 'You are subscribed. Thank you!', 'ok'); } else setStatus(status, 'Something went wrong. Please try again.', 'error');
          });
        } else {
          // No backend configured: hand the request to the visitor's email app so it is never silently lost.
          setStatus(status, 'Opening your email app to confirm your subscription…', 'ok');
          location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Newsletter subscription') + '&body=' + encodeURIComponent('Please add ' + email + ' to the ' + CONFIG.business + ' newsletter.');
        }
      });
      input.addEventListener('input', function () { input.classList.remove('is-invalid'); });
    });
  }

  /* ---------- 9. CUSTOMER REVIEWS (auto-added + shown instantly) ---------- */
  var ReviewStore = {
    KEY: 'electra_reviews_v1',
    load: function () { var r = local.get(this.KEY); return Array.isArray(r) ? r : []; },
    add: function (rev) { var all = this.load(); all.unshift(rev); return local.set(this.KEY, all.slice(0, 30)); },
    drop: function (id) { local.set(this.KEY, this.load().filter(function (r) { return r.id !== id; })); }
  };
  function reviewCard(r, isNew) {
    var card = document.createElement('article'); card.className = 'review-card' + (isNew ? ' is-new' : ''); card.setAttribute('data-review-id', r.id);
    var stars = document.createElement('div'); stars.className = 'stars'; stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', 'Rated ' + r.rating + ' out of 5');
    for (var i = 0; i < r.rating; i++) { var s = document.createElement('i'); s.className = 'fa-solid fa-star'; s.setAttribute('aria-hidden', 'true'); stars.appendChild(s); }
    var p = document.createElement('p'); p.textContent = r.text;
    var author = document.createElement('div'); author.className = 'review-author';
    var who = document.createElement('div'); var h = document.createElement('h4'); h.textContent = r.name; who.appendChild(h);
    var sub = [r.location, r.business].filter(Boolean).join(' · '); if (sub) { var sm = document.createElement('small'); sm.textContent = sub; who.appendChild(sm); }
    var tag = document.createElement('span'); tag.className = 'review-tag'; tag.textContent = (r.type || 'Customer') + (r.project ? ' · ' + r.project : '');
    author.appendChild(who); author.appendChild(tag);
    if (isNew) { var pill = document.createElement('span'); pill.className = 'review-new-pill'; pill.textContent = 'New'; card.appendChild(pill); }
    card.appendChild(stars);
    if (r.image) { var im = document.createElement('img'); im.className = 'review-photo'; im.src = r.image; im.alt = 'Project photo shared by ' + r.name; im.loading = 'lazy'; card.appendChild(im); }
    card.appendChild(p); card.appendChild(author);
    return card;
  }
  function shrinkImage(file, max) {
    return new Promise(function (resolve) {
      if (!file) return resolve(null);
      var fr = new FileReader();
      fr.onerror = function () { resolve(null); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { resolve(null); };
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.78));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function initReviews() {
    var grid = $('#reviews-grid'); if (!grid) return;
    var wrap = $('#review-form-wrapper'), openBtn = $('#open-review-form'), closeBtn = $('#close-review-form');
    var form = $('#customer-review-form'), status = $('#review-status'), confirm = $('#review-confirmation');
    var bizField = $('#business-name-field'), msg = $('#review-message'), count = $('#review-count');
    var lastId = null;
    confirm.hidden = true; confirm.classList.remove('is-open');

    ReviewStore.load().slice().reverse().forEach(function (r) { grid.insertBefore(reviewCard(r, false), grid.firstChild); });   // restore saved reviews (newest first)

    function openForm() { wrap.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); setTimeout(function () { wrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); var n = $('#review-name'); if (n) n.focus({ preventScroll: true }); }, 60); }
    function closeForm() { wrap.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus({ preventScroll: true }); }
    openBtn.addEventListener('click', function () { wrap.hidden ? openForm() : closeForm(); });
    closeBtn.addEventListener('click', closeForm);

    $$('input[name="customer_type"]', form).forEach(function (r) { r.addEventListener('change', function () { bizField.hidden = r.value !== 'Commercial' || !r.checked; }); });
    msg.addEventListener('input', function () { count.textContent = msg.value.length.toLocaleString('en-US') + ' / 1,000 characters (minimum 20)'; msg.classList.remove('is-invalid'); });
    $$('input, select, textarea', form).forEach(function (f) { f.addEventListener('input', function () { f.classList.remove('is-invalid'); setStatus(status, ''); }); });

    function fail(text, field) { setStatus(status, text, 'error'); if (field) { field.classList.add('is-invalid'); field.focus(); } }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if (fd.get('website')) { form.reset(); closeForm(); return; }                         // honeypot: pretend success
      var name = String(fd.get('name') || '').trim(), loc = String(fd.get('location') || '').trim(), text = String(fd.get('review') || '').trim();
      var type = fd.get('customer_type'), rating = parseInt(fd.get('rating'), 10), file = $('#review-image').files[0];
      if (name.length < 2) return fail('Please enter your name.', $('#review-name'));
      if (loc.length < 2) return fail('Please enter your location.', $('#review-location'));
      if (!type) return fail('Please choose how you are reviewing (Residential or Commercial).');
      if (!(rating >= 1 && rating <= 5)) return fail('Please select a star rating.');
      if (text.length < 20) return fail('Please write at least 20 characters about your experience.', msg);
      if (!fd.get('publication_consent')) return fail('Please tick the consent box so we can publish your review.');
      if (file && !/^image\/(jpeg|png|webp)$/.test(file.type)) return fail('Photo must be a JPG, PNG or WebP image.', $('#review-image'));
      if (file && file.size > 8 * 1024 * 1024) return fail('Photo is too large (max 8 MB).', $('#review-image'));
      var last = local.get('electra_last_review_at') || 0;
      if (Date.now() - last < 30000) return fail('Please wait a few seconds before submitting another review.');

      var btn = $('.review-form-submit', form); btn.classList.add('is-loading'); setStatus(status, 'Publishing your review…');
      shrinkImage(file, 900).then(function (img) {
        var rev = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name, location: loc, type: type, business: type === 'Commercial' ? String(fd.get('business_name') || '').trim() : '', rating: rating, project: String(fd.get('project_type') || ''), text: text, image: img, at: new Date().toISOString() };
        var saved = ReviewStore.add(rev);
        if (!saved && img) { rev.image = null; saved = ReviewStore.add(rev); }          // storage full: retry without photo
        local.set('electra_last_review_at', Date.now());
        var card = reviewCard(rev, true); grid.insertBefore(card, grid.firstChild); lastId = rev.id;
        postJSON(CONFIG.endpoints.review, rev);                                          // optional: notify the owner
        form.reset(); bizField.hidden = true; count.textContent = '0 / 1,000 characters (minimum 20)'; setStatus(status, '');
        btn.classList.remove('is-loading'); wrap.hidden = true; openBtn.setAttribute('aria-expanded', 'false');
        showConfirm();
      });
    });

    function showConfirm() {
      confirm.hidden = false; confirm.classList.add('is-open'); document.documentElement.classList.add('modal-open');
      var b = $('#review-confirm-close'); setTimeout(function () { b.focus(); }, 50);
    }
    function hideConfirm() {
      confirm.hidden = true; confirm.classList.remove('is-open'); document.documentElement.classList.remove('modal-open');
      var card = lastId && $('[data-review-id="' + lastId + '"]');
      if (card) { card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); setTimeout(function () { var p = $('.review-new-pill', card); if (p) p.remove(); card.classList.remove('is-new'); }, 9000); }
    }
    $('#review-confirm-close').addEventListener('click', hideConfirm);
    $('#review-confirm-x').addEventListener('click', hideConfirm);
    confirm.addEventListener('click', function (e) { if (e.target === confirm) hideConfirm(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && confirm.classList.contains('is-open')) hideConfirm(); });
  }

  /* ---------- 10. MODAL SYSTEM ---------- */
  var state = { estimate: null };
  var TEMPLATES = {};
  var Modal = (function () {
    var built = {}, active = null, lastFocus = null;
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    function build(name) {
      if (built[name]) return built[name];
      var node = document.createElement('div');
      node.className = 'modal'; node.id = 'modal-' + name;
      node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); node.setAttribute('aria-labelledby', name + '-title');
      node.innerHTML = TEMPLATES[name].html();
      document.body.appendChild(node);
      node.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
      node.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var f = $$(FOCUSABLE, node).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === node.querySelector('.modal-panel'))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      built[name] = node;
      TEMPLATES[name].init(node);
      return node;
    }
    function lock(on) {
      var root = document.documentElement;
      if (on) { var sw = window.innerWidth - root.clientWidth; if (sw > 0) document.body.style.paddingRight = sw + 'px'; root.classList.add('modal-open'); }
      else { root.classList.remove('modal-open'); document.body.style.paddingRight = ''; }
    }
    function show(name, opts) {
      opts = opts || {};
      var node = build(name);
      if (active && active !== name) hide(active, true);
      var wasActive = active === name;
      active = name;
      if (!wasActive) {
        lock(true);
        document.dispatchEvent(new CustomEvent('electra:modal-open', { detail: name }));
        requestAnimationFrame(function () { node.classList.add('open'); });
        var panel = $('.modal-panel', node); if (panel) { panel.scrollTop = 0; setTimeout(function () { panel.focus({ preventScroll: true }); }, 60); }
      }
      if (TEMPLATES[name].onOpen) TEMPLATES[name].onOpen(node, opts);
    }
    function hide(name, swapping) {
      var node = built[name]; if (!node) return;
      node.classList.remove('open');
      if (TEMPLATES[name].onClose) TEMPLATES[name].onClose(node);
      if (!swapping) {
        active = null; lock(false);
        document.dispatchEvent(new CustomEvent('electra:modal-close', { detail: name }));
        if (lastFocus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
      }
    }
    function open(name, opts) {
      opts = opts || {};
      if (!TEMPLATES[name]) return;
      if (opts.trigger && !active) lastFocus = opts.trigger;
      var already = history.state && history.state.modal;
      if (!opts.fromHistory && !opts.fromHash) {
        try { if (already) history.replaceState({ modal: name }, '', '#' + name); else history.pushState({ modal: name }, '', '#' + name); } catch (e) { /* file:// */ }
      }
      show(name, opts);
    }
    function close() {
      if (!active) return;
      if (history.state && history.state.modal) { history.back(); return; }          // popstate hides it
      var n = active; hide(n);
      if (/^#(assessment|calculator)$/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* noop */ } }
    }
    window.addEventListener('popstate', function () {
      var st = history.state;
      if (st && st.modal) show(st.modal, { fromHistory: true }); else if (active) hide(active);
    });
    window.addEventListener('hashchange', function () {
      var m = location.hash.match(/^#(assessment|calculator)$/);
      if (m && TEMPLATES[m[1]] && active !== m[1]) open(m[1], { fromHash: true });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) close(); });
    return { open: open, close: close, isOpen: function () { return active; } };
  })();

  // Every button/link that leads to the assessment or calculator opens a pop-up instead of navigating.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-modal], a[href]'); if (!a) return;
    var name = a.getAttribute('data-modal');
    if (!name) { var m = (a.getAttribute('href') || '').match(/^(?:assessment\.html)?#(assessment|calculator)$/); if (m && !a.closest('.modal')) name = m[1]; }
    if (!name || !TEMPLATES[name]) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    Modal.open(name, { trigger: a, preset: a.getAttribute('data-preset') });
  });

  /* ---------- 11. CALCULATOR ---------- */
  // Typical Nigerian-market ratings. watts = running power per unit, surge = start-up multiple (motors),
  // duty = share of "on" time the unit actually draws power (compressors cycle), hours = typical daily use.
  var APPLIANCES = [
    { id: 'air-conditioner', name: 'Air Conditioner', note: '1.5HP split unit', icon: 'fa-snowflake', watts: 1200, surge: 3, duty: 0.7, hours: 8 },
    { id: 'refrigerator', name: 'Refrigerator', note: 'Fridge / fridge-freezer', icon: 'fa-temperature-low', watts: 150, surge: 4, duty: 0.4, hours: 24 },
    { id: 'freezer', name: 'Deep Freezer', note: 'Chest freezer', icon: 'fa-box', watts: 250, surge: 4, duty: 0.5, hours: 24 },
    { id: 'television', name: 'Television', note: 'LED TV + decoder', icon: 'fa-tv', watts: 120, surge: 1, duty: 1, hours: 6 },
    { id: 'lighting', name: 'Lighting', note: 'LED bulbs (qty = bulbs)', icon: 'fa-lightbulb', watts: 12, surge: 1, duty: 1, hours: 6 },
    { id: 'fan', name: 'Fans', note: 'Ceiling / standing', icon: 'fa-fan', watts: 75, surge: 1.5, duty: 1, hours: 10 },
    { id: 'pump', name: 'Water Pump', note: '1HP pump', icon: 'fa-faucet-drip', watts: 750, surge: 3, duty: 1, hours: 1 },
    { id: 'washing-machine', name: 'Washing Machine', note: 'Laundry equipment', icon: 'fa-shirt', watts: 500, surge: 2.5, duty: 0.6, hours: 1 },
    { id: 'computer', name: 'Computer', note: 'Laptop / desktop', icon: 'fa-laptop', watts: 100, surge: 1, duty: 1, hours: 8 }
  ];
  var INVERTER_SIZES = [1, 1.5, 2.5, 3.5, 5, 7.5, 10, 12, 15, 20, 30, 40, 50, 75, 100];
  var K = { PSH: 5, SYS_EFF: 0.75, PANEL_W: 550, LI_DOD: 0.9, TUB_DOD: 0.5, INV_EFF: 0.92, HEADROOM: 1.25, PF: 0.8, MIN_SOLAR_SHARE: 0.4, LI_MODULE_WH: 5120, TUB_WH: 12 * 200 };
  var GRID_LOW = { '20-24': 20, '16-20': 16, '12-16': 12, '08-12': 8, '04-08': 4, '00-04': 0 };
  var GRID_LABEL = { '20-24': '20-24 hours', '16-20': '16-20 hours', '12-16': '12-16 hours', '08-12': '8-12 hours', '04-08': '4-8 hours', '00-04': 'Less than 4 hours' };
  var BACKUP_LABEL = { '4': 'Up to 4 hours', '8': '4-8 hours', '12': '8-12 hours', '16': '12-16 hours', '24': '16-24+ hours' };

  function roundUpTo(list, v) { for (var i = 0; i < list.length; i++) if (list[i] >= v) return list[i]; return Math.ceil(v / 10) * 10; }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  // items: [{def, qty, hours}] · backupHours: number · gridKey: key of GRID_LOW
  function calculate(items, backupHours, gridKey) {
    var running = 0, daily = 0, backup = 0, startExtra = 0;
    items.forEach(function (it) {
      var w = it.def.watts * it.qty;
      running += w;
      daily += w * it.hours * it.def.duty;
      backup += w * Math.min(it.hours, backupHours) * it.def.duty;
      startExtra = Math.max(startExtra, it.def.watts * (it.def.surge - 1));            // one motor starts at a time
    });
    var peak = running + startExtra;
    var needKva = Math.max(running * K.HEADROOM / K.PF, peak / 2 / K.PF) / 1000;     // 25% headroom, and 2x surge capability
    var kva = roundUpTo(INVERTER_SIZES, needKva);
    var low = GRID_LOW[gridKey]; if (low === undefined) low = 0;
    var share = Math.max(K.MIN_SOLAR_SHARE, (24 - low) / 24);
    var solarWh = daily * share;
    var wp = solarWh / (K.PSH * K.SYS_EFF);
    var panels = Math.max(1, Math.ceil(wp / K.PANEL_W));
    var liWh = backup / (K.LI_DOD * K.INV_EFF), tubWh = backup / (K.TUB_DOD * K.INV_EFF);
    var series = kva <= 1.5 ? 1 : kva <= 3.5 ? 2 : 4, tub = null;
    if (kva <= 10) { var n = Math.ceil(tubWh / K.TUB_WH); tub = Math.ceil(n / series) * series; }
    return {
      runningW: running, peakW: peak, dailyWh: daily, backupWh: backup, share: share,
      inverterKva: kva,
      panels: panels, arrayKwp: panels * K.PANEL_W / 1000, solarWh: solarWh,
      liKwh: Math.ceil(liWh / 100) / 10, liModules: Math.max(1, Math.ceil(liWh / K.LI_MODULE_WH)),
      tubKwh: Math.ceil(tubWh / 100) / 10, tubBatteries: tub
    };
  }

  TEMPLATES.calculator = {
    html: function () {
      var rows = APPLIANCES.map(function (a) {
        return '<div class="appliance-row" data-id="' + a.id + '"><div class="appliance-info"><i class="fa-solid ' + a.icon + '" aria-hidden="true"></i><div><h4>' + a.name + '</h4><small>' + a.note + ' · ~' + fmt(a.watts) + ' W</small></div></div>' +
          '<input type="number" inputmode="numeric" min="0" max="999" step="1" placeholder="0" data-qty aria-label="' + a.name + ' quantity">' +
          '<input type="number" inputmode="decimal" min="0" max="24" step="0.5" placeholder="' + a.hours + '" data-hours aria-label="' + a.name + ' hours per day"></div>';
      }).join('');
      return '<div class="modal-backdrop" data-close></div>' +
        '<div class="modal-panel is-wide" tabindex="-1">' +
        '<button class="modal-close" type="button" data-close aria-label="Close calculator"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '<div class="modal-head"><img src="assets/file_00000000b0bc81fb996e1c0d593e5acb.webp" alt="" width="44" height="44"><div><span class="section-eyebrow on-dark">ENERGY SYSTEM CALCULATOR</span><h2 id="calculator-title">Estimate Your Solar Needs <span>Before You Request a Quote</span></h2></div></div>' +
        '<div class="modal-body"><p class="modal-intro">Tell us what you want to power, how often you use it and how much backup you need. You get an initial indication of the inverter, solar array and battery capacity that may suit you.</p>' +
        '<div class="calc-layout"><form class="calc-form" id="solar-calculator-form" novalidate>' +
        '<div class="form-grid">' +
        '<div class="form-group"><label for="c-property">Property Type</label><select id="c-property" name="property_type" required><option value="">Select property type</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="office">Office</option><option value="shop">Shop / Retail</option><option value="other">Other</option></select></div>' +
        '<div class="form-group"><label for="c-backup">Desired Backup Time</label><select id="c-backup" name="backup_hours" required><option value="">Select backup duration</option><option value="4">Up to 4 hours</option><option value="8">4-8 hours</option><option value="12">8-12 hours</option><option value="16">12-16 hours</option><option value="24">16-24+ hours</option></select></div>' +
        '<div class="form-group"><label for="c-grid">Average Grid Supply Per Day</label><select id="c-grid" name="grid_hours" required><option value="">Select</option><option value="20-24">20-24 hours</option><option value="16-20">16-20 hours</option><option value="12-16">12-16 hours</option><option value="08-12">8-12 hours</option><option value="04-08">4-8 hours</option><option value="00-04">Less than 4 hours</option></select></div>' +
        '<div class="form-group"><label for="c-other">Other major loads <small>(not in the numbers)</small></label><input type="text" id="c-other" name="other_loads" placeholder="e.g. microwave, iron, welding machine" maxlength="120" autocomplete="off"></div>' +
        '</div>' +
        '<div class="appliance-head" aria-hidden="true"><span>Appliance</span><span>Qty</span><span>Hrs/day</span></div>' +
        '<div class="appliance-list">' + rows + '</div>' +
        '<div class="calc-error" role="alert" hidden></div>' +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">Calculate My Solar Needs <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></form>' +
        '<aside class="calc-results" id="calculator-results" aria-live="polite">' +
        '<div class="calc-empty"><i class="fa-solid fa-solar-panel" aria-hidden="true"></i><strong>Your estimate appears here</strong><span>Add your appliances, choose your backup time and tap Calculate.</span></div>' +
        '<div class="calc-out" hidden></div></aside></div></div></div>';
    },
    init: function (root) {
      var form = $('#solar-calculator-form', root), err = $('.calc-error', root), empty = $('.calc-empty', root), out = $('.calc-out', root);
      var rows = $$('.appliance-row', root);
      rows.forEach(function (row) {
        var def = APPLIANCES.filter(function (a) { return a.id === row.getAttribute('data-id'); })[0];
        var q = $('[data-qty]', row), h = $('[data-hours]', row);
        q.addEventListener('input', function () {
          var on = parseFloat(q.value) > 0; row.classList.toggle('is-active', on); row.classList.remove('has-error');
          if (on && h.value === '') h.value = def.hours;                                   // typical hours, still editable
          if (!on && h.value == def.hours) h.value = '';
        });
        h.addEventListener('input', function () { row.classList.remove('has-error'); });
      });
      $$('select, input', form).forEach(function (f) { f.addEventListener('input', function () { f.classList.remove('is-invalid'); err.hidden = true; }); });

      function problem(msg, node, row) { err.textContent = msg; err.hidden = false; if (node) { node.classList.add('is-invalid'); } if (row) row.classList.add('has-error'); (node || err).focus && (node || err).focus({ preventScroll: false }); return null; }

      form.addEventListener('submit', function (e) {
        e.preventDefault(); err.hidden = true;
        var prop = $('#c-property', form), backup = $('#c-backup', form), grid = $('#c-grid', form);
        if (!prop.value) return problem('Please choose your property type.', prop);
        var items = [], bad = null;
        rows.forEach(function (row) {
          if (bad) return;
          var def = APPLIANCES.filter(function (a) { return a.id === row.getAttribute('data-id'); })[0];
          var qv = $('[data-qty]', row).value, hv = $('[data-hours]', row).value;
          if (qv === '' && hv === '') return;
          var qty = Number(qv), hrs = Number(hv);
          if (qv === '' || !(qty >= 1) || qty > 999 || Math.floor(qty) !== qty) { bad = ['Enter a whole-number quantity (1-999) for ' + def.name + '.', $('[data-qty]', row), row]; return; }
          if (hv === '' || !(hrs > 0) || hrs > 24) { bad = ['Enter hours per day (0.5 to 24) for ' + def.name + '.', $('[data-hours]', row), row]; return; }
          items.push({ def: def, qty: qty, hours: hrs });
        });
        if (bad) return problem(bad[0], bad[1], bad[2]);
        if (!items.length) return problem('Add at least one appliance: enter a quantity and the hours it runs per day.', $('[data-qty]', rows[0]));
        if (!backup.value) return problem('Please choose how much backup time you want.', backup);
        if (!grid.value) return problem('Please choose your average grid supply per day.', grid);

        var r = calculate(items, Number(backup.value), grid.value);
        r.property = prop.value; r.backupKey = backup.value; r.gridKey = grid.value; r.other = $('#c-other', form).value.trim();
        r.appliances = items.map(function (i) { return { id: i.def.id, name: i.def.name, qty: i.qty, hours: i.hours }; });
        r.summary = fmt(r.inverterKva, r.inverterKva % 1 ? 1 : 0) + ' kVA inverter, ' + fmt(r.arrayKwp, 2) + ' kWp solar (' + r.panels + ' x ' + K.PANEL_W + 'W), ' + fmt(r.liKwh, 1) + ' kWh lithium battery';
        state.estimate = r;
        document.dispatchEvent(new CustomEvent('electra:estimate', { detail: r }));
        render(r);
      });

      function render(r) {
        var inv = fmt(r.inverterKva, r.inverterKva % 1 ? 1 : 0);
        var tubNote = r.tubBatteries ? ' or about ' + r.tubBatteries + ' x 200Ah 12V tubular (' + fmt(r.tubKwh, 1) + ' kWh)' : ' (tubular would need about ' + fmt(r.tubKwh, 1) + ' kWh)';
        out.innerHTML =
          '<div><span class="eyebrow">Your estimate</span><h3>Your Energy System Starting Point</h3></div>' +
          '<div class="result-card" style="--i:0"><i class="fa-solid fa-bolt" aria-hidden="true"></i><span>Recommended Inverter</span><strong id="recommended-inverter">' + inv + ' kVA</strong><small>Covers about ' + fmt(r.runningW / 1000, 1) + ' kW running load and ' + fmt(r.peakW / 1000, 1) + ' kW peak including motor start-up.</small></div>' +
          '<div class="result-card" style="--i:1"><i class="fa-solid fa-solar-panel" aria-hidden="true"></i><span>Solar Array</span><strong id="recommended-panel">' + fmt(r.arrayKwp, 2) + ' kWp</strong><small>' + r.panels + ' x ' + K.PANEL_W + 'W panels, sized to produce about ' + fmt(r.solarWh / 1000, 1) + ' kWh/day (' + Math.round(r.share * 100) + '% of your daily use).</small></div>' +
          '<div class="result-card" style="--i:2"><i class="fa-solid fa-battery-full" aria-hidden="true"></i><span>Battery Storage</span><strong id="recommended-battery">' + fmt(r.liKwh, 1) + ' kWh lithium</strong><small>About ' + r.liModules + ' x 5 kWh lithium module' + (r.liModules > 1 ? 's' : '') + tubNote + '.</small></div>' +
          '<div class="result-meta"><div><b>' + fmt(r.dailyWh / 1000, 1) + ' kWh</b><span>Estimated daily energy use</span></div><div><b>' + fmt(r.backupWh / 1000, 1) + ' kWh</b><span>Energy for your backup window</span></div></div>' +
          (r.other ? '<div class="result-note"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>"' + esc(r.other) + '" is not included in these numbers. Add it in the assessment so it can be sized properly.</span></div>' : '') +
          '<div class="result-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span><b>A starting point, not a final design.</b> Actual loads, site conditions, equipment and backup expectations must be reviewed before a final recommendation.</span></div>' +
          '<details class="calc-assumptions"><summary>How this is calculated</summary><ul>' +
          '<li>Inverter: running load + 25% headroom at 0.8 power factor, and able to start your biggest motor (2x surge).</li>' +
          '<li>Solar: daily energy x share not covered by grid (at least 40%), at 5 peak sun hours and 75% system efficiency, in ' + K.PANEL_W + 'W panels.</li>' +
          '<li>Battery: energy used during your backup window, lithium at 90% usable depth, tubular at 50%, 92% inverter efficiency.</li>' +
          '<li>Typical ratings are used (e.g. 1.5HP AC about 1,200 W). Your equipment may differ.</li></ul></details>' +
          '<button type="button" class="btn btn-primary btn-block" data-to-assessment>Get My Detailed Assessment <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></button>';
        empty.hidden = true; out.hidden = false;
        $('[data-to-assessment]', out).addEventListener('click', function () { Modal.open('assessment', { prefill: r }); });
        setTimeout(function () { out.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }, 80);
      }
    },
    onClose: function () { /* keep inputs so the visitor can reopen and tweak */ }
  };

  /* ---------- 12. ASSESSMENT (3-step pop-up) ---------- */
  var ASSESS_APPLIANCES = [
    ['air-conditioner', 'fa-snowflake', 'Air conditioner'], ['refrigerator', 'fa-temperature-low', 'Refrigerator'], ['freezer', 'fa-box', 'Deep freezer'],
    ['television', 'fa-tv', 'Television'], ['fan', 'fa-fan', 'Fans'], ['lighting', 'fa-lightbulb', 'Lighting'], ['pump', 'fa-faucet-drip', 'Water pump'],
    ['washing-machine', 'fa-shirt', 'Washing machine'], ['microwave', 'fa-temperature-high', 'Microwave'], ['computer', 'fa-laptop', 'Computers'],
    ['router', 'fa-wifi', 'Wi-Fi / network'], ['other', 'fa-ellipsis', 'Other loads']
  ];
  function opt(list) { return list.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); }
  function field(id, label, control, extra) { return '<div class="form-group"' + (extra || '') + '><label for="' + id + '">' + label + '</label>' + control + '</div>'; }

  TEMPLATES.assessment = {
    html: function () {
      var grid = [['', 'Select'], ['20-24', '20-24 hours'], ['16-20', '16-20 hours'], ['12-16', '12-16 hours'], ['08-12', '8-12 hours'], ['04-08', '4-8 hours'], ['00-04', 'Less than 4 hours']];
      return '<div class="modal-backdrop" data-close></div>' +
        '<div class="modal-panel" tabindex="-1">' +
        '<button class="modal-close" type="button" data-close aria-label="Close assessment"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '<div class="modal-head"><img src="assets/file_00000000b0bc81fb996e1c0d593e5acb.webp" alt="" width="44" height="44"><div><span class="section-eyebrow on-dark">PROJECT ASSESSMENT</span><h2 id="assessment-title">Tell Us What You Need. <span>We\'ll Understand The Requirements.</span></h2></div></div>' +
        '<form id="assessment-form" novalidate style="display:contents">' +
        '<div class="modal-body" data-scroll>' +
        '<ol class="stepper" aria-label="Progress"><li class="is-current"><span class="dot">1</span><span>You &amp; property</span></li><li><span class="dot">2</span><span>Power &amp; appliances</span></li><li><span class="dot">3</span><span>Backup &amp; notes</span></li></ol>' +
        /* step 1 */
        '<div class="step" data-step="1"><div class="step-section"><h3><span>01</span>Your Details</h3><div class="form-grid">' +
        field('a-name', 'Full Name', '<input type="text" id="a-name" name="name" autocomplete="name" placeholder="e.g. Chinedu Okafor" maxlength="80" required>') +
        field('a-phone', 'Phone / WhatsApp', '<input type="tel" id="a-phone" name="phone" autocomplete="tel" inputmode="tel" placeholder="e.g. 0814 420 6866 or +234…" maxlength="20" required>') +
        field('a-email', 'Email Address', '<input type="email" id="a-email" name="email" autocomplete="email" placeholder="you@example.com" maxlength="120" required>') +
        field('a-location', 'Property Location', '<input type="text" id="a-location" name="location" autocomplete="address-level2" placeholder="City / State" maxlength="100" required>') +
        '</div></div><div class="step-section"><h3><span>02</span>Property Details</h3><div class="form-grid">' +
        field('a-ptype', 'Property Type', '<select id="a-ptype" name="property_type" required><option value="">Select property type</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="office">Office</option><option value="shop">Shop / Retail</option><option value="hotel">Hotel / Guest house</option><option value="school">School / Institution</option><option value="other">Other</option></select>') +
        field('a-puse', 'Property Use', '<select id="a-puse" name="property_use"><option value="">Select</option><option value="residential">Residential</option><option value="business">Business</option><option value="mixed">Residential + Business</option></select>') +
        field('a-bedrooms', 'Number Of Bedrooms <small>(optional)</small>', '<select id="a-bedrooms" name="bedrooms"><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option></select>') +
        field('a-occupants', 'Number Of Occupants <small>(optional)</small>', '<input type="number" id="a-occupants" name="occupants" min="1" max="999" inputmode="numeric" placeholder="e.g. 5">') +
        '</div></div></div>' +
        /* step 2 */
        '<div class="step" data-step="2" hidden><div class="step-section"><h3><span>03</span>Current Power Situation</h3><div class="form-grid">' +
        field('a-grid', 'Average Grid Supply Per Day', '<select id="a-grid" name="grid_hours">' + opt(grid) + '</select>') +
        field('a-generator', 'Do You Currently Use A Generator?', '<select id="a-generator" name="generator"><option value="">Select</option><option value="yes">Yes</option><option value="sometimes">Sometimes</option><option value="no">No</option></select>') +
        field('a-genhours', 'Generator Usage', '<select id="a-genhours" name="generator_hours" disabled><option value="">Select</option><option value="Less than 4 hours/day">Less than 4 hours / day</option><option value="4-8 hours/day">4-8 hours / day</option><option value="8-12 hours/day">8-12 hours / day</option><option value="More than 12 hours/day">More than 12 hours / day</option></select>') +
        field('a-solar', 'Existing Solar', '<select id="a-solar" name="existing_solar"><option value="">Select</option><option value="none">None</option><option value="inverter">Inverter only</option><option value="solar-panel">Solar panels</option><option value="complete">Complete solar system</option></select>') +
        '</div></div><div class="step-section"><h3><span>04</span>Major Appliances <small>Select what you need your system to support</small></h3><div class="appliance-check-grid">' +
        ASSESS_APPLIANCES.map(function (a) { return '<label class="appliance-check"><input type="checkbox" name="appliances" value="' + a[0] + '"><span><i class="fa-solid ' + a[1] + '" aria-hidden="true"></i>' + a[2] + '</span></label>'; }).join('') +
        '</div></div></div>' +
        /* step 3 */
        '<div class="step" data-step="3" hidden><div class="step-section"><h3><span>05</span>Backup Requirements</h3><div class="form-grid">' +
        field('a-backup', 'Desired Backup Duration', '<select id="a-backup" name="backup_duration" required><option value="">Select backup duration</option><option value="4">Up to 4 hours</option><option value="8">4-8 hours</option><option value="12">8-12 hours</option><option value="16">12-16 hours</option><option value="24">16-24+ hours</option></select>') +
        field('a-priority', 'Backup Priority', '<select id="a-priority" name="backup_priority"><option value="">Select</option><option value="Essential appliances only">Essential appliances only</option><option value="Most appliances">Most appliances</option><option value="Whole property">Whole property</option></select>') +
        field('a-battery', 'Battery Preference', '<select id="a-battery" name="battery_preference"><option value="">No preference</option><option value="Lithium">Lithium</option><option value="Tubular">Tubular</option><option value="Not sure">Not sure</option></select>') +
        field('a-budget', 'Estimated Budget Range', '<select id="a-budget" name="budget"><option value="">Prefer not to say</option><option value="Under ₦1m">Under ₦1m</option><option value="₦1m - ₦3m">₦1m - ₦3m</option><option value="₦3m - ₦5m">₦3m - ₦5m</option><option value="₦5m - ₦10m">₦5m - ₦10m</option><option value="₦10m+">₦10m+</option></select>') +
        '</div></div><div class="step-section"><h3><span>06</span>Tell Us More</h3>' +
        field('a-notes', 'Additional Requirements <small>(optional)</small>', '<textarea id="a-notes" name="notes" rows="4" maxlength="600" placeholder="Tell us about your energy needs, current system, appliances, concerns or anything else that may help us understand your project."></textarea>') +
        '<label class="calc-chip" id="a-attach-chip" hidden><input type="checkbox" id="a-attach" checked style="accent-color:var(--green-2);width:18px;height:18px"><span id="a-attach-text"></span></label>' +
        '<p class="privacy-note"><i class="fa-solid fa-lock" aria-hidden="true"></i>Your information is used to understand your project and prepare your assessment request.</p></div></div>' +
        '<p class="form-status error" id="a-error" role="alert"></p>' +
        '</div>' +
        '<div class="modal-foot" data-foot><button type="button" class="btn btn-outline" data-back hidden><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button><span class="spacer"></span><button type="button" class="btn btn-primary" data-next>Next <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button><button type="submit" class="btn btn-wa" data-send hidden>Send My Assessment <i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></div>' +
        '</form>' +
        /* success card */
        '<div class="modal-body success-card" data-success hidden>' +
        '<div class="success-badge"><span class="success-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span></div>' +
        '<span class="success-eyebrow">ASSESSMENT READY</span><h2>SUCCESS<span>!</span></h2>' +
        '<p>Your project details have been prepared and are ready to continue on WhatsApp.</p>' +
        '<div class="success-summary" data-summary></div>' +
        '<div class="success-actions"><a class="btn btn-wa btn-lg btn-block" data-wa href="#" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Continue on WhatsApp</a><button type="button" class="btn btn-outline btn-block" data-close>Close</button></div>' +
        '<p class="success-fine">Tap "Continue on WhatsApp" to send your details to the team. Nothing is sent until you press send in WhatsApp.</p></div>' +
        '</div>';
    },
    init: function (root) {
      var form = $('#assessment-form', root), steps = $$('.step', root), crumbs = $$('.stepper li', root), body = $('[data-scroll]', root);
      var back = $('[data-back]', root), next = $('[data-next]', root), send = $('[data-send]', root), errBox = $('#a-error', root);
      var cur = 1, sending = false;
      var gen = $('#a-generator', root), genH = $('#a-genhours', root);
      gen.addEventListener('change', function () { var on = gen.value === 'yes' || gen.value === 'sometimes'; genH.disabled = !on; if (!on) genH.value = ''; });

      function clearErr(f) { f.classList.remove('is-invalid'); var n = f.parentElement && f.parentElement.querySelector('.field-error'); if (n) n.remove(); errBox.textContent = ''; }
      $$('input, select, textarea', form).forEach(function (f) { f.addEventListener('input', function () { clearErr(f); }); f.addEventListener('change', function () { clearErr(f); }); });
      function mark(f, msg) { f.classList.add('is-invalid'); var p = f.parentElement; if (p && !p.querySelector('.field-error')) { var s = document.createElement('span'); s.className = 'field-error'; s.textContent = msg; p.appendChild(s); } }

      function normPhone(v) { var s = String(v).replace(/[\s\-().]/g, ''); return /^\+?\d{10,15}$/.test(s) ? s : null; }
      function validate(n) {
        var first = null, ok = true;
        function need(id, test, msg) { var f = $('#' + id, root); if (!test(f.value.trim())) { mark(f, msg); ok = false; if (!first) first = f; } }
        if (n === 1) {
          need('a-name', function (v) { return v.length >= 2; }, 'Please enter your full name.');
          need('a-phone', function (v) { return !!normPhone(v); }, 'Enter a valid phone number, e.g. 08012345678 or +2348012345678.');
          need('a-email', function (v) { return EMAIL_RE.test(v); }, 'Enter a valid email address.');
          need('a-location', function (v) { return v.length >= 2; }, 'Please enter the property location.');
          need('a-ptype', function (v) { return !!v; }, 'Please select a property type.');
        }
        if (n === 3) need('a-backup', function (v) { return !!v; }, 'Please select your desired backup duration.');
        if (first) { errBox.textContent = 'Please fix the highlighted field' + ($$('.is-invalid', form).length > 1 ? 's' : '') + ' to continue.'; first.focus(); }
        return ok;
      }

      function go(n) {
        cur = n;
        steps.forEach(function (s, i) { s.hidden = i + 1 !== n; });
        crumbs.forEach(function (c, i) { c.classList.toggle('is-current', i + 1 === n); c.classList.toggle('is-done', i + 1 < n); $('.dot', c).innerHTML = i + 1 < n ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : String(i + 1); });
        back.hidden = n === 1; next.hidden = n === 3; send.hidden = n !== 3;
        errBox.textContent = ''; body.scrollTop = 0;
      }
      next.addEventListener('click', function () { if (validate(cur)) go(cur + 1); });
      back.addEventListener('click', function () { go(cur - 1); });
      form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && cur < 3 && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); next.click(); } });

      function text(id) { var f = $('#' + id, root); if (!f) return ''; if (f.tagName === 'SELECT') return f.value ? f.options[f.selectedIndex].text : ''; return f.value.trim(); }
      function buildMessage() {
        var L = [], apps = $$('input[name="appliances"]:checked', form).map(function (c) { return c.parentElement.textContent.trim(); });
        L.push('*New Solar Assessment Request*', '_From the ' + CONFIG.business + ' website_', '');
        L.push('*Contact*', 'Name: ' + text('a-name'), 'Phone: ' + normPhone($('#a-phone', root).value), 'Email: ' + text('a-email'), 'Location: ' + text('a-location'), '');
        L.push('*Property*', 'Type: ' + text('a-ptype'));
        if (text('a-puse')) L.push('Use: ' + text('a-puse'));
        if (text('a-bedrooms')) L.push('Bedrooms: ' + text('a-bedrooms'));
        if (text('a-occupants')) L.push('Occupants: ' + text('a-occupants'));
        L.push('', '*Power situation*');
        L.push('Grid supply: ' + (text('a-grid') || 'Not specified') + ' per day');
        L.push('Generator: ' + (text('a-generator') || 'Not specified') + (text('a-genhours') ? ' (' + text('a-genhours') + ')' : ''));
        L.push('Existing solar: ' + (text('a-solar') || 'Not specified'), '');
        L.push('*Appliances to support*', apps.length ? apps.join(', ') : 'Not specified', '');
        L.push('*Backup*', 'Duration: ' + text('a-backup'));
        if (text('a-priority')) L.push('Priority: ' + text('a-priority'));
        if (text('a-battery')) L.push('Battery: ' + text('a-battery'));
        if (text('a-budget')) L.push('Budget: ' + text('a-budget'));
        if (state.estimate && $('#a-attach', root).checked) {
          var r = state.estimate; L.push('', '*Calculator estimate*', 'Inverter: ' + fmt(r.inverterKva, r.inverterKva % 1 ? 1 : 0) + ' kVA', 'Solar: ' + fmt(r.arrayKwp, 2) + ' kWp (' + r.panels + ' x ' + K.PANEL_W + 'W)', 'Battery: ' + fmt(r.liKwh, 1) + ' kWh lithium', 'Daily use: ' + fmt(r.dailyWh / 1000, 1) + ' kWh', 'Loads: ' + r.appliances.map(function (a) { return a.qty + ' x ' + a.name + ' (' + a.hours + 'h)'; }).join(', '));
          if (r.other) L.push('Other loads: ' + r.other);
        }
        if (text('a-notes')) L.push('', '*Notes*', text('a-notes'));
        return L.join('\n');
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault(); if (sending) return;
        if (!validate(1)) { go(1); return; }
        if (!validate(3)) return;
        sending = true; send.classList.add('is-loading');
        var msg = buildMessage(), url = waUrl(msg);
        postJSON(CONFIG.endpoints.assessment, { message: msg, page: location.href, at: new Date().toISOString() });
        $('[data-wa]', root).href = url;
        $('[data-summary]', root).innerHTML = [text('a-name'), text('a-location'), text('a-ptype'), 'Backup: ' + text('a-backup')].filter(Boolean).map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('');
        form.hidden = true; $('[data-success]', root).hidden = false;
        $('.modal-panel', root).scrollTop = 0; setTimeout(function () { $('[data-wa]', root).focus({ preventScroll: true }); }, 700);
        sending = false; send.classList.remove('is-loading');
      });
      root._reset = function () { form.reset(); form.hidden = false; $('[data-success]', root).hidden = true; genH.disabled = true; $$('.is-invalid', form).forEach(clearErr); go(1); };
      root._go = go;
    },
    onOpen: function (root, opts) {
      var f = function (id) { return $('#' + id, root); };
      if (opts && opts.preset) {
        f('a-ptype').value = opts.preset; f('a-puse').value = opts.preset === 'residential' ? 'residential' : 'business';
      }
      var r = opts && opts.prefill;
      if (r) {
        if (!f('a-ptype').value) f('a-ptype').value = r.property;
        if (!f('a-backup').value) f('a-backup').value = r.backupKey;
        if (!f('a-grid').value) f('a-grid').value = r.gridKey;
        var map = { 'air-conditioner': 'air-conditioner', refrigerator: 'refrigerator', freezer: 'freezer', television: 'television', fan: 'fan', lighting: 'lighting', pump: 'pump', 'washing-machine': 'washing-machine', computer: 'computer' };
        r.appliances.forEach(function (a) { var c = $('input[name="appliances"][value="' + map[a.id] + '"]', root); if (c) c.checked = true; });
        if (r.other) { var o = $('input[name="appliances"][value="other"]', root); if (o) o.checked = true; if (!f('a-notes').value) f('a-notes').value = 'Other loads: ' + r.other; }
      }
      var chip = $('#a-attach-chip', root);
      if (state.estimate) { chip.hidden = false; $('#a-attach-text', root).textContent = 'Include my calculator estimate (' + state.estimate.summary + ')'; } else chip.hidden = true;
    },
    onClose: function (root) { if (!$('[data-success]', root).hidden && root._reset) setTimeout(root._reset, 400); }
  };

  /* ---------- 13. BOOT ---------- */
  function boot() {
    initHeader(); initMarquee(); initHero(); initReveal(); initFaq(); initVideos(); initYear();
    initWhatsApp(); initNewsletter(); initReviews();
    var m = location.hash.match(/^#(assessment|calculator)$/);
    if (m) Modal.open(m[1], { fromHash: true });
  }
  window.__electra = { calculate: calculate, APPLIANCES: APPLIANCES, K: K };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
