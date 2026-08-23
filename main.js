/* ==========================================================================
   Arrow Flow — landing page demo board

   Draws what the game draws: thin ink polylines on a dot lattice, capped
   with a pixel-stepped arrowhead. The head geometry is a direct port of
   src/render/arrowhead.ts in the app, and the colours are read off the
   page's CSS custom properties — which are themselves a transcription of
   src/theme/palette.ts. So the board here and the board in the game are
   literally the same drawing, in the same theme.

   The board is scripted, not solvable here: four arrows leave in the only
   order that works, because each one is blocked until the arrow crossing
   its way out has gone.
   ========================================================================== */

(function () {
  'use strict';

  var canvas = document.getElementById('demo');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var tapsOut = document.getElementById('demo-taps');
  var progressOut = document.getElementById('demo-progress');

  /* -- board geometry ----------------------------------------------------- */

  var GRID = 7;      // cells per side
  var STROKE = 0.2;  // line width in grid units — matches STROKE in the app

  /* Set by fit(), from however wide the phone screen actually renders. */
  var SIZE = 168;
  var CELL = SIZE / GRID;

  /* Each arrow is a polyline through cell centres; the last point is the
     head. They are listed in the only order they can leave: the third is
     blocked by the first two, the fourth by the third. */
  var ARROWS = [
    { pts: [[0, 2], [0, 0], [3, 0]] },   // exits right along the top row
    { pts: [[1, 5], [1, 2], [4, 2]] },   // exits right, freeing column 3
    { pts: [[3, 6], [3, 4]] },           // exits up, freeing row 4
    { pts: [[6, 6], [6, 4], [4, 4]] }    // exits left
  ];

  /* -- theme -------------------------------------------------------------- */

  /* One source of truth: the page owns the palette, the canvas borrows it.
     Falls back to Quiet Current dark if custom properties are unavailable. */
  var theme = { ink: '#e6ebe6', accent: '#7cb8a4', bg: '#161b18', dot: 'rgba(230,235,230,0.13)' };

  function readTheme() {
    var s = window.getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var got = s.getPropertyValue(name).trim();
      return got || fallback;
    }
    theme = {
      ink: v('--ink', theme.ink),
      accent: v('--accent', theme.accent),
      bg: v('--bg', theme.bg),
      dot: v('--dot', theme.dot)
    };
  }

  /* -- polyline maths ----------------------------------------------------- */

  function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

  function pathLength(pts) {
    var total = 0;
    for (var i = 0; i < pts.length - 1; i++) total += dist(pts[i], pts[i + 1]);
    return total;
  }

  /** Exit direction: where the last segment is heading. */
  function headDir(pts) {
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    if (b[0] > a[0]) return 'R';
    if (b[0] < a[0]) return 'L';
    if (b[1] < a[1]) return 'U';
    return 'D';
  }

  /** The path an arrow travels: its own shape, then straight on out. */
  function extend(pts, by) {
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    var len = dist(a, b);
    var ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    return pts.concat([[b[0] + ux * by, b[1] + uy * by]]);
  }

  /** The slice of a polyline between arc lengths `a` and `b`. */
  function slice(pts, a, b) {
    var out = [];
    var acc = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i], p1 = pts[i + 1];
      var len = dist(p0, p1);
      if (len === 0) continue;
      var segEnd = acc + len;
      var s0 = Math.max(a, acc), s1 = Math.min(b, segEnd);
      if (s1 > s0) {
        var t0 = (s0 - acc) / len, t1 = (s1 - acc) / len;
        if (out.length === 0) {
          out.push([p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0]);
        }
        out.push([p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1]);
      }
      acc = segEnd;
    }
    return out;
  }

  /* -- arrowhead (ported from src/render/arrowhead.ts) --------------------- */

  /* Four stacked rects, 0.55 wide x 0.4 long in grid units, pointing UP.
     The base caps the line at the head node; the tip pokes 0.4 units past it. */
  var HEAD_ROWS_UP = [
    [-0.07, -0.4, 0.07, -0.3],
    [-0.14, -0.3, 0.14, -0.2],
    [-0.205, -0.2, 0.205, -0.1],
    [-0.275, -0.1, 0.275, 0]
  ];

  function rotate(r, dir) {
    var x0 = r[0], y0 = r[1], x1 = r[2], y1 = r[3];
    switch (dir) {
      case 'U': return r;
      case 'D': return [-x1, -y1, -x0, -y0];
      case 'R': return [-y1, x0, -y0, x1];
      case 'L': return [y0, -x1, y1, -x0];
    }
  }

  /* -- drawing ------------------------------------------------------------ */

  /** Grid units -> canvas px. Cell centres, so the board sits inset. */
  function px(u) { return (u + 0.5) * CELL; }

  /* DotGrid.tsx draws a 0.14-unit square at every lattice point. */
  function drawDots() {
    var d = Math.max(2, Math.round(0.14 * CELL));
    ctx.fillStyle = theme.dot;
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        ctx.fillRect(px(x) - d / 2, px(y) - d / 2, d, d);
      }
    }
  }

  function drawArrow(pts, dir, color) {
    if (pts.length >= 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = STROKE * CELL;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(px(pts[0][0]), px(pts[0][1]));
      for (var i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i][0]), px(pts[i][1]));
      ctx.stroke();
    }
    var head = pts[pts.length - 1];
    if (!head) return;
    ctx.fillStyle = color;
    for (var j = 0; j < HEAD_ROWS_UP.length; j++) {
      var r = rotate(HEAD_ROWS_UP[j], dir);
      ctx.fillRect(
        px(head[0] + r[0]), px(head[1] + r[1]),
        (r[2] - r[0]) * CELL, (r[3] - r[1]) * CELL
      );
    }
  }

  /* -- the loop ----------------------------------------------------------- */

  /* Per arrow: its own length, the full path out, and how far it must travel
     before the tail has cleared the board too. */
  var TRAVEL_PAD = 12;
  var plan = ARROWS.map(function (a) {
    var len = pathLength(a.pts);
    return {
      len: len,
      dir: headDir(a.pts),
      path: extend(a.pts, len + TRAVEL_PAD),
      travel: len + TRAVEL_PAD
    };
  });

  var TAP_MS = 220;     // the arrow lights up, as if tapped
  var SLIDE_MS = 620;   // then it leaves
  var GAP_MS = 260;     // beat before the next one
  var HOLD_MS = 1500;   // empty board, before starting over

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /** Mirrors the play screen's HUD: taps counted, rail filled by arrows gone. */
  function setHud(taps, cleared) {
    if (tapsOut) tapsOut.textContent = String(taps);
    if (progressOut) progressOut.style.width = (cleared / plan.length) * 100 + '%';
  }

  function render(index, phase, t) {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    drawDots();

    for (var i = 0; i < plan.length; i++) {
      if (i < index) continue;                       // already gone
      var p = plan[i];
      if (i > index || phase === 'tap') {
        drawArrow(ARROWS[i].pts, p.dir, i === index ? theme.accent : theme.ink);
      } else {
        var s = easeOut(t) * p.travel;
        drawArrow(slice(p.path, s, s + p.len), p.dir, theme.accent);
      }
    }

    setHud(Math.min(index + (phase === 'tap' && index < plan.length ? 1 : 0), plan.length), index);
  }

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The canvas fills the phone screen, so its backing store is sized from the
     rendered width rather than a fixed constant — CELL follows. */
  function fit() {
    var css = canvas.clientWidth || SIZE;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    SIZE = css;
    CELL = SIZE / GRID;
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  readTheme();
  fit();

  if (reduced) {
    // The full board, held still. `fit` clears the canvas, so redraw after it.
    var still = function () { readTheme(); fit(); render(0, 'tap', 0); setHud(0, 0); };
    still();
    window.addEventListener('resize', still);
    if (window.matchMedia) {
      var mqStill = window.matchMedia('(prefers-color-scheme: light)');
      if (mqStill.addEventListener) mqStill.addEventListener('change', still);
    }
    return;
  }

  var start = null;
  var running = true;
  var raf = null;

  /* One full cycle: tap+slide+gap per arrow, then the hold. */
  var STEP = TAP_MS + SLIDE_MS + GAP_MS;
  var CYCLE = STEP * plan.length + HOLD_MS;

  function frame(now) {
    raf = null;
    if (start === null) start = now;
    var elapsed = (now - start) % CYCLE;
    var index = Math.floor(elapsed / STEP);

    if (index >= plan.length) {
      render(plan.length, 'tap', 0);      // board empty during the hold
    } else {
      var within = elapsed - index * STEP;
      if (within < TAP_MS) render(index, 'tap', 0);
      else if (within < TAP_MS + SLIDE_MS) {
        render(index, 'slide', (within - TAP_MS) / SLIDE_MS);
      } else render(index + 1, 'tap', 0);
    }

    if (running) raf = window.requestAnimationFrame(frame);
  }

  function play() {
    if (running && raf === null) raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; }
  }

  /* Don't animate a board nobody is looking at. Clearing `start` on resume
     restarts the cycle cleanly instead of jumping mid-slide. */
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { start = null; play(); } else stop();
  }

  document.addEventListener('visibilitychange', function () {
    setRunning(!document.hidden);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      setRunning(entries[0].isIntersecting && !document.hidden);
    }, { threshold: 0.1 }).observe(canvas);
  }

  window.addEventListener('resize', fit);

  /* Follow the OS between light and dark the way the app follows its setting. */
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.addEventListener) mq.addEventListener('change', readTheme);
  }

  play();
})();
