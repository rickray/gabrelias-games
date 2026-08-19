/* ABC Zoo — learn letters with friendly animals. No score, no fail, big taps. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.76 });

  /* Valid letter map — strictly only letters with corresponding animals */
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

  var currentLetter = "B";
  var currentTargetAnimal = "bunny";
  var lastLetter = "";
  var animalsOnGrass = [];
  var letterCard = { x: 0, y: 0, w: 120, h: 120, scale: 1, rot: 0 };
  var busy = false;
  var asked = false;
  var askTimeout = 0;
  var lastInteraction = 0;
  var dust = [];

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

  function getAnimalsForLetter(letter) {
    return LETTER_ANIMALS[letter] || [];
  }

  function getAllOtherAnimals(excludeLetter) {
    var others = [];
    var letter;
    for (letter in LETTER_ANIMALS) {
      if (letter !== excludeLetter) {
        others = others.concat(LETTER_ANIMALS[letter]);
      }
    }
    return others;
  }

  function promptSpeech() {
    asked = true;
    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    var spoken = currentLetter + " is for " + currentTargetAnimal;
    GGAudio.say(spoken, { rate: 0.86, pitch: 1.2 });
  }

  function layout() {
    var unit = Math.min(W, H);
    var isLandscape = W > H;

    /* Letter card at top center */
    var cardSize = isLandscape ? Math.min(130, unit * 0.22) : Math.min(150, unit * 0.25);
    letterCard.w = cardSize * 1.3;
    letterCard.h = cardSize;
    letterCard.x = W * 0.5;
    letterCard.y = Math.max(cardSize * 0.55 + 16, H * 0.18);

    /* 3 animals spread across lower grass */
    var n = 3;
    var animalSize = isLandscape ? Math.min(95, unit * 0.16) : Math.min(105, unit * 0.17);
    var span = Math.min(W * 0.84, animalSize * 6.8);
    var x0 = (W - span) / 2;
    var y0 = isLandscape ? H * 0.65 : H * 0.67;

    var i, a;
    for (i = 0; i < animalsOnGrass.length; i++) {
      a = animalsOnGrass[i];
      a.x = x0 + (span / (n - 1)) * i;
      a.y = y0 + (i === 1 ? -H * 0.02 : H * 0.015);
      a.size = animalSize;
      a.r = animalSize * 1.35;
      a.breathPhase = i * 1.5;
    }
  }

  function nextRound() {
    var letters = VALID_LETTERS.slice();
    shuffle(letters);
    var letter = letters[0];
    if (letter === lastLetter && letters.length > 1) {
      letter = letters[1];
    }
    lastLetter = letter;
    currentLetter = letter;

    var validOptions = getAnimalsForLetter(letter);
    currentTargetAnimal = pick(validOptions);

    var decoys = getAllOtherAnimals(letter);
    shuffle(decoys);
    var decoy1 = decoys[0];
    var decoy2 = decoys[1];

    var trio = [
      { name: currentTargetAnimal, isTarget: true },
      { name: decoy1, isTarget: false },
      { name: decoy2, isTarget: false }
    ];
    shuffle(trio);

    animalsOnGrass = trio.map(function (item, idx) {
      return {
        name: item.name,
        isTarget: item.isTarget,
        x: 0,
        y: 0,
        size: 80,
        r: 90,
        mode: "idle",
        t: 0,
        sx: 1,
        sy: 1,
        hopY: 0,
        breathPhase: idx * 1.6
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

  function onCorrect(a) {
    busy = true;
    a.mode = "celebrate";
    a.t = 0;
    letterCard.scale = 1.35;
    letterCard.rot = rand(-0.15, 0.15);

    scene.confetti(a.x, a.y);
    scene.sparkle(letterCard.x, letterCard.y);
    GGAudio.sparkle();
    GGAudio.say(a.name, { rate: 0.88, pitch: 1.25 });
  }

  function onWrong(a) {
    a.mode = "wiggle";
    a.t = 0;
    spawnDust(a.x, a.y + a.size * 0.55);
    GGAudio.wiggle();
    GGAudio.say("That's the " + a.name, { rate: 0.86, pitch: 1.15 });
    GGAudio.say(currentLetter + " is for " + currentTargetAnimal, {
      delay: 1400,
      interrupt: false,
      rate: 0.86,
      pitch: 1.2
    });
    asked = true;
  }

  function hitAnimal(x, y) {
    var i, a, dx, dy, best = null, bestD = 1e9, d;
    for (i = 0; i < animalsOnGrass.length; i++) {
      a = animalsOnGrass[i];
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

  function hitLetterCard(x, y) {
    var dx = Math.abs(x - letterCard.x);
    var dy = Math.abs(y - letterCard.y);
    return dx < letterCard.w * 0.6 && dy < letterCard.h * 0.65;
  }

  function updateAnimalPose(a) {
    var t = a.t;
    if (a.mode === "celebrate") {
      /* Happy bounce hop */
      if (t < 0.15) {
        var u = t / 0.15;
        a.sx = 1 + 0.25 * u;
        a.sy = 1 - 0.2 * u;
        a.hopY = 0;
      } else if (t < 0.45) {
        var v = (t - 0.15) / 0.3;
        a.sx = 1.25 - 0.45 * v;
        a.sy = 0.8 + 0.45 * v;
        a.hopY = -Math.sin(v * Math.PI) * a.size * 0.55;
      } else if (t < 0.75) {
        var w = (t - 0.45) / 0.3;
        a.sx = 0.8 + 0.35 * w;
        a.sy = 1.25 - 0.35 * w;
        a.hopY = -Math.sin(w * Math.PI) * a.size * 0.25;
      } else {
        a.sx = 1;
        a.sy = 1;
        a.hopY = 0;
      }
    } else if (a.mode === "wiggle") {
      a.sx = 1 + Math.sin(t * 22) * 0.08;
      a.sy = 1 - Math.sin(t * 22) * 0.06;
      a.hopY = 0;
    } else {
      a.sx = 1;
      a.sy = 1;
      a.hopY = 0;
    }
  }

  function update(dt) {
    var i, a, p;

    /* Stalled hint */
    if (asked && !busy && GGAudio.isUnlocked() && time - lastInteraction > 9) {
      promptSpeech();
      lastInteraction = time;
    }

    /* Animate letter card */
    if (letterCard.scale > 1) {
      letterCard.scale = Math.max(1, letterCard.scale - dt * 1.8);
      letterCard.rot *= Math.max(0, 1 - dt * 3);
    }

    for (i = 0; i < animalsOnGrass.length; i++) {
      a = animalsOnGrass[i];
      a.t += dt;
      if (a.mode === "wiggle" && a.t > 0.5) {
        a.mode = "idle";
        a.t = 0;
      }
      if (a.mode === "celebrate") {
        updateAnimalPose(a);
        if (a.t > 1.5) {
          nextRound();
          return;
        }
      } else {
        updateAnimalPose(a);
      }
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

  function drawLetterCard() {
    var x = letterCard.x;
    var y = letterCard.y;
    var w = letterCard.w;
    var h = letterCard.h;
    var s = letterCard.scale;
    var rad = Math.min(w, h) * 0.42;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(letterCard.rot);
    ctx.scale(s, s);

    /* Soft shadow */
    ctx.fillStyle = "rgba(20, 60, 90, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.46, w * 0.5, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Pill badge background */
    var bg = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#fff4d0");

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5 + rad, -h * 0.5);
    ctx.arcTo(w * 0.5, -h * 0.5, w * 0.5, h * 0.5, rad);
    ctx.arcTo(w * 0.5, h * 0.5, -w * 0.5, h * 0.5, rad);
    ctx.arcTo(-w * 0.5, h * 0.5, -w * 0.5, -h * 0.5, rad);
    ctx.arcTo(-w * 0.5, -h * 0.5, w * 0.5, -h * 0.5, rad);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ff8a1a";
    ctx.lineWidth = 5.5;
    ctx.stroke();

    /* Inner gloss highlight */
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.22, w * 0.38, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Big vibrant letter */
    ctx.fillStyle = "#e04090";
    ctx.font = "900 " + Math.floor(h * 0.68) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    /* Letter shadow & text */
    ctx.fillStyle = "#c02070";
    ctx.fillText(currentLetter, 0, 3);
    ctx.fillStyle = "#ff4da0";
    ctx.fillText(currentLetter, 0, 0);

    ctx.restore();
  }

  function drawAnimalShadow(a, breath) {
    var footY = a.y + a.size * 0.65 + a.hopY * 0.2;
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
    drawLetterCard();

    var i, a, p, breath, tAnim, scaleMul, drawY;

    for (i = 0; i < animalsOnGrass.length; i++) {
      a = animalsOnGrass[i];
      breath = a.mode === "celebrate" ? 1 : 1 + Math.sin(time * 2.2 + a.breathPhase) * 0.035;

      drawAnimalShadow(a, breath);

      tAnim = time * 0.18 + i;
      if (a.mode === "wiggle") tAnim = a.t * 5.5;
      if (a.mode === "celebrate") tAnim = a.t * 3.8;

      scaleMul = (a.size / 40) * (a.mode === "celebrate" ? 1.12 : breath);
      drawY = a.y + a.hopY;

      ctx.save();
      ctx.translate(a.x, drawY);
      ctx.scale(a.sx, a.sy);
      if (a.mode === "wiggle") {
        ctx.rotate(Math.sin(a.t * 26) * 0.14);
      }
      GGAnimals.draw(ctx, a.name, 0, 0, scaleMul, tAnim);
      ctx.restore();
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

      if (hitLetterCard(x, y)) {
        GGAudio.bounce();
        promptSpeech();
        letterCard.scale = 1.15;
        return;
      }

      var a = hitAnimal(x, y);
      if (!a) {
        promptSpeech();
        return;
      }

      if (a.isTarget) {
        onCorrect(a);
      } else {
        onWrong(a);
      }
    },
    frame: function (dt, t) {
      time = t;
      scene.update(dt);
      update(dt);
      render();
    }
  });
})();
