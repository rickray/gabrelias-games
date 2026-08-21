/* Which Box — memory game for little kids.
   Watch animals hop into boxes, then tap the box that holds the asked animal.
   Huge celebration on correct answer! No score, no fail, big taps. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.76 });

  /* Box color themes: high-contrast, vibrant, festive */
  var BOX_THEMES = [
    {
      name: "ruby",
      boxGrad: ["#ff4070", "#d61848", "#a80c34"],
      lidGrad: ["#ff5985", "#e62558"],
      boxDark: "#8f082a",
      ribbonGrad: ["#ffe74a", "#ffc81a"],
      ribbonDark: "#c49008",
      innerBg: "#60061e"
    },
    {
      name: "azure",
      boxGrad: ["#2699fb", "#0a75d8", "#0754a0"],
      lidGrad: ["#40abff", "#1885ea"],
      boxDark: "#043c74",
      ribbonGrad: ["#76f94a", "#4cdb22"],
      ribbonDark: "#2ea00f",
      innerBg: "#032850"
    },
    {
      name: "purple",
      boxGrad: ["#b042ff", "#881ce6", "#620db3"],
      lidGrad: ["#c15fff", "#992df4"],
      boxDark: "#4a068a",
      ribbonGrad: ["#ffb340", "#ff8c1a"],
      ribbonDark: "#c45805",
      innerBg: "#340360"
    }
  ];

  /* Game state machine:
     "start"     - waiting for initial tap if audio locked
     "watch"     - animals hopping into boxes one by one
     "ask"       - target chosen, speech prompts
     "guess"     - player can tap a box
     "celebrate" - HUGE celebratory explosion on correct tap
  */
  var gameState = "start";
  var stateTimer = 0;

  /* Current round animals and boxes */
  var roundAnimals = [];
  var targetAnimal = "";
  var targetIndex = -1;
  var lastTarget = "";
  var lastAnimals = [];

  var boxes = [];

  /* Target prompt badge at top */
  var targetCard = {
    x: 0,
    y: 0,
    w: 140,
    h: 110,
    scale: 1,
    rot: 0,
    show: false,
    alpha: 0
  };

  /* Watch phase animation state */
  var watchAnimalIndex = 0;
  var watchStepTime = 0;
  var watchHopAnimal = null;

  /* Celebration state */
  var celebrateTime = 0;
  var celebrateAnimal = null;
  var celebrateSideAnimals = [];
  var celebrateAuraAngle = 0;
  var celebrateShockwaves = [];
  var celebrateBalloons = [];
  var celebrateSparkles = [];
  var celebrateCannonTimer = 0;

  /* General dust and particles */
  var dust = [];
  var lastInteraction = 0;

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

  function pick3DistinctAnimals() {
    var pool = GGAnimals.names.slice();
    shuffle(pool);
    var trio = pool.slice(0, 3);
    /* Avoid exact same 3 animals as previous round if possible */
    if (lastAnimals.length === 3 && pool.length >= 6) {
      var sameCount = 0;
      var k;
      for (k = 0; k < 3; k++) {
        if (lastAnimals.indexOf(trio[k]) !== -1) sameCount++;
      }
      if (sameCount === 3) {
        trio = pool.slice(3, 6);
      }
    }
    lastAnimals = trio.slice();
    return trio;
  }

  function layout() {
    var isLandscape = W > H;
    var unit = Math.min(W, H);

    /* Target badge at top center */
    var cardW = isLandscape ? Math.min(220, unit * 0.36) : Math.min(240, unit * 0.44);
    var cardH = isLandscape ? Math.min(100, unit * 0.18) : Math.min(120, unit * 0.2);
    targetCard.w = cardW;
    targetCard.h = cardH;
    targetCard.x = W * 0.5;
    targetCard.y = Math.max(cardH * 0.55 + 16, H * 0.17);

    /* 3 Boxes spread across grass */
    var boxSize = isLandscape ? Math.min(170, unit * 0.26) : Math.min(155, unit * 0.28);
    var span = Math.min(W * 0.86, boxSize * 4.4);
    var x0 = (W - span) / 2;
    var y0 = isLandscape ? H * 0.68 : H * 0.69;

    var i, b;
    for (i = 0; i < boxes.length; i++) {
      b = boxes[i];
      b.w = boxSize;
      b.h = boxSize * 0.92;
      b.x = x0 + (span / 2) * i;
      b.y = y0;
      b.r = boxSize * 0.85; /* generous touch target radius */
    }
  }

  function initBoxes() {
    boxes = [0, 1, 2].map(function (idx) {
      return {
        index: idx,
        x: 0,
        y: 0,
        w: 140,
        h: 130,
        r: 100,
        theme: BOX_THEMES[idx % BOX_THEMES.length],
        animal: "",
        lidLift: 0,
        lidAngle: 0,
        lidOpenTarget: 0,
        lidOpenCurrent: 0,
        peekT: 0,
        wiggleT: 0,
        bounceT: 0,
        sx: 1,
        sy: 1,
        hopY: 0,
        flyLid: null
      };
    });
  }

  initBoxes();

  function startWatchPhase() {
    gameState = "watch";
    stateTimer = 0;
    watchAnimalIndex = 0;
    watchStepTime = 0;

    targetCard.show = false;
    targetCard.alpha = 0;

    roundAnimals = pick3DistinctAnimals();
    var i;
    for (i = 0; i < 3; i++) {
      boxes[i].animal = roundAnimals[i];
      boxes[i].lidOpenTarget = 0;
      boxes[i].lidOpenCurrent = 0;
      boxes[i].lidLift = 0;
      boxes[i].lidAngle = 0;
      boxes[i].wiggleT = 0;
      boxes[i].peekT = 0;
      boxes[i].sx = 1;
      boxes[i].sy = 1;
      boxes[i].flyLid = null;
    }

    setupCurrentWatchAnimal();
  }

  function setupCurrentWatchAnimal() {
    if (watchAnimalIndex >= 3) {
      /* Finished watching all 3 */
      finishWatchPhase();
      return;
    }

    var b = boxes[watchAnimalIndex];
    var animalName = b.animal;

    watchStepTime = 0;
    b.lidOpenTarget = 1; /* open lid for incoming animal */

    /* Animal starts above the box and hops in */
    watchHopAnimal = {
      name: animalName,
      boxIndex: watchAnimalIndex,
      x: b.x,
      startY: b.y - b.h * 1.5,
      targetY: b.y - b.h * 0.15,
      y: b.y - b.h * 1.5,
      scale: (b.w * 0.55) / 40,
      alpha: 1,
      phase: "hop_in",
      duration: 1.45
    };

    /* Speak animal name as it prepares to hop into its box */
    if (GGAudio.isUnlocked()) {
      GGAudio.say(animalName, { rate: 0.85, pitch: 1.2 });
    }
  }

  function finishWatchPhase() {
    watchHopAnimal = null;
    gameState = "ask";
    stateTimer = 0;

    /* Choose target from round animals */
    var options = [0, 1, 2];
    shuffle(options);
    targetIndex = options[0];
    if (boxes[targetIndex].animal === lastTarget && roundAnimals.length > 1) {
      targetIndex = options[1];
    }
    targetAnimal = boxes[targetIndex].animal;
    lastTarget = targetAnimal;

    /* Reveal target card at top */
    targetCard.show = true;
    targetCard.scale = 1.4;
    targetCard.alpha = 1;

    scene.sparkle(targetCard.x, targetCard.y);
    GGAudio.pop();

    promptAskSpeech();
    gameState = "guess";
    lastInteraction = time;
  }

  function promptAskSpeech() {
    if (GGAudio.isUnlocked()) {
      GGAudio.say("Where's the " + targetAnimal + "?", { rate: 0.88, pitch: 1.2 });
    }
  }

  function spawnDust(x, y, color) {
    var i;
    for (i = 0; i < 8; i++) {
      dust.push({
        x: x + rand(-16, 16),
        y: y + rand(2, 12),
        vx: rand(-40, 40),
        vy: rand(-45, -10),
        r: rand(4, 8),
        life: rand(0.35, 0.55),
        t: 0,
        color: color || "rgba(215, 190, 135, 0.6)"
      });
    }
  }

  function onWrongBox(b) {
    b.wiggleT = 0.55;
    b.peekT = 0.75;
    spawnDust(b.x, b.y + b.h * 0.5);
    GGAudio.wiggle();

    /* Speak "That's the [peeked animal]" then repeat question */
    GGAudio.say("That's the " + b.animal, { rate: 0.86, pitch: 1.15 });
    GGAudio.say("Where's the " + targetAnimal + "?", {
      delay: 1500,
      interrupt: false,
      rate: 0.88,
      pitch: 1.2
    });
  }

  function onCorrectBox(b) {
    gameState = "celebrate";
    celebrateTime = 0;
    celebrateCannonTimer = 0;
    celebrateShockwaves = [];
    celebrateBalloons = [];
    celebrateSparkles = [];

    /* Big sounds & praise */
    GGAudio.cheer();
    GGAudio.sparkle();
    GGAudio.say("You found the " + targetAnimal + "!", {
      rate: 0.88,
      pitch: 1.25
    });

    /* Pop all lids with festive spin */
    var i, bx;
    for (i = 0; i < boxes.length; i++) {
      bx = boxes[i];
      bx.flyLid = {
        x: bx.x,
        y: bx.y - bx.h * 0.48,
        vx: (i - 1) * 90 + rand(-30, 30),
        vy: rand(-380, -260),
        rot: 0,
        vrot: rand(-6, 6),
        w: bx.w * 1.08,
        h: bx.h * 0.28,
        theme: bx.theme
      };
      scene.confetti(bx.x, bx.y - bx.h * 0.3);
    }

    /* Central ENORMOUS Superstar Animal */
    celebrateAnimal = {
      name: targetAnimal,
      x: b.x,
      y: b.y - b.h * 0.2,
      targetX: W * 0.5,
      targetY: H * 0.46,
      scale: (b.w * 0.55) / 40,
      targetScale: (Math.min(W, H) * 0.54) / 40, /* Takes over 60% of screen height */
      rot: 0,
      bounceT: 0
    };

    /* Pick 2 to 4 extra cheering animals for side celebrations */
    var extraPool = GGAnimals.names.filter(function (n) {
      return n !== targetAnimal;
    });
    shuffle(extraPool);

    celebrateSideAnimals = [
      {
        name: extraPool[0] || "panda",
        startX: -80,
        targetX: W * 0.14,
        y: H * 0.76,
        scale: (Math.min(W, H) * 0.22) / 40,
        dir: 1,
        bouncePhase: 0
      },
      {
        name: extraPool[1] || "bunny",
        startX: W + 80,
        targetX: W * 0.86,
        y: H * 0.76,
        scale: (Math.min(W, H) * 0.22) / 40,
        dir: -1,
        bouncePhase: 1.5
      }
    ];

    if (W > 600) {
      celebrateSideAnimals.push({
        name: extraPool[2] || "monkey",
        startX: -100,
        targetX: W * 0.26,
        y: H * 0.84,
        scale: (Math.min(W, H) * 0.18) / 40,
        dir: 1,
        bouncePhase: 0.8
      });
      celebrateSideAnimals.push({
        name: extraPool[3] || "frog",
        startX: W + 100,
        targetX: W * 0.74,
        y: H * 0.84,
        scale: (Math.min(W, H) * 0.18) / 40,
        dir: -1,
        bouncePhase: 2.2
      });
    }

    /* Shockwave ring */
    celebrateShockwaves.push({
      x: W * 0.5,
      y: H * 0.46,
      r: 10,
      maxR: Math.max(W, H) * 0.8,
      life: 0,
      maxLife: 1.1,
      color: "rgba(255, 235, 90, 0.8)"
    });
  }

  function triggerCelebrationFireworks() {
    /* Continuous explosion cannons from multiple positions */
    var origins = [
      { x: W * 0.2, y: H * 0.85 },
      { x: W * 0.5, y: H * 0.55 },
      { x: W * 0.8, y: H * 0.85 },
      { x: W * 0.35, y: H * 0.3 },
      { x: W * 0.65, y: H * 0.3 }
    ];
    var pt = pick(origins);
    scene.confetti(pt.x + rand(-30, 30), pt.y + rand(-20, 20));
    scene.sparkle(pt.x + rand(-40, 40), pt.y + rand(-30, 30));

    /* Shimmering celebration star particles */
    var k;
    for (k = 0; k < 6; k++) {
      celebrateSparkles.push({
        x: W * 0.5 + rand(-W * 0.4, W * 0.4),
        y: H * 0.5 + rand(-H * 0.35, H * 0.35),
        vx: rand(-60, 60),
        vy: rand(-120, -30),
        r: rand(8, 22),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-5, 5),
        color: pick(["#fff", "#ffe040", "#ff69b4", "#00ffff", "#ffb347", "#76ff33"]),
        life: 0,
        maxLife: rand(0.6, 1.2)
      });
    }
  }

  function hitBox(x, y) {
    var i, b, dx, dy, d, best = null, bestD = 1e9;
    for (i = 0; i < boxes.length; i++) {
      b = boxes[i];
      dx = x - b.x;
      dy = y - b.y;
      d = dx * dx + dy * dy;
      if (d < b.r * b.r && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  function hitTargetCard(x, y) {
    if (!targetCard.show) return false;
    var dx = Math.abs(x - targetCard.x);
    var dy = Math.abs(y - targetCard.y);
    return dx < targetCard.w * 0.6 && dy < targetCard.h * 0.65;
  }

  /* ----------------------------------------------------------------- update */

  function update(dt) {
    var i, b, p, sw;

    /* Stalled hint in guess state */
    if (gameState === "guess" && GGAudio.isUnlocked() && time - lastInteraction > 8.5) {
      promptAskSpeech();
      lastInteraction = time;
    }

    /* Target badge scale animation */
    if (targetCard.scale > 1) {
      targetCard.scale = Math.max(1, targetCard.scale - dt * 2.2);
    }

    /* Update Boxes (lids, squashes, wiggles, peeks) */
    for (i = 0; i < boxes.length; i++) {
      b = boxes[i];

      /* Smooth lid open/close interpolation */
      b.lidOpenCurrent += (b.lidOpenTarget - b.lidOpenCurrent) * Math.min(1, dt * 10);
      b.lidLift = b.lidOpenCurrent * (b.h * 0.28);
      b.lidAngle = -b.lidOpenCurrent * 0.85;

      if (b.wiggleT > 0) {
        b.wiggleT = Math.max(0, b.wiggleT - dt);
      }

      if (b.peekT > 0) {
        b.peekT = Math.max(0, b.peekT - dt);
        /* Peek lifts lid slightly then closes */
        var peekFrac = Math.sin((1 - b.peekT / 0.75) * Math.PI);
        b.lidLift = Math.max(b.lidLift, peekFrac * (b.h * 0.22));
        b.lidAngle = Math.min(b.lidAngle, -peekFrac * 0.35);
      }

      /* Flying lid physics during celebration */
      if (b.flyLid) {
        var fl = b.flyLid;
        fl.x += fl.vx * dt;
        fl.y += fl.vy * dt;
        fl.vy += 650 * dt; /* gravity */
        fl.rot += fl.vrot * dt;
      }
    }

    /* Watch Phase Logic */
    if (gameState === "watch") {
      watchStepTime += dt;
      if (watchHopAnimal) {
        var a = watchHopAnimal;
        var progress = Math.min(1, watchStepTime / a.duration);

        /* Smooth parabolic hop curve */
        var u = progress;
        var bCurrent = boxes[a.boxIndex];
        a.x = bCurrent.x;

        if (u < 0.6) {
          /* Parabolic descent into box */
          var tHop = u / 0.6;
          var hopArc = Math.sin(tHop * Math.PI) * (bCurrent.h * 0.6);
          a.y = a.startY + (a.targetY - a.startY) * tHop - hopArc;
          a.scale = ((bCurrent.w * 0.58) / 40) * (1 + 0.15 * Math.sin(tHop * Math.PI));
        } else {
          /* Disappearing dip into box interior */
          var tDip = (u - 0.6) / 0.4;
          a.y = a.targetY + tDip * (bCurrent.h * 0.4);
          a.scale = ((bCurrent.w * 0.58) / 40) * Math.max(0.01, 1 - tDip * 0.9);
        }

        if (progress >= 0.88 && bCurrent.lidOpenTarget === 1) {
          /* Snap lid closed with soft tap */
          bCurrent.lidOpenTarget = 0;
          GGAudio.tap();
          spawnDust(bCurrent.x, bCurrent.y + bCurrent.h * 0.45);
        }

        if (progress >= 1) {
          /* Move to next animal */
          watchAnimalIndex++;
          setupCurrentWatchAnimal();
        }
      }
    }

    /* Celebration Phase Logic */
    if (gameState === "celebrate") {
      celebrateTime += dt;
      celebrateAuraAngle += dt * 1.5;

      /* Fire periodic confetti & fireworks cannons */
      celebrateCannonTimer += dt;
      if (celebrateCannonTimer > 0.12) {
        celebrateCannonTimer = 0;
        triggerCelebrationFireworks();
      }

      /* Superstar central animal zooms to giant center stage */
      if (celebrateAnimal) {
        var ca = celebrateAnimal;
        var ease = Math.min(1, celebrateTime / 0.7);
        var sEase = 1 - Math.pow(1 - ease, 3);
        ca.x = ca.x + (ca.targetX - ca.x) * sEase;
        ca.y = ca.y + (ca.targetY - ca.y) * sEase;
        ca.scale = ca.scale + (ca.targetScale - ca.scale) * sEase;
        ca.bounceT += dt * 4.5;
      }

      /* Side cheer squad animals hop in */
      for (i = 0; i < celebrateSideAnimals.length; i++) {
        var sa = celebrateSideAnimals[i];
        var sProgress = Math.min(1, celebrateTime / 0.6);
        sa.x = sa.startX + (sa.targetX - sa.startX) * (1 - Math.pow(1 - sProgress, 3));
      }

      /* Shockwaves */
      for (i = celebrateShockwaves.length - 1; i >= 0; i--) {
        sw = celebrateShockwaves[i];
        sw.life += dt;
        sw.r += (sw.maxR - sw.r) * dt * 4;
        if (sw.life > sw.maxLife) celebrateShockwaves.splice(i, 1);
      }

      /* Celebration sparkles */
      for (i = celebrateSparkles.length - 1; i >= 0; i--) {
        var sp = celebrateSparkles[i];
        sp.life += dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.rot += sp.vrot * dt;
        if (sp.life > sp.maxLife) celebrateSparkles.splice(i, 1);
      }

      /* Celebration finishes after ~3.0 seconds */
      if (celebrateTime > 3.0) {
        startWatchPhase();
      }
    }

    /* Dust particles */
    for (i = dust.length - 1; i >= 0; i--) {
      p = dust[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 130 * dt;
      p.vx *= 0.95;
      if (p.t > p.life) dust.splice(i, 1);
    }
  }

  /* ----------------------------------------------------------------- render */

  function drawRoundedRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5 + rad, y - h * 0.5);
    ctx.arcTo(x + w * 0.5, y - h * 0.5, x + w * 0.5, y + h * 0.5, rad);
    ctx.arcTo(x + w * 0.5, y + h * 0.5, x - w * 0.5, y + h * 0.5, rad);
    ctx.arcTo(x - w * 0.5, y + h * 0.5, x - w * 0.5, y - h * 0.5, rad);
    ctx.arcTo(x - w * 0.5, y - h * 0.5, x + w * 0.5, y - h * 0.5, rad);
    ctx.closePath();
  }

  function drawBoxShadow(b) {
    var footY = b.y + b.h * 0.46;
    var sw = b.w * 0.65;
    var sh = b.h * 0.18;

    ctx.save();
    ctx.translate(b.x, footY);
    var g = ctx.createRadialGradient(0, 0, 2, 0, 0, sw);
    g.addColorStop(0, "rgba(30, 60, 20, 0.35)");
    g.addColorStop(0.55, "rgba(30, 60, 20, 0.15)");
    g.addColorStop(1, "rgba(30, 60, 20, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, sw, sh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoxBody(b) {
    var x = b.x;
    var y = b.y;
    var w = b.w;
    var h = b.h;
    var rad = Math.min(w, h) * 0.18;
    var th = b.theme;

    ctx.save();
    ctx.translate(x, y);

    /* Wiggle oscillation */
    if (b.wiggleT > 0) {
      var wAng = Math.sin((1 - b.wiggleT / 0.55) * 26) * 0.12;
      ctx.rotate(wAng);
    }

    /* Interior Dark Void (visible when lid is opening / lifting) */
    var interiorH = h * 0.35;
    var intGrad = ctx.createLinearGradient(0, -h * 0.5, 0, -h * 0.5 + interiorH);
    intGrad.addColorStop(0, th.innerBg);
    intGrad.addColorStop(1, "#111118");
    ctx.fillStyle = intGrad;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.44, w * 0.46, interiorH * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Peeking animal during wrong guess */
    if (b.peekT > 0 && b.animal) {
      var peekHeight = Math.sin((1 - b.peekT / 0.75) * Math.PI) * (h * 0.3);
      var peekScale = (w * 0.48) / 40;
      ctx.save();
      ctx.translate(0, -h * 0.45 - peekHeight);
      GGAnimals.draw(ctx, b.animal, 0, 0, peekScale, time * 2);
      ctx.restore();
    }

    /* Main Box Front Body */
    var bodyGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    bodyGrad.addColorStop(0, th.boxGrad[0]);
    bodyGrad.addColorStop(0.55, th.boxGrad[1]);
    bodyGrad.addColorStop(1, th.boxGrad[2]);

    ctx.fillStyle = bodyGrad;
    drawRoundedRect(0, 0, w, h, rad);
    ctx.fill();

    ctx.strokeStyle = th.boxDark;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    /* Box Highlight Curve */
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.28, w * 0.38, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Vertical Ribbon */
    var ribW = w * 0.22;
    var ribGrad = ctx.createLinearGradient(-ribW * 0.5, 0, ribW * 0.5, 0);
    ribGrad.addColorStop(0, th.ribbonGrad[0]);
    ribGrad.addColorStop(0.5, "#fff8d0");
    ribGrad.addColorStop(1, th.ribbonGrad[1]);

    ctx.fillStyle = ribGrad;
    ctx.fillRect(-ribW * 0.5, -h * 0.5 + 2, ribW, h - 4);

    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-ribW * 0.5, -h * 0.5 + 2, ribW, h - 4);

    /* Horizontal Ribbon Band */
    var ribH = h * 0.18;
    ctx.fillStyle = ribGrad;
    ctx.fillRect(-w * 0.5 + 2, -ribH * 0.5, w - 4, ribH);
    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-w * 0.5 + 2, -ribH * 0.5, w - 4, ribH);

    /* Central ribbon knot */
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, ribW * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = th.ribbonGrad[0];
    ctx.fill();
    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawLid(b) {
    if (b.flyLid) return; /* Drawn separately in celebration */

    var x = b.x;
    var y = b.y - b.h * 0.48 - b.lidLift;
    var lw = b.w * 1.08;
    var lh = b.h * 0.28;
    var rad = lh * 0.42;
    var th = b.theme;

    ctx.save();
    ctx.translate(x, y);

    /* Tilt lid when opening or wiggling */
    if (b.wiggleT > 0) {
      var wAng = Math.sin((1 - b.wiggleT / 0.55) * 26) * 0.12;
      ctx.rotate(wAng);
    }
    ctx.rotate(b.lidAngle);

    /* Lid Shadow on box */
    ctx.fillStyle = "rgba(10, 20, 30, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, lh * 0.6, lw * 0.48, lh * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Lid Body */
    var lidGrad = ctx.createLinearGradient(0, -lh * 0.5, 0, lh * 0.5);
    lidGrad.addColorStop(0, th.lidGrad[0]);
    lidGrad.addColorStop(1, th.lidGrad[1]);

    ctx.fillStyle = lidGrad;
    drawRoundedRect(0, 0, lw, lh, rad);
    ctx.fill();

    ctx.strokeStyle = th.boxDark;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    /* Lid Ribbon Band */
    var ribW = lw * 0.22;
    var ribGrad = ctx.createLinearGradient(-ribW * 0.5, 0, ribW * 0.5, 0);
    ribGrad.addColorStop(0, th.ribbonGrad[0]);
    ribGrad.addColorStop(0.5, "#fff8d0");
    ribGrad.addColorStop(1, th.ribbonGrad[1]);

    ctx.fillStyle = ribGrad;
    ctx.fillRect(-ribW * 0.5, -lh * 0.5 + 1, ribW, lh - 2);
    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-ribW * 0.5, -lh * 0.5 + 1, ribW, lh - 2);

    /* Festive Ribbon Bow on Top of Lid */
    drawBow(0, -lh * 0.52, lw * 0.35, lh * 1.1, th);

    ctx.restore();
  }

  function drawBow(cx, cy, bw, bh, th) {
    ctx.save();
    ctx.translate(cx, cy);

    /* Left Bow Loop */
    ctx.fillStyle = th.ribbonGrad[0];
    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2.4;

    ctx.beginPath();
    ctx.ellipse(-bw * 0.38, -bh * 0.32, bw * 0.35, bh * 0.42, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* Left Loop Inner Shadow */
    ctx.fillStyle = th.ribbonGrad[1];
    ctx.beginPath();
    ctx.ellipse(-bw * 0.38, -bh * 0.32, bw * 0.15, bh * 0.18, -0.45, 0, Math.PI * 2);
    ctx.fill();

    /* Right Bow Loop */
    ctx.fillStyle = th.ribbonGrad[0];
    ctx.beginPath();
    ctx.ellipse(bw * 0.38, -bh * 0.32, bw * 0.35, bh * 0.42, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* Right Loop Inner Shadow */
    ctx.fillStyle = th.ribbonGrad[1];
    ctx.beginPath();
    ctx.ellipse(bw * 0.38, -bh * 0.32, bw * 0.15, bh * 0.18, 0.45, 0, Math.PI * 2);
    ctx.fill();

    /* Ribbon Center Knot */
    ctx.fillStyle = "#fff8d0";
    ctx.beginPath();
    ctx.arc(0, -bh * 0.12, bw * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = th.ribbonGrad[0];
    ctx.fill();
    ctx.strokeStyle = th.ribbonDark;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.restore();
  }

  function drawFlyingLid(fl) {
    ctx.save();
    ctx.translate(fl.x, fl.y);
    ctx.rotate(fl.rot);

    var lw = fl.w;
    var lh = fl.h;
    var rad = lh * 0.42;
    var th = fl.theme;

    var lidGrad = ctx.createLinearGradient(0, -lh * 0.5, 0, lh * 0.5);
    lidGrad.addColorStop(0, th.lidGrad[0]);
    lidGrad.addColorStop(1, th.lidGrad[1]);

    ctx.fillStyle = lidGrad;
    drawRoundedRect(0, 0, lw, lh, rad);
    ctx.fill();

    ctx.strokeStyle = th.boxDark;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    drawBow(0, -lh * 0.52, lw * 0.35, lh * 1.1, th);
    ctx.restore();
  }

  function drawTargetCard() {
    if (!targetCard.show || !targetAnimal) return;

    var x = targetCard.x;
    var y = targetCard.y;
    var w = targetCard.w;
    var h = targetCard.h;
    var s = targetCard.scale;
    var rad = Math.min(w, h) * 0.38;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(targetCard.rot);
    ctx.scale(s, s);

    /* Soft shadow */
    ctx.fillStyle = "rgba(20, 60, 90, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.46, w * 0.48, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Pill badge background */
    var bg = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#fff6d8");

    ctx.fillStyle = bg;
    drawRoundedRect(0, 0, w, h, rad);
    ctx.fill();

    ctx.strokeStyle = "#ff9a1a";
    ctx.lineWidth = 5.5;
    ctx.stroke();

    /* Inner gloss highlight */
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.22, w * 0.38, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Target animal illustration inside badge */
    var animalScale = (h * 0.62) / 40;
    GGAnimals.draw(ctx, targetAnimal, 0, 0, animalScale, time * 0.8);

    ctx.restore();
  }

  function drawStartPrompt() {
    var isLandscape = W > H;
    var unit = Math.min(W, H);
    var pw = isLandscape ? Math.min(320, unit * 0.6) : Math.min(300, unit * 0.7);
    var ph = isLandscape ? 70 : 80;
    var px = W * 0.5;
    var py = H * 0.28 + Math.sin(time * 3.5) * 8;

    ctx.save();
    ctx.translate(px, py);

    /* Soft shadow */
    ctx.fillStyle = "rgba(20, 50, 80, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, ph * 0.45, pw * 0.48, ph * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Pill badge */
    var bg = ctx.createLinearGradient(0, -ph * 0.5, 0, ph * 0.5);
    bg.addColorStop(0, "#ff8ad8");
    bg.addColorStop(0.5, "#ff5ec8");
    bg.addColorStop(1, "#ff8a1a");

    ctx.fillStyle = bg;
    drawRoundedRect(0, 0, pw, ph, ph * 0.45);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4.5;
    ctx.stroke();

    /* Text */
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 " + Math.floor(ph * 0.48) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(160, 20, 90, 0.4)";
    ctx.shadowOffsetY = 2;
    ctx.fillText("Tap to Play!", 0, 0);

    ctx.restore();
  }

  function drawCelebration() {
    var i;

    /* Screen Flash / Warm celebratory pulse */
    var pulse = Math.sin(celebrateTime * 8) * 0.5 + 0.5;
    var flashGrad = ctx.createRadialGradient(W * 0.5, H * 0.46, 20, W * 0.5, H * 0.46, Math.max(W, H) * 0.7);
    flashGrad.addColorStop(0, "rgba(255, 240, 150, " + (0.35 * pulse) + ")");
    flashGrad.addColorStop(0.5, "rgba(255, 180, 220, " + (0.2 * pulse) + ")");
    flashGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, W, H);

    /* Expanding Shockwaves */
    for (i = 0; i < celebrateShockwaves.length; i++) {
      var sw = celebrateShockwaves[i];
      var swAlpha = Math.max(0, 1 - sw.life / sw.maxLife) * 0.8;
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 14 * (1 - sw.life / sw.maxLife);
      ctx.globalAlpha = swAlpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* Massive Golden Sunburst Aura behind superstar animal */
    ctx.save();
    ctx.translate(W * 0.5, H * 0.46);
    ctx.rotate(celebrateAuraAngle);
    var rayCount = 14;
    var rayLen = Math.max(W, H) * 0.55;
    var rayW = rayLen * 0.12;
    var k;
    for (k = 0; k < rayCount; k++) {
      var ang = (k / rayCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-rayW * 0.4, 0);
      ctx.lineTo(0, rayLen);
      ctx.lineTo(rayW * 0.4, 0);
      ctx.closePath();
      ctx.fillStyle = k % 2 === 0 ? "rgba(255, 225, 60, 0.28)" : "rgba(255, 120, 200, 0.22)";
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    /* Flying Lids spinning in the air */
    for (i = 0; i < boxes.length; i++) {
      if (boxes[i].flyLid) drawFlyingLid(boxes[i].flyLid);
    }

    /* Side Cheer Squad Animals */
    for (i = 0; i < celebrateSideAnimals.length; i++) {
      var sa = celebrateSideAnimals[i];
      var bounceHop = -Math.abs(Math.sin(celebrateTime * 8 + sa.bouncePhase)) * (H * 0.08);
      ctx.save();
      ctx.translate(sa.x, sa.y + bounceHop);
      ctx.scale(sa.dir, 1);
      GGAnimals.draw(ctx, sa.name, 0, 0, sa.scale, celebrateTime * 4);
      ctx.restore();
    }

    /* Superstar ENORMOUS Center Animal */
    if (celebrateAnimal) {
      var ca = celebrateAnimal;
      var heroBounce = -Math.abs(Math.sin(ca.bounceT * 2)) * (H * 0.06);
      var heroSquash = 1 + Math.sin(ca.bounceT * 4) * 0.08;
      var heroStretch = 1 - Math.sin(ca.bounceT * 4) * 0.06;

      ctx.save();
      ctx.translate(ca.x, ca.y + heroBounce);
      ctx.scale(heroSquash, heroStretch);
      ctx.rotate(Math.sin(ca.bounceT * 2) * 0.08);
      GGAnimals.draw(ctx, ca.name, 0, 0, ca.scale, celebrateTime * 3.5);
      ctx.restore();
    }

    /* Shimmering celebration star sparkles */
    for (i = 0; i < celebrateSparkles.length; i++) {
      var sp = celebrateSparkles[i];
      var spAlpha = Math.max(0, 1 - sp.life / sp.maxLife);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.globalAlpha = spAlpha;
      ctx.fillStyle = sp.color;

      /* 4-point star */
      var r = sp.r;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function render() {
    /* 1. Backdrop scene (sky, clouds, hills, grass, flowers, butterflies) */
    scene.draw(ctx);

    /* 2. Target Prompt Badge at Top */
    drawTargetCard();

    /* 3. Box Shadows */
    var i;
    for (i = 0; i < boxes.length; i++) {
      drawBoxShadow(boxes[i]);
    }

    /* 4. Watch phase: Hopping Animal */
    if (gameState === "watch" && watchHopAnimal) {
      var wa = watchHopAnimal;
      ctx.save();
      ctx.translate(wa.x, wa.y);
      GGAnimals.draw(ctx, wa.name, 0, 0, wa.scale, watchStepTime * 4);
      ctx.restore();
    }

    /* 5. Box Bodies and Lids */
    for (i = 0; i < boxes.length; i++) {
      drawBoxBody(boxes[i]);
      drawLid(boxes[i]);
    }

    /* 6. Start Prompt */
    if (gameState === "start") {
      drawStartPrompt();
    }

    /* 7. Dust particles */
    for (i = 0; i < dust.length; i++) {
      var p = dust[i];
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * (1 + p.t * 1.2), p.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* 8. Scene juice particles (confetti, sparkles) */
    scene.drawParticles(ctx);

    /* 9. HUGE Full-Screen Celebration overlay */
    if (gameState === "celebrate") {
      drawCelebration();
    }
  }

  /* ----------------------------------------------------------------- mount */

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
      layout();
      if (GGAudio.isUnlocked()) {
        startWatchPhase();
      } else {
        gameState = "start";
      }
    },
    tap: function (x, y) {
      lastInteraction = time;

      if (gameState === "start") {
        startWatchPhase();
        return;
      }

      if (gameState === "celebrate") {
        /* Extra celebratory taps trigger extra fireworks */
        triggerCelebrationFireworks();
        GGAudio.pop();
        return;
      }

      if (gameState === "watch") {
        /* During watch phase, touching gives friendly bounce feedback */
        GGAudio.tap();
        return;
      }

      /* Tapping top target card repeats the prompt */
      if (hitTargetCard(x, y)) {
        GGAudio.bounce();
        targetCard.scale = 1.25;
        promptAskSpeech();
        return;
      }

      var b = hitBox(x, y);
      if (!b) {
        /* Tapping sky/lawn repeats the question */
        promptAskSpeech();
        return;
      }

      if (b.index === targetIndex) {
        onCorrectBox(b);
      } else {
        onWrongBox(b);
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
