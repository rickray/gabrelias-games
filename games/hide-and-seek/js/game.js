/* Hide and Seek — find the animal you hear. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var dpr = 1;
  var lastTap = 0;
  var time = 0;

  var clouds = [];
  var flowers = [];
  var sparkles = [];

  var roster = [];
  var target = "";
  var lastTarget = "";
  var asked = false;
  var busy = false;
  var askTimer = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function shuffle(arr) {
    var i, j, t;
    for (i = arr.length - 1; i > 0; i--) {
      j = (Math.random() * (i + 1)) | 0;
      t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
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

  function animalLayout() {
    var n = 3;
    var size = Math.min(W, H) * (H > W ? 0.14 : 0.13);
    var span = Math.min(W * 0.78, size * 6.2);
    var x0 = (W - span) / 2;
    var y = H * (H > W ? 0.64 : 0.62);
    var i, a;
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      a.x = x0 + (span / (n - 1)) * i;
      a.y = y + (i === 1 ? -H * 0.02 : H * 0.01);
      a.r = size * 1.55;
      a.size = size;
    }
  }

  function nextRound() {
    var names = BubbleAnimals.names.slice();
    shuffle(names);
    var choice = names[0];
    var guard = 0;
    while (choice === lastTarget && names.length > 1 && guard < 8) {
      shuffle(names);
      choice = names[0];
      guard++;
    }
    lastTarget = choice;
    target = choice;
    var trio = [choice, names[1], names[2]];
    shuffle(trio);
    roster = trio.map(function (name) {
      return {
        name: name,
        x: 0,
        y: 0,
        r: 80,
        size: 60,
        mode: "idle",
        t: 0
      };
    });
    animalLayout();
    busy = false;
    asked = false;
    askTimer = 0;
  }

  function askWhere() {
    asked = true;
    if (window.HideAudio) HideAudio.speak("Where's the " + target + "?");
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
    if (roster.length) animalLayout();
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

  function spawnSparkle(x, y) {
    var i;
    for (i = 0; i < 18; i++) {
      var a = (i / 18) * Math.PI * 2 + rand(-0.1, 0.1);
      sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * rand(70, 220),
        vy: Math.sin(a) * rand(70, 220) - 50,
        r: rand(4, 9),
        color: pick(["#fff6a0", "#ffe14a", "#ff8ad8", "#fff", "#7a6bff"]),
        life: rand(0.45, 0.85),
        t: 0
      });
    }
  }

  function hitAnimal(x, y) {
    var i, a, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      dx = x - a.x;
      dy = y - a.y;
      d = dx * dx + dy * dy;
      if (d < a.r * a.r && d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  function onCorrect(a) {
    busy = true;
    a.mode = "found";
    a.t = 0;
    spawnSparkle(a.x, a.y);
    if (window.HideAudio) {
      HideAudio.sparkle();
      HideAudio.speak(a.name);
    }
  }

  function onWrong(a) {
    a.mode = "wiggle";
    a.t = 0;
    if (window.HideAudio) {
      HideAudio.wiggle();
      HideAudio.speak("That's the " + a.name);
      HideAudio.speak("Where's the " + target + "?", 1400);
    }
    asked = true;
  }

  function update(dt) {
    var i, a, p;
    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].drift * dt;
      if (clouds[i].x > W + 80) clouds[i].x = -80;
    }
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      a.t += dt;
      if (a.mode === "wiggle" && a.t > 0.55) {
        a.mode = "idle";
        a.t = 0;
      }
      if (a.mode === "found" && a.t > 1.45) {
        nextRound();
        return;
      }
    }
    for (i = sparkles.length - 1; i >= 0; i--) {
      p = sparkles[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      if (p.t > p.life) sparkles.splice(i, 1);
    }
  }

  function render() {
    drawSky();
    var i, a, p, tAnim, extra;
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      extra = 1;
      tAnim = time * 0.16 + i;
      if (a.mode === "wiggle") tAnim = a.t * 5;
      if (a.mode === "found") {
        extra = 1.12;
        tAnim = a.t * 3.4;
      }
      BubbleAnimals.draw(ctx, a.name, a.x, a.y, (a.size / 40) * extra, tAnim);
    }
    for (i = 0; i < sparkles.length; i++) {
      p = sparkles[i];
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    time = now / 1000;
    update(dt);
    render();
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
    if (window.HideAudio) HideAudio.unlock();
    if (busy) return;
    var p = eventPos(e);
    var a = hitAnimal(p.x, p.y);
    if (!a) {
      if (!asked) askWhere();
      return;
    }
    asked = true;
    if (a.name === target) onCorrect(a);
    else onWrong(a);
  }

  canvas.addEventListener("pointerdown", onTap, { passive: false });
  canvas.addEventListener("touchstart", onTap, { passive: false });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () {
    setTimeout(resize, 200);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && window.HideAudio && HideAudio.isUnlocked()) {
      HideAudio.unlock();
    }
  });

  resize();
  nextRound();
  requestAnimationFrame(frame);
})();
