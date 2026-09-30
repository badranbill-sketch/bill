/*
 * Runs in the page before printing (build.mjs waits for window.__docsReady):
 *  1. crops each drawing's viewBox to its ink (data-crop="ink"), or to an explicit box;
 *  2. fits each capsule to one page: tries denser steps fit-1 … fit-3, else marks it "flow"
 *     (page 1 = the scripts; page 2 = on-screen text, CTA wording, production notes).
 *     Measured at the printed width and height (build.mjs launches Chromium with unhinted fonts
 *     so screen metrics match print). <html data-capsule-pages="auto|1|2"> from the front matter.
 */
(function () {
  var PAGE_W_IN = 6.4; // 8.5 in − 2 × 1.05 in side margins (print.css @page)
  var CAPSULE_H_IN = 9.39; // 11 in − 0.86 in − 0.75 in (print.css @page capsule)
  var SAFETY_IN = 0.12;

  function crop() {
    var svgs = document.querySelectorAll('svg[data-crop]');
    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      var mode = svg.getAttribute('data-crop');
      if (mode === 'full') continue;
      var x, y, w, h;
      if (mode === 'ink') {
        var b = svg.getBBox();
        if (!b.width || !b.height) continue;
        var pad = Math.max(b.width, b.height) * 0.025;
        x = b.x - pad; y = b.y - pad; w = b.width + 2 * pad; h = b.height + 2 * pad;
      } else {
        var p = mode.split(',').map(Number);
        x = p[0]; y = p[1]; w = p[2]; h = p[3];
      }
      svg.setAttribute('viewBox', [x, y, w, h].map(function (n) { return Math.round(n * 10) / 10; }).join(' '));
      svg.style.aspectRatio = w + ' / ' + h;
    }
  }

  function fitCapsules() {
    var caps = document.querySelectorAll('.capsule');
    if (!caps.length) return;
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;width:1in;height:1in;visibility:hidden';
    document.body.appendChild(probe);
    var IN = probe.getBoundingClientRect().height;
    probe.remove();
    var main = document.querySelector('main') || document.body;
    var oldWidth = main.style.width;
    main.style.width = PAGE_W_IN + 'in';
    var limit = (CAPSULE_H_IN - SAFETY_IN) * IN;
    // Front matter capsule_pages: auto (default) | 1 (never split; may still overflow) | 2 (always two pages)
    var mode = document.documentElement.getAttribute('data-capsule-pages') || 'auto';
    var steps = mode === '2' ? [] : ['fit-0', 'fit-1', 'fit-2', 'fit-3'];
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      var fit = 'flow';
      for (var s = 0; s < steps.length; s++) {
        c.classList.remove('fit-1', 'fit-2', 'fit-3');
        if (s) c.classList.add(steps[s]);
        if (c.getBoundingClientRect().height <= limit) { fit = steps[s]; break; }
      }
      if (fit === 'flow' && mode === '1') fit = 'fit-3 (overflows)';
      else if (fit === 'flow') { c.classList.remove('fit-1', 'fit-2', 'fit-3'); c.classList.add('flow'); }
      c.setAttribute('data-fit', fit);
      c.setAttribute('data-height-in', (c.getBoundingClientRect().height / IN).toFixed(2));
    }
    main.style.width = oldWidth;
  }

  function ready() {
    crop();
    fitCapsules();
    document.documentElement.setAttribute('data-ready', '1');
    window.__docsReady = true;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
  else window.addEventListener('load', ready);
})();
