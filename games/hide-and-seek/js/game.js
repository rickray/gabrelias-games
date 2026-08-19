/* Hide and Seek — find the animal you hear. No score, no fail, no reading. */

(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });

  var W = 800;
  var H = 600;
  var time = 0;

  var scene = GGScene.create({ ground: 0.78 });

  var dust = [];
  var foundGlow = null;
  var shadowGrad = null;
  var shadowKey = "";

  var roster = [];
  var target = "";
  var lastTarget = "";
  var asked = false;
  var busy = false;
  var askTimeout = 0;
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

  function ensureCachedGrads() {
    var key = W + "x" + H;
    if (shadowKey === key && shadowGrad && foundGlow) return;
    shadowKey = key;
    var sw = Math.min(W, H) * 0.09;
    shadowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, sw);
    shadowGrad.addColorStop(0, "rgba(40,70,20,0.28)");
    shadowGrad.addColorStop(0.55, "rgba(40,70,20,0.12)");
    shadowGrad.addColorStop(1, "rgba(40,70,20,0)");

    var gw = Math.min(W, H) * 0.22;
    foundGlow = ctx.createRadialGradient(0, 0, gw * 0.1, 0, 0, gw);
    foundGlow.addColorStop(0, "rgba(255,230,120,0.55)");
    foundGlow.addColorStop(0.45, "rgba(255,200,80,0.22)");
    foundGlow.addColorStop(1, "rgba(255,180,60,0)");
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
      a.breathPhase = i * 1.7 + rand(0, 1);
    }
    ensureCachedGrads();
  }

  function nextRound() {
    var names = GGAnimals.names.slice();
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
    roster = trio.map(function (name, idx) {
      return {
        name: name,
        x: 0,
        y: 0,
        r: 80,
        size: 60,
        mode: "idle",
        t: 0,
        breathPhase: idx * 1.7,
        sx: 1,
        sy: 1,
        hopY: 0
      };
    });
    animalLayout();
    busy = false;
    asked = false;
    lastInteraction = time;
    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    if (GGAudio.isUnlocked()) askLater(1600);
  }

  function askWhere() {
    asked = true;
    if (askTimeout) {
      clearTimeout(askTimeout);
      askTimeout = 0;
    }
    GGAudio.say("Where's the " + target + "?");
  }

  function askLater(delay) {
    var wanted = target;
    askTimeout = setTimeout(function () {
      askTimeout = 0;
      if (wanted === target && !busy) askWhere();
    }, delay);
  }

  function spawnDust(x, y) {
    var i;
    for (i = 0; i < 10; i++) {
      dust.push({
        x: x + rand(-12, 12),
        y: y + rand(4, 18),
        vx: rand(-40, 40),
        vy: rand(-55, -10),
        r: rand(4, 9),
        life: rand(0.35, 0.6),
        t: 0,
        color: pick([
          "rgba(210,185,130,0.55)",
          "rgba(190,170,120,0.5)",
          "rgba(230,210,160,0.45)"
        ])
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
    a.sx = 1;
    a.sy = 1;
    a.hopY = 0;
    scene.confetti(a.x, a.y);
    GGAudio.sparkle();
    GGAudio.say("You found the " + a.name + "!");
  }

  function onWrong(a) {
    a.mode = "wiggle";
    a.t = 0;
    spawnDust(a.x, a.y + a.size * 0.55);
    GGAudio.wiggle();
    GGAudio.say("That's the " + a.name);
    GGAudio.say("Where's the " + target + "?", { delay: 1400, interrupt: false });
    asked = true;
  }

  function updateFoundPose(a) {
    var t = a.t;
    /* Happy hop with squash-and-stretch over ~1.45s celebration window */
    if (t < 0.12) {
      var u = t / 0.12;
      a.sx = 1 + 0.22 * u;
      a.sy = 1 - 0.18 * u;
      a.hopY = 0;
    } else if (t < 0.38) {
      var v = (t - 0.12) / 0.26;
      a.sx = 1.22 - 0.4 * v;
      a.sy = 0.82 + 0.38 * v;
      a.hopY = -Math.sin(v * Math.PI) * a.size * 0.42;
    } else if (t < 0.55) {
      var w = (t - 0.38) / 0.17;
      a.sx = 0.82 + 0.28 * w;
      a.sy = 1.2 - 0.3 * w;
      a.hopY = Math.sin(w * Math.PI) * a.size * 0.08;
    } else if (t < 0.85) {
      var z = (t - 0.55) / 0.3;
      a.sx = 1.1 - 0.1 * z;
      a.sy = 0.9 + 0.1 * z;
      a.hopY = -Math.sin(z * Math.PI) * a.size * 0.18;
    } else {
      a.sx = 1;
      a.sy = 1;
      a.hopY = 0;
    }
  }

  function update(dt) {
    var i, a, p;
    /* Nudge a stalled child, but only after 8 seconds of real play: `time`
       stops while the app is in the background. */
    if (asked && !busy && GGAudio.isUnlocked() && time - lastInteraction > 8) {
      askWhere();
      lastInteraction = time;
    }
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      a.t += dt;
      if (a.mode === "wiggle" && a.t > 0.55) {
        a.mode = "idle";
        a.t = 0;
      }
      if (a.mode === "found") {
        updateFoundPose(a);
        if (a.t > 1.45) {
          nextRound();
          return;
        }
      } else if (a.mode === "idle") {
        a.sx = 1;
        a.sy = 1;
        a.hopY = 0;
      } else if (a.mode === "wiggle") {
        a.sx = 1;
        a.sy = 1;
        a.hopY = 0;
      }
    }
    for (i = dust.length - 1; i >= 0; i--) {
      p = dust[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.vx *= 0.96;
      if (p.t > p.life) dust.splice(i, 1);
    }
  }

  function drawContactShadow(a, breath) {
    var footY = a.y + a.size * 0.62 + a.hopY * 0.15;
    var sw = a.size * (0.95 + (1 - breath) * 0.08);
    var sh = a.size * 0.22 * (0.9 + (1 - breath) * 0.15);
    ctx.save();
    ctx.translate(a.x, footY);
    ctx.scale(sw / (Math.min(W, H) * 0.09), sh / (Math.min(W, H) * 0.09));
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(W, H) * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFoundGlow(a) {
    var gw = Math.min(W, H) * 0.22;
    ctx.save();
    ctx.translate(a.x, a.y + a.hopY * 0.5);
    ctx.fillStyle = foundGlow;
    ctx.beginPath();
    ctx.arc(0, 0, gw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    scene.draw(ctx);
    ensureCachedGrads();
    var i, a, p, tAnim, breath, scaleMul, drawY;
    for (i = 0; i < roster.length; i++) {
      a = roster[i];
      breath = 1 + Math.sin(time * 2.1 + a.breathPhase) * 0.035;
      if (a.mode === "found") breath = 1;

      drawContactShadow(a, breath);

      if (a.mode === "found") {
        drawFoundGlow(a);
      }

      tAnim = time * 0.16 + i;
      if (a.mode === "wiggle") tAnim = a.t * 5;
      if (a.mode === "found") tAnim = a.t * 3.4;

      scaleMul = (a.size / 40) * breath;
      if (a.mode === "found") scaleMul = (a.size / 40) * 1.08;

      drawY = a.y + a.hopY;
      ctx.save();
      ctx.translate(a.x, drawY);
      ctx.scale(a.sx, a.sy);
      GGAnimals.draw(ctx, a.name, 0, 0, scaleMul, tAnim);
      ctx.restore();
    }

    for (i = 0; i < dust.length; i++) {
      p = dust[i];
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.85;
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
      shadowKey = "";
      if (roster.length) animalLayout();
    },
    start: function () {
      nextRound();
    },
    tap: function (x, y) {
      lastInteraction = time;
      if (busy) return;
      if (!asked) {
        askWhere();
        return;
      }
      var a = hitAnimal(x, y);
      if (!a) {
        askWhere();
        return;
      }
      if (a.name === target) onCorrect(a);
      else onWrong(a);
    },
    frame: function (dt, t) {
      time = t;
      scene.update(dt);
      update(dt);
      render();
    }
  });
})();
