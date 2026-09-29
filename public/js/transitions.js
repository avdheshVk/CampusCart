// public/js/transitions.js
//
// Three things happen here:
// 1. A frosted "veil" clears on every page load (pure CSS animation — works
//    even if this script fails to run, so the page is never stuck hidden).
// 2. A sliding glass "pill" behind the nav links shows which page you're on.
//    It's placed instantly (no animation) on a fresh page load, but glides
//    smoothly to the clicked link *before* the page actually navigates —
//    so moving between Home / Cart / Orders / Login feels continuous.
// 3. Internal link clicks and form submits blur the veil back in before
//    completing the navigation, and buttons/chips get a small click ripple.

(function () {
  var veil = document.querySelector('.page-transition-veil');
  var navLinksEl = document.querySelector('.nav-links');
  var pill = navLinksEl ? navLinksEl.querySelector('.nav-pill') : null;

  var TRANSITION_MS = 320;   // delay before navigating for ordinary links/forms
  var PILL_VEIL_DELAY = 160; // when the veil starts fading in during a pill glide
  var PILL_NAV_DELAY = 380;  // total delay before navigating when the pill glides

  function isInternalNavigableLink(link) {
    if (!link) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;

    var href = link.getAttribute('href');
    if (!href) return false;
    if (href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    try {
      var url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function movePillTo(link) {
    if (!pill || !link || !navLinksEl) return;
    var linkRect = link.getBoundingClientRect();
    var wrapRect = navLinksEl.getBoundingClientRect();
    pill.style.left = (linkRect.left - wrapRect.left) + 'px';
    pill.style.top = (linkRect.top - wrapRect.top) + 'px';
    pill.style.width = linkRect.width + 'px';
    pill.style.height = linkRect.height + 'px';
    pill.classList.add('ready');
  }

  // Places the pill under whichever link the server marked active.
  // `instant` skips the CSS transition so a fresh page load never shows
  // the pill sliding in from the corner — it should just already be there.
  function placePillOnActive(instant) {
    if (!pill || !navLinksEl) return;
    var active = navLinksEl.querySelector('a.active');
    if (!active) return;

    if (instant) pill.style.transition = 'none';
    movePillTo(active);
    if (instant) {
      void pill.offsetWidth; // force layout so the 'none' transition applies
      pill.style.transition = '';
    }
  }

  function addRipple(el, x, y) {
    var rect = el.getBoundingClientRect();
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = (x - rect.left) + 'px';
    ripple.style.top = (y - rect.top) + 'px';
    el.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 650);
  }

  document.addEventListener('DOMContentLoaded', function () { placePillOnActive(true); });
  window.addEventListener('load', function () { placePillOnActive(true); });
  window.addEventListener('resize', function () { placePillOnActive(true); });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest('a');
    if (link && isInternalNavigableLink(link)) {
      var href = link.getAttribute('href');
      e.preventDefault();

      var navKey = link.dataset.navKey;
      var isPillLink = pill && link.closest('.nav-links') && navKey && navKey !== 'logout';

      if (isPillLink) {
        movePillTo(link); // glide the glass over to the clicked item first
        setTimeout(function () { if (veil) veil.classList.add('active'); }, PILL_VEIL_DELAY);
        setTimeout(function () { window.location.href = href; }, PILL_NAV_DELAY);
      } else {
        if (veil) veil.classList.add('active');
        setTimeout(function () { window.location.href = href; }, TRANSITION_MS);
      }
      return;
    }

    var control = e.target.closest('button, .chip');
    if (control) addRipple(control, e.clientX, e.clientY);
  }, false);

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.dataset.transitioning === 'true') return; // let the real submit through
    e.preventDefault();
    form.dataset.transitioning = 'true';
    if (veil) veil.classList.add('active');
    setTimeout(function () {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    }, TRANSITION_MS);
  }, false);
})();
