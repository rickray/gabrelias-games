/* Zoo Count — count 1 to 5 friendly animals on the grass. No fail, speech everywhere. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.72 });

  var currentAnimal = "lion";
  var currentCount = 3;
  var lastCount = 0;
  var lastAnimal = "";

  var animals = [];
  var numberTiles = [];
  var busy = false;
  var asked = false;
  var askTimeout = 0;
  var lastInteraction = 0;
  var dust = [];

  var NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five"];

  var TILE_PALETTES = [
    { bgTop: "#ffe259", bgBot: "#ffa751", border: "#ff7e00", text: "#8a3a00", shadow: "rgba(180,80,0,0.22)" },
    { bgTop: "#ff9a9e", bgBot: "#fecfef", border: "#f35588", text: "#9e104e", shadow: "rgba(180,40,90,0.22)" },
    { bgTop: "#a1c4fd", bgBot: "#c2e9fb", border: "#4a90e2", text: "#1a4f8b", shadow: "rgba(20,70,140,0.22)" },
    { bgTop: "#84fab0", bgBot: "#8fd3f4", border: "#2ebd85", text: "#0d6b47", shadow: "rgba(20,130,80,0.22)" },
    { bgTop: "#fbc2eb", bgBot: "#a6c1ee", border: "#9b51e0", text: "#561a8b", shadow: "rgba(100,30,140,0.22)" }
  ];

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

  function pluralizeAnimal(name, count) {
    if (count === 1) return name;
    if (name === "butterfly") return "butterflies";
    if (name === "fish") return "fish";
    return name + "s";
  }

  function promptSpeech() {
    asked = true;
    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    var question = "How many " + pluralizeAnimal(currentAnimal, currentCount) + "?";
    GGAudio.say(question, { rate: 0.86, pitch: 1.2 });
  }

  function layout() {
    var unit = Math.min(W, H);
    var isLandscape = W > H;

    /* Lay out number tiles across the bottom */
    var nTiles = numberTiles.length;
    var tileSize = isLandscape ? Math.min(105, unit * 0.22) : Math.min(115, unit * 0.25);
    var tileSpan = Math.min(W * 0.86, tileSize * 4.2);
    var tileX0 = (W - tileSpan) / 2;
    var tileY = H * (isLandscape ? 0.85 : 0.86);

    var i, tile;
    for (i = 0; i < nTiles; i++) {
      tile = numberTiles[i];
      tile.x = nTiles === 1 ? W / 2 : tileX0 + (tileSpan / (nTiles - 1)) * i;
      tile.y = tileY;
      tile.w = tileSize;
      tile.h = tileSize;
      tile.r = tileSize * 0.6;
    }

    /* Lay out animals in lively grass pasture */
    var count = animals.length;
    var aSize = isLandscape ? Math.min(85, unit * 0.17) : Math.min(95, unit * 0.18);
    var grassY = H * (isLandscape ? 0.52 : 0.48);

    /* Formations based on count (1 to 5) */
    var positions = [];
    if (count === 1) {
      positions = [{ x: W * 0.5, y: grassY + H * 0.04 }];
    } else if (count === 2) {
      positions = [
        { x: W * 0.35, y: grassY + H * 0.03 },
        { x: W * 0.65, y: grassY + H * 0.05 }
      ];
    } else if (count === 3) {
      positions = [
        { x: W * 0.26, y: grassY + H * 0.06 },
        { x: W * 0.5, y: grassY - H * 0.03 },
        { x: W * 0.74, y: grassY + H * 0.05 }
      ];
    } else if (count === 4) {
      positions = [
        { x: W * 0.24, y: grassY - H * 0.02 },
        { x: W * 0.44, y: grassY + H * 0.07 },
        { x: W * 0.58, y: grassY - H * 0.04 },
        { x: W * 0.78, y: grassY + H * 0.06 }
      ];
    } else if (count === 5) {
      positions = [
        { x: W * 0.2, y: grassY + H * 0.06 },
        { x: W * 0.36, y: grassY - H * 0.04 },
        { x: W * 0.52, y: grassY + H * 0.08 },
        { x: W * 0.68, y: grassY - H * 0.02 },
        { x: W * 0.82, y: grassY + H * 0.07 }
      ];
    }

    for (i = 0; i < count; i++) {
      animals[i].x = positions[i].x;
      animals[i].y = positions[i].y;
      animals[i].size = aSize;
      animals[i].r = aSize * 1.35;
    }
  }

  function pickOptions(correct) {
    /* 3 numbers total: correct + 2 nearby in 1..5 */
    var candidates = [1, 2, 3, 4, 5].filter(function (n) { return n !== correct; });
    shuffle(candidates);
    var trio = [correct, candidates[0], candidates[1]];
    trio.sort(function (a, b) { return a - b; });
    return trio;
  }

  function nextRound() {
    var names = GGAnimals.names.slice();
    shuffle(names);
    var animal = names[0];
    if (animal === lastAnimal && names.length > 1) animal = names[1];
    lastAnimal = animal;
    currentAnimal = animal;

    var count = 1 + ((Math.random() * 5) | 0);
    if (count === lastCount) {
      count = (count % 5) + 1;
    }
    lastCount = count;
    currentCount = count;

    animals = [];
    var i;
    for (i = 0; i < count; i++) {
      animals.push({
        name: animal,
        x: 0,
        y: 0,
        size: 70,
        r: 70,
        mode: "idle",
        t: 0,
        hopY: 0,
        sx: 1,
        sy: 1,
        breathPhase: i * 1.4 + rand(0, 0.5)
      });
    }

    var options = pickOptions(count);
    numberTiles = options.map(function (num, idx) {
      var pal = TILE_PALETTES[(num - 1) % TILE_PALETTES.length];
      return {
        num: num,
        isCorrect: num === count,
        x: 0,
        y: 0,
        w: 90,
        h: 90,
        r: 60,
        palette: pal,
        scale: 1,
        rot: 0,
        mode: "idle",
        t: 0
      };
    });

    layout();
    busy = false;
    asked = false;
    lastInteraction = time;

    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    if (GGAudio.isUnlocked()) {
      askTimeout = setTimeout(function () {
        askTimeout = 0;
        if (!busy) promptSpeech();
      }, 700);
    }
  }

  function spawnDust(x, y) {
    var i;
    for (i = 0; i < 8; i++) {
      dust.push({
        x: x + rand(-12, 12),
        y: y + rand(2, 14),
        vx: rand(-35, 35),
        vy: rand(-45, -8),
        r: rand(3, 8),
        life: rand(0.3, 0.55),
        t: 0,
        color: "rgba(220,195,140,0.5)"
      });
    }
  }

  function onCorrectTile(tile) {
    busy = true;
    tile.mode = "celebrate";
    tile.t = 0;

    var i, a;
    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      a.mode = "celebrate";
      a.t = -i * 0.08; // wave bounce
    }

    scene.confetti(tile.x, tile.y);
    for (i = 0; i < animals.length; i++) {
      scene.sparkle(animals[i].x, animals[i].y);
    }
    GGAudio.sparkle();
    GGAudio.say(NUMBER_WORDS[tile.num] + "!", { rate: 0.88, pitch: 1.25 });
  }

  function onWrongTile(tile) {
    tile.mode = "wiggle";
    tile.t = 0;
    spawnDust(tile.x, tile.y + tile.h * 0.45);
    GGAudio.wiggle();
    GGAudio.say("That's " + tile.num, { rate: 0.86, pitch: 1.15 });
    GGAudio.say("How many " + pluralizeAnimal(currentAnimal, currentCount) + "?", {
      delay: 1300,
      interrupt: false,
      rate: 0.86,
      pitch: 1.2
    });
    asked = true;
  }

  function hitTile(x, y) {
    var i, t, dx, dy;
    for (i = 0; i < numberTiles.length; i++) {
      t = numberTiles[i];
      dx = Math.abs(x - t.x);
      dy = Math.abs(y - t.y);
      if (dx < t.w * 0.55 && dy < t.h * 0.55) {
        return t;
      }
    }
    return null;
  }

  function hitAnimal(x, y) {
    var i, a, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < animals.length; i++) {
      a = animals[i];
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

  function updateAnimalPose(a) {
    var t = a.t;
    if (a.mode === "tap-hop") {
      if (t < 0.1) {
        a.sx = 1 + 0.2 * (t / 0.1);
        a.sy = 1 - 0.15 * (t / 0.1);
        a.hopY = 0;
      } else if (t < 0.35) {
        var u = (t - 0.1) / 0.25;
        a.sx = 1.2 - 0.35 * u;
        a.sy = 0.85 + 0.35 * u;
        a.hopY = -Math.sin(u * Math.PI) * a.size * 0.45;
      } else {
        a.sx = 1;
        a.sy = 1;
        a.hopY = 0;
      }
    } else if (a.mode === "celebrate") {
      if (t > 0) {
        var cycle = t % 0.6;
        var p = cycle / 0.6;
        a.hopY = -Math.sin(p * Math.PI) * a.size * 0.45;
        a.sx = 1 + Math.sin(p * Math.PI * 2) * 0.12;
        a.sy = 1 - Math.sin(p * Math.PI * 2) * 0.12;
      }
    } else {
      a.sx = 1;
      a.sy = 1;
      a.hopY = 0;
    }
  }

  function update(dt) {
    var i, a, t, p;

    if (asked && !busy && GGAudio.isUnlocked() && time - lastInteraction > 9) {
      promptSpeech();
      lastInteraction = time;
    }

    for (i = 0; i < numberTiles.length; i++) {
      t = numberTiles[i];
      t.t += dt;
      if (t.mode === "wiggle") {
        t.rot = Math.sin(t.t * 26) * 0.15;
        t.scale = 1 + Math.sin(t.t * 20) * 0.06;
        if (t.t > 0.45) {
          t.mode = "idle";
          t.rot = 0;
          t.scale = 1;
        }
      } else if (t.mode === "celebrate") {
        t.scale = 1.25 + Math.sin(t.t * 8) * 0.08;
        t.rot = Math.sin(t.t * 4) * 0.08;
        if (t.t > 1.6) {
          nextRound();
          return;
        }
      } else {
        t.scale = 1;
        t.rot = 0;
      }
    }

    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      a.t += dt;
      if (a.mode === "tap-hop" && a.t > 0.4) {
        a.mode = "idle";
        a.t = 0;
      }
      updateAnimalPose(a);
    }

    for (i = dust.length - 1; i >= 0; i--) {
      p = dust[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.vx *= 0.95;
      if (p.t > p.life) dust.splice(i, 1);
    }
  }

  function drawNumberTile(t) {
    var w = t.w;
    var h = t.h;
    var pal = t.palette;
    var corner = w * 0.28;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rot);
    ctx.scale(t.scale, t.scale);

    /* Shadow underneath */
    ctx.fillStyle = pal.shadow;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.48, w * 0.52, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Tile body with rounded rect */
    var g = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    g.addColorStop(0, pal.bgTop);
    g.addColorStop(1, pal.bgBot);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5 + corner, -h * 0.5);
    ctx.arcTo(w * 0.5, -h * 0.5, w * 0.5, h * 0.5, corner);
    ctx.arcTo(w * 0.5, h * 0.5, -w * 0.5, h * 0.5, corner);
    ctx.arcTo(-w * 0.5, h * 0.5, -w * 0.5, -h * 0.5, corner);
    ctx.arcTo(-w * 0.5, -h * 0.5, w * 0.5, -h * 0.5, corner);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    /* Specular highlight arc */
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.22, w * 0.35, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Big numeral */
    ctx.fillStyle = pal.text;
    ctx.font = "900 " + Math.floor(h * 0.62) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillText(t.num, 0, 3);
    ctx.fillStyle = pal.text;
    ctx.fillText(t.num, 0, 0);

    ctx.restore();
  }

  function drawAnimalShadow(a, breath) {
    var footY = a.y + a.size * 0.62 + a.hopY * 0.2;
    var sw = a.size * (0.95 + (1 - breath) * 0.08);
    var sh = a.size * 0.24 * (0.9 + (1 - breath) * 0.12);

    ctx.save();
    ctx.translate(a.x, footY);
    var g = ctx.createRadialGradient(0, 0, 2, 0, 0, sw * 0.9);
    g.addColorStop(0, "rgba(40,70,20,0.32)");
    g.addColorStop(0.55, "rgba(40,70,20,0.14)");
    g.addColorStop(1, "rgba(40,70,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, sw * 0.9, sh * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    scene.draw(ctx);

    var i, a, t, p, breath, tAnim, scaleMul, drawY;

    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      breath = a.mode === "celebrate" ? 1 : 1 + Math.sin(time * 2.2 + a.breathPhase) * 0.035;

      drawAnimalShadow(a, breath);

      tAnim = time * 0.18 + i;
      if (a.mode === "tap-hop") tAnim = a.t * 4;
      if (a.mode === "celebrate") tAnim = a.t * 4;

      scaleMul = (a.size / 40) * (a.mode === "celebrate" ? 1.08 : breath);
      drawY = a.y + a.hopY;

      ctx.save();
      ctx.translate(a.x, drawY);
      ctx.scale(a.sx, a.sy);
      GGAnimals.draw(ctx, a.name, 0, 0, scaleMul, tAnim);
      ctx.restore();
    }

    for (i = 0; i < numberTiles.length; i++) {
      drawNumberTile(numberTiles[i]);
    }

    for (i = 0; i < dust.length; i++) {
      p = dust[i];
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * (1 + p.t * 1.2), p.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
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
      layout();
    },
    start: function () {
      nextRound();
    },
    tap: function (x, y) {
      lastInteraction = time;
      if (busy) return;

      var tile = hitTile(x, y);
      if (tile) {
        if (tile.isCorrect) onCorrectTile(tile);
        else onWrongTile(tile);
        return;
      }

      var a = hitAnimal(x, y);
      if (a) {
        a.mode = "tap-hop";
        a.t = 0;
        GGAudio.bounce();
        GGAudio.say(formatAnimalName(a.name), { rate: 0.9, pitch: 1.2 });
        return;
      }

      promptSpeech();
    },
    frame: function (dt, t) {
      time = t;
      scene.update(dt);
      update(dt);
      render();
    }
  });

  function formatAnimalName(name) {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
})();
