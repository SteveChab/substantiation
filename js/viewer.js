(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  function land(slide) {
    slide.inert = false;
    slide.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'nearest' });
    slide.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-slide]');
    if (!btn) return;
    var slide = document.getElementById(btn.dataset.slide);
    var dlg = slide.closest('dialog');
    var tile = btn.querySelector('.gallery__tile');
    var big = slide.querySelector('.viewer__media img');
    var canZoom = document.startViewTransition && !reduce.matches && tile && big && !dlg.open;

    if (!canZoom) {
      if (!('commandForElement' in HTMLButtonElement.prototype)) dlg.showModal();
      setTimeout(function () { land(slide); });
      return;
    }

    e.preventDefault();               // cancel the invoker command; we open the dialog inside the transition
    tile.style.viewTransitionName = 'zoom';
    dlg.style.transition = 'none';    // the transition does the fading; avoid fading twice
    var vt = document.startViewTransition(function () {
      tile.style.viewTransitionName = '';
      big.style.viewTransitionName = 'zoom';
      dlg.showModal();
      land(slide);
    });
    vt.finished.finally(function () {
      big.style.viewTransitionName = '';
      dlg.style.transition = '';
    });
  });

  // One Previous/Next pair for the whole viewer. Only the slide in view is
  // reachable, so Tab does not walk through off-screen copies of the controls.
  function step(dlg) {
    var track = dlg.querySelector('.viewer__track');
    var slides = Array.prototype.slice.call(dlg.querySelectorAll('.viewer__slide'));
    var bar = dlg.querySelector('.viewer__bar');
    if (!track || !bar || slides.length < 2 || !window.IntersectionObserver) return;

    var current = 0;
    var live = false;
    var liveTimer;

    function button(label, dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'viewer__step';
      b.textContent = label;
      b.addEventListener('click', function () { go(current + dir); });
      return b;
    }

    var group = document.createElement('div');
    group.className = 'viewer__steps';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Change slide');

    var count = document.createElement('span');
    count.className = 'viewer__count';
    count.setAttribute('aria-hidden', 'true');

    var status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');

    group.append(button('Previous', -1), count, button('Next', 1), status);
    bar.insertBefore(group, bar.querySelector('form'));
    dlg.classList.add('viewer--stepped');
    Array.prototype.forEach.call(dlg.querySelectorAll('.viewer__nav'), function (nav) { nav.remove(); });

    function go(i) {
      var slide = slides[(i + slides.length) % slides.length];
      slide.inert = false;
      slide.scrollIntoView({ inline: 'start', block: 'nearest' });
    }

    function show(i) {
      current = i;
      var focused = document.activeElement;
      var leaving = focused && focused.closest('.viewer__slide');
      if (leaving && leaving !== slides[i]) track.focus({ preventScroll: true });
      slides.forEach(function (slide, n) { slide.inert = n !== i; });
      count.textContent = (i + 1) + ' of ' + slides.length;
      if (live) status.textContent = slides[i].getAttribute('aria-label');
    }

    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(slides.indexOf(entry.target));
      });
    }, { root: track, threshold: 0.6 });
    slides.forEach(function (slide) { watcher.observe(slide); });

    track.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var to = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      go(to);
    });

    // Stay quiet while the viewer opens; announce only changes after that.
    new MutationObserver(function () {
      clearTimeout(liveTimer);
      live = false;
      status.textContent = '';
      if (dlg.open) liveTimer = setTimeout(function () { live = true; }, 400);
    }).observe(dlg, { attributes: true, attributeFilter: ['open'] });

    show(0);
  }

  // Opening a viewer adds a history entry so Back closes it instead of leaving the page.
  function ownsState(dlg) {
    return history.state && history.state.viewer === dlg.id;
  }

  function remember(dlg) {
    new MutationObserver(function () {
      if (dlg.open && !ownsState(dlg)) history.pushState({ viewer: dlg.id }, '');
    }).observe(dlg, { attributes: true, attributeFilter: ['open'] });

    // Close button and Escape land here too; pop the entry we pushed.
    dlg.addEventListener('close', function () {
      if (ownsState(dlg)) history.back();
    });
  }

  window.addEventListener('popstate', function () {
    Array.prototype.forEach.call(document.querySelectorAll('dialog.viewer[open]'), function (dlg) {
      dlg.close();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('dialog.viewer'), function (dlg) {
    remember(dlg);
    step(dlg);
  });
})();
