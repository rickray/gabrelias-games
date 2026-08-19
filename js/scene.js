/* Gabrelia's Games — shared outdoor scene: sky, hills, decor, juice particles.
   Canvas 2D only, ES5, gradients cached on resize, no shadowBlur. */

(function (global) {
  "use strict";

  var TWO_PI = Math.PI * 2;
  var MAX_PARTICLES = 180;
  var CONFETTI_COLORS = [
    "#ff4d9a", "#ff8a1a", "#ffe14a", "#7a5cff", "#3dbfff",
    "#ff5ad5", "#6ed85a", "#fff", "#ff6b6b", "#4ecdc4"
  ];
  var SPARKLE_COLORS = ["#fff6a0", "#ffe14a", "#ff8ad8", "#fff", "#7a6bff", "#a8f0ff"];
  var FLOWER_COLORS = ["#ff4d9a", "#ff8a1a", "#ffe14a", "#ff5ad5", "#7a5cff", "#ff6b6b"];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function createScene(opts) {
    opts = opts || {};
    var groundFrac = typeof opts.ground === "number" ? opts.ground : 0.78;

    var W = 800;
    var H = 600;
    var time = 0;
    var groundYpx = H * groundFrac;

    var skyGrad = null;
    var sunGlow = null;
    var hillGrads = [null, null, null];
    var sunX = 0;
    var sunY = 0;
    var sunR = 40;

    var clouds = [];
    var flowers = [];
    var grass = [];
    var butterflies = [];
    var particles = [];
    var particleCount = 0;

    /* Pre-sized particle pool — slots reused, never grown past MAX. */
    var i;
    for (i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        alive: false,
        kind: 0, /* 0 confetti, 1 sparkle */
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 4,
        rot: 0,
        spin: 0,
        life: 0,
        maxLife: 1,
        color: "#fff",
        w: 6,
        h: 10
      });
    }

    function allocParticle() {
      var j, p;
      for (j = 0; j < MAX_PARTICLES; j++) {
        p = particles[j];
        if (!p.alive) {
          p.alive = true;
          particleCount++;
          return p;
        }
      }
      /* Cap hit: steal oldest-ish by overwriting first live slot. */
      p = particles[0];
      if (!p.alive) particleCount++;
      p.alive = true;
      return p;
    }

    function layout() {
      clouds.length = 0;
      flowers.length = 0;
      grass.length = 0;
      butterflies.length = 0;

      var n, k, c, f, g, b, baseY;
      baseY = groundYpx;

      n = W > H ? 7 : 5;
      for (k = 0; k < n; k++) {
        c = {
          x: (k + 0.25) * (W / n) + rand(-40, 40),
          y: rand(H * 0.05, H * 0.26),
          s: rand(0.55, 1.45),
          drift: 0,
          phase: rand(0, TWO_PI)
        };
        /* Smaller clouds drift faster (parallax). */
        c.drift = rand(8, 18) / Math.max(0.55, c.s);
        clouds.push(c);
      }

      n = W > H ? 14 : 10;
      for (k = 0; k < n; k++) {
        f = {
          x: (k + 0.35) * (W / n) + rand(-18, 18),
          y: baseY + rand(H * 0.04, H * 0.16),
          color: pick(FLOWER_COLORS),
          s: rand(0.75, 1.35),
          phase: rand(0, TWO_PI),
          petals: 5 + ((Math.random() * 2) | 0)
        };
        if (f.y > H - 8) f.y = H - 8;
        flowers.push(f);
      }

      n = W > H ? 22 : 16;
      for (k = 0; k < n; k++) {
        g = {
          x: (k + 0.2) * (W / n) + rand(-14, 14),
          y: baseY + rand(-6, H * 0.08),
          s: rand(0.7, 1.25),
          phase: rand(0, TWO_PI),
          blades: 3 + ((Math.random() * 3) | 0)
        };
        grass.push(g);
      }

      n = 3;
      for (k = 0; k < n; k++) {
        b = {
          x: rand(W * 0.1, W * 0.9),
          y: rand(H * 0.28, groundYpx - H * 0.08),
          s: rand(0.7, 1.1),
          speed: rand(18, 36),
          amp: rand(10, 22),
          phase: rand(0, TWO_PI),
          wing: rand(0, TWO_PI),
          dir: Math.random() < 0.5 ? -1 : 1,
          color: pick(["#ff8ad8", "#ffb347", "#a78bfa", "#60a5fa"])
        };
        butterflies.push(b);
      }
    }

    function cacheGradients() {
      skyGrad = null;
      sunGlow = null;
      hillGrads[0] = null;
      hillGrads[1] = null;
      hillGrads[2] = null;

      /* Multi-stop sky — cooler zenith, warm near horizon. */
      skyGrad = {
        /* rebuilt with real canvas gradient when draw has a ctx; store stops */
        stops: [
          [0, "#2eb7ff"],
          [0.35, "#7ad8ff"],
          [0.62, "#c8f0ff"],
          [0.82, "#ffe9a8"],
          [1, "#b8e86a"]
        ]
      };

      sunX = W * 0.84;
      sunY = H * 0.13;
      sunR = Math.min(W, H) * 0.085;

      sunGlow = {
        x: sunX,
        y: sunY,
        r: sunR,
        stops: [
          [0, "rgba(255,246,160,0.95)"],
          [0.35, "rgba(255,225,74,0.55)"],
          [0.7, "rgba(255,200,80,0.18)"],
          [1, "rgba(255,225,74,0)"]
        ]
      };

      /* Hill vertical fills: far → mid → front */
      hillGrads[0] = {
        stops: [
          [0, "#8bc96e"],
          [1, "#6fa85a"]
        ],
        haze: "rgba(180,210,230,0.28)"
      };
      hillGrads[1] = {
        stops: [
          [0, "#6ed85a"],
          [1, "#4fb83e"]
        ]
      };
      hillGrads[2] = {
        stops: [
          [0, "#5ec64a"],
          [0.55, "#4aad38"],
          [1, "#3d9630"]
        ]
      };
    }

    /* Canvas gradients must bind to a ctx — build on first draw after resize. */
    var boundSky = null;
    var boundSun = null;
    var boundHills = [null, null, null];
    var boundW = 0;
    var boundH = 0;
    var boundCtx = null;

    function ensureBound(ctx) {
      if (boundCtx === ctx && boundW === W && boundH === H && boundSky) return;

      boundCtx = ctx;
      boundW = W;
      boundH = H;

      var g, s, j;

      g = ctx.createLinearGradient(0, 0, 0, H);
      for (j = 0; j < skyGrad.stops.length; j++) {
        s = skyGrad.stops[j];
        g.addColorStop(s[0], s[1]);
      }
      boundSky = g;

      g = ctx.createRadialGradient(sunX, sunY, sunR * 0.15, sunX, sunY, sunR * 2.4);
      for (j = 0; j < sunGlow.stops.length; j++) {
        s = sunGlow.stops[j];
        g.addColorStop(s[0], s[1]);
      }
      boundSun = g;

      /* Far hill */
      g = ctx.createLinearGradient(0, H * 0.52, 0, H);
      for (j = 0; j < hillGrads[0].stops.length; j++) {
        s = hillGrads[0].stops[j];
        g.addColorStop(s[0], s[1]);
      }
      boundHills[0] = g;

      g = ctx.createLinearGradient(0, H * 0.62, 0, H);
      for (j = 0; j < hillGrads[1].stops.length; j++) {
        s = hillGrads[1].stops[j];
        g.addColorStop(s[0], s[1]);
      }
      boundHills[1] = g;

      g = ctx.createLinearGradient(0, groundYpx - H * 0.06, 0, H);
      for (j = 0; j < hillGrads[2].stops.length; j++) {
        s = hillGrads[2].stops[j];
        g.addColorStop(s[0], s[1]);
      }
      boundHills[2] = g;
    }

    function resize(w, h) {
      W = w;
      H = h;
      groundYpx = H * groundFrac;
      boundSky = null;
      boundSun = null;
      boundHills[0] = null;
      boundHills[1] = null;
      boundHills[2] = null;
      boundW = 0;
      boundH = 0;
      boundCtx = null;
      cacheGradients();
      layout();
    }

    function update(dt) {
      if (!(dt > 0) || dt > 0.1) dt = 0.016;
      time += dt;

      var j, c, b, p;

      for (j = 0; j < clouds.length; j++) {
        c = clouds[j];
        c.x += c.drift * dt;
        if (c.x > W + 80 * c.s) c.x = -90 * c.s;
      }

      for (j = 0; j < butterflies.length; j++) {
        b = butterflies[j];
        b.x += b.speed * b.dir * dt;
        b.wing += dt * 14;
        b.phase += dt * 1.6;
        if (b.x > W + 40) {
          b.x = -40;
          b.y = rand(H * 0.28, groundYpx - H * 0.08);
        } else if (b.x < -40) {
          b.x = W + 40;
          b.y = rand(H * 0.28, groundYpx - H * 0.08);
        }
      }

      for (j = 0; j < MAX_PARTICLES; j++) {
        p = particles[j];
        if (!p.alive) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.alive = false;
          particleCount--;
          continue;
        }
        if (p.kind === 0) {
          p.vy += 420 * dt;
          p.vx *= 1 - 1.4 * dt;
          p.vy *= 1 - 0.15 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
        } else {
          p.vx *= 1 - 2.2 * dt;
          p.vy *= 1 - 2.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      }
    }

    function drawCloud(ctx, c) {
      var s = c.s;
      var x = c.x;
      var y = c.y + Math.sin(time * 0.4 + c.phase) * 3;
      var bob = y;

      /* Soft underside (blue-grey). */
      ctx.fillStyle = "rgba(170,190,210,0.35)";
      ctx.beginPath();
      ctx.ellipse(x + 8 * s, bob + 10 * s, 30 * s, 14 * s, 0, 0, TWO_PI);
      ctx.ellipse(x + 36 * s, bob + 12 * s, 26 * s, 12 * s, 0, 0, TWO_PI);
      ctx.fill();

      /* Main lobes — brighter top. */
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.beginPath();
      ctx.arc(x, bob, 22 * s, 0, TWO_PI);
      ctx.arc(x + 26 * s, bob - 10 * s, 30 * s, 0, TWO_PI);
      ctx.arc(x + 54 * s, bob + 2 * s, 22 * s, 0, TWO_PI);
      ctx.arc(x + 24 * s, bob + 10 * s, 20 * s, 0, TWO_PI);
      ctx.arc(x + 44 * s, bob - 4 * s, 18 * s, 0, TWO_PI);
      ctx.fill();

      /* Highlight cap. */
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(x + 22 * s, bob - 14 * s, 18 * s, 10 * s, -0.2, 0, TWO_PI);
      ctx.fill();
    }

    function drawHillPath(ctx, y0, crestA, crestB, crestC) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, y0);
      ctx.quadraticCurveTo(W * 0.18, y0 + crestA, W * 0.36, y0);
      ctx.quadraticCurveTo(W * 0.52, y0 + crestB, W * 0.68, y0 + crestC * 0.3);
      ctx.quadraticCurveTo(W * 0.84, y0 + crestC, W, y0 + crestA * 0.4);
      ctx.lineTo(W, H);
      ctx.closePath();
    }

    function drawGrassTuft(ctx, g) {
      var sway = Math.sin(time * 2.1 + g.phase) * 0.18;
      var j, ang, h, tipX;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(sway);
      ctx.scale(g.s, g.s);
      ctx.strokeStyle = "#2f8a28";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (j = 0; j < g.blades; j++) {
        ang = (j - (g.blades - 1) * 0.5) * 0.28 + sway * 0.4;
        h = 10 + j * 2;
        tipX = Math.sin(ang) * h;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tipX * 0.4, -h * 0.5, tipX, -h);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFlower(ctx, f) {
      var sway = Math.sin(time * 1.7 + f.phase) * 0.12;
      var j, a, px, py, pr;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(sway);
      ctx.scale(f.s, f.s);

      /* Stem */
      ctx.strokeStyle = "#2f8a28";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(sway * 20, 12, 0, 22);
      ctx.stroke();

      /* Leaf */
      ctx.fillStyle = "#4aad38";
      ctx.beginPath();
      ctx.ellipse(6, 14, 7, 3.5, 0.5, 0, TWO_PI);
      ctx.fill();

      /* Petals with slight radial gradient feel via darker rim + fill */
      pr = 7.5;
      for (j = 0; j < f.petals; j++) {
        a = (j / f.petals) * TWO_PI - Math.PI * 0.5;
        px = Math.cos(a) * 8;
        py = Math.sin(a) * 8 - 6;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TWO_PI);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      /* Centre + gloss */
      ctx.beginPath();
      ctx.arc(0, -6, 5.5, 0, TWO_PI);
      ctx.fillStyle = "#ffe14a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -6, 5.5, 0, TWO_PI);
      ctx.strokeStyle = "#e0a820";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-1.5, -7.5, 2, 0, TWO_PI);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();

      ctx.restore();
    }

    function drawButterfly(ctx, b) {
      var y = b.y + Math.sin(b.phase) * b.amp;
      var flap = 0.55 + Math.sin(b.wing) * 0.45;
      var bodyR = 3.2 * b.s;

      ctx.save();
      ctx.translate(b.x, y);
      if (b.dir < 0) ctx.scale(-1, 1);
      ctx.scale(b.s, b.s);

      /* Wings */
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(-7, -2, 9 * flap, 7, -0.4, 0, TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-6, 5, 7 * flap, 5.5, 0.35, 0, TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, -2, 9 * flap, 7, 0.4, 0, TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 5, 7 * flap, 5.5, -0.35, 0, TWO_PI);
      ctx.fill();

      /* Wing highlights */
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-8, -4, 3.5 * flap, 2.5, -0.4, 0, TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, -4, 3.5 * flap, 2.5, 0.4, 0, TWO_PI);
      ctx.fill();

      /* Body */
      ctx.fillStyle = "#3a2a18";
      ctx.beginPath();
      ctx.ellipse(0, 1, bodyR * 0.55, bodyR * 2.1, 0, 0, TWO_PI);
      ctx.fill();

      /* Antennae */
      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -bodyR * 1.6);
      ctx.quadraticCurveTo(-3, -bodyR * 3.2, -5, -bodyR * 3.6);
      ctx.moveTo(0, -bodyR * 1.6);
      ctx.quadraticCurveTo(3, -bodyR * 3.2, 5, -bodyR * 3.6);
      ctx.stroke();

      ctx.restore();
    }

    function drawSun(ctx) {
      var rayLen, rayW, ang, k, ca, sa;
      var glowR = sunR * 2.4;

      ctx.fillStyle = boundSun;
      ctx.beginPath();
      ctx.arc(sunX, sunY, glowR, 0, TWO_PI);
      ctx.fill();

      /* Long faint rays — rotation from accumulated scene time. */
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(time * 0.12);
      rayLen = sunR * 3.2;
      rayW = sunR * 0.12;
      for (k = 0; k < 8; k++) {
        ang = (k / 8) * TWO_PI;
        ca = Math.cos(ang);
        sa = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(ca * sunR * 1.15 - sa * rayW, sa * sunR * 1.15 + ca * rayW);
        ctx.lineTo(ca * rayLen - sa * rayW * 0.3, sa * rayLen + ca * rayW * 0.3);
        ctx.lineTo(ca * rayLen + sa * rayW * 0.3, sa * rayLen - ca * rayW * 0.3);
        ctx.lineTo(ca * sunR * 1.15 + sa * rayW, sa * sunR * 1.15 - ca * rayW);
        ctx.closePath();
        ctx.fillStyle = k % 2 === 0 ? "rgba(255,236,140,0.14)" : "rgba(255,246,180,0.09)";
        ctx.fill();
      }
      ctx.restore();

      /* Disc */
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
      ctx.fillStyle = "#ffe14a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
      ctx.strokeStyle = "#f0c020";
      ctx.lineWidth = Math.max(2, sunR * 0.06);
      ctx.stroke();

      /* Specular */
      ctx.beginPath();
      ctx.arc(sunX - sunR * 0.28, sunY - sunR * 0.26, sunR * 0.32, 0, TWO_PI);
      ctx.fillStyle = "rgba(255,255,240,0.75)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sunX - sunR * 0.12, sunY - sunR * 0.1, sunR * 0.12, 0, TWO_PI);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
    }

    function draw(ctx) {
      var j;

      ensureBound(ctx);

      ctx.fillStyle = boundSky;
      ctx.fillRect(0, 0, W, H);

      drawSun(ctx);

      for (j = 0; j < clouds.length; j++) {
        drawCloud(ctx, clouds[j]);
      }

      /* Far hill — desaturated / hazy */
      drawHillPath(ctx, H * 0.58, -H * 0.06, H * 0.05, -H * 0.04);
      ctx.fillStyle = boundHills[0];
      ctx.fill();
      ctx.fillStyle = hillGrads[0].haze;
      ctx.fill();

      /* Mid hill */
      drawHillPath(ctx, H * 0.68, -H * 0.05, H * 0.04, -H * 0.03);
      ctx.fillStyle = boundHills[1];
      ctx.fill();

      /* Front grass hill — crest at groundY */
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, groundYpx);
      ctx.quadraticCurveTo(W * 0.25, groundYpx - H * 0.08, W * 0.5, groundYpx);
      ctx.quadraticCurveTo(W * 0.75, groundYpx + H * 0.08, W, groundYpx - H * 0.04);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = boundHills[2];
      ctx.fill();

      /* Soft crest highlight strip */
      ctx.beginPath();
      ctx.moveTo(0, groundYpx);
      ctx.quadraticCurveTo(W * 0.25, groundYpx - H * 0.08, W * 0.5, groundYpx);
      ctx.quadraticCurveTo(W * 0.75, groundYpx + H * 0.08, W, groundYpx - H * 0.04);
      ctx.lineTo(W, groundYpx + 10);
      ctx.quadraticCurveTo(W * 0.75, groundYpx + H * 0.08 + 10, W * 0.5, groundYpx + 10);
      ctx.quadraticCurveTo(W * 0.25, groundYpx - H * 0.08 + 10, 0, groundYpx + 10);
      ctx.closePath();
      ctx.fillStyle = "rgba(180,240,120,0.22)";
      ctx.fill();

      for (j = 0; j < grass.length; j++) {
        drawGrassTuft(ctx, grass[j]);
      }
      for (j = 0; j < flowers.length; j++) {
        drawFlower(ctx, flowers[j]);
      }
      for (j = 0; j < butterflies.length; j++) {
        drawButterfly(ctx, butterflies[j]);
      }
    }

    function drawParticles(ctx) {
      var j, p, life, alpha, rw, rh;
      for (j = 0; j < MAX_PARTICLES; j++) {
        p = particles[j];
        if (!p.alive) continue;
        life = p.life / p.maxLife;
        if (p.kind === 0) {
          alpha = life < 0.7 ? 1 : 1 - (life - 0.7) / 0.3;
          if (alpha <= 0) continue;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = alpha;
          rw = p.w;
          rh = p.h * (0.55 + 0.45 * Math.abs(Math.cos(p.rot * 1.3)));
          ctx.fillStyle = p.color;
          ctx.fillRect(-rw * 0.5, -rh * 0.5, rw, rh);
          ctx.restore();
        } else {
          alpha = life < 0.35 ? life / 0.35 : 1 - (life - 0.35) / 0.65;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 - life * 0.4), 0, TWO_PI);
          ctx.fill();
          /* Cross twinkle */
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          var tw = p.r * (1.6 - life);
          ctx.beginPath();
          ctx.moveTo(p.x - tw, p.y);
          ctx.lineTo(p.x + tw, p.y);
          ctx.moveTo(p.x, p.y - tw);
          ctx.lineTo(p.x, p.y + tw);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = 1;
    }

    function confetti(x, y) {
      var n = 22;
      var k, p, a, sp;
      for (k = 0; k < n; k++) {
        p = allocParticle();
        a = rand(0, TWO_PI);
        sp = rand(80, 280);
        p.kind = 0;
        p.x = x + rand(-8, 8);
        p.y = y + rand(-8, 8);
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp - rand(80, 200);
        p.r = rand(3, 6);
        p.w = rand(5, 10);
        p.h = rand(8, 14);
        p.rot = rand(0, TWO_PI);
        p.spin = rand(-10, 10);
        p.life = 0;
        p.maxLife = rand(0.7, 1.35);
        p.color = pick(CONFETTI_COLORS);
      }
    }

    function sparkle(x, y) {
      var n = 10;
      var k, p, a, sp;
      for (k = 0; k < n; k++) {
        p = allocParticle();
        a = (k / n) * TWO_PI + rand(-0.2, 0.2);
        sp = rand(40, 160);
        p.kind = 1;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp - 30;
        p.r = rand(3, 7);
        p.w = p.r;
        p.h = p.r;
        p.rot = 0;
        p.spin = 0;
        p.life = 0;
        p.maxLife = rand(0.35, 0.7);
        p.color = pick(SPARKLE_COLORS);
      }
    }

    function getGroundY() {
      return groundYpx;
    }

    /* Initial layout at default size so groundY is valid before first resize. */
    cacheGradients();
    layout();

    return {
      resize: resize,
      update: update,
      draw: draw,
      drawParticles: drawParticles,
      confetti: confetti,
      sparkle: sparkle,
      groundY: getGroundY
    };
  }

  global.GGScene = {
    create: createScene
  };
})(window);
