/* Zoo Train — hop animals onto the cars. No score, no fail, no reading. */

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
  var puffs = [];
  var puffTimer = 0;

  var CAR_COLORS = ["#ff6a6a", "#ffd24a", "#7a6bff"];
  var trainX = 0;
  var trainMode = "idle";
  var trainT = 0;
  var cars = [null, null, null];
  var platform = [];
  var hop = null;
  var busy = false;
  var lastPicks = [];
  var lastInteractionTime = 0;

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
        y: rand(H * 0.06, H * 0.26),
        s: rand(0.7, 1.3),
        drift: rand(4, 12)
      });
    }
    n = W > H ? 10 : 7;
    for (i = 0; i < n; i++) {
      flowers.push({
        x: (i + 0.4) * (W / n) + rand(-16, 16),
        y: rand(H * 0.88, H * 0.97),
        color: pick(["#ff4d9a", "#ff8a1a", "#ffe14a", "#ff5ad5", "#7a5cff"]),
        s: rand(0.8, 1.3)
      });
    }
  }

  function metrics() {
    var unit = Math.min(W, H);
    var carW = Math.min(W * 0.16, unit * 0.2, 150);
    var carH = carW * 0.72;
    var engineW = carW * 1.15;
    var gap = carW * 0.08;
    var trackY = H * (H > W ? 0.54 : 0.52);
    var trainW = engineW + gap + 3 * (carW + gap);
    var platY = H * (H > W ? 0.80 : 0.82);
    var platSize = Math.min(W * 0.14, H * 0.12, 92);
    return {
      carW: carW,
      carH: carH,
      engineW: engineW,
      gap: gap,
      trackY: trackY,
      trainW: trainW,
      platY: platY,
      platSize: platSize
    };
  }

  function carCenters(m, origin) {
    var x = origin + m.engineW + m.gap + m.carW * 0.5;
    var list = [];
    var i;
    for (i = 0; i < 3; i++) {
      list.push({
        x: x + i * (m.carW + m.gap),
        y: m.trackY - m.carH * 0.18
      });
    }
    return list;
  }

  function layoutPlatform() {
    var m = metrics();
    var n = platform.length;
    var span = Math.min(W * 0.82, m.platSize * 6.4);
    var x0 = (W - span) / 2;
    var i;
    for (i = 0; i < n; i++) {
      platform[i].x = n === 1 ? W / 2 : x0 + (span / Math.max(1, n - 1)) * i;
      platform[i].y = m.platY;
      platform[i].r = m.platSize * 1.15;
      platform[i].size = m.platSize;
    }
  }

  function fillPlatform() {
    var names = BubbleAnimals.names.slice();
    shuffle(names);
    var chosen = [];
    var i, name;
    for (i = 0; i < names.length && chosen.length < 4; i++) {
      name = names[i];
      if (lastPicks.indexOf(name) !== -1 && chosen.length + (names.length - i) > 4) continue;
      chosen.push(name);
    }
    while (chosen.length < 4) chosen.push(pick(names));
    lastPicks = chosen.slice();
    platform = chosen.map(function (n) {
      return { name: n, x: 0, y: 0, r: 70, size: 60, gone: false };
    });
    layoutPlatform();
  }

  function resetTrain(offscreen) {
    var m = metrics();
    trainX = offscreen ? -m.trainW - 40 : (W - m.trainW) / 2;
    trainMode = offscreen ? "arrive" : "idle";
    trainT = 0;
    cars = [null, null, null];
    hop = null;
    busy = false;
  }

  function nextSet(fromLeft) {
    resetTrain(!!fromLeft);
    fillPlatform();
  }

  function parkedX() {
    var m = metrics();
    return (W - m.trainW) / 2;
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
    if (trainMode === "idle") trainX = parkedX();
    layoutPlatform();
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

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTracks(m) {
    var y = m.trackY + m.carH * 0.42;
    ctx.fillStyle = "#8a5a2a";
    var i, x;
    for (x = -20; x < W + 20; x += 28) {
      ctx.fillRect(x, y - 6, 18, 22);
    }
    ctx.fillStyle = "#6a6a70";
    ctx.fillRect(0, y - 2, W, 5);
    ctx.fillRect(0, y + 10, W, 5);
    ctx.fillStyle = "#c0c4c8";
    ctx.fillRect(0, y - 3, W, 2);
    ctx.fillRect(0, y + 9, W, 2);
  }

  function drawWheel(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#2a2a30";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "#c0c4c8";
    ctx.fill();
  }

  function drawEngine(m, x) {
    var y = m.trackY;
    var w = m.engineW;
    var h = m.carH;
    ctx.fillStyle = "#ff4d5a";
    roundRect(x, y - h, w, h, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    roundRect(x, y - h, w, h, 14);
    ctx.stroke();
    ctx.fillStyle = "#8ae0ff";
    roundRect(x + w * 0.18, y - h * 0.78, w * 0.38, h * 0.36, 8);
    ctx.fill();
    ctx.fillStyle = "#4a4a50";
    ctx.fillRect(x + w * 0.68, y - h * 1.18, w * 0.16, h * 0.28);
    ctx.beginPath();
    ctx.arc(x + w * 0.76, y - h * 1.28 - Math.sin(time * 8) * 4, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(x + w * 0.88, y - h * 0.32, 7, 0, Math.PI * 2);
    ctx.fill();
    drawWheel(x + w * 0.28, y + 4, h * 0.22);
    drawWheel(x + w * 0.72, y + 4, h * 0.22);
  }

  function drawCar(m, x, color, rider) {
    var y = m.trackY;
    var w = m.carW;
    var h = m.carH * 0.78;
    ctx.fillStyle = color;
    roundRect(x, y - h, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    roundRect(x, y - h, w, h, 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(x + 10, y - h + 8, w - 20, h * 0.42, 8);
    ctx.fill();
    drawWheel(x + w * 0.25, y + 4, h * 0.24);
    drawWheel(x + w * 0.75, y + 4, h * 0.24);
    if (rider) {
      BubbleAnimals.draw(ctx, rider, x + w * 0.5, y - h * 0.55, (Math.min(w, h) / 70), time * 0.2);
    }
  }

  function drawTrain() {
    var m = metrics();
    var x = trainX;
    drawEngine(m, x);
    var i;
    for (i = 0; i < 3; i++) {
      drawCar(
        m,
        x + m.engineW + m.gap + i * (m.carW + m.gap),
        CAR_COLORS[i],
        cars[i]
      );
    }
  }

  function drawPlatform() {
    var m = metrics();
    var y = m.platY + m.platSize * 0.55;
    ctx.fillStyle = "#c48a48";
    roundRect(W * 0.06, y - 10, W * 0.88, 22, 8);
    ctx.fill();
    ctx.fillStyle = "#a06a30";
    ctx.fillRect(W * 0.08, y + 8, 10, H - y);
    ctx.fillRect(W * 0.9, y + 8, 10, H - y);
    var i, a, pulse;
    var idle = trainMode === "idle" && time - lastInteractionTime > 7;
    for (i = 0; i < platform.length; i++) {
      a = platform[i];
      if (a.gone) continue;
      pulse = idle ? 1 + Math.sin(time * 5 + i * 1.3) * 0.07 : 1;
      BubbleAnimals.draw(ctx, a.name, a.x, a.y, (a.size / 40) * pulse, time * 0.18 + i);
    }
  }

  function spawnPuff() {
    var m = metrics();
    puffs.push({
      x: trainX + m.engineW * 0.76 + rand(-4, 4),
      y: m.trackY - m.carH * 1.3,
      vx: rand(-14, 14),
      vy: rand(-70, -40),
      r: rand(6, 11),
      life: rand(0.7, 1.1),
      t: 0
    });
  }

  function drawPuffs() {
    var i, pf, k;
    for (i = 0; i < puffs.length; i++) {
      pf = puffs[i];
      k = pf.t / pf.life;
      ctx.globalAlpha = Math.max(0, 0.75 * (1 - k));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pf.x, pf.y, pf.r * (1 + k * 1.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function nextEmpty() {
    var i;
    for (i = 0; i < cars.length; i++) {
      if (!cars[i]) return i;
    }
    return -1;
  }

  function hitPlatform(x, y) {
    var i, a, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < platform.length; i++) {
      a = platform[i];
      if (a.gone) continue;
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

  function hitEngine(x, y) {
    if (trainMode !== "idle") return false;
    var m = metrics();
    return x >= trainX && x <= trainX + m.engineW &&
           y >= m.trackY - m.carH * 1.5 && y <= m.trackY + 12;
  }

  function boardAnimal(a) {
    var slot = nextEmpty();
    if (slot < 0) return;
    busy = true;
    a.gone = true;
    var m = metrics();
    var dest = carCenters(m, trainX)[slot];
    hop = {
      name: a.name,
      x: a.x,
      y: a.y,
      sx: a.x,
      sy: a.y,
      tx: dest.x,
      ty: dest.y,
      slot: slot,
      t: 0
    };
    if (window.TrainAudio) {
      TrainAudio.toot();
      TrainAudio.speak(a.name);
    }
  }

  function update(dt) {
    var i;
    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].drift * dt;
      if (clouds[i].x > W + 80) clouds[i].x = -80;
    }

    if (hop) {
      hop.t += dt;
      var k = Math.min(1, hop.t / 0.48);
      var e = k * (2 - k);
      hop.x = hop.sx + (hop.tx - hop.sx) * e;
      hop.y = hop.sy + (hop.ty - hop.sy) * e - Math.sin(k * Math.PI) * 90;
      if (k >= 1) {
        cars[hop.slot] = hop.name;
        hop = null;
        busy = false;
        if (cars[0] && cars[1] && cars[2]) {
          busy = true;
          trainMode = "depart";
          trainT = 0;
          puffTimer = 0;
          if (window.TrainAudio) {
            TrainAudio.chug();
            TrainAudio.speak("All aboard!", 700);
          }
        }
      }
    }

    if (trainMode === "depart") {
      trainT += dt;
      if (trainT > 0.25) trainX += (420 + trainT * 260) * dt;
      puffTimer -= dt;
      if (puffTimer <= 0) {
        puffTimer = 0.14;
        spawnPuff();
      }
      if (trainX > W + 40) nextSet(true);
    } else if (trainMode === "arrive") {
      trainT += dt;
      var dest = parkedX();
      trainX += (dest - trainX) * Math.min(1, dt * 3.2);
      if (Math.abs(trainX - dest) < 2) {
        trainX = dest;
        trainMode = "idle";
        busy = false;
        if (window.TrainAudio) TrainAudio.toot();
      }
    }

    for (i = puffs.length - 1; i >= 0; i--) {
      var pf = puffs[i];
      pf.t += dt;
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      if (pf.t > pf.life) puffs.splice(i, 1);
    }
  }

  function render() {
    drawSky();
    drawTracks(metrics());
    drawTrain();
    drawPuffs();
    drawPlatform();
    if (hop) {
      var s = metrics().platSize / 40;
      BubbleAnimals.draw(ctx, hop.name, hop.x, hop.y, s, hop.t * 3);
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
    lastInteractionTime = t / 1000;
    if (window.TrainAudio) TrainAudio.unlock();
    if (busy || trainMode !== "idle") return;
    var p = eventPos(e);
    var a = hitPlatform(p.x, p.y);
    if (a) {
      boardAnimal(a);
      return;
    }
    if (hitEngine(p.x, p.y)) {
      if (window.TrainAudio) TrainAudio.toot();
      spawnPuff();
      spawnPuff();
      spawnPuff();
    }
  }

  var muteBtn = document.getElementById("mute");
  function syncMuteBtn() {
    if (!muteBtn || !window.TrainAudio) return;
    var m = TrainAudio.isMuted();
    muteBtn.classList.toggle("muted", m);
    muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
  }
  if (muteBtn) {
    muteBtn.addEventListener("click", function () {
      if (window.TrainAudio) {
        TrainAudio.unlock();
        TrainAudio.setMuted(!TrainAudio.isMuted());
      }
      syncMuteBtn();
    });
    syncMuteBtn();
  }

  if (window.PointerEvent) {
    canvas.addEventListener("pointerdown", onTap, { passive: false });
  } else {
    canvas.addEventListener("touchstart", onTap, { passive: false });
    canvas.addEventListener("mousedown", onTap);
  }
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () {
    setTimeout(resize, 200);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && window.TrainAudio && TrainAudio.isUnlocked()) {
      TrainAudio.unlock();
    }
  });

  resize();
  nextSet(false);
  requestAnimationFrame(frame);
})();
