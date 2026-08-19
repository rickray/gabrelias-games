/* Letter Pop — pop floating letter bubbles, find the target letter, meet animals. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.78 });

  var LETTER_ANIMALS = {
    B: ["bunny", "bee", "butterfly"],
    C: ["cat"],
    D: ["duck"],
    E: ["elephant"],
    F: ["frog", "fish"],
    G: ["giraffe"],
    L: ["lion"],
    M: ["monkey"],
    O: ["owl"],
    P: ["panda", "penguin", "pig"],
    T: ["turtle"]
  };

  var VALID_LETTERS = ["B", "C", "D", "E", "F", "G", "L", "M", "O", "P", "T"];

  var bubbles = [];
  var animals = [];
  var bursts = [];
  var rings = [];

  var targetLetter = "M";
  var lastTargetLetter = "";
  var asked = false;
  var busy = false;
  var askTimeout = 0;
  var lastInteraction = 0;

  var BUBBLE_COLORS = [
    { body: "rgba(255,77,154,0.24)", rim: "#ff8ac4", band: "rgba(255,120,200,0.32)", text: "#c01070" },
    { body: "rgba(255,138,26,0.24)", rim: "#ffc36a", band: "rgba(255,180,80,0.32)", text: "#c45000" },
    { body: "rgba(255,225,74,0.24)", rim: "#fff3a0", band: "rgba(255,230,120,0.32)", text: "#a07000" },
    { body: "rgba(77,224,106,0.24)", rim: "#9af0aa", band: "rgba(120,230,150,0.32)", text: "#1a8a28" },
    { body: "rgba(46,197,255,0.24)", rim: "#8ae0ff", band: "rgba(100,210,255,0.32)", text: "#0070b8" },
    { body: "rgba(122,92,255,0.24)", rim: "#b8a6ff", band: "rgba(160,140,255,0.32)", text: "#5020c0" },
    { body: "rgba(255,90,90,0.24)", rim: "#ff9a9a", band: "rgba(255,140,140,0.32)", text: "#b81010" },
    { body: "rgba(0,212,200,0.24)", rim: "#7af0ea", band: "rgba(80,230,220,0.32)", text: "#007870" }
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

  function targetBubbleCount() {
    var shortSide = Math.min(W, H);
    if (shortSide < 500) return 5;
    if (W > H) return 7;
    return 6;
  }

  function bubbleRadius() {
    var shortSide = Math.min(W, H);
    return Math.max(54, Math.min(105, shortSide * 0.11));
  }

  function farEnough(x, y, r, ignore) {
    var i, b, dx, dy, min;
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      if (b === ignore || b.dying) continue;
      dx = b.x - x;
      dy = b.y - y;
      min = (b.r + r) * 0.78;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  function createBubble(letter, existing) {
    var r = bubbleRadius() * rand(0.92, 1.08);
    var x, y, tries = 0;
    var margin = r + 16;
    do {
      x = rand(margin, W - margin);
      y = rand(margin + 20, H * 0.72);
      tries++;
    } while (!farEnough(x, y, r, null) && tries < 45);

    var color = pick(BUBBLE_COLORS);
    return {
      letter: letter,
      x: x,
      y: y,
      r: r,
      vx: rand(-16, 16),
      vy: rand(-14, 14),
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(1.1, 2.0),
      phase: rand(0, Math.PI * 2),
      color: color,
      born: time,
      scale: existing ? 1 : 0,
      dying: false,
      dieT: 0,
      wobbleOffset: 0,
      wobbleTime: 0
    };
  }

  function promptSpeech() {
    asked = true;
    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    GGAudio.say("Find the " + targetLetter, { rate: 0.86, pitch: 1.2 });
  }

  function pickNewTarget() {
    /* Pick a target that is currently present in active bubbles if possible */
    var activeLetters = bubbles
      .filter(function (b) { return !b.dying; })
      .map(function (b) { return b.letter; });

    if (activeLetters.length) {
      shuffle(activeLetters);
      targetLetter = activeLetters[0];
    } else {
      var all = VALID_LETTERS.slice();
      shuffle(all);
      targetLetter = all[0];
    }

    if (targetLetter === lastTargetLetter && activeLetters.length > 1) {
      targetLetter = activeLetters[1] || targetLetter;
    }
    lastTargetLetter = targetLetter;

    /* Ensure at least one bubble has targetLetter */
    var hasTarget = bubbles.some(function (b) { return !b.dying && b.letter === targetLetter; });
    if (!hasTarget && bubbles.length) {
      bubbles[0].letter = targetLetter;
    }

    asked = false;
    busy = false;
    lastInteraction = time;

    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    if (GGAudio.isUnlocked()) {
      askTimeout = setTimeout(function () {
        askTimeout = 0;
        if (!busy) promptSpeech();
      }, 600);
    }
  }

  function spawnInitialBubbles() {
    bubbles = [];
    var count = targetBubbleCount();
    var letters = VALID_LETTERS.slice();
    shuffle(letters);

    var i, letVal;
    for (i = 0; i < count; i++) {
      letVal = letters[i % letters.length];
      bubbles.push(createBubble(letVal, true));
    }
    pickNewTarget();
  }

  function replenishBubbles() {
    var alive = bubbles.filter(function (b) { return !b.dying; });
    var want = targetBubbleCount();
    if (alive.length < want) {
      /* Pick a letter from valid letters, favoring targetLetter if missing */
      var hasTarget = alive.some(function (b) { return b.letter === targetLetter; });
      var newLetter;
      if (!hasTarget) {
        newLetter = targetLetter;
      } else {
        var used = alive.map(function (b) { return b.letter; });
        var candidates = VALID_LETTERS.filter(function (l) { return used.indexOf(l) === -1; });
        newLetter = candidates.length ? pick(candidates) : pick(VALID_LETTERS);
      }
      bubbles.push(createBubble(newLetter, false));
    }
  }

  function spawnAnimal(x, y, letter) {
    var matching = LETTER_ANIMALS[letter] || ["panda"];
    var animalName = pick(matching);
    animals.push({
      name: animalName,
      letter: letter,
      x: x,
      y: y,
      vx: rand(-15, 15),
      vy: rand(-38, -16),
      t: 0,
      life: 2.2,
      scale: 0,
      sx: 1,
      sy: 1
    });

    var line = letter + " is for " + animalName;
    GGAudio.say(line, { rate: 0.86, pitch: 1.2 });
  }

  function spawnBurst(x, y, color) {
    var i, n = 14;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      var sp = rand(90, 260);
      bursts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 35,
        r: rand(3, 7),
        color: i % 2 ? color.rim : "#ffffff",
        life: rand(0.4, 0.7),
        t: 0
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
    scene.confetti(b.x, b.y);

    spawnAnimal(b.x, b.y, b.letter);

    busy = true;
    setTimeout(function () {
      pickNewTarget();
    }, 1800);
  }

  function onWrongBubble(b) {
    b.wobbleTime = 0.5;
    GGAudio.wiggle();
    GGAudio.say("That's " + b.letter, { rate: 0.86, pitch: 1.15 });
    GGAudio.say("Find the " + targetLetter, {
      delay: 1300,
      interrupt: false,
      rate: 0.86,
      pitch: 1.2
    });
    asked = true;
  }

  function hitTest(x, y) {
    var i, b, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      if (b.dying) continue;
      dx = x - b.x;
      dy = y - b.y;
      d = dx * dx + dy * dy;
      if (d < (b.r * 1.15) * (b.r * 1.15) && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  function drawLetterBubble(b, t) {
    var appear = Math.min(1, (t - b.born) * 3);
    var s = b.dying ? Math.max(0, 1 - b.dieT * 4) : (b.scale || appear);
    if (s <= 0.01) return;

    var rPulse = 1 + Math.sin(t * b.wobbleSpeed * 1.4 + b.phase) * 0.035;
    var wob = Math.sin(t * b.wobbleSpeed + b.wobble) * 0.045;
    var r = b.r * s * rPulse;
    var c = b.color;

    var offX = 0;
    if (b.wobbleTime > 0) {
      offX = Math.sin(b.wobbleTime * 28) * 10;
    }

    ctx.save();
    ctx.translate(b.x + offX, b.y);
    ctx.scale(1 + wob, 1 - wob);

    /* Bubble glass fill */
    var g = ctx.createRadialGradient(-r * 0.28, -r * 0.32, r * 0.05, 0, 0, r);
    g.addColorStop(0, "rgba(255,255,255,0.65)");
    g.addColorStop(0.28, c.body);
    g.addColorStop(0.82, c.body);
    g.addColorStop(1, "rgba(255,255,255,0.12)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    /* Lower refraction color band */
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.clip();
    var band = ctx.createLinearGradient(-r * 0.6, r * 0.15, r * 0.6, r * 0.75);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.35, c.band);
    band.addColorStop(0.55, "rgba(180,255,255,0.22)");
    band.addColorStop(0.75, c.band);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(-r, r * 0.05, r * 2, r * 0.7);
    ctx.restore();

    /* Rim outline */
    ctx.lineWidth = Math.max(2.5, r * 0.05);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(2, r * 0.055);
    ctx.strokeStyle = c.rim;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* Highlight specular */
    var hg = ctx.createRadialGradient(-r * 0.32, -r * 0.38, 0, -r * 0.32, -r * 0.38, r * 0.42);
    hg.addColorStop(0, "rgba(255,255,255,0.95)");
    hg.addColorStop(0.4, "rgba(255,255,255,0.45)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.36, r * 0.34, r * 0.22, -0.55, 0, Math.PI * 2);
    ctx.fill();

    /* Big crisp letter inside bubble */
    ctx.font = "900 " + Math.floor(r * 0.95) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    /* Letter drop shadow */
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(b.letter, 0, 3);
    ctx.fillStyle = c.text;
    ctx.fillText(b.letter, 0, 0);

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
    var t = a.t;
    if (t < 0.18) {
      var u = t / 0.18;
      a.scale = u * 1.25;
      a.sx = 0.72 + 0.2 * u;
      a.sy = 1.35 - 0.1 * u;
    } else if (t < 0.34) {
      var v = (t - 0.18) / 0.16;
      a.scale = 1.25 - v * 0.15;
      a.sx = 0.92 + v * 0.28;
      a.sy = 1.25 - v * 0.35;
    } else if (t < 0.5) {
      var w = (t - 0.34) / 0.16;
      a.scale = 1.1 - w * 0.1;
      a.sx = 1.2 - w * 0.2;
      a.sy = 0.9 + w * 0.1;
    } else {
      a.scale = 1;
      a.sx = 1;
      a.sy = 1;
    }
  }

  function update(dt, t) {
    var i, b, a, p, ring;

    if (asked && !busy && GGAudio.isUnlocked() && time - lastInteraction > 9) {
      promptSpeech();
      lastInteraction = time;
    }

    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      if (b.wobbleTime > 0) {
        b.wobbleTime -= dt;
      }
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
      if (b.y < b.r + 10) { b.y = b.r + 10; b.vy = Math.abs(b.vy); }
      if (b.y > H * 0.75) { b.y = H * 0.75; b.vy = -Math.abs(b.vy); }

      if (b.scale < 1) b.scale = Math.min(1, b.scale + dt * 2.4);
    }

    replenishBubbles();

    for (i = animals.length - 1; i >= 0; i--) {
      a = animals[i];
      a.t += dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      updateAnimalSquash(a);
      if (a.t > a.life * 0.55) {
        a.vy -= 28 * dt;
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
    for (i = 0; i < bubbles.length; i++) drawLetterBubble(bubbles[i], t);

    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      fade = a.t > a.life * 0.7 ? 1 - (a.t - a.life * 0.7) / (a.life * 0.3) : 1;
      ctx.globalAlpha = Math.max(0, fade);
      size = Math.min(W, H) * 0.12 * a.scale;
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
      var i, b;
      for (i = 0; i < bubbles.length; i++) {
        b = bubbles[i];
        b.x = Math.max(b.r, Math.min(W - b.r, b.x));
        b.y = Math.max(b.r + 10, Math.min(H * 0.75, b.y));
      }
    },
    start: function () {
      spawnInitialBubbles();
    },
    tap: function (x, y) {
      lastInteraction = time;
      if (busy) return;

      var b = hitTest(x, y);
      if (!b) {
        promptSpeech();
        return;
      }

      if (b.letter === targetLetter) {
        popBubble(b);
      } else {
        onWrongBubble(b);
      }
    },
    frame: function (dt, t) {
      time = t;
      scene.update(dt);
      update(dt, t);
      render(t);
    }
  });
})();
