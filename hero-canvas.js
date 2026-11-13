/* ============================================================================
   Hero Canvas Backdrop — Data Scientist & Speech AI Engineer portfolio
   ----------------------------------------------------------------------------
   Layers (back to front):
     1. Architectural grid  — pre-rendered once per resize to an offscreen
                              canvas (0.04 alpha), blitted each frame.
     2. Speech-AI waveform  — 4 slow sine/particle ribbons across the
                              lower-middle → right, cyan #00F0FF → purple
                              #A855F7, drawn as translucent lines + glow dots.
     3. Neural constellation— ~40 drifting nodes, faint links within 120px
                              (max alpha 0.12), subtle mouse repulsion +
                              per-node parallax depth.

   Performance: single requestAnimationFrame loop, delta-clamped, pauses
   when the hero is off-screen, particle count scales down on mobile,
   devicePixelRatio capped at 2. Respects prefers-reduced-motion by
   painting ONE static frame and never starting the loop.

   Drop-in usage:
     <section class="hero"> <canvas id="heroCanvas"></canvas> ... </section>
     <script src="hero-canvas.js"></script>
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    nodeCountDesktop: 42,        // nodes on wide screens
    nodeCountMobile: 18,         // nodes under the mobile breakpoint
    mobileBreakpoint: 720,       // px
    linkDistance: 120,           // px — nodes closer than this get a line
    linkColor: '56, 189, 248',   // rgb of link lines (alpha scaled, max 0.12)
    linkMaxAlpha: 0.12,
    gridSize: 44,                // px — architectural grid cell
    gridAlpha: 0.04,
    mouseRadius: 110,            // px — gentle repulsion radius
    mouseForce: 0.35,            // repulsion strength (kept subtle)
    parallax: 10,                // px — max parallax shift for deepest nodes
    waveColors: ['#00F0FF', '#A855F7'] // ribbon gradient start → end
  };

  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var hero = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var gridLayer = null;          // offscreen canvas with the static grid
  var nodes = [];
  var mouse = { x: -9999, y: -9999, nx: 0, ny: 0 }; // nx/ny: -1..1 for parallax
  var rafId = null, running = false, lastTs = 0;

  /* Wave ribbons: yBase = fraction of hero height; two harmonics each. */
  var WAVES = [
    { yBase: 0.60, amp: 16, len: 0.0062, speed: 0.220, harm: 0.45, alpha: 0.34, width: 1.1 },
    { yBase: 0.68, amp: 20, len: 0.0051, speed: 0.170, harm: 0.55, alpha: 0.44, width: 1.3 },
    { yBase: 0.77, amp: 24, len: 0.0042, speed: 0.135, harm: 0.60, alpha: 0.54, width: 1.5 },
    { yBase: 0.86, amp: 28, len: 0.0034, speed: 0.105, harm: 0.50, alpha: 0.40, width: 1.2 }
  ];

  function isMobile() { return W < CONFIG.mobileBreakpoint; }

  function buildGrid() {
    gridLayer = document.createElement('canvas');
    gridLayer.width = Math.max(1, Math.floor(W * DPR));
    gridLayer.height = Math.max(1, Math.floor(H * DPR));
    var g = gridLayer.getContext('2d');
    g.scale(DPR, DPR);
    g.strokeStyle = 'rgba(148, 184, 255,' + CONFIG.gridAlpha + ')';
    g.lineWidth = 1;
    g.beginPath();
    for (var x = 0.5; x <= W; x += CONFIG.gridSize) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (var y = 0.5; y <= H; y += CONFIG.gridSize) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  }

  function seedNodes() {
    var count = isMobile() ? CONFIG.nodeCountMobile : CONFIG.nodeCountDesktop;
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,   // slow drift
        vy: (Math.random() - 0.5) * 0.16,
        r: 1 + Math.random() * 1.6,
        depth: 0.3 + Math.random() * 0.7    // parallax factor
      });
    }
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildGrid();
    seedNodes();
    if (reduceMotion) drawFrame(1200);    // one calm static frame
  }

  function waveY(wave, x, t) {
    return wave.yBase * H
      + Math.sin(x * wave.len + t * wave.speed) * wave.amp
      + Math.sin(x * wave.len * 2.13 + t * wave.speed * 1.6) * wave.amp * wave.harm;
  }

  function drawWaves(t) {
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.12, 'rgba(0, 240, 255, 0)');        // fade in from the left
    grad.addColorStop(0.38, CONFIG.waveColors[0]);          // electric cyan
    grad.addColorStop(1.00, CONFIG.waveColors[1]);          // soft neon purple
    ctx.lineCap = 'round';
    for (var w = 0; w < WAVES.length; w++) {
      var wave = WAVES[w], x, y;
      /* translucent ribbon line */
      ctx.beginPath();
      for (x = 0; x <= W; x += 6) {
        y = waveY(wave, x, t);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = grad;
      ctx.globalAlpha = wave.alpha * 0.55;
      ctx.lineWidth = wave.width;
      ctx.stroke();
      /* glowing particle dots riding the same ribbon */
      ctx.globalAlpha = wave.alpha;
      ctx.fillStyle = grad;
      for (x = 10 + (w * 9) % 26; x <= W; x += 26) {
        y = waveY(wave, x, t);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNodes(dt) {
    var i, j, n, dx, dy, dist;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (dt > 0) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        /* gentle repulsion from the cursor */
        dx = n.x - mouse.x; dy = n.y - mouse.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.01 && dist < CONFIG.mouseRadius) {
          var f = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseForce;
          n.x += (dx / dist) * f * dt;
          n.y += (dy / dist) * f * dt;
        }
        /* wrap around edges */
        if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      }
      n.px = n.x + mouse.nx * CONFIG.parallax * n.depth;   // parallax-shifted
      n.py = n.y + mouse.ny * CONFIG.parallax * n.depth;   // draw position
    }
    /* constellation links */
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        dx = nodes[i].px - nodes[j].px; dy = nodes[i].py - nodes[j].py;
        dist = dx * dx + dy * dy;
        if (dist < CONFIG.linkDistance * CONFIG.linkDistance) {
          var a = (1 - Math.sqrt(dist) / CONFIG.linkDistance) * CONFIG.linkMaxAlpha;
          ctx.strokeStyle = 'rgba(' + CONFIG.linkColor + ',' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(nodes[i].px, nodes[i].py);
          ctx.lineTo(nodes[j].px, nodes[j].py);
          ctx.stroke();
        }
      }
    }
    /* node dots */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      ctx.beginPath();
      ctx.arc(n.px, n.py, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
      ctx.fill();
    }
  }

  function drawFrame(tSeconds, dt) {
    ctx.clearRect(0, 0, W, H);
    if (gridLayer) ctx.drawImage(gridLayer, 0, 0, W, H);
    drawWaves(tSeconds);
    drawNodes(dt || 0);
  }

  function loop(ts) {
    if (!running) return;
    var dt = Math.min((ts - lastTs) / 16.667, 3);   // frame units, clamped
    lastTs = ts;
    drawFrame(ts / 1000, dt);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  /* ---- wiring ------------------------------------------------------------ */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  hero.addEventListener('mousemove', function (e) {
    var rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.nx = (e.clientX - rect.left) / rect.width - 0.5;
    mouse.ny = (e.clientY - rect.top) / rect.height - 0.5;
  });
  hero.addEventListener('mouseleave', function () {
    mouse.x = -9999; mouse.y = -9999; mouse.nx = 0; mouse.ny = 0;
  });

  /* pause when the hero scrolls out of view — battery & CPU friendly */
  if ('IntersectionObserver' in window && !reduceMotion) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0.02 }).observe(hero);
  }

  resize();
  start();
})();
