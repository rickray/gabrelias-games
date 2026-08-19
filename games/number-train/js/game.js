/* Number Train — hop waiting animals into numbered cars 1, 2, and 3. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;
  var scene = GGScene.create({ ground: 0.78 });

  var puffs = [];
  var dust = [];
  var puffTimer = 0;
  var departBurst = false;

  var CAR_COLORS = [
    { top: "#ff9a9a", mid: "#ff5a6a", bot: "#d02030", rim: "#8a1020", text: "#7a0818", numBg: "#fff0f0" },
    { top: "#ffe68a", mid: "#ffd24a", bot: "#d0a010", rim: "#8a6a08", text: "#6a4000", numBg: "#fffdf0" },
    { top: "#a89aff", mid: "#7a6bff", bot: "#4030c0", rim: "#201080", text: "#180860", numBg: "#f0f0ff" }
  ];
  var ENGINE = { top: "#ff8a90", mid: "#ff4d5a", bot: "#c02030", rim: "#7a1018" };

  var trainX = 0;
  var trainMode = "idle";
  var trainT = 0;
  var cars = [null, null, null];
  var carWiggle = [0, 0, 0];
  var platform = [];
  var hop = null;
  var busy = false;
  var lastPicks = [];
  var lastInteractionTime = 0;
  var gradCache = {};
  var asked = false;
  var askTimeout = 0;

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

  function formatAnimalName(name) {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function metrics() {
    var unit = Math.min(W, H);
    var isLandscape = W > H;
    var carW = Math.min(W * 0.165, unit * 0.21, 155);
    var carH = carW * 0.74;
    var engineW = carW * 1.15;
    var gap = carW * 0.08;
    var trackY = H * (isLandscape ? 0.52 : 0.50);
    var trainW = engineW + gap + 3 * (carW + gap);
    var platY = H * (isLandscape ? 0.81 : 0.83);
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

  function parkedX() {
    var m = metrics();
    return (W - m.trainW) / 2;
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

  function nextEmptyCarIndex() {
    var i;
    for (i = 0; i < cars.length; i++) {
      if (!cars[i]) return i;
    }
    return -1;
  }

  function promptNextCar() {
    var nextIdx = nextEmptyCarIndex();
    if (nextIdx >= 0) {
      var carNum = nextIdx + 1;
      asked = true;
      if (askTimeout) {
        clearTimeout(askTimeout);
        askTimeout = 0;
      }
      GGAudio.say("Car " + carNum + "!", { rate: 0.86, pitch: 1.2 });
    }
  }

  function layoutPlatform() {
    var m = metrics();
    var n = platform.length;
    var span = Math.min(W * 0.84, m.platSize * 6.5);
    var x0 = (W - span) / 2;
    var i;
    for (i = 0; i < n; i++) {
      platform[i].x = n === 1 ? W / 2 : x0 + (span / Math.max(1, n - 1)) * i;
      platform[i].y = m.platY;
      platform[i].r = m.platSize * 1.18;
      platform[i].size = m.platSize;
    }
  }

  function fillPlatform() {
    var names = GGAnimals.names.slice();
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
    trainX = offscreen ? -m.trainW - 40 : parkedX();
    trainMode = offscreen ? "arrive" : "idle";
    trainT = 0;
    cars = [null, null, null];
    carWiggle = [0, 0, 0];
    hop = null;
    busy = false;
    departBurst = false;
    puffs = [];
    dust = [];
  }

  function nextSet(fromLeft) {
    resetTrain(!!fromLeft);
    if (fromLeft) GGAudio.whoosh();
    fillPlatform();

    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    if (GGAudio.isUnlocked() && !fromLeft) {
      askTimeout = setTimeout(function () {
        askTimeout = 0;
        if (!busy) promptNextCar();
      }, 700);
    }
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

  function bodyGrad(key, x, y, w, h, palette) {
    var ck = key + ":" + ((w / 4) | 0) + ":" + ((h / 4) | 0);
    var g = gradCache[ck];
    if (g) return g;
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, palette.top);
    g.addColorStop(0.45, palette.mid);
    g.addColorStop(1, palette.bot);
    gradCache[ck] = g;
    return g;
  }

  function drawTracks(m) {
    var y = m.trackY + m.carH * 0.42;
    var i, x, g, bed;

    bed = ctx.createLinearGradient(0, y - 10, 0, y + 22);
    bed.addColorStop(0, "#cbae7e");
    bed.addColorStop(1, "#a4834f");
    ctx.fillStyle = bed;
    ctx.fillRect(0, y - 8, W, 30);

    for (x = -20; x < W + 20; x += 36) {
      g = ctx.createLinearGradient(x, y - 6, x, y + 18);
      g.addColorStop(0, "#c48a48");
      g.addColorStop(0.55, "#8a5a2a");
      g.addColorStop(1, "#5a3818");
      ctx.fillStyle = g;
      roundRect(x, y - 5, 15, 23, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,160,0.35)";
      ctx.fillRect(x + 2, y - 3, 11, 2.5);
    }

    for (i = 0; i < 2; i++) {
      var ry = y + i * 12;
      ctx.fillStyle = "#4a4a52";
      ctx.fillRect(0, ry + 1, W, 3.5);
      ctx.fillStyle = "#9298a0";
      ctx.fillRect(0, ry - 2, W, 3.5);
      ctx.fillStyle = "#e2e6ea";
      ctx.fillRect(0, ry - 2.5, W, 1.5);
    }
  }

  function drawWheel(x, y, r, spin) {
    var i, a, hub;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a22";
    ctx.fill();
    ctx.strokeStyle = "#0a0a10";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = "#3a3a44";
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin || 0);
    ctx.strokeStyle = "#c0c4c8";
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineCap = "round";
    for (i = 0; i < 6; i++) {
      a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
      ctx.stroke();
    }
    ctx.restore();

    hub = ctx.createRadialGradient(x - r * 0.15, y - r * 0.15, 1, x, y, r * 0.42);
    hub.addColorStop(0, "#f0f2f4");
    hub.addColorStop(0.55, "#a0a4a8");
    hub.addColorStop(1, "#606468");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#2a2a30";
    ctx.fill();
  }

  function drawCoupler(x, y) {
    ctx.fillStyle = "#4a4a50";
    roundRect(x - 4, y - 5, 8, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#2a2a30";
    ctx.fillRect(x - 2, y - 3, 4, 6);
  }

  function trainShadow(m, x, w) {
    var y = m.trackY + m.carH * 0.4;
    var g = ctx.createRadialGradient(x + w * 0.5, y, 4, x + w * 0.5, y, w * 0.55);
    g.addColorStop(0, "rgba(30,20,10,0.28)");
    g.addColorStop(1, "rgba(30,20,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + 4, w * 0.52, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEngine(m, x) {
    var y = m.trackY;
    var w = m.engineW;
    var h = m.carH;
    var spin = trainMode === "depart" || trainMode === "arrive" ? time * 10 : time * 0.6;
    var g, cabX, cabW;

    trainShadow(m, x, w);

    /* boiler body */
    g = bodyGrad("eng", x, y - h, w, h, ENGINE);
    roundRect(x, y - h, w, h, 14);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ENGINE.rim;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    /* side panel highlight */
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(x + 8, y - h + 8, w * 0.55, h * 0.28, 8);
    ctx.fill();

    /* cabin */
    cabX = x + w * 0.08;
    cabW = w * 0.48;
    g = ctx.createLinearGradient(cabX, y - h * 0.95, cabX, y - h * 0.35);
    g.addColorStop(0, "#ffb0b4");
    g.addColorStop(1, "#d02838");
    roundRect(cabX, y - h * 0.95, cabW, h * 0.58, 10);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ENGINE.rim;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    /* window with glass shine */
    g = ctx.createLinearGradient(cabX + cabW * 0.12, y - h * 0.88, cabX + cabW * 0.12, y - h * 0.5);
    g.addColorStop(0, "#e8f8ff");
    g.addColorStop(0.4, "#7ad0ff");
    g.addColorStop(1, "#2a80c0");
    roundRect(cabX + cabW * 0.14, y - h * 0.86, cabW * 0.72, h * 0.34, 7);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#104060";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(cabX + cabW * 0.2, y - h * 0.84, cabW * 0.22, h * 0.14, 4);
    ctx.fill();

    /* chunky funnel */
    g = ctx.createLinearGradient(x + w * 0.66, y - h * 1.3, x + w * 0.66, y - h * 0.85);
    g.addColorStop(0, "#5a5a64");
    g.addColorStop(1, "#2a2a32");
    roundRect(x + w * 0.66, y - h * 1.22, w * 0.18, h * 0.34, 4);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 2;
    ctx.stroke();

    /* funnel lip */
    g = ctx.createLinearGradient(x + w * 0.63, y - h * 1.32, x + w * 0.63, y - h * 1.18);
    g.addColorStop(0, "#7a7a84");
    g.addColorStop(1, "#3a3a44");
    roundRect(x + w * 0.63, y - h * 1.3, w * 0.24, h * 0.12, 5);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 2;
    ctx.stroke();

    /* headlamp */
    g = ctx.createRadialGradient(x + w * 0.88 - 2, y - h * 0.32 - 2, 1, x + w * 0.88, y - h * 0.32, 9);
    g.addColorStop(0, "#fff6c8");
    g.addColorStop(0.5, "#ffe14a");
    g.addColorStop(1, "#d0a010");
    ctx.beginPath();
    ctx.arc(x + w * 0.88, y - h * 0.32, 8, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#8a6a08";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w * 0.86, y - h * 0.34, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();

    /* cowcatcher */
    ctx.beginPath();
    ctx.moveTo(x + w * 0.92, y - 4);
    ctx.lineTo(x + w + 6, y + 10);
    ctx.lineTo(x + w * 0.78, y + 10);
    ctx.closePath();
    ctx.fillStyle = "#c0c4c8";
    ctx.fill();
    ctx.strokeStyle = "#4a4a50";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawWheel(x + w * 0.28, y + 4, h * 0.22, spin);
    drawWheel(x + w * 0.72, y + 4, h * 0.22, spin);

    drawCoupler(x + w + m.gap * 0.5, y - h * 0.28);
  }

  function drawCar(m, x, palette, rider, idx) {
    var y = m.trackY;
    var w = m.carW;
    var h = m.carH * 0.78;
    var spin = trainMode === "depart" || trainMode === "arrive" ? time * 10 : time * 0.6;
    var carNum = idx + 1;
    var g;

    var wig = carWiggle[idx];
    var offX = 0;
    if (wig > 0) {
      offX = Math.sin(wig * 26) * 6;
    }

    ctx.save();
    ctx.translate(offX, 0);

    trainShadow(m, x, w);

    g = bodyGrad("car" + idx, x, y - h, w, h, palette);
    roundRect(x, y - h, w, h, 12);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    /* roof stripe */
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    roundRect(x + 6, y - h + 4, w - 12, h * 0.14, 6);
    ctx.fill();

    /* window band or animal occupant */
    g = ctx.createLinearGradient(x + 10, y - h + 14, x + 10, y - h + 14 + h * 0.38);
    g.addColorStop(0, "#e8f8ff");
    g.addColorStop(0.45, "#7ad0ff");
    g.addColorStop(1, "#2a80c0");
    roundRect(x + 10, y - h + 14, w - 20, h * 0.38, 8);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#104060";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = palette.rim;
    ctx.fillRect(x + w * 0.5 - 1.5, y - h + 16, 3, h * 0.34);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    roundRect(x + 14, y - h + 18, (w - 28) * 0.28, h * 0.12, 3);
    ctx.fill();

    /* Big bold car numeral badge on lower car body */
    var badgeW = w * 0.48;
    var badgeH = h * 0.34;
    var badgeX = x + w * 0.5;
    var badgeY = y - h * 0.24;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(badgeX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
    ctx.fill();
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.font = "900 " + Math.floor(badgeH * 0.88) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(carNum, badgeX, badgeY + 1);

    drawWheel(x + w * 0.25, y + 4, h * 0.24, spin);
    drawWheel(x + w * 0.75, y + 4, h * 0.24, spin);

    if (idx < 2) drawCoupler(x + w + m.gap * 0.5, y - h * 0.3);

    if (rider) {
      GGAnimals.draw(ctx, rider, x + w * 0.5, y - h * 0.55, (Math.min(w, h) / 70), time * 0.2);
    }

    ctx.restore();
  }

  function drawTrain() {
    var m = metrics();
    var x = trainX;
    var i;
    drawEngine(m, x);
    for (i = 0; i < 3; i++) {
      drawCar(
        m,
        x + m.engineW + m.gap + i * (m.carW + m.gap),
        CAR_COLORS[i],
        cars[i],
        i
      );
    }
  }

  function drawPlatform() {
    var m = metrics();
    var y = m.platY + m.platSize * 0.55;
    var g, i, a, pulse;
    var idle = trainMode === "idle" && time - lastInteractionTime > 7;

    g = ctx.createLinearGradient(0, y - 12, 0, y + 14);
    g.addColorStop(0, "#e0b070");
    g.addColorStop(0.5, "#c48a48");
    g.addColorStop(1, "#8a5a28");
    roundRect(W * 0.06, y - 10, W * 0.88, 24, 8);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#6a3a18";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,230,180,0.4)";
    ctx.fillRect(W * 0.08, y - 6, W * 0.84, 4);

    g = ctx.createLinearGradient(0, y + 8, 0, H);
    g.addColorStop(0, "#b07838");
    g.addColorStop(1, "#6a4018");
    ctx.fillStyle = g;
    ctx.fillRect(W * 0.08, y + 10, 12, H - y);
    ctx.fillRect(W * 0.9 - 2, y + 10, 12, H - y);

    for (i = 0; i < platform.length; i++) {
      a = platform[i];
      if (a.gone) continue;
      pulse = idle ? 1 + Math.sin(time * 5 + i * 1.3) * 0.07 : 1;
      GGAnimals.draw(ctx, a.name, a.x, a.y, (a.size / 40) * pulse, time * 0.18 + i);
    }
  }

  function spawnPuff() {
    var m = metrics();
    puffs.push({
      x: trainX + m.engineW * 0.76 + rand(-4, 4),
      y: m.trackY - m.carH * 1.3,
      vx: rand(-18, 18),
      vy: rand(-110, -55),
      r: rand(10, 18),
      life: rand(1.0, 1.6),
      t: 0,
      grow: rand(2.2, 3.4)
    });
  }

  function spawnDust(x, y) {
    var i, a;
    for (i = 0; i < 8; i++) {
      a = Math.PI + (i / 8) * Math.PI + rand(-0.2, 0.2);
      dust.push({
        x: x,
        y: y + 8,
        vx: Math.cos(a) * rand(30, 80),
        vy: Math.sin(a) * rand(10, 40) - 10,
        r: rand(4, 9),
        life: rand(0.3, 0.55),
        t: 0
      });
    }
  }

  function burstDepartConfetti() {
    var m = metrics();
    var i, cx, cy;
    for (i = 0; i < 4; i++) {
      cx = trainX + m.engineW * 0.4 + i * (m.carW + m.gap) * 0.9;
      cy = m.trackY - m.carH * 0.7;
      scene.confetti(cx, cy);
    }
  }

  function drawPuffs() {
    var i, pf, k, rr, g;
    for (i = 0; i < puffs.length; i++) {
      pf = puffs[i];
      k = pf.t / pf.life;
      rr = pf.r * (1 + k * pf.grow);
      ctx.globalAlpha = Math.max(0, 0.7 * (1 - k) * (1 - k));
      g = ctx.createRadialGradient(pf.x - rr * 0.2, pf.y - rr * 0.2, 1, pf.x, pf.y, rr);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.55, "rgba(230,230,235,0.7)");
      g.addColorStop(1, "rgba(200,200,210,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pf.x, pf.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawDust() {
    var i, d, k;
    for (i = 0; i < dust.length; i++) {
      d = dust[i];
      k = d.t / d.life;
      ctx.globalAlpha = Math.max(0, 0.45 * (1 - k));
      ctx.fillStyle = "#c4a070";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r * (1 + k), d.r * 0.55 * (1 + k * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  function hitCarIndex(x, y) {
    if (trainMode !== "idle") return -1;
    var m = metrics();
    var i, cx, cy;
    for (i = 0; i < 3; i++) {
      cx = trainX + m.engineW + m.gap + i * (m.carW + m.gap);
      cy = m.trackY - m.carH * 0.78;
      if (x >= cx - 6 && x <= cx + m.carW + 6 && y >= cy - 20 && y <= m.trackY + 16) {
        return i;
      }
    }
    return -1;
  }

  function hitEngine(x, y) {
    if (trainMode !== "idle") return false;
    var m = metrics();
    return x >= trainX && x <= trainX + m.engineW &&
           y >= m.trackY - m.carH * 1.5 && y <= m.trackY + 12;
  }

  function getFirstAvailableAnimal() {
    var i;
    for (i = 0; i < platform.length; i++) {
      if (!platform[i].gone) return platform[i];
    }
    return null;
  }

  function hopAnimalIntoCar(a, slot) {
    if (!a || slot < 0 || slot >= 3) return;
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
      t: 0,
      landed: false
    };

    var carNum = slot + 1;
    GGAudio.toot();
    GGAudio.say("Car " + carNum + "! " + formatAnimalName(a.name) + "!", { rate: 0.86, pitch: 1.2 });
  }

  function update(dt) {
    var i, pf, d, k, e, dest;
    scene.update(dt);

    for (i = 0; i < 3; i++) {
      if (carWiggle[i] > 0) {
        carWiggle[i] -= dt;
      }
    }

    if (asked && !busy && trainMode === "idle" && GGAudio.isUnlocked() && time - lastInteractionTime > 8) {
      promptNextCar();
      lastInteractionTime = time;
    }

    if (hop) {
      hop.t += dt;
      k = Math.min(1, hop.t / 0.48);
      e = k * (2 - k);
      hop.x = hop.sx + (hop.tx - hop.sx) * e;
      hop.y = hop.sy + (hop.ty - hop.sy) * e - Math.sin(k * Math.PI) * 90;

      hop.sxScale = 1 - Math.sin(k * Math.PI) * 0.18;
      hop.syScale = 1 + Math.sin(k * Math.PI) * 0.22;
      if (k < 0.12) {
        hop.sxScale = 1 + (0.12 - k) / 0.12 * 0.25;
        hop.syScale = 1 - (0.12 - k) / 0.12 * 0.2;
      }
      if (k > 0.85) {
        hop.sxScale = 1 + (k - 0.85) / 0.15 * 0.28;
        hop.syScale = 1 - (k - 0.85) / 0.15 * 0.22;
      }

      if (k >= 1) {
        if (!hop.landed) {
          hop.landed = true;
          spawnDust(hop.tx, hop.ty);
        }
        cars[hop.slot] = hop.name;
        hop = null;
        busy = false;

        if (cars[0] && cars[1] && cars[2]) {
          busy = true;
          trainMode = "depart";
          trainT = 0;
          puffTimer = 0;
          departBurst = false;
          GGAudio.cheer();
          GGAudio.say("All aboard!", { delay: 250, rate: 0.88, pitch: 1.2 });
          setTimeout(function () { GGAudio.chug(); }, 550);
        } else {
          promptNextCar();
        }
      }
    }

    if (trainMode === "depart") {
      trainT += dt;
      if (!departBurst && trainT > 0.05) {
        departBurst = true;
        burstDepartConfetti();
      }
      if (trainT > 0.25) trainX += (420 + trainT * 260) * dt;
      puffTimer -= dt;
      if (puffTimer <= 0) {
        puffTimer = 0.12;
        spawnPuff();
        if (trainT < 1.2) spawnPuff();
      }
      if (trainX > W + 40) nextSet(true);
    } else if (trainMode === "arrive") {
      trainT += dt;
      dest = parkedX();
      trainX += (dest - trainX) * Math.min(1, dt * 3.2);
      if (Math.abs(trainX - dest) < 2) {
        trainX = dest;
        trainMode = "idle";
        busy = false;
        GGAudio.toot();
        promptNextCar();
      }
    }

    for (i = puffs.length - 1; i >= 0; i--) {
      pf = puffs[i];
      pf.t += dt;
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.vy *= 0.98;
      if (pf.t > pf.life) puffs.splice(i, 1);
    }

    for (i = dust.length - 1; i >= 0; i--) {
      d = dust[i];
      d.t += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.r += 10 * dt;
      if (d.t > d.life) dust.splice(i, 1);
    }
  }

  function render() {
    var m = metrics();
    var s, sx, sy;
    scene.draw(ctx);
    drawTracks(m);
    drawTrain();
    drawPuffs();
    drawDust();
    drawPlatform();

    if (hop) {
      s = m.platSize / 40;
      sx = hop.sxScale || 1;
      sy = hop.syScale || 1;
      ctx.save();
      ctx.translate(hop.x, hop.y);
      ctx.scale(sx, sy);
      GGAnimals.draw(ctx, hop.name, 0, 0, s, hop.t * 3);
      ctx.restore();
    }

    scene.drawParticles(ctx);
  }

  GGShell.mount({
    canvas: canvas,
    ctx: ctx,
    resize: function (w, h) {
      W = w;
      H = h;
      gradCache = {};
      scene.resize(w, h);
      if (trainMode === "idle") trainX = parkedX();
      layoutPlatform();
    },
    start: function () {
      nextSet(false);
    },
    tap: function (x, y) {
      lastInteractionTime = time;
      if (busy || trainMode !== "idle") return;

      /* Tap a specific car */
      var carIdx = hitCarIndex(x, y);
      if (carIdx >= 0) {
        if (cars[carIdx]) {
          /* Car is already full! */
          carWiggle[carIdx] = 0.5;
          GGAudio.wiggle();
          GGAudio.say("Car " + (carIdx + 1) + " is full", { rate: 0.86, pitch: 1.15 });
          return;
        }

        var animal = getFirstAvailableAnimal();
        if (animal) {
          hopAnimalIntoCar(animal, carIdx);
          return;
        }
      }

      /* Tap platform animal directly */
      var platAnimal = hitPlatform(x, y);
      if (platAnimal) {
        var emptySlot = nextEmptyCarIndex();
        if (emptySlot >= 0) {
          hopAnimalIntoCar(platAnimal, emptySlot);
        } else {
          GGAudio.toot();
        }
        return;
      }

      /* Tap locomotive engine */
      if (hitEngine(x, y)) {
        GGAudio.toot();
        spawnPuff();
        spawnPuff();
        spawnPuff();
        return;
      }

      promptNextCar();
    },
    frame: function (dt, t) {
      time = t;
      update(dt);
      render();
    }
  });
})();
