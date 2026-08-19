/* Snack Time — feed the hungry animal. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var dpr = 1;
  var lastTap = 0;

  var clouds = [];
  var flowers = [];

  var PAIRS = [
    { animal: "monkey", food: "banana" },
    { animal: "panda", food: "bamboo" },
    { animal: "bunny", food: "carrot" },
    { animal: "pig", food: "apple" },
    { animal: "giraffe", food: "leaf" },
    { animal: "elephant", food: "peanut" },
    { animal: "penguin", food: "fish" },
    { animal: "duck", food: "corn" },
    { animal: "lion", food: "steak" },
    { animal: "cat", food: "milk" }
  ];

  var TILE_COLORS = ["#fff6c8", "#ffe0f0", "#e0f4ff"];

  var lastPair = "";
  var pair = null;
  var tiles = [];
  var animalAnim = { mode: "idle", t: 0 };
  var chompFood = null;
  var sparkles = [];
  var busy = false;
  var announced = false;
  var time = 0;

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

  function tileLayout() {
    var n = 3;
    var gap = Math.min(22, W * 0.03);
    var size = Math.min(W * 0.28, H * 0.26, 200);
    var total = n * size + (n - 1) * gap;
    var x0 = (W - total) / 2;
    var y = H - size - Math.max(18, H * 0.04);
    return { size: size, gap: gap, x0: x0, y: y };
  }

  function animalPos() {
    return {
      x: W * 0.5,
      y: H * (H > W ? 0.40 : 0.36)
    };
  }

  function nextRound() {
    var choice = pick(PAIRS);
    var guard = 0;
    while (choice.animal === lastPair && PAIRS.length > 1 && guard < 8) {
      choice = pick(PAIRS);
      guard++;
    }
    lastPair = choice.animal;
    pair = choice;
    animalAnim = { mode: "idle", t: 0 };
    chompFood = null;
    busy = false;
    announced = false;
    if (window.SnackAudio && SnackAudio.isUnlocked()) announce(1200);

    var others = PAIRS.filter(function (p) { return p.food !== choice.food; });
    shuffle(others);
    var foods = [choice.food, others[0].food, others[1].food];
    shuffle(foods);

    var lay = tileLayout();
    tiles = foods.map(function (food, i) {
      return {
        food: food,
        correct: food === choice.food,
        x: lay.x0 + i * (lay.size + lay.gap) + lay.size / 2,
        y: lay.y + lay.size / 2,
        size: lay.size,
        bounce: 0,
        press: 0,
        hide: 0
      };
    });
  }

  function relayoutTiles() {
    var lay = tileLayout();
    var i, t;
    for (i = 0; i < tiles.length; i++) {
      t = tiles[i];
      t.x = lay.x0 + i * (lay.size + lay.gap) + lay.size / 2;
      t.y = lay.y + lay.size / 2;
      t.size = lay.size;
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
    if (tiles.length) relayoutTiles();
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
    for (i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2;
      sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * rand(60, 180),
        vy: Math.sin(a) * rand(60, 180) - 40,
        r: rand(4, 8),
        color: pick(["#fff6a0", "#ffe14a", "#ff8ad8", "#fff"]),
        life: rand(0.4, 0.7),
        t: 0
      });
    }
  }

  function drawTile(tile) {
    if (tile.hide >= 1) return;
    var s = tile.size * (1 - tile.hide * 0.4) * (1 - tile.press * 0.06);
    var x = tile.x + Math.sin(tile.bounce * 18) * tile.bounce * 16;
    var y = tile.y - Math.abs(Math.sin(tile.bounce * 12)) * tile.bounce * 10;
    var r = s * 0.22;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(80, 40, 10, 0.12)";
    roundRect(-s / 2 + 4, -s / 2 + 8, s, s, r);
    ctx.fill();
    ctx.fillStyle = TILE_COLORS[tiles.indexOf(tile) % 3];
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    roundRect(-s / 2, -s / 2, s, s, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    SnackFoods.draw(ctx, tile.food, x, y, s / 90);
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

  function drawThought(ax, ay, size) {
    var br = size * 0.62;
    var bx = ax + size * 1.08;
    var by = ay - size * 1.18 + Math.sin(time * 2) * size * 0.05;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ax + size * 0.42, ay - size * 0.5, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ax + size * 0.68, ay - size * 0.8, size * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = Math.max(3, size * 0.05);
    ctx.stroke();
    SnackFoods.draw(ctx, pair.food, bx, by, br / 36);
  }

  function hitTile(x, y) {
    var i, t, half, dx, dy;
    for (i = 0; i < tiles.length; i++) {
      t = tiles[i];
      if (t.hide > 0) continue;
      half = t.size * 0.52;
      dx = x - t.x;
      dy = y - t.y;
      if (Math.abs(dx) < half && Math.abs(dy) < half) return t;
    }
    return null;
  }

  function hitAnimal(x, y) {
    var ap = animalPos();
    var size = Math.min(W, H) * (H > W ? 0.16 : 0.14);
    var r = size * 1.35;
    var dx = x - ap.x;
    var dy = y - ap.y;
    return dx * dx + dy * dy < r * r;
  }

  function announce(delay) {
    if (!window.SnackAudio || !pair) return;
    SnackAudio.speak(
      "The " + pair.animal + " wants " + SnackFoods.wantPhrase(pair.food),
      delay || 0
    );
  }

  function onCorrect(tile) {
    busy = true;
    animalAnim = { mode: "chomp", t: 0 };
    tile.hide = 0.01;
    var ap = animalPos();
    chompFood = {
      food: tile.food,
      x: tile.x,
      y: tile.y,
      tx: ap.x,
      ty: ap.y + 18,
      t: 0
    };
    spawnSparkle(tile.x, tile.y);
    if (window.SnackAudio) {
      SnackAudio.yum();
      SnackAudio.speak("Yum!");
    }
  }

  function onWrong(tile) {
    tile.bounce = 1;
    animalAnim = { mode: "wiggle", t: 0 };
    if (window.SnackAudio) {
      SnackAudio.bounce();
      SnackAudio.speak(SnackFoods.sayWrong(tile.food));
      announce(1500);
    }
  }

  function update(dt) {
    var i, p, t;
    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].drift * dt;
      if (clouds[i].x > W + 80) clouds[i].x = -80;
    }
    for (i = tiles.length - 1; i >= 0; i--) {
      t = tiles[i];
      if (t.bounce > 0) t.bounce = Math.max(0, t.bounce - dt * 1.6);
      if (t.press > 0) t.press = Math.max(0, t.press - dt * 4);
      if (t.hide > 0 && t.hide < 1) t.hide = Math.min(1, t.hide + dt * 3);
    }
    animalAnim.t += dt;
    if (animalAnim.mode === "wiggle" && animalAnim.t > 0.55) {
      animalAnim = { mode: "idle", t: 0 };
    }
    if (chompFood) {
      chompFood.t += dt;
      var k = Math.min(1, chompFood.t / 0.38);
      k = k * (2 - k);
      chompFood.cx = chompFood.x + (chompFood.tx - chompFood.x) * k;
      chompFood.cy = chompFood.y + (chompFood.ty - chompFood.y) * k - Math.sin(k * Math.PI) * 70;
      if (chompFood.t > 1.55) {
        chompFood = null;
        nextRound();
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
    var ap = animalPos();
    var size = Math.min(W, H) * (H > W ? 0.16 : 0.14);
    var tAnim = time * 0.18;
    var extra = 1;
    if (animalAnim.mode === "wiggle") tAnim = animalAnim.t * 4;
    if (animalAnim.mode === "chomp") {
      extra = 1 + Math.sin(Math.min(1, animalAnim.t / 0.25) * Math.PI) * 0.18;
      tAnim = animalAnim.t * 3;
    }
    BubbleAnimals.draw(ctx, pair.animal, ap.x, ap.y, (size / 40) * extra, tAnim);
    if (animalAnim.mode !== "chomp") drawThought(ap.x, ap.y, size);

    var i, p;
    if (chompFood && chompFood.t < 0.5) {
      SnackFoods.draw(ctx, chompFood.food, chompFood.cx, chompFood.cy, (tileLayout().size / 90) * (1 - chompFood.t));
    }
    for (i = 0; i < tiles.length; i++) drawTile(tiles[i]);
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
    if (window.SnackAudio) SnackAudio.unlock();
    if (busy) return;
    var p = eventPos(e);
    var tile = hitTile(p.x, p.y);
    var first = !announced;
    announced = true;
    if (!tile) {
      if (first) {
        announce(0);
        return;
      }
      if (hitAnimal(p.x, p.y)) {
        animalAnim = { mode: "wiggle", t: 0 };
        if (window.SnackAudio) {
          SnackAudio.bounce();
          SnackAudio.speak("I'm the " + pair.animal + "!");
        }
      }
      return;
    }
    tile.press = 1;
    if (tile.correct) onCorrect(tile);
    else onWrong(tile);
  }

  var muteBtn = document.getElementById("mute");
  function syncMuteBtn() {
    if (!muteBtn || !window.SnackAudio) return;
    var m = SnackAudio.isMuted();
    muteBtn.classList.toggle("muted", m);
    muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
  }
  if (muteBtn) {
    muteBtn.addEventListener("click", function () {
      if (window.SnackAudio) {
        SnackAudio.unlock();
        SnackAudio.setMuted(!SnackAudio.isMuted());
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
    if (!document.hidden && window.SnackAudio && SnackAudio.isUnlocked()) {
      SnackAudio.unlock();
    }
  });

  resize();
  nextRound();
  requestAnimationFrame(frame);
})();
