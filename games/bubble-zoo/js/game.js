/* Bubble Zoo — tap bubbles, meet animals. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var dpr = 1;

  var bubbles = [];
  var animals = [];
  var bursts = [];
  var clouds = [];
  var flowers = [];
  var lastAnimal = "";
  var lastTap = 0;

  var BUBBLE_COLORS = [
    { body: "#ff4d9a", rim: "#ff8ac4", shine: "rgba(255,255,255,0.85)" },
    { body: "#ff8a1a", rim: "#ffc36a", shine: "rgba(255,255,255,0.85)" },
    { body: "#ffe14a", rim: "#fff3a0", shine: "rgba(255,255,255,0.8)" },
    { body: "#4de06a", rim: "#9af0aa", shine: "rgba(255,255,255,0.85)" },
    { body: "#2ec5ff", rim: "#8ae0ff", shine: "rgba(255,255,255,0.85)" },
    { body: "#7a5cff", rim: "#b8a6ff", shine: "rgba(255,255,255,0.85)" },
    { body: "#ff5a5a", rim: "#ff9a9a", shine: "rgba(255,255,255,0.85)" },
    { body: "#00d4c8", rim: "#7af0ea", shine: "rgba(255,255,255,0.85)" }
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
      color: color,
      born: performance.now() / 1000,
      scale: existing ? 1 : 0,
      dying: false,
      dieT: 0
    };
  }

  function spawnBubble() {
    bubbles.push(placeBubble(false));
  }

  function pickAnimal() {
    var names = BubbleAnimals.names;
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
      scale: 0
    });
    if (window.BubbleAudio) BubbleAudio.animal(name);
  }

  function spawnBurst(x, y, color) {
    var i, n = 16;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      var sp = rand(80, 280);
      bursts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: rand(5, 12),
        color: i % 2 ? color.body : color.rim,
        life: rand(0.35, 0.7),
        t: 0
      });
    }
    for (i = 0; i < 8; i++) {
      bursts.push({
        x: x,
        y: y,
        vx: rand(-60, 60),
        vy: rand(-160, -40),
        r: rand(3, 6),
        color: "#fff6a0",
        life: rand(0.4, 0.8),
        t: 0
      });
    }
  }

  function popBubble(b) {
    if (b.dying) return;
    b.dying = true;
    b.dieT = 0;
    if (window.BubbleAudio) BubbleAudio.pop();
    spawnBurst(b.x, b.y, b.color);
    spawnAnimal(b.x, b.y);
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

  function layoutDecor() {
    clouds = [];
    flowers = [];
    var i, n = W > H ? 6 : 4;
    for (i = 0; i < n; i++) {
      clouds.push({
        x: (i + 0.3) * (W / n) + rand(-30, 30),
        y: rand(H * 0.06, H * 0.28),
        s: rand(0.7, 1.3),
        drift: rand(4, 12)
      });
    }
    n = W > H ? 10 : 7;
    for (i = 0; i < n; i++) {
      flowers.push({
        x: (i + 0.4) * (W / n) + rand(-16, 16),
        y: rand(H * 0.82, H * 0.96),
        color: pick(["#ff4d9a", "#ff8a1a", "#ffe14a", "#ff5ad5", "#7a5cff"]),
        s: rand(0.8, 1.3)
      });
    }
  }

  function resize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = vw;
    H = vh;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutDecor();

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
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#3dbfff");
    g.addColorStop(0.45, "#9ee8ff");
    g.addColorStop(0.7, "#c8f7a0");
    g.addColorStop(1, "#7ed957");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var sunX = W * 0.86;
    var sunY = H * 0.12;
    var sunR = Math.min(W, H) * 0.09;
    var rg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 1.8);
    rg.addColorStop(0, "#fff6a0");
    rg.addColorStop(0.45, "#ffe14a");
    rg.addColorStop(1, "rgba(255,225,74,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6c8";
    ctx.beginPath();
    ctx.arc(sunX - sunR * 0.25, sunY - sunR * 0.2, sunR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    var i, c;
    for (i = 0; i < clouds.length; i++) {
      c = clouds[i];
      drawCloud(c.x, c.y, c.s);
    }

    ctx.fillStyle = "#5ec64a";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78);
    ctx.quadraticCurveTo(W * 0.25, H * 0.7, W * 0.5, H * 0.78);
    ctx.quadraticCurveTo(W * 0.75, H * 0.86, W, H * 0.74);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6ed85a";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.86);
    ctx.quadraticCurveTo(W * 0.4, H * 0.8, W, H * 0.88);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    for (i = 0; i < flowers.length; i++) {
      drawFlower(flowers[i]);
    }
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y - 8 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(x + 50 * s, y, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y + 10 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFlower(f) {
    var i, a;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.s, f.s);
    ctx.strokeStyle = "#2f8a28";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.stroke();
    for (i = 0; i < 5; i++) {
      a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8 - 6, 7, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe14a";
    ctx.fill();
    ctx.restore();
  }

  function drawBubble(b, time) {
    var appear = Math.min(1, (time - b.born) * 3);
    var s = b.dying ? Math.max(0, 1 - b.dieT * 4) : (b.scale || appear);
    if (s <= 0.01) return;
    var wob = Math.sin(time * b.wobbleSpeed + b.wobble) * 0.04;
    var r = b.r * s;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(1 + wob, 1 - wob);

    var g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, b.color.shine);
    g.addColorStop(0.35, b.color.rim);
    g.addColorStop(1, b.color.body);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.92;
    ctx.fill();

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(3, r * 0.06);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(r * 0.28, r * 0.22, r * 0.1, r * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();

    ctx.restore();
  }

  function drawBurst(p) {
    var fade = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * fade, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function update(dt, time) {
    var i, b, a, p, want;

    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].drift * dt;
      if (clouds[i].x > W + 80) clouds[i].x = -80;
    }

    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      if (b.dying) {
        b.dieT += dt;
        if (b.dieT > 0.28) bubbles.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.y += Math.sin(time * b.wobbleSpeed + b.wobble) * 8 * dt;
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
      if (a.t < 0.25) a.scale = (a.t / 0.25) * 1.15;
      else if (a.t < 0.4) a.scale = 1.15 - (a.t - 0.25) * 0.8;
      else a.scale = 1;
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
      p.vy += 220 * dt;
      if (p.t > p.life) bursts.splice(i, 1);
    }
  }

  function render(time) {
    drawSky();
    var i;
    for (i = 0; i < bursts.length; i++) drawBurst(bursts[i]);
    for (i = 0; i < bubbles.length; i++) drawBubble(bubbles[i], time);
    for (i = 0; i < animals.length; i++) {
      var a = animals[i];
      var fade = a.t > a.life * 0.7 ? 1 - (a.t - a.life * 0.7) / (a.life * 0.3) : 1;
      ctx.globalAlpha = Math.max(0, fade);
      var size = Math.min(W, H) * 0.09 * a.scale;
      BubbleAnimals.draw(ctx, a.name, a.x, a.y, size / 40, a.t);
      ctx.globalAlpha = 1;
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    var time = now / 1000;
    update(dt, time);
    render(time);
    requestAnimationFrame(frame);
  }

  function eventPos(e) {
    var rect = canvas.getBoundingClientRect();
    var src = e;
    if (e.changedTouches && e.changedTouches[0]) src = e.changedTouches[0];
    return {
      x: (src.clientX - rect.left) * (W / rect.width),
      y: (src.clientY - rect.top) * (H / rect.height)
    };
  }

  function onTap(e) {
    e.preventDefault();
    var t = performance.now();
    if (t - lastTap < 40) return;
    lastTap = t;
    if (window.BubbleAudio) BubbleAudio.unlock();
    var p = eventPos(e);
    var b = hitTest(p.x, p.y);
    if (b) popBubble(b);
  }

  canvas.addEventListener("pointerdown", onTap, { passive: false });
  canvas.addEventListener("touchstart", onTap, { passive: false });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () {
    setTimeout(resize, 200);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && window.BubbleAudio && BubbleAudio.isUnlocked()) {
      BubbleAudio.unlock();
    }
  });

  resize();
  requestAnimationFrame(frame);
})();
