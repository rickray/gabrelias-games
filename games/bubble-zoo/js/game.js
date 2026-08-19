/* Bubble Zoo — tap bubbles, meet animals. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.78 });

  var bubbles = [];
  var animals = [];
  var bursts = [];
  var rings = [];
  var lastAnimal = "";
  var lastInteractionTime = 0;

  var BUBBLE_COLORS = [
    { body: "rgba(255,77,154,0.22)", rim: "#ff8ac4", band: "rgba(255,120,200,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(255,138,26,0.22)", rim: "#ffc36a", band: "rgba(255,180,80,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(255,225,74,0.22)", rim: "#fff3a0", band: "rgba(255,230,120,0.28)", shine: "rgba(255,255,255,0.88)" },
    { body: "rgba(77,224,106,0.22)", rim: "#9af0aa", band: "rgba(120,230,150,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(46,197,255,0.22)", rim: "#8ae0ff", band: "rgba(100,210,255,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(122,92,255,0.22)", rim: "#b8a6ff", band: "rgba(160,140,255,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(255,90,90,0.22)", rim: "#ff9a9a", band: "rgba(255,140,140,0.28)", shine: "rgba(255,255,255,0.9)" },
    { body: "rgba(0,212,200,0.22)", rim: "#7af0ea", band: "rgba(80,230,220,0.28)", shine: "rgba(255,255,255,0.9)" }
  ];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function targetCount() {
    var shortSide = Math.min(W, H);
    if (shortSide < 500) return 4;
    if (W > H) return 7;
    return 6;
  }

  function bubbleRadius() {
    var shortSide = Math.min(W, H);
    return Math.max(56, Math.min(120, shortSide * 0.11));
  }

  function farEnough(x, y, r, ignore) {
    var i, b, dx, dy, min;
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      if (b === ignore || b.dying) continue;
      dx = b.x - x;
      dy = b.y - y;
      min = (b.r + r) * 0.82;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  function placeBubble(existing) {
    var r = bubbleRadius() * rand(0.88, 1.12);
    var x, y, tries = 0;
    var margin = r + 12;
    do {
      x = rand(margin, W - margin);
      y = rand(margin + 20, H * 0.72);
      tries++;
    } while (!farEnough(x, y, r, existing) && tries < 40);

    var color = pick(BUBBLE_COLORS);
    return {
      x: x,
      y: y,
      r: r,
      vx: rand(-18, 18),
      vy: rand(-14, 14),
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(1.1, 2.2),
      phase: rand(0, Math.PI * 2),
      color: color,
      born: time,
      scale: existing ? 1 : 0,
      dying: false,
      dieT: 0
    };
  }

  function spawnBubble() {
    bubbles.push(placeBubble(false));
  }

  function pickAnimal() {
    var names = GGAnimals.names;
    var name = pick(names);
    var guard = 0;
    while (name === lastAnimal && names.length > 1 && guard < 8) {
      name = pick(names);
      guard++;
    }
    lastAnimal = name;
    return name;
  }

  function spawnAnimal(x, y) {
    var name = pickAnimal();
    animals.push({
      name: name,
      x: x,
      y: y,
      vx: rand(-20, 20),
      vy: rand(-40, -18),
      t: 0,
      life: 2.4,
      scale: 0,
      sx: 1,
      sy: 1
    });
    GGAudio.say(name);
  }

  function spawnBurst(x, y, color) {
    var i, n = 12;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      var sp = rand(90, 260);
      bursts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        r: rand(3, 7),
        color: i % 2 ? color.rim : "#ffffff",
        life: rand(0.4, 0.75),
        t: 0,
        kind: "drop"
      });
    }
    for (i = 0; i < 6; i++) {
      bursts.push({
        x: x,
        y: y,
        vx: rand(-50, 50),
        vy: rand(-140, -30),
        r: rand(2, 5),
        color: "#fff6a0",
        life: rand(0.35, 0.65),
        t: 0,
        kind: "drop"
      });
    }
  }

  function spawnRing(x, y, color, r0) {
    rings.push({
      x: x,
      y: y,
      r: r0 * 0.55,
      maxR: r0 * 2.1,
      color: color.rim,
      life: 0.45,
      t: 0
    });
  }

  function popBubble(b) {
    if (b.dying) return;
    b.dying = true;
    b.dieT = 0;
    GGAudio.pop();
    spawnBurst(b.x, b.y, b.color);
    spawnRing(b.x, b.y, b.color, b.r);
    scene.sparkle(b.x, b.y);
    spawnAnimal(b.x, b.y);
  }

  function spawnTapSparkle(x, y) {
    var i, n = 8;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      var sp = rand(40, 120);
      bursts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        r: rand(3, 6),
        color: pick(["#ffffff", "#fff6a0", "#c8f4ff"]),
        life: rand(0.3, 0.55),
        t: 0,
        kind: "drop"
      });
    }
  }

  function hitTest(x, y) {
    var i, b, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      if (b.dying) continue;
      dx = x - b.x;
      dy = y - b.y;
      d = dx * dx + dy * dy;
      if (d < (b.r * 1.12) * (b.r * 1.12) && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  function drawBubble(b, t) {
    var appear = Math.min(1, (t - b.born) * 3);
    var s = b.dying ? Math.max(0, 1 - b.dieT * 4) : (b.scale || appear);
    if (s <= 0.01) return;
    if (!b.dying && t - lastInteractionTime > 6) {
      s *= 1 + Math.sin(t * 4 + b.wobble) * 0.07;
    }
    /* Visual radius wobble only — hit radius stays b.r */
    var rPulse = 1 + Math.sin(t * b.wobbleSpeed * 1.4 + b.phase) * 0.035;
    var wob = Math.sin(t * b.wobbleSpeed + b.wobble) * 0.045;
    var r = b.r * s * rPulse;
    var c = b.color;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(1 + wob, 1 - wob);

    /* Soft glass fill */
    var g = ctx.createRadialGradient(-r * 0.28, -r * 0.32, r * 0.05, 0, 0, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.28, c.body);
    g.addColorStop(0.78, c.body);
    g.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    /* Coloured refraction band low on the sphere */
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.clip();
    var band = ctx.createLinearGradient(-r * 0.6, r * 0.15, r * 0.6, r * 0.75);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.35, c.band);
    band.addColorStop(0.55, "rgba(180,255,255,0.18)");
    band.addColorStop(0.75, c.band);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(-r, r * 0.05, r * 2, r * 0.7);
    ctx.restore();

    /* Rim: a faint white edge all the way round, then a whisper of colour on
       the shaded lower arc. Strong colour here reads as a separate ring
       floating next to the bubble rather than part of it. */
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.strokeStyle = c.rim;
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* Large soft top-left highlight */
    var hg = ctx.createRadialGradient(-r * 0.32, -r * 0.38, 0, -r * 0.32, -r * 0.38, r * 0.42);
    hg.addColorStop(0, "rgba(255,255,255,0.95)");
    hg.addColorStop(0.35, "rgba(255,255,255,0.45)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.36, r * 0.34, r * 0.22, -0.55, 0, Math.PI * 2);
    ctx.fill();

    /* Small secondary specular */
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.48, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();

    /* Tiny lower glint */
    ctx.beginPath();
    ctx.ellipse(r * 0.3, r * 0.28, r * 0.09, r * 0.05, 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();

    ctx.restore();
  }

  function drawBurst(p) {
    var fade = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * fade), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawRing(ring) {
    var u = ring.t / ring.life;
    var fade = 1 - u;
    var rr = ring.r + (ring.maxR - ring.r) * u;
    ctx.globalAlpha = Math.max(0, fade * 0.85);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = Math.max(2, 5 * (1 - u * 0.7));
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function updateAnimalSquash(a) {
    /* Squash-and-stretch entrance: stretch tall, overshoot, settle */
    var t = a.t;
    if (t < 0.18) {
      var u = t / 0.18;
      a.scale = u * 1.22;
      a.sx = 0.72 + 0.2 * u;
      a.sy = 1.35 - 0.1 * u;
    } else if (t < 0.34) {
      var v = (t - 0.18) / 0.16;
      a.scale = 1.22 - v * 0.14;
      a.sx = 0.92 + v * 0.28;
      a.sy = 1.25 - v * 0.35;
    } else if (t < 0.5) {
      var w = (t - 0.34) / 0.16;
      a.scale = 1.08 - w * 0.08;
      a.sx = 1.2 - w * 0.2;
      a.sy = 0.9 + w * 0.1;
    } else {
      a.scale = 1;
      a.sx = 1;
      a.sy = 1;
    }
  }

  function update(dt, t) {
    var i, b, a, p, ring, want;

    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      if (b.dying) {
        b.dieT += dt;
        if (b.dieT > 0.28) bubbles.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.y += Math.sin(t * b.wobbleSpeed + b.wobble) * 8 * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r + 8) { b.y = b.r + 8; b.vy = Math.abs(b.vy); }
      if (b.y > H * 0.76) { b.y = H * 0.76; b.vy = -Math.abs(b.vy); }
      if (b.scale < 1) b.scale = Math.min(1, b.scale + dt * 2.4);
    }

    want = targetCount();
    if (bubbles.filter(function (bb) { return !bb.dying; }).length < want) {
      spawnBubble();
    }

    for (i = animals.length - 1; i >= 0; i--) {
      a = animals[i];
      a.t += dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      updateAnimalSquash(a);
      if (a.t > a.life * 0.55) {
        a.vy -= 30 * dt;
        a.scale *= 0.995;
      }
      if (a.t > a.life) animals.splice(i, 1);
    }

    for (i = bursts.length - 1; i >= 0; i--) {
      p = bursts[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      if (p.t > p.life) bursts.splice(i, 1);
    }

    for (i = rings.length - 1; i >= 0; i--) {
      ring = rings[i];
      ring.t += dt;
      if (ring.t > ring.life) rings.splice(i, 1);
    }
  }

  function render(t) {
    scene.draw(ctx);
    var i, a, size, fade;
    for (i = 0; i < rings.length; i++) drawRing(rings[i]);
    for (i = 0; i < bursts.length; i++) drawBurst(bursts[i]);
    for (i = 0; i < bubbles.length; i++) drawBubble(bubbles[i], t);
    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      fade = a.t > a.life * 0.7 ? 1 - (a.t - a.life * 0.7) / (a.life * 0.3) : 1;
      ctx.globalAlpha = Math.max(0, fade);
      size = Math.min(W, H) * 0.09 * a.scale;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.scale(a.sx, a.sy);
      GGAnimals.draw(ctx, a.name, 0, 0, size / 40, a.t);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    scene.drawParticles(ctx);
  }

  GGShell.mount({
    canvas: canvas,
    ctx: ctx,
    resize: function (w, h) {
      W = w;
      H = h;
      scene.resize(w, h);

      var want = targetCount();
      while (bubbles.length < want) spawnBubble();
      while (bubbles.length > want && bubbles.length) {
        var last = bubbles[bubbles.length - 1];
        if (!last.dying) bubbles.pop();
        else break;
      }
      var i, b;
      for (i = 0; i < bubbles.length; i++) {
        b = bubbles[i];
        b.x = Math.max(b.r, Math.min(W - b.r, b.x));
        b.y = Math.max(b.r, Math.min(H * 0.78, b.y));
      }
    },
    start: function () {},
    tap: function (x, y) {
      lastInteractionTime = time;
      var b = hitTest(x, y);
      if (b) popBubble(b);
      else spawnTapSparkle(x, y);
    },
    frame: function (dt, t) {
      time = t;
      scene.update(dt);
      update(dt, t);
      render(t);
    }
  });
})();
