/* Color Mix — joyful color mixing game for little kids.
   Tap two paint blobs to pour and swirl them in the garden mixing bowl.
   HUGE celebration when you mix the target color! No score, no fail, big taps. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.76 });

  /* Saturated Kid Paints & Hues */
  var COLOR_DEFS = {
    red: {
      name: "red",
      hex: "#ff2a3a",
      light: "#ff6b7b",
      dark: "#b80816",
      glow: "rgba(255, 42, 58, 0.45)",
      splashHexes: ["#ff2a3a", "#ff5967", "#ff8894", "#ffffff"]
    },
    yellow: {
      name: "yellow",
      hex: "#ffd000",
      light: "#fff666",
      dark: "#9e6300",
      glow: "rgba(255, 208, 0, 0.45)",
      splashHexes: ["#ffd000", "#ffe242", "#fff6a0", "#ffffff"]
    },
    blue: {
      name: "blue",
      hex: "#148aff",
      light: "#66b5ff",
      dark: "#0556b8",
      glow: "rgba(20, 138, 255, 0.45)",
      splashHexes: ["#148aff", "#4da8ff", "#94ccff", "#ffffff"]
    },
    white: {
      name: "white",
      hex: "#f8fbff",
      light: "#ffffff",
      dark: "#9cb3c4",
      glow: "rgba(240, 248, 255, 0.55)",
      splashHexes: ["#ffffff", "#eef5fb", "#d4e5f2", "#ffffff"]
    },
    black: {
      name: "black",
      hex: "#22262c",
      light: "#4a525d",
      dark: "#0f1115",
      glow: "rgba(34, 38, 44, 0.45)",
      splashHexes: ["#22262c", "#39414d", "#586577", "#ffffff"]
    },
    orange: {
      name: "orange",
      hex: "#ff7f0e",
      light: "#ffa754",
      dark: "#b84f00",
      glow: "rgba(255, 127, 14, 0.45)",
      splashHexes: ["#ff7f0e", "#ffa242", "#ffc885", "#ffffff"]
    },
    green: {
      name: "green",
      hex: "#16c836",
      light: "#52eb6e",
      dark: "#0a821e",
      glow: "rgba(22, 200, 54, 0.45)",
      splashHexes: ["#16c836", "#44e062", "#8ff5a3", "#ffffff"]
    },
    purple: {
      name: "purple",
      hex: "#9418ea",
      light: "#be5eff",
      dark: "#5a0894",
      glow: "rgba(148, 24, 234, 0.45)",
      splashHexes: ["#9418ea", "#b243fc", "#d68eff", "#ffffff"]
    },
    pink: {
      name: "pink",
      hex: "#ff4d94",
      light: "#ff8ab8",
      dark: "#b81457",
      glow: "rgba(255, 77, 148, 0.45)",
      splashHexes: ["#ff4d94", "#ff75ac", "#ffaecf", "#ffffff"]
    },
    "light blue": {
      name: "light blue",
      hex: "#4ad5ff",
      light: "#9ee8ff",
      dark: "#0d8ec4",
      glow: "rgba(74, 213, 255, 0.45)",
      splashHexes: ["#4ad5ff", "#7ce1ff", "#c2f2ff", "#ffffff"]
    },
    lavender: {
      name: "lavender",
      hex: "#bf77ff",
      light: "#e0b0ff",
      dark: "#7e32c9",
      glow: "rgba(191, 119, 255, 0.45)",
      splashHexes: ["#bf77ff", "#d299ff", "#ecc7ff", "#ffffff"]
    },
    peach: {
      name: "peach",
      hex: "#ffaa6b",
      light: "#ffd0a3",
      dark: "#c96520",
      glow: "rgba(255, 170, 107, 0.45)",
      splashHexes: ["#ffaa6b", "#ffc08f", "#ffe0c4", "#ffffff"]
    },
    lime: {
      name: "lime",
      hex: "#8ce010",
      light: "#bdf553",
      dark: "#528c00",
      glow: "rgba(140, 224, 16, 0.45)",
      splashHexes: ["#8ce010", "#aef03e", "#d4faa0", "#ffffff"]
    },
    brown: {
      name: "brown",
      hex: "#8c4a1e",
      light: "#b86f3b",
      dark: "#54290a",
      glow: "rgba(140, 74, 30, 0.45)",
      splashHexes: ["#8c4a1e", "#a85f2c", "#cc8756", "#ffffff"]
    },
    gray: {
      name: "gray",
      hex: "#8d98a5",
      light: "#bcc6d2",
      dark: "#56606d",
      glow: "rgba(141, 152, 165, 0.45)",
      splashHexes: ["#8d98a5", "#aab4c0", "#d2dbe4", "#ffffff"]
    }
  };

  /* 10 Target Colors and their 2-ingredient recipes */
  var RECIPES = {
    orange: ["red", "yellow"],
    green: ["yellow", "blue"],
    purple: ["red", "blue"],
    pink: ["red", "white"],
    "light blue": ["blue", "white"],
    lavender: ["purple", "white"],
    peach: ["orange", "white"],
    lime: ["green", "white"],
    brown: ["orange", "blue"],
    gray: ["black", "white"]
  };

  /* Paint Mixing Table (commutative) */
  var MIX_TABLE = {
    "red+yellow": "orange",
    "yellow+red": "orange",
    "yellow+blue": "green",
    "blue+yellow": "green",
    "red+blue": "purple",
    "blue+red": "purple",
    "red+white": "pink",
    "white+red": "pink",
    "blue+white": "light blue",
    "white+blue": "light blue",
    "purple+white": "lavender",
    "white+purple": "lavender",
    "orange+white": "peach",
    "white+orange": "peach",
    "green+white": "lime",
    "white+green": "lime",
    "orange+blue": "brown",
    "blue+orange": "brown",
    "black+white": "gray",
    "white+black": "gray"
  };

  var ALL_INGREDIENTS = ["red", "yellow", "blue", "white", "black", "orange", "green", "purple"];
  var TARGETS = ["orange", "green", "purple", "pink", "light blue", "lavender", "peach", "lime", "brown", "gray"];

  /* Game state machine:
     "start"     - waiting for initial tap if audio locked
     "play"      - waiting for player to tap blobs
     "pouring"   - paint splash animation travelling to bowl
     "swirling"  - two colors mixing inside the bowl
     "wrong"     - brief reveal of non-target mix, gentle wiggle and reset
     "celebrate" - HUGE celebratory screen explosion on correct mix
  */
  var gameState = "start";
  var lastInteraction = 0;

  var currentTarget = "orange";
  var lastTarget = "";
  var targetDeck = [];

  /* The three paint blobs on the tray */
  var blobs = [];

  /* Light paint tray / palette underneath the three blobs */
  var paintTray = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rad: 0
  };

  /* Mixing Bowl State */
  var bowl = {
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    r: 120,
    wiggleT: 0,
    bounceT: 0,
    fillLevel: 0,      /* 0: empty, 1: one color, 2: two colors / mixed */
    firstColor: null,
    secondColor: null,
    mixedColor: null,
    swirlAngle: 0,
    swirlMixProgress: 0
  };

  /* Giant Target goal paint blob in the sky */
  var targetBlob = {
    x: 0,
    y: 0,
    baseRadius: 100,
    r: 120,
    scale: 1,
    bounceT: 0,
    wiggleT: 0,
    show: true,
    color: "orange"
  };

  /* Active pouring splash animation */
  var pourSplashes = [];

  /* Celebration State */
  var celebrateTime = 0;
  var celebrateColor = "orange";
  var celebrateAuraAngle = 0;
  var celebrateShockwaves = [];
  var celebrateSparkles = [];
  var celebrateSplatDrops = [];
  var celebrateCannonTimer = 0;
  var celebrateHeroBlob = {
    x: 0,
    y: 0,
    scale: 1,
    targetScale: 1,
    bounceT: 0
  };

  /* General paint drips and dust */
  var drips = [];

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

  function getNextTarget() {
    if (targetDeck.length === 0) {
      targetDeck = TARGETS.slice();
      shuffle(targetDeck);
      if (targetDeck.length > 1 && targetDeck[targetDeck.length - 1] === lastTarget) {
        var first = targetDeck.pop();
        targetDeck.unshift(first);
      }
    }
    return targetDeck.pop();
  }

  function layout() {
    var isLandscape = W > H;
    var unit = Math.min(W, H);

    /* 3 Paint Blobs across the bottom lawn */
    var blobRadius = isLandscape ? Math.min(78, unit * 0.13) : Math.min(68, unit * 0.135);
    /* Extra large touch target for little kids */
    var touchRadius = Math.max(90, blobRadius * 1.35);
    var span = Math.min(W * 0.78, blobRadius * 4.9);
    var x0 = (W - span) / 2;
    var y0 = isLandscape ? H * 0.81 : H * 0.80;

    var i, b;
    for (i = 0; i < blobs.length; i++) {
      b = blobs[i];
      b.w = blobRadius * 2;
      b.h = blobRadius * 1.8;
      b.x = x0 + (span / 2) * i;
      b.y = y0;
      b.r = touchRadius;
      b.baseRadius = blobRadius;
    }

    /* Light paint tray / palette underneath the 3 blobs on the grass */
    var trayPaddingX = blobRadius * 1.3;
    paintTray.w = Math.min(W * 0.94, span + trayPaddingX * 2);
    paintTray.h = blobRadius * 2.15;
    paintTray.x = W * 0.5;
    paintTray.y = y0 + 2;
    paintTray.rad = Math.min(32, paintTray.h * 0.46);

    /* Giant Target Goal Paint Blob in the sky at top center (roughly 1.5x to 1.7x mixing blob radius) */
    var targetRadius = isLandscape
      ? Math.min(blobRadius * 1.6, H * 0.22, unit * 0.22)
      : Math.min(blobRadius * 1.6, H * 0.15, unit * 0.23);

    targetBlob.baseRadius = targetRadius;
    targetBlob.r = Math.max(90, targetRadius * 1.3); /* Giant tap target */
    targetBlob.x = W * 0.5;
    targetBlob.y = isLandscape
      ? Math.max(targetRadius * 1.05 + 10, H * 0.20)
      : Math.max(targetRadius * 1.05 + 16, H * 0.18);

    /* Mixing bowl in center of scene */
    var bowlSize = isLandscape ? Math.min(230, unit * 0.38) : Math.min(210, unit * 0.42);
    bowl.w = bowlSize;
    bowl.h = bowlSize * 0.58;
    bowl.x = W * 0.5;
    bowl.y = isLandscape ? H * 0.51 : H * 0.47;
    bowl.r = bowlSize * 0.65;
  }

  function initBlobs() {
    blobs = [0, 1, 2].map(function (idx) {
      return {
        index: idx,
        color: "red",
        x: 0,
        y: 0,
        w: 140,
        h: 120,
        r: 90,
        baseRadius: 65,
        bounceT: 0,
        scaleT: 1,
        selected: false,
        wiggleT: 0
      };
    });
  }

  initBlobs();

  function startNewRound() {
    gameState = "play";
    lastInteraction = time;

    /* Pick target cycling through all 10 */
    currentTarget = getNextTarget();
    lastTarget = currentTarget;

    targetBlob.color = currentTarget;
    targetBlob.scale = 1.35;
    targetBlob.bounceT = 0.4;
    targetBlob.wiggleT = 0;
    targetBlob.show = true;

    /* Reset bowl */
    bowl.fillLevel = 0;
    bowl.firstColor = null;
    bowl.secondColor = null;
    bowl.mixedColor = null;
    bowl.swirlAngle = 0;
    bowl.swirlMixProgress = 0;
    bowl.wiggleT = 0;

    /* Pick the 2 required ingredients for this target + 1 decoy */
    var pair = RECIPES[currentTarget] || ["red", "yellow"];
    var ing1 = pair[0];
    var ing2 = pair[1];
    var decoyPool = ALL_INGREDIENTS.filter(function (ing) {
      return ing !== ing1 && ing !== ing2;
    });
    var decoy = pick(decoyPool);

    var roundPaints = [ing1, ing2, decoy];
    shuffle(roundPaints);

    for (var i = 0; i < 3; i++) {
      blobs[i].color = roundPaints[i];
      blobs[i].selected = false;
      blobs[i].bounceT = 0;
      blobs[i].scaleT = 1;
      blobs[i].wiggleT = 0;
    }

    pourSplashes = [];

    scene.sparkle(targetBlob.x, targetBlob.y);
    GGAudio.pop();

    promptMakeSpeech();
  }

  function promptMakeSpeech() {
    if (GGAudio.isUnlocked()) {
      GGAudio.say("Make " + currentTarget + "!", { rate: 0.86, pitch: 1.2 });
    }
  }

  function triggerPour(blob, onArrive) {
    var cDef = COLOR_DEFS[blob.color];
    var p = {
      color: blob.color,
      cDef: cDef,
      startX: blob.x,
      startY: blob.y,
      x: blob.x,
      y: blob.y,
      targetX: bowl.x + rand(-15, 15),
      targetY: bowl.y + bowl.h * 0.1,
      t: 0,
      duration: 0.42,
      onArrive: onArrive,
      particles: []
    };

    /* Blob jump / bounce */
    blob.bounceT = 0.45;
    blob.selected = true;

    /* Audio splash */
    GGAudio.whoosh();
    GGAudio.pop();

    pourSplashes.push(p);
  }

  function onBlobTap(b) {
    if (gameState !== "play") return;

    /* Already selected this blob for the current mix? Tiny friendly bounce */
    if (b.selected) {
      b.wiggleT = 0.3;
      GGAudio.bounce();
      return;
    }

    if (bowl.fillLevel === 0) {
      /* First color tap */
      gameState = "pouring";
      triggerPour(b, function () {
        bowl.fillLevel = 1;
        bowl.firstColor = b.color;
        bowl.bounceT = 0.35;
        GGAudio.tap();
        GGAudio.say(b.color, { rate: 0.88, pitch: 1.2 });
        spawnSplashParticles(bowl.x, bowl.y + bowl.h * 0.1, b.color, 14);
        gameState = "play";
      });
    } else if (bowl.fillLevel === 1) {
      /* Second color tap -> start swirl mix */
      gameState = "pouring";
      triggerPour(b, function () {
        bowl.fillLevel = 2;
        bowl.secondColor = b.color;
        bowl.bounceT = 0.4;
        GGAudio.tap();
        spawnSplashParticles(bowl.x, bowl.y + bowl.h * 0.1, b.color, 16);

        var mixResult = MIX_TABLE[bowl.firstColor + "+" + bowl.secondColor] || null;
        bowl.mixedColor = mixResult;

        gameState = "swirling";
        bowl.swirlMixProgress = 0;
      });
    }
  }

  function finishSwirlMix() {
    var resultColor = bowl.mixedColor;

    if (resultColor && resultColor === currentTarget) {
      /* Correct Mix! */
      triggerCorrectCelebration(resultColor);
    } else {
      /* Wrong or Unknown Mix! Gentle, no fail */
      triggerWrongMix(resultColor);
    }
  }

  function triggerWrongMix(resultColor) {
    gameState = "wrong";
    bowl.wiggleT = 0.65;
    GGAudio.wiggle();

    if (resultColor) {
      /* Announce what they made, then repeat the goal */
      GGAudio.say("That's " + resultColor + ". Make " + currentTarget + "!", {
        rate: 0.86,
        pitch: 1.18
      });
    } else {
      /* Unknown mix: don't name muddy/fail color, just repeat target prompt */
      GGAudio.say("Make " + currentTarget + "!", {
        rate: 0.86,
        pitch: 1.2
      });
    }

    /* After brief viewing, empty the bowl and allow re-trying */
    setTimeout(function () {
      if (gameState !== "wrong") return;
      bowl.fillLevel = 0;
      bowl.firstColor = null;
      bowl.secondColor = null;
      bowl.mixedColor = null;
      bowl.wiggleT = 0;

      for (var i = 0; i < blobs.length; i++) {
        blobs[i].selected = false;
      }
      gameState = "play";
      lastInteraction = time;
    }, 1700);
  }

  function triggerCorrectCelebration(resultColor) {
    gameState = "celebrate";
    celebrateTime = 0;
    celebrateColor = resultColor;
    celebrateAuraAngle = 0;
    celebrateShockwaves = [];
    celebrateSparkles = [];
    celebrateSplatDrops = [];
    celebrateCannonTimer = 0;

    var cDef = COLOR_DEFS[resultColor] || COLOR_DEFS.orange;

    /* Central Hero Splash Blob zooms to > 50% of the screen */
    celebrateHeroBlob.x = bowl.x;
    celebrateHeroBlob.y = bowl.y;
    celebrateHeroBlob.scale = (bowl.w * 0.4) / 50;
    celebrateHeroBlob.targetScale = (Math.min(W, H) * 0.58) / 50;
    celebrateHeroBlob.bounceT = 0;

    /* Big sounds & cheer speech */
    GGAudio.cheer();
    GGAudio.sparkle();
    GGAudio.say(resultColor + "! You made " + resultColor + "!", {
      rate: 0.88,
      pitch: 1.25
    });

    /* Massive Initial Splash Shockwave */
    celebrateShockwaves.push({
      x: W * 0.5,
      y: H * 0.48,
      r: 20,
      maxR: Math.max(W, H) * 0.85,
      life: 0,
      maxLife: 1.3,
      color: cDef.hex
    });

    /* Initial confetti burst in mixed color */
    spawnColorConfetti(W * 0.5, H * 0.48, resultColor, 35);
  }

  function triggerCelebrationFireworks() {
    var cDef = COLOR_DEFS[celebrateColor] || COLOR_DEFS.orange;
    var origins = [
      { x: W * 0.2, y: H * 0.85 },
      { x: W * 0.5, y: H * 0.5 },
      { x: W * 0.8, y: H * 0.85 },
      { x: W * 0.35, y: H * 0.3 },
      { x: W * 0.65, y: H * 0.3 }
    ];
    var pt = pick(origins);
    spawnColorConfetti(pt.x + rand(-30, 30), pt.y + rand(-20, 20), celebrateColor, 18);
    scene.sparkle(pt.x + rand(-40, 40), pt.y + rand(-30, 30));

    /* Shimmering celebration sparkles */
    for (var k = 0; k < 6; k++) {
      celebrateSparkles.push({
        x: W * 0.5 + rand(-W * 0.42, W * 0.42),
        y: H * 0.5 + rand(-H * 0.36, H * 0.36),
        vx: rand(-60, 60),
        vy: rand(-130, -30),
        r: rand(10, 24),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-5, 5),
        color: pick(cDef.splashHexes),
        life: 0,
        maxLife: rand(0.6, 1.2)
      });
    }

    /* Floating paint splats in the celebratory hue */
    celebrateSplatDrops.push({
      x: W * 0.5 + rand(-W * 0.38, W * 0.38),
      y: H * 0.5 + rand(-H * 0.32, H * 0.32),
      r: rand(14, 32),
      rot: rand(0, Math.PI * 2),
      color: cDef.hex,
      alpha: 1,
      life: 0,
      maxLife: rand(0.8, 1.5)
    });
  }

  function spawnSplashParticles(x, y, colorName, count) {
    var cDef = COLOR_DEFS[colorName] || COLOR_DEFS.red;
    for (var i = 0; i < count; i++) {
      var ang = rand(0, Math.PI * 2);
      var spd = rand(60, 220);
      drips.push({
        x: x + rand(-10, 10),
        y: y + rand(-10, 10),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(50, 150),
        r: rand(4, 10),
        color: pick(cDef.splashHexes),
        life: rand(0.35, 0.65),
        t: 0
      });
    }
  }

  function spawnColorConfetti(x, y, colorName, count) {
    scene.confetti(x, y);
    var cDef = COLOR_DEFS[colorName] || COLOR_DEFS.orange;
    for (var i = 0; i < count; i++) {
      var ang = rand(0, Math.PI * 2);
      var spd = rand(80, 260);
      drips.push({
        x: x + rand(-15, 15),
        y: y + rand(-15, 15),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(80, 180),
        r: rand(6, 14),
        color: pick(cDef.splashHexes),
        life: rand(0.5, 1.0),
        t: 0
      });
    }
  }

  function hitBlob(x, y) {
    var i, b, dx, dy, d, best = null, bestD = 1e9;
    for (i = 0; i < blobs.length; i++) {
      b = blobs[i];
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

  function hitTargetBlob(x, y) {
    if (!targetBlob.show) return false;
    var dx = x - targetBlob.x;
    var dy = y - targetBlob.y;
    return (dx * dx + dy * dy) < (targetBlob.r * targetBlob.r);
  }

  /* ----------------------------------------------------------------- update */

  function update(dt) {
    var i, b, p, sw, sp, sd;

    /* Stalled hint in play state */
    if (gameState === "play" && GGAudio.isUnlocked() && time - lastInteraction > 9.0) {
      promptMakeSpeech();
      lastInteraction = time;
    }

    /* Target blob scale & bounce decay */
    if (targetBlob.scale > 1) {
      targetBlob.scale = Math.max(1, targetBlob.scale - dt * 2.2);
    }
    if (targetBlob.bounceT > 0) {
      targetBlob.bounceT = Math.max(0, targetBlob.bounceT - dt);
    }
    if (targetBlob.wiggleT > 0) {
      targetBlob.wiggleT = Math.max(0, targetBlob.wiggleT - dt);
    }

    /* Blobs update */
    for (i = 0; i < blobs.length; i++) {
      b = blobs[i];
      if (b.bounceT > 0) {
        b.bounceT = Math.max(0, b.bounceT - dt);
      }
      if (b.wiggleT > 0) {
        b.wiggleT = Math.max(0, b.wiggleT - dt);
      }
    }

    /* Bowl wiggles & bounces */
    if (bowl.wiggleT > 0) {
      bowl.wiggleT = Math.max(0, bowl.wiggleT - dt);
    }
    if (bowl.bounceT > 0) {
      bowl.bounceT = Math.max(0, bowl.bounceT - dt);
    }

    /* Active Pour Splashes */
    for (i = pourSplashes.length - 1; i >= 0; i--) {
      p = pourSplashes[i];
      p.t += dt;
      var prog = Math.min(1, p.t / p.duration);
      /* Parabolic arc up then down into bowl */
      var arcHeight = Math.sin(prog * Math.PI) * (H * 0.22);
      p.x = p.startX + (p.targetX - p.startX) * prog;
      p.y = p.startY + (p.targetY - p.startY) * prog - arcHeight;

      if (prog >= 1) {
        pourSplashes.splice(i, 1);
        if (p.onArrive) p.onArrive();
      }
    }

    /* Swirling Phase Logic */
    if (gameState === "swirling") {
      bowl.swirlAngle += dt * 7.5;
      bowl.swirlMixProgress += dt * 0.9;
      if (bowl.swirlMixProgress >= 1.0) {
        finishSwirlMix();
      }
    }

    /* Celebration Phase Logic */
    if (gameState === "celebrate") {
      celebrateTime += dt;
      celebrateAuraAngle += dt * 1.5;

      /* Fire cannons continuously */
      celebrateCannonTimer += dt;
      if (celebrateCannonTimer > 0.12) {
        celebrateCannonTimer = 0;
        triggerCelebrationFireworks();
      }

      /* Hero Splash Blob Zooms to Center Stage (>50% Screen) */
      var ease = Math.min(1, celebrateTime / 0.65);
      var sEase = 1 - Math.pow(1 - ease, 3);
      celebrateHeroBlob.x = bowl.x + (W * 0.5 - bowl.x) * sEase;
      celebrateHeroBlob.y = bowl.y + (H * 0.46 - bowl.y) * sEase;
      celebrateHeroBlob.scale = celebrateHeroBlob.scale + (celebrateHeroBlob.targetScale - celebrateHeroBlob.scale) * sEase;
      celebrateHeroBlob.bounceT += dt * 4.5;

      /* Shockwaves */
      for (i = celebrateShockwaves.length - 1; i >= 0; i--) {
        sw = celebrateShockwaves[i];
        sw.life += dt;
        sw.r += (sw.maxR - sw.r) * dt * 3.5;
        if (sw.life > sw.maxLife) celebrateShockwaves.splice(i, 1);
      }

      /* Celebration sparkles */
      for (i = celebrateSparkles.length - 1; i >= 0; i--) {
        sp = celebrateSparkles[i];
        sp.life += dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.rot += sp.vrot * dt;
        if (sp.life > sp.maxLife) celebrateSparkles.splice(i, 1);
      }

      /* Splat drops */
      for (i = celebrateSplatDrops.length - 1; i >= 0; i--) {
        sd = celebrateSplatDrops[i];
        sd.life += dt;
        sd.alpha = Math.max(0, 1 - sd.life / sd.maxLife);
        if (sd.life > sd.maxLife) celebrateSplatDrops.splice(i, 1);
      }

      /* Celebration finishes after ~3.0 seconds -> next round */
      if (celebrateTime > 3.0) {
        startNewRound();
      }
    }

    /* Paint drips and splash particles */
    for (i = drips.length - 1; i >= 0; i--) {
      p = drips[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt; /* gravity */
      p.vx *= 0.96;
      if (p.t > p.life) drips.splice(i, 1);
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

  /* Draw a dynamic paint blob with soft glossy organic shape */
  function drawPaintBlob(cx, cy, radius, colorName, wobbleT, isSelected) {
    var cDef = COLOR_DEFS[colorName] || COLOR_DEFS.red;
    ctx.save();
    ctx.translate(cx, cy);

    var wFrac = wobbleT ? Math.sin(wobbleT * 22) * 0.15 : 0;
    ctx.rotate(wFrac);

    /* Shadow */
    ctx.fillStyle = "rgba(20, 50, 30, 0.26)";
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.75, radius * 0.95, radius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Selection Halo */
    if (isSelected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* Organic blob body using sine lobes */
    ctx.beginPath();
    var lobes = 7;
    for (var a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
      var r = radius * (1 + 0.08 * Math.sin(a * lobes + time * 3) + 0.04 * Math.cos(a * 3));
      var px = Math.cos(a) * r;
      var py = Math.sin(a) * r * 0.92;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    /* Saturated gradient */
    var grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.1, 0, 0, radius * 1.1);
    grad.addColorStop(0, cDef.light);
    grad.addColorStop(0.55, cDef.hex);
    grad.addColorStop(1, cDef.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = cDef.dark;
    ctx.lineWidth = Math.max(3.5, radius * 0.075);
    ctx.stroke();

    /* Large glossy highlight */
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(-radius * 0.32, -radius * 0.35, radius * 0.38, radius * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();

    /* Secondary specular dot */
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(-radius * 0.18, -radius * 0.48, radius * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* Draw the light porcelain/wooden palette tray underneath the mixing blobs */
  function drawPaintTray() {
    if (!paintTray.w || !paintTray.h) return;

    var x = paintTray.x;
    var y = paintTray.y;
    var w = paintTray.w;
    var h = paintTray.h;
    var rad = paintTray.rad;

    ctx.save();
    ctx.translate(x, y);

    /* Tray Drop Shadow on grass */
    ctx.fillStyle = "rgba(10, 45, 20, 0.28)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.52, w * 0.5, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Tray Body - soft ivory/white porcelain palette */
    var trayGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    trayGrad.addColorStop(0, "#ffffff");
    trayGrad.addColorStop(0.65, "#f6fafe");
    trayGrad.addColorStop(1, "#e5edf5");

    ctx.fillStyle = trayGrad;
    drawRoundedRect(0, 0, w, h, rad);
    ctx.fill();

    /* Crisp border */
    ctx.strokeStyle = "#c8d9e6";
    ctx.lineWidth = 4;
    ctx.stroke();

    /* Inner gloss on top rim */
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.32, w * 0.44, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Soft indented wells / grooves under each blob position */
    for (var i = 0; i < blobs.length; i++) {
      var bx = blobs[i].x - x;
      ctx.fillStyle = "rgba(180, 200, 218, 0.35)";
      ctx.beginPath();
      ctx.ellipse(bx, h * 0.08, blobs[i].baseRadius * 0.92, blobs[i].baseRadius * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* Draw the Garden Mixing Bowl */
  function drawBowl() {
    var x = bowl.x;
    var y = bowl.y;
    var w = bowl.w;
    var h = bowl.h;

    ctx.save();
    ctx.translate(x, y);

    /* Bounce & Wiggle */
    var bounceOffset = bowl.bounceT > 0 ? -Math.sin((1 - bowl.bounceT / 0.4) * Math.PI) * 16 : 0;
    var wiggleAngle = bowl.wiggleT > 0 ? Math.sin((1 - bowl.wiggleT / 0.65) * 26) * 0.14 : 0;
    ctx.translate(0, bounceOffset);
    ctx.rotate(wiggleAngle);

    /* Bowl Shadow on grass */
    ctx.fillStyle = "rgba(20, 50, 30, 0.32)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.58, w * 0.65, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Bowl Outer White Ceramic Body */
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.2, w * 0.5, h * 0.26, 0, 0, Math.PI * 2);
    ctx.arc(0, 0, w * 0.5, 0, Math.PI);
    ctx.closePath();

    var bowlGrad = ctx.createLinearGradient(-w * 0.5, -h * 0.3, w * 0.5, h * 0.5);
    bowlGrad.addColorStop(0, "#ffffff");
    bowlGrad.addColorStop(0.6, "#f4f8fb");
    bowlGrad.addColorStop(1, "#d6e2eb");
    ctx.fillStyle = bowlGrad;
    ctx.fill();

    ctx.strokeStyle = "#9eb5c4";
    ctx.lineWidth = 4.5;
    ctx.stroke();

    /* Inner Bowl Cavity */
    ctx.fillStyle = "#1e3344";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.2, w * 0.45, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Paint Liquid inside the bowl */
    if (bowl.fillLevel > 0) {
      drawBowlLiquid(w * 0.42, h * 0.2);
    }

    /* Bowl Rim Gloss Highlight */
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.2, w * 0.47, h * 0.23, 0, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();

    /* Front Body Gloss Arc */
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.44, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  function drawBowlLiquid(lw, lh) {
    var cDef1 = bowl.firstColor ? COLOR_DEFS[bowl.firstColor] : null;
    var cDef2 = bowl.secondColor ? COLOR_DEFS[bowl.secondColor] : null;
    var mixDef = bowl.mixedColor ? COLOR_DEFS[bowl.mixedColor] : null;

    if (bowl.fillLevel === 1 && cDef1) {
      /* Single Color in Bowl */
      var g1 = ctx.createRadialGradient(-lw * 0.2, -lh * 0.3, lw * 0.1, 0, 0, lw);
      g1.addColorStop(0, cDef1.light);
      g1.addColorStop(0.7, cDef1.hex);
      g1.addColorStop(1, cDef1.dark);
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.ellipse(0, -lh * 0.9, lw, lh, 0, 0, Math.PI * 2);
      ctx.fill();

      /* Paint swirl gloss */
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.ellipse(-lw * 0.3, -lh * 1.1, lw * 0.4, lh * 0.25, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (bowl.fillLevel === 2) {
      /* Two colors or fully mixed color */
      if (gameState === "swirling" && cDef1 && cDef2) {
        var mixProg = bowl.swirlMixProgress;
        var blendHex = mixDef ? mixDef.hex : "#7a8894";

        /* Swirling spiral halves blending into mixed result */
        ctx.save();
        ctx.translate(0, -lh * 0.9);
        ctx.beginPath();
        ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
        ctx.clip();

        /* Background blends into mixed color */
        ctx.fillStyle = blendHex;
        ctx.fillRect(-lw * 1.2, -lh * 1.2, lw * 2.4, lh * 2.4);

        /* Two spinning yin-yang swirls of primary colors fading as mix progresses */
        var swirlAlpha = Math.max(0, 1 - mixProg * 1.1);
        ctx.globalAlpha = swirlAlpha;
        ctx.rotate(bowl.swirlAngle);

        /* Semi 1: First Color */
        ctx.fillStyle = cDef1.hex;
        ctx.beginPath();
        ctx.arc(0, 0, lw, 0, Math.PI);
        ctx.arc(-lw * 0.5, 0, lw * 0.5, Math.PI, 0, true);
        ctx.arc(lw * 0.5, 0, lw * 0.5, Math.PI, 0, false);
        ctx.fill();

        /* Semi 2: Second Color */
        ctx.fillStyle = cDef2.hex;
        ctx.beginPath();
        ctx.arc(0, 0, lw, Math.PI, Math.PI * 2);
        ctx.arc(lw * 0.5, 0, lw * 0.5, 0, Math.PI, true);
        ctx.arc(-lw * 0.5, 0, lw * 0.5, 0, Math.PI, false);
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (mixDef) {
        /* Fully mixed result color in bowl */
        var gMix = ctx.createRadialGradient(-lw * 0.2, -lh * 0.3, lw * 0.1, 0, 0, lw);
        gMix.addColorStop(0, mixDef.light);
        gMix.addColorStop(0.7, mixDef.hex);
        gMix.addColorStop(1, mixDef.dark);
        ctx.fillStyle = gMix;
        ctx.beginPath();
        ctx.ellipse(0, -lh * 0.9, lw, lh, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Paint swirl gloss */
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.beginPath();
        ctx.ellipse(-lw * 0.3, -lh * 1.1, lw * 0.4, lh * 0.25, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cDef1 && cDef2) {
        /* Unknown mix in wrong state before reset */
        ctx.fillStyle = "#7a8894";
        ctx.beginPath();
        ctx.ellipse(0, -lh * 0.9, lw, lh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* Draw Giant Target Goal Paint Blob in Sky */
  function drawTargetBlob() {
    if (!targetBlob.show || !targetBlob.color) return;

    var hop = targetBlob.bounceT > 0 ? -Math.sin((1 - targetBlob.bounceT / 0.4) * Math.PI) * 16 : 0;
    var s = targetBlob.scale;

    ctx.save();
    ctx.translate(targetBlob.x, targetBlob.y + hop);
    ctx.scale(s, s);
    drawPaintBlob(0, 0, targetBlob.baseRadius, targetBlob.color, targetBlob.wiggleT, false);
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

    /* Shadow */
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

  /* HUGE Celebration Render: Color floods the screen, sunburst, giant zoom splash */
  function drawCelebration() {
    var i;
    var cDef = COLOR_DEFS[celebrateColor] || COLOR_DEFS.orange;

    /* 1. Screen Flood / Hue Takeover Flash */
    var flashGrad = ctx.createRadialGradient(W * 0.5, H * 0.46, 20, W * 0.5, H * 0.46, Math.max(W, H) * 0.75);
    flashGrad.addColorStop(0, cDef.glow);
    flashGrad.addColorStop(0.6, cDef.glow.replace("0.45", "0.22").replace("0.55", "0.22"));
    flashGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, W, H);

    /* 2. Expanding Paint Shockwaves */
    for (i = 0; i < celebrateShockwaves.length; i++) {
      var sw = celebrateShockwaves[i];
      var swAlpha = Math.max(0, 1 - sw.life / sw.maxLife) * 0.85;
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 16 * (1 - sw.life / sw.maxLife);
      ctx.globalAlpha = swAlpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* 3. Massive Sunburst in that Mixed Color Hue */
    ctx.save();
    ctx.translate(W * 0.5, H * 0.46);
    ctx.rotate(celebrateAuraAngle);
    var rayCount = 16;
    var rayLen = Math.max(W, H) * 0.62;
    var rayW = rayLen * 0.14;
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
      ctx.fillStyle = k % 2 === 0 ? cDef.glow : "rgba(255, 255, 255, 0.2)";
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    /* 4. Giant Zooming Superstar Splash Paint Blob (>50% of screen) */
    var hb = celebrateHeroBlob;
    var heroBounce = -Math.abs(Math.sin(hb.bounceT * 2.2)) * (H * 0.05);
    var heroSquash = 1 + Math.sin(hb.bounceT * 4.4) * 0.08;
    var heroStretch = 1 - Math.sin(hb.bounceT * 4.4) * 0.06;

    ctx.save();
    ctx.translate(hb.x, hb.y + heroBounce);
    ctx.scale(heroSquash, heroStretch);
    drawPaintBlob(0, 0, 50 * hb.scale, celebrateColor, hb.bounceT, false);

    /* Celebration Text Banner on Hero Blob */
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 " + Math.floor(Math.min(W, H) * 0.085) + "px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowOffsetY = 3;
    ctx.fillText(celebrateColor.toUpperCase() + "!", 0, 0);
    ctx.restore();

    /* 5. Shimmering celebration sparkles */
    for (i = 0; i < celebrateSparkles.length; i++) {
      var sp = celebrateSparkles[i];
      var spAlpha = Math.max(0, 1 - sp.life / sp.maxLife);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.globalAlpha = spAlpha;
      ctx.fillStyle = sp.color;

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
    /* 1. Garden Backdrop (sky, sun, clouds, hills, flowers, butterflies) */
    scene.draw(ctx);

    /* 2. Target Goal Paint Blob in Sky */
    drawTargetBlob();

    /* 3. Garden Mixing Bowl */
    drawBowl();

    /* 4. Active Pour Splashes Flying to Bowl */
    for (var i = 0; i < pourSplashes.length; i++) {
      var p = pourSplashes[i];
      drawPaintBlob(p.x, p.y, 28, p.color, 0, false);
    }

    /* 5. Light Paint Tray / Palette on Lawn */
    drawPaintTray();

    /* 6. Three Paint Blobs on Tray */
    for (var j = 0; j < blobs.length; j++) {
      var b = blobs[j];
      var bounceHop = b.bounceT > 0 ? -Math.sin((1 - b.bounceT / 0.45) * Math.PI) * 22 : 0;
      drawPaintBlob(b.x, b.y + bounceHop, b.baseRadius, b.color, b.wiggleT, b.selected);
    }

    /* 7. Paint Drips & Particles */
    for (var k = 0; k < drips.length; k++) {
      var d = drips[k];
      ctx.globalAlpha = Math.max(0, 1 - d.t / d.life) * 0.9;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* 8. Scene Confetti / Sparkle Juice */
    scene.drawParticles(ctx);

    /* 9. Start Prompt if audio locked */
    if (gameState === "start") {
      drawStartPrompt();
    }

    /* 10. HUGE Celebration Overlay */
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
        startNewRound();
      } else {
        gameState = "start";
      }
    },
    tap: function (x, y) {
      lastInteraction = time;

      if (gameState === "start") {
        startNewRound();
        return;
      }

      if (gameState === "celebrate") {
        /* Extra celebratory taps pop extra confetti */
        triggerCelebrationFireworks();
        GGAudio.pop();
        return;
      }

      /* Tapping target blob repeats the prompt */
      if (hitTargetBlob(x, y)) {
        GGAudio.bounce();
        targetBlob.scale = 1.3;
        targetBlob.bounceT = 0.35;
        scene.sparkle(targetBlob.x, targetBlob.y);
        promptMakeSpeech();
        return;
      }

      /* Tapping bowl when filled gives a friendly slosh bounce */
      var dxBowl = x - bowl.x;
      var dyBowl = y - bowl.y;
      if (dxBowl * dxBowl + dyBowl * dyBowl < bowl.r * bowl.r) {
        bowl.bounceT = 0.3;
        GGAudio.bounce();
        if (bowl.fillLevel === 1) {
          GGAudio.say(bowl.firstColor, { rate: 0.88, pitch: 1.2 });
        }
        return;
      }

      /* Check primary / ingredient blob taps */
      var b = hitBlob(x, y);
      if (b) {
        onBlobTap(b);
      } else {
        /* Tapping sky repeats the prompt */
        promptMakeSpeech();
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
