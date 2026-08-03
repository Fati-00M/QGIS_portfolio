/* ============================================================
   Fatima Mahmood — Geospatial Portfolio
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── theme ─────────────────────────────────────────────── */
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('fm-theme'); } catch (e) {}
  var initial = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);

  var toggle = $('#themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fm-theme', next); } catch (e) {}
    });
  }

  /* ── year ──────────────────────────────────────────────── */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── sticky nav + mobile menu ──────────────────────────── */
  var nav = $('#nav');
  var links = $('.nav__links');
  var burger = $('#burger');

  window.addEventListener('scroll', function () {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  }, { passive: true });

  if (burger) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── active section highlight ──────────────────────────── */
  var navLinks = $$('.nav__links a');
  var sections = navLinks
    .map(function (a) { return $(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { secObs.observe(s); });
  }

  /* ── reveal on scroll ──────────────────────────────────── */
  var revealables = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          revObs.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -30px 0px', threshold: 0 });
    revealables.forEach(function (el) { revObs.observe(el); });

    // Failsafe: never leave content invisible on very tall viewports or if
    // the observer misses something. Anything already on screen gets shown.
    var sweep = function () {
      revealables.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    };
    window.addEventListener('load', sweep);
    setTimeout(sweep, 1200);
  }

  /* ── hero video: autoplay only when visible ────────────── */
  var heroVid = $('.hero__video');
  if (heroVid) {
    if (reduced) {
      heroVid.removeAttribute('autoplay');
    } else if ('IntersectionObserver' in window) {
      var heroObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            heroVid.preload = 'auto';
            var p = heroVid.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            heroVid.pause();
          }
        });
      }, { threshold: 0.25 });
      heroObs.observe(heroVid);
    }
  }

  /* ── project filters ───────────────────────────────────── */
  var chips = $$('.chip');
  var cards = $$('#workGrid .card');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', String(on));
      });
      cards.forEach(function (card) {
        var tags = (card.dataset.tags || '').split(' ');
        var show = f === 'all' || tags.indexOf(f) !== -1;
        card.classList.toggle('is-hidden', !show);
        if (!show) stopVideo(card);
      });
    });
  });

  /* ── inline video players ──────────────────────────────── */
  function stopVideo(scope) {
    var wrap = scope.classList && scope.classList.contains('card__media--video')
      ? scope : $('.card__media--video', scope);
    if (!wrap) return;
    var v = $('video', wrap);
    if (v) { v.pause(); v.removeAttribute('controls'); }
    wrap.classList.remove('is-playing');
  }

  $$('.card__media--video').forEach(function (wrap) {
    var video = $('video', wrap);
    if (!video) return;

    function play() {
      // pause any other playing clip
      $$('.card__media--video.is-playing').forEach(function (other) {
        if (other !== wrap) stopVideo(other);
      });
      wrap.classList.add('is-playing');
      video.setAttribute('controls', '');
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    wrap.addEventListener('click', function (e) {
      // let the native controls handle their own clicks
      if (wrap.classList.contains('is-playing') && e.target === video) return;
      if (wrap.classList.contains('is-playing')) return;
      play();
    });

    $('.playbtn', wrap).addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
    });

    video.addEventListener('pause', function () {
      if (video.currentTime === 0) stopVideo(wrap);
    });
  });

  // pause off-screen clips
  if ('IntersectionObserver' in window) {
    var vidObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) stopVideo(en.target);
      });
    }, { threshold: 0 });
    $$('.card__media--video').forEach(function (w) { vidObs.observe(w); });
  }

  /* ── lightbox ──────────────────────────────────────────── */
  var lb    = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCap = $('#lbCap');
  var triggers = $$('[data-lightbox]');
  var index = 0;
  var lastFocus = null;

  function show(i) {
    index = (i + triggers.length) % triggers.length;
    var t = triggers[index];
    lbImg.src = t.dataset.lightbox;
    lbImg.alt = ($('img', t) || {}).alt || '';
    lbCap.textContent = t.dataset.caption || '';
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.classList.add('lb-open');
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    $('#lbClose').focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.classList.remove('lb-open');
    setTimeout(function () { lb.hidden = true; lbImg.src = ''; }, 240);
    if (lastFocus) lastFocus.focus();
  }

  triggers.forEach(function (t, i) {
    t.addEventListener('click', function () { open(i); });
  });

  if (lb) {
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { show(index - 1); });
    $('#lbNext').addEventListener('click', function () { show(index + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'Tab') {
        // simple focus trap
        var f = $$('button', lb);
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
})();
