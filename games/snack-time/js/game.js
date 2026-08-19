/* Snack Time — feed the hungry animal. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var scene = GGScene.create({ ground: 0.78 });

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

  var TILE_COLORS = [
    { top: "#fffef0", mid: "#fff6c8", bot: "#f0d88a", rim: "#e0b050" },
    { top: "#fff5fa", mid: "#ffe0f0", bot: "#f0b0d0", rim: "#e070b0" },
    { top: "#f0faff", mid: "#e0f4ff", bot: "#a8d8f0", rim: "#60a8d0" }
  ];

  var tileFaceCache = {};
  var lastPair = "";
  var pair = null;
  var tiles = [];
  var animalAnim = { mode: "idle", t: 0 };
  var chompFood = null;
  var crumbs = [];
  var puffs = [];
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

  function mouthPos() {
    var ap = animalPos();
    return { x: ap.x, y: ap.y + 18 };
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
    crumbs = [];
    puffs = [];
    busy = false;
    announced = false;
    if (GGAudio.isUnlocked()) announce(1200);

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

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function tileFaceGrad(idx, s) {
    var key = idx + ":" + ((s / 4) | 0);
    var g = tileFaceCache[key];
    if (g) return g;
    var c = TILE_COLORS[idx % 3];
    g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    g.addColorStop(0, c.top);
    g.addColorStop(0.45, c.mid);
    g.addColorStop(1, c.bot);
    tileFaceCache[key] = g;
    return g;
  }

  function spawnCrumbs(x, y) {
    var i, a;
    for (i = 0; i < 12; i++) {
      a = (i / 12) * Math.PI * 2 + rand(-0.2, 0.2);
      crumbs.push({
        x: x,
        y: y,
        vx: Math.cos(a) * rand(40, 140),
        vy: Math.sin(a) * rand(20, 100) - 80,
        r: rand(2.5, 5.5),
        color: pick(["#fff6a0", "#e0a060", "#ffd24a", "#c48a48", "#fff"]),
        life: rand(0.45, 0.8),
        t: 0,
        rot: rand(0, Math.PI * 2),
        spin: rand(-8, 8)
      });
    }
  }

  function spawnPuff(x, y) {
    var i, a;
    for (i = 0; i < 6; i++) {
      a = (i / 6) * Math.PI * 2;
      puffs.push({
        x: x + Math.cos(a) * 6,
        y: y + Math.sin(a) * 4,
        vx: Math.cos(a) * rand(20, 50),
        vy: Math.sin(a) * rand(10, 40) - 20,
        r: rand(6, 12),
        life: rand(0.28, 0.45),
        t: 0
      });
    }
  }

  function drawTile(tile, idx) {
    if (tile.hide >= 1) return;
    var press = tile.press;
    var s = tile.size * (1 - tile.hide * 0.4) * (1 - press * 0.08);
    var x = tile.x + Math.sin(tile.bounce * 18) * tile.bounce * 16;
    var y = tile.y - Math.abs(Math.sin(tile.bounce * 12)) * tile.bounce * 10 + press * 5;
    var r = s * 0.22;
    var c = TILE_COLORS[idx % 3];
    var sh, face;
    ctx.save();
    ctx.translate(x, y);

    sh = ctx.createRadialGradient(0, s * 0.42, 2, 4, s * 0.48, s * 0.55);
    sh.addColorStop(0, "rgba(60,30,8,0.28)");
    sh.addColorStop(1, "rgba(60,30,8,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(4, s * 0.48, s * 0.48, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    face = tileFaceGrad(idx, s);
    roundRect(-s / 2, -s / 2, s, s, r);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = Math.max(3, s * 0.045);
    ctx.stroke();
    /* A fade across the top, not a closed inner rounded-rect — that
       read as a circle sitting on the tile. */
    ctx.save();
    roundRect(-s / 2, -s / 2, s, s, r);
    ctx.clip();
    var sheen = ctx.createLinearGradient(0, -s / 2, 0, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0.5)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-s / 2, -s / 2, s, s * 0.5);
    ctx.restore();

    ctx.restore();
    SnackFoods.draw(ctx, tile.food, x, y + press * 2, s / 90);
  }

  function drawThought(ax, ay, size) {
    var bob = Math.sin(time * 2.2) * size * 0.04;
    var br = size * 0.62;
    var bx = ax + size * 1.08;
    var by = ay - size * 1.18 + bob;
    var t0x = ax + size * 0.38;
    var t0y = ay - size * 0.42;
    var t1x = ax + size * 0.58;
    var t1y = ay - size * 0.68 + bob * 0.5;
    var t2x = ax + size * 0.78;
    var t2y = ay - size * 0.92 + bob * 0.75;
    var g, i, tx, ty, tr, dots;

    dots = [
      { x: t0x, y: t0y, r: size * 0.07 },
      { x: t1x, y: t1y, r: size * 0.11 },
      { x: t2x, y: t2y, r: size * 0.15 }
    ];
    for (i = 0; i < dots.length; i++) {
      tx = dots[i].x;
      ty = dots[i].y;
      tr = dots[i].r;
      g = ctx.createRadialGradient(tx - tr * 0.3, ty - tr * 0.3, 1, tx, ty, tr);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#fff0c8");
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "#e0a830";
      ctx.lineWidth = Math.max(1.5, size * 0.025);
      ctx.stroke();
    }

    g = ctx.createRadialGradient(bx - br * 0.25, by - br * 0.3, br * 0.1, bx, by, br);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.7, "#fff8e0");
    g.addColorStop(1, "#ffe8a8");
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#e0a830";
    ctx.lineWidth = Math.max(3, size * 0.055);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.beginPath();
    ctx.arc(bx, by, br - Math.max(3, size * 0.04), 0, Math.PI * 2);
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

  function announce(delay, interrupt) {
    if (!pair) return;
    var opts = { delay: delay || 0 };
    if (interrupt === false) opts.interrupt = false;
    GGAudio.say(
      "The " + pair.animal + " wants " + SnackFoods.wantPhrase(pair.food),
      opts
    );
  }

  function onCorrect(tile) {
    busy = true;
    animalAnim = { mode: "chomp", t: 0 };
    tile.hide = 0.01;
    var mouth = mouthPos();
    chompFood = {
      food: tile.food,
      x: tile.x,
      y: tile.y,
      tx: mouth.x,
      ty: mouth.y,
      t: 0,
      landed: false
    };
    scene.sparkle(tile.x, tile.y);
    GGAudio.yum();
    GGAudio.say("Yum!");
  }

  function onWrong(tile) {
    tile.bounce = 1;
    animalAnim = { mode: "wiggle", t: 0 };
    spawnPuff(tile.x, tile.y - tile.size * 0.1);
    GGAudio.bounce();
    GGAudio.say(SnackFoods.sayWrong(tile.food));
    announce(1500, false);
  }

  function update(dt) {
    var i, p, t, k;
    scene.update(dt);

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
      k = Math.min(1, chompFood.t / 0.38);
      k = k * (2 - k);
      chompFood.cx = chompFood.x + (chompFood.tx - chompFood.x) * k;
      chompFood.cy = chompFood.y + (chompFood.ty - chompFood.y) * k - Math.sin(k * Math.PI) * 70;
      if (!chompFood.landed && chompFood.t >= 0.38) {
        chompFood.landed = true;
        scene.confetti(chompFood.tx, chompFood.ty);
        spawnCrumbs(chompFood.tx, chompFood.ty);
      }
      if (chompFood.t > 1.55) {
        chompFood = null;
        nextRound();
      }
    }
    for (i = crumbs.length - 1; i >= 0; i--) {
      p = crumbs[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.rot += p.spin * dt;
      if (p.t > p.life) crumbs.splice(i, 1);
    }
    for (i = puffs.length - 1; i >= 0; i--) {
      p = puffs[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += 18 * dt;
      if (p.t > p.life) puffs.splice(i, 1);
    }
  }

  function drawAnimal() {
    var ap = animalPos();
    var size = Math.min(W, H) * (H > W ? 0.16 : 0.14);
    var tAnim = time * 0.18;
    var sx = 1;
    var sy = 1;
    var chompK;
    if (animalAnim.mode === "wiggle") tAnim = animalAnim.t * 4;
    if (animalAnim.mode === "chomp") {
      chompK = Math.min(1, animalAnim.t / 0.45);
      /* squash on bite, stretch back */
      sx = 1 + Math.sin(chompK * Math.PI) * 0.22;
      sy = 1 - Math.sin(chompK * Math.PI) * 0.16 + Math.sin(Math.min(1, animalAnim.t / 0.25) * Math.PI) * 0.06;
      tAnim = animalAnim.t * 3;
    }
    ctx.save();
    ctx.translate(ap.x, ap.y);
    ctx.scale(sx, sy);
    GGAnimals.draw(ctx, pair.animal, 0, 0, size / 40, tAnim);
    ctx.restore();
    if (animalAnim.mode !== "chomp") drawThought(ap.x, ap.y, size);
  }

  function render() {
    var i, p, a;
    scene.draw(ctx);
    if (!pair) {
      scene.drawParticles(ctx);
      return;
    }
    drawAnimal();

    if (chompFood && chompFood.t < 0.5) {
      SnackFoods.draw(
        ctx,
        chompFood.food,
        chompFood.cx,
        chompFood.cy,
        (tileLayout().size / 90) * (1 - chompFood.t)
      );
    }
    for (i = 0; i < tiles.length; i++) drawTile(tiles[i], i);

    for (i = 0; i < crumbs.length; i++) {
      p = crumbs[i];
      a = Math.max(0, 1 - p.t / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.restore();
    }
    for (i = 0; i < puffs.length; i++) {
      p = puffs[i];
      a = Math.max(0, 0.55 * (1 - p.t / p.life));
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    scene.drawParticles(ctx);
  }

  GGShell.mount({
    canvas: canvas,
    ctx: ctx,
    resize: function (w, h) {
      W = w;
      H = h;
      tileFaceCache = {};
      scene.resize(w, h);
      if (tiles.length) relayoutTiles();
    },
    start: function () {
      nextRound();
    },
    tap: function (x, y) {
      if (busy) return;
      var tile = hitTile(x, y);
      var first = !announced;
      announced = true;
      if (!tile) {
        if (first) {
          announce(0);
          return;
        }
        if (hitAnimal(x, y)) {
          animalAnim = { mode: "wiggle", t: 0 };
          GGAudio.bounce();
          GGAudio.say("I'm the " + pair.animal + "!");
        }
        return;
      }
      tile.press = 1;
      if (tile.correct) onCorrect(tile);
      else onWrong(tile);
    },
    frame: function (dt, t) {
      time = t;
      update(dt);
      render();
    }
  });
})();
