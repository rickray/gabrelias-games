/* Gabrelia's Games — the cast. Sticker-style canvas animals shared by every
   game: soft gradients, outlines, no image files. */

(function (global) {
  "use strict";

  /* Gradients live in animal-local (unscaled) space and are built once. */
  var G = {};

  function rad(ctx, key, x0, y0, r0, x1, y1, r1, a, b) {
    var g = G[key];
    if (g) return g;
    g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    G[key] = g;
    return g;
  }

  function contactShadow(ctx, x, y, rx, ry) {
    var g = rad(ctx, "shadow", 0, 0, 0, 0, 0, 1, "rgba(40,30,20,0.28)", "rgba(40,30,20,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /* Soft filled ellipse + darker outline. Light sits top-left. */
  function blob(ctx, x, y, rx, ry, key, light, mid, dark, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    var g = rad(ctx, key, -rx * 0.35, -ry * 0.4, rx * 0.05, 0, 0, Math.max(rx, ry), light, mid);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  function blobSolid(ctx, x, y, rx, ry, fill, dark, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (dark) {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function blinkT(t, off) {
    var p = (t + off) % 4;
    if (p > 3.88) return 1;
    if (p > 3.76) return (p - 3.76) / 0.12;
    return 0;
  }

  /* Iris + pupil + specular; lids squeeze shut on blink. */
  function glossyEye(ctx, x, y, r, t, off, iris) {
    var b = blinkT(t, off == null ? 0 : off);
    iris = iris || "#2a1a10";
    if (b > 0.72) {
      ctx.beginPath();
      ctx.moveTo(x - r * 1.05, y);
      ctx.quadraticCurveTo(x, y + r * 0.35, x + r * 1.05, y);
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = Math.max(2, r * 0.45);
      ctx.lineCap = "round";
      ctx.stroke();
      return;
    }
    var sy = 1 - b * 0.85;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    circle(ctx, 0, 0, r, "#fff");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    circle(ctx, r * 0.12, r * 0.08, r * 0.55, iris);
    circle(ctx, r * 0.18, r * 0.12, r * 0.28, "#0d0a08");
    circle(ctx, r * 0.38, -r * 0.28, r * 0.18, "#fff");
    circle(ctx, -r * 0.22, r * 0.2, r * 0.08, "rgba(255,255,255,0.55)");
    ctx.restore();
  }

  function smile(ctx, x, y, w, thick) {
    ctx.beginPath();
    ctx.arc(x, y, w, 0.18, Math.PI - 0.18);
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = thick || 2.6;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function blush(ctx, x, y, s) {
    s = s || 1;
    blobSolid(ctx, x - 20 * s, y, 8 * s, 5 * s, "rgba(255,120,150,0.4)");
    blobSolid(ctx, x + 20 * s, y, 8 * s, 5 * s, "rgba(255,120,150,0.4)");
  }

  function polyFill(ctx, pts, fill, dark) {
    var i;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (dark) {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  /* ---- drawers: each gets (ctx, t); local origin is animal centre ---- */

  var drawers = {
    lion: function (ctx, t) {
      var i, a, r;
      contactShadow(ctx, 0, 42, 34, 10);
      for (i = 0; i < 12; i++) {
        a = (i / 12) * Math.PI * 2 + Math.sin(t * 2 + i) * 0.03;
        r = 38 + (i % 2) * 3;
        blob(
          ctx,
          Math.cos(a) * r,
          Math.sin(a) * r * 0.95,
          15,
          12,
          i % 2 ? "lion-m1" : "lion-m0",
          i % 2 ? "#ffb028" : "#ffc84a",
          i % 2 ? "#ff8a1a" : "#ff9a20",
          "#c45a10",
          a
        );
      }
      blob(ctx, 0, 2, 30, 28, "lion-face", "#ffe08a", "#ffd36a", "#c48a28");
      blob(ctx, -22, -22, 10, 8, "lion-ear", "#ffe08a", "#ffd36a", "#c48a28");
      blob(ctx, 22, -22, 10, 8, "lion-ear", "#ffe08a", "#ffd36a", "#c48a28");
      blobSolid(ctx, -22, -22, 5, 4, "#f4a0b8");
      blobSolid(ctx, 22, -22, 5, 4, "#f4a0b8");
      glossyEye(ctx, -11, -4, 7, t, 0.2);
      glossyEye(ctx, 11, -4, 7, t, 0.55);
      blob(ctx, 0, 9, 8, 6, "lion-nose", "#e09040", "#c46a20", "#8a4010");
      circle(ctx, -2.5, 8, 1.6, "#3a2010");
      circle(ctx, 2.5, 8, 1.6, "#3a2010");
      smile(ctx, 0, 14, 12);
      blush(ctx, 0, 10, 0.9);
    },

    elephant: function (ctx, t) {
      var curl = Math.sin(t * 2.2) * 0.18;
      contactShadow(ctx, 0, 44, 36, 10);
      blob(ctx, -36, 4, 22, 26, "el-earL", "#c5cedb", "#9aa6b8", "#5a6578");
      blob(ctx, 36, 4, 22, 26, "el-earR", "#c5cedb", "#9aa6b8", "#5a6578");
      blobSolid(ctx, -36, 4, 14, 18, "#d8e0ea");
      blobSolid(ctx, 36, 4, 14, 18, "#d8e0ea");
      blob(ctx, 0, 4, 30, 28, "el-head", "#d0d8e4", "#b7c2d1", "#6a7588");
      ctx.save();
      ctx.translate(0, 22);
      ctx.rotate(0.22 + curl);
      blob(ctx, 6, 20, 9, 22, "el-trunk", "#c5cedb", "#9aa6b8", "#5a6578");
      blobSolid(ctx, 8, 18, 4.5, 14, "#d8e0ea");
      ctx.restore();
      glossyEye(ctx, -10, -2, 6.5, t, 1.1);
      glossyEye(ctx, 12, -2, 6.5, t, 1.4);
      blobSolid(ctx, -18, 16, 4.5, 3.5, "#fff");
      blobSolid(ctx, 18, 16, 4.5, 3.5, "#fff");
      smile(ctx, 0, 14, 8, 2.2);
    },

    giraffe: function (ctx, t) {
      var spots = [
        [-10, 22],
        [8, 30],
        [-6, 8],
        [4, -2],
        [-8, -28],
        [10, -22]
      ];
      var s;
      contactShadow(ctx, 0, 44, 28, 9);
      blob(ctx, 0, 28, 22, 16, "gir-body", "#ffe06a", "#ffd24a", "#c48a18");
      blob(ctx, -4, 2, 10, 26, "gir-neck", "#ffe06a", "#ffd24a", "#c48a18");
      blob(ctx, 2, -26, 18, 17, "gir-head", "#ffe06a", "#ffd24a", "#c48a18");
      for (s = 0; s < spots.length; s++) {
        blobSolid(ctx, spots[s][0], spots[s][1], 5.5, 4.5, "#d4891a", "#a06010");
      }
      blob(ctx, -8, -42, 4.5, 8, "gir-oss", "#ffe06a", "#ffd24a", "#c48a18");
      blob(ctx, 10, -42, 4.5, 8, "gir-oss", "#ffe06a", "#ffd24a", "#c48a18");
      blob(ctx, -8, -50, 4.5, 4.5, "gir-knob", "#e09040", "#c46a20", "#8a4010");
      blob(ctx, 10, -50, 4.5, 4.5, "gir-knob", "#e09040", "#c46a20", "#8a4010");
      blob(ctx, -16, -30, 7, 5, "gir-ear", "#ffe06a", "#ffd24a", "#c48a18");
      blob(ctx, 16, -28, 7, 5, "gir-ear", "#ffe06a", "#ffd24a", "#c48a18");
      glossyEye(ctx, -4, -28, 5.5, t, 0.8);
      glossyEye(ctx, 10, -26, 5.5, t, 1.2);
      blob(ctx, 6, -18, 7, 4.5, "gir-nose", "#f0a850", "#e09040", "#a06020");
      smile(ctx, 4, -14, 6, 2);
    },

    penguin: function (ctx, t) {
      contactShadow(ctx, 0, 46, 28, 9);
      blob(ctx, 0, 6, 26, 36, "pen-body", "#3a4558", "#1d2430", "#0a0e14");
      blob(ctx, 0, 12, 18, 26, "pen-belly", "#ffffff", "#f0f4f8", "#c0c8d0");
      blob(ctx, -22, 10, 10, 14, "pen-wing", "#3a4558", "#1d2430", "#0a0e14", -0.5);
      blob(ctx, 22, 10, 10, 14, "pen-wing", "#3a4558", "#1d2430", "#0a0e14", 0.5);
      blob(ctx, 0, -22, 16, 15, "pen-head", "#3a4558", "#1d2430", "#0a0e14");
      blob(ctx, 0, -18, 12, 11, "pen-face", "#ffffff", "#f0f4f8", "#c0c8d0");
      glossyEye(ctx, -6, -20, 5.2, t, 2.0);
      glossyEye(ctx, 6, -20, 5.2, t, 2.3);
      blob(ctx, 0, -12, 8, 4.5, "pen-beak", "#ffb028", "#ff8a1a", "#c45010");
      blob(ctx, -10, 40, 11, 5.5, "pen-foot", "#ffb028", "#ff8a1a", "#c45010");
      blob(ctx, 10, 40, 11, 5.5, "pen-foot", "#ffb028", "#ff8a1a", "#c45010");
    },

    frog: function (ctx, t) {
      contactShadow(ctx, 0, 34, 34, 10);
      blob(ctx, 0, 10, 32, 24, "frog-body", "#7ef05a", "#5ed44a", "#2a8a20");
      blob(ctx, -16, -14, 12, 12, "frog-eyeB", "#7ef05a", "#5ed44a", "#2a8a20");
      blob(ctx, 16, -14, 12, 12, "frog-eyeB", "#7ef05a", "#5ed44a", "#2a8a20");
      glossyEye(ctx, -16, -16, 8, t, 0.4, "#1a4010");
      glossyEye(ctx, 16, -16, 8, t, 0.9, "#1a4010");
      blob(ctx, 0, 14, 16, 10, "frog-belly", "#b8f88a", "#8ef06a", "#5aaa30");
      smile(ctx, 0, 12, 14);
      blobSolid(ctx, -22, 8, 4.5, 4, "#3aaa2a");
      blobSolid(ctx, 22, 8, 4.5, 4, "#3aaa2a");
      blush(ctx, 0, 8, 0.85);
    },

    panda: function (ctx, t) {
      contactShadow(ctx, 0, 38, 32, 10);
      blob(ctx, -26, -26, 14, 14, "pan-ear", "#3a3a3a", "#1a1a1a", "#000000");
      blob(ctx, 26, -26, 14, 14, "pan-ear", "#3a3a3a", "#1a1a1a", "#000000");
      blob(ctx, 0, 0, 32, 30, "pan-face", "#ffffff", "#f4f4f8", "#b0b0b8");
      blob(ctx, -13, -6, 10, 12, "pan-patch", "#3a3a3a", "#1a1a1a", "#000000", -0.3);
      blob(ctx, 13, -6, 10, 12, "pan-patch", "#3a3a3a", "#1a1a1a", "#000000", 0.3);
      glossyEye(ctx, -12, -4, 6.5, t, 1.6);
      glossyEye(ctx, 12, -4, 6.5, t, 1.95);
      blob(ctx, 0, 8, 6.5, 5.5, "pan-nose", "#3a3a3a", "#1a1a1a", "#000000");
      smile(ctx, 0, 14, 10);
      blush(ctx, 0, 10);
    },

    bunny: function (ctx, t) {
      var tilt = Math.sin(t * 3) * 0.14;
      contactShadow(ctx, 0, 36, 28, 9);
      ctx.save();
      ctx.translate(-14, -18);
      ctx.rotate(-0.12 + tilt);
      blob(ctx, 0, -22, 8, 22, "bun-ear", "#fff8f4", "#fff0e8", "#d0b8a8");
      blobSolid(ctx, 0, -20, 4, 14, "#ffb0c8");
      ctx.restore();
      ctx.save();
      ctx.translate(14, -18);
      ctx.rotate(0.12 - tilt * 0.8);
      blob(ctx, 0, -22, 8, 22, "bun-ear", "#fff8f4", "#fff0e8", "#d0b8a8");
      blobSolid(ctx, 0, -20, 4, 14, "#ffb0c8");
      ctx.restore();
      blob(ctx, 0, 2, 28, 27, "bun-face", "#fff8f4", "#fff0e8", "#d0b8a8");
      glossyEye(ctx, -10, -2, 6.5, t, 0.3);
      glossyEye(ctx, 10, -2, 6.5, t, 0.7);
      blob(ctx, 0, 8, 5.5, 4.5, "bun-nose", "#ff9ab8", "#ff7aa0", "#c04060");
      ctx.beginPath();
      ctx.moveTo(-2, 10);
      ctx.lineTo(-14, 14);
      ctx.moveTo(-2, 12);
      ctx.lineTo(-14, 18);
      ctx.moveTo(2, 10);
      ctx.lineTo(14, 14);
      ctx.moveTo(2, 12);
      ctx.lineTo(14, 18);
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.stroke();
      smile(ctx, 0, 14, 8);
      blush(ctx, 0, 12, 0.9);
    },

    fish: function (ctx, t) {
      var swish = Math.sin(t * 6) * 0.22;
      contactShadow(ctx, 0, 24, 36, 8);
      ctx.save();
      ctx.translate(28, 0);
      ctx.rotate(swish);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(18, -16);
      ctx.lineTo(12, 0);
      ctx.lineTo(18, 16);
      ctx.closePath();
      ctx.fillStyle = rad(ctx, "fish-tail", 4, -4, 2, 10, 0, 20, "#ffc84a", "#ff8a2a");
      ctx.fill();
      ctx.strokeStyle = "#c45010";
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
      blob(ctx, -4, 0, 30, 20, "fish-body", "#ffb04a", "#ff8a2a", "#c45010");
      blob(ctx, -6, -18, 10, 7, "fish-fin", "#ffc84a", "#ffb03a", "#c47018", -0.2);
      blobSolid(ctx, -8, 6, 8, 5, "#ffd24a");
      glossyEye(ctx, -18, -4, 7.5, t, 2.5);
      blob(ctx, -28, 4, 3.5, 3, "fish-cheek", "#ff7a9a", "#ff5a7a", "#c03050");
    },

    owl: function (ctx, t) {
      /* Slow blink: stretch the closed window via a slower offset phase. */
      var slow = t * 0.55;
      contactShadow(ctx, 0, 42, 30, 9);
      blob(ctx, 0, 6, 28, 32, "owl-body", "#d49240", "#c47a28", "#7a4010");
      blob(ctx, -16, -8, 16, 16, "owl-disk", "#fff4d8", "#f4e0b0", "#c8b080");
      blob(ctx, 16, -8, 16, 16, "owl-disk", "#fff4d8", "#f4e0b0", "#c8b080");
      glossyEye(ctx, -16, -8, 9.5, slow, 0.1, "#3a2010");
      glossyEye(ctx, 16, -8, 9.5, slow, 0.15, "#3a2010");
      polyFill(ctx, [-6, 6, 0, 16, 6, 6], rad(ctx, "owl-beak", 0, 6, 1, 0, 14, 12, "#ffb028", "#ff8a1a"), "#c45010");
      blob(ctx, -22, -30, 10, 8, "owl-tuft", "#d49240", "#c47a28", "#7a4010", -0.4);
      blob(ctx, 22, -30, 10, 8, "owl-tuft", "#d49240", "#c47a28", "#7a4010", 0.4);
      blush(ctx, 0, 10, 0.7);
    },

    pig: function (ctx, t) {
      contactShadow(ctx, 0, 40, 32, 10);
      blob(ctx, 0, 4, 30, 28, "pig-face", "#ffc8d4", "#ffb0c0", "#d07088");
      blob(ctx, -24, -22, 10, 14, "pig-ear", "#ffc8d4", "#ffb0c0", "#d07088");
      blob(ctx, 24, -22, 10, 14, "pig-ear", "#ffc8d4", "#ffb0c0", "#d07088");
      blobSolid(ctx, -24, -22, 5, 8, "#ff88a0");
      blobSolid(ctx, 24, -22, 5, 8, "#ff88a0");
      glossyEye(ctx, -12, -4, 6.5, t, 1.0);
      glossyEye(ctx, 12, -4, 6.5, t, 1.35);
      blob(ctx, 0, 10, 14, 10, "pig-snout", "#ff9ab0", "#ff88a0", "#c05070");
      blobSolid(ctx, -5, 10, 3.2, 3.8, "#e06080");
      blobSolid(ctx, 5, 10, 3.2, 3.8, "#e06080");
      smile(ctx, 0, 18, 8, 2.2);
      blush(ctx, 0, 2, 0.85);
    },

    duck: function (ctx, t) {
      var bill = Math.sin(t * 4) * 0.12;
      contactShadow(ctx, 0, 38, 30, 9);
      blob(ctx, 0, 14, 28, 20, "duck-body", "#ffe86a", "#ffe14a", "#c4a018");
      blob(ctx, 10, -16, 16, 15, "duck-head", "#ffe86a", "#ffe14a", "#c4a018");
      ctx.save();
      ctx.translate(22, -12);
      ctx.rotate(bill);
      blob(ctx, 8, 0, 14, 7, "duck-bill", "#ffb028", "#ff8a1a", "#c45010");
      blobSolid(ctx, 10, -1, 10, 2.5, "#ffc84a");
      ctx.restore();
      glossyEye(ctx, 12, -20, 5.5, t, 2.8);
      blob(ctx, -18, 8, 12, 8, "duck-wing", "#ffe86a", "#ffd24a", "#c4a018", -0.4);
      blob(ctx, -8, 32, 10, 5, "duck-foot", "#ffb028", "#ff8a1a", "#c45010");
      blob(ctx, 8, 32, 10, 5, "duck-foot", "#ffb028", "#ff8a1a", "#c45010");
    },

    cat: function (ctx, t) {
      contactShadow(ctx, 0, 38, 30, 9);
      blob(ctx, 0, 4, 28, 27, "cat-face", "#ffc46a", "#ffb14a", "#c47820");
      polyFill(
        ctx,
        [-24, -8, -18, -36, -6, -16],
        rad(ctx, "cat-earL", -18, -20, 2, -16, -24, 18, "#ffc46a", "#ffb14a"),
        "#c47820"
      );
      polyFill(
        ctx,
        [24, -8, 18, -36, 6, -16],
        rad(ctx, "cat-earR", 18, -20, 2, 16, -24, 18, "#ffc46a", "#ffb14a"),
        "#c47820"
      );
      blobSolid(ctx, -16, -20, 4, 8, "#ff88a0");
      blobSolid(ctx, 16, -20, 4, 8, "#ff88a0");
      glossyEye(ctx, -10, 0, 6.5, t, 0.5, "#3a2810");
      glossyEye(ctx, 10, 0, 6.5, t, 0.85, "#3a2810");
      blob(ctx, 0, 8, 4.5, 3.5, "cat-nose", "#ff9ab8", "#ff7aa0", "#c04060");
      smile(ctx, 0, 12, 8);
      ctx.beginPath();
      ctx.moveTo(-6, 10);
      ctx.lineTo(-22, 6);
      ctx.moveTo(-6, 12);
      ctx.lineTo(-22, 12);
      ctx.moveTo(-6, 14);
      ctx.lineTo(-22, 18);
      ctx.moveTo(6, 10);
      ctx.lineTo(22, 6);
      ctx.moveTo(6, 12);
      ctx.lineTo(22, 12);
      ctx.moveTo(6, 14);
      ctx.lineTo(22, 18);
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();
      blush(ctx, 0, 8);
    },

    butterfly: function (ctx, t) {
      var flap = Math.sin(t * 14) * 0.35;
      contactShadow(ctx, 0, 36, 26, 8);
      ctx.save();
      ctx.translate(-6, 0);
      ctx.scale(0.72 + flap * 0.28, 1);
      blob(ctx, -18, -10, 18, 22, "bf-wUL", "#ff8ae0", "#ff5ad5", "#a02090", -0.35);
      blob(ctx, -16, 16, 14, 16, "bf-wLL", "#9a8cff", "#7a6bff", "#4030b0", 0.25);
      blobSolid(ctx, -16, -12, 6, 6, "#ffe14a");
      ctx.restore();
      ctx.save();
      ctx.translate(6, 0);
      ctx.scale(0.72 + flap * 0.28, 1);
      blob(ctx, 18, -10, 18, 22, "bf-wUR", "#ff8ae0", "#ff5ad5", "#a02090", 0.35);
      blob(ctx, 16, 16, 14, 16, "bf-wLR", "#9a8cff", "#7a6bff", "#4030b0", -0.25);
      blobSolid(ctx, 16, -12, 6, 6, "#ffe14a");
      ctx.restore();
      blob(ctx, 0, 4, 6, 28, "bf-body", "#5a4030", "#3a2010", "#1a1008");
      blob(ctx, 0, -24, 7, 7, "bf-head", "#5a4030", "#3a2010", "#1a1008");
      glossyEye(ctx, -3, -25, 3.2, t, 3.1);
      glossyEye(ctx, 3, -25, 3.2, t, 3.3);
      ctx.beginPath();
      ctx.moveTo(-2, -30);
      ctx.quadraticCurveTo(-10, -48, -14, -44);
      ctx.moveTo(2, -30);
      ctx.quadraticCurveTo(10, -48, 14, -44);
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.stroke();
    },

    turtle: function (ctx, t) {
      contactShadow(ctx, 0, 32, 34, 9);
      blob(ctx, 0, 4, 30, 24, "tur-shell", "#5ed44a", "#3aaa2a", "#1a6010");
      blob(ctx, 0, 4, 22, 16, "tur-plate", "#a8e86a", "#8ed44a", "#4a9020");
      blobSolid(ctx, -8, 0, 6, 5.5, "#2a8a20");
      blobSolid(ctx, 8, 4, 5, 4.5, "#2a8a20");
      blobSolid(ctx, 0, 10, 5, 4.5, "#2a8a20");
      blob(ctx, 26, 2, 12, 11, "tur-head", "#7ef05a", "#5ed44a", "#2a8a20");
      glossyEye(ctx, 30, -2, 4.5, t, 1.7, "#1a4010");
      blob(ctx, -8, 26, 8, 5, "tur-leg", "#7ef05a", "#5ed44a", "#2a8a20");
      blob(ctx, 10, 26, 8, 5, "tur-leg", "#7ef05a", "#5ed44a", "#2a8a20");
      blob(ctx, -26, 12, 8, 5, "tur-leg", "#7ef05a", "#5ed44a", "#2a8a20");
      smile(ctx, 28, 6, 4, 1.8);
    },

    bee: function (ctx, t) {
      var flap = Math.sin(t * 18) * 0.4;
      contactShadow(ctx, 0, 26, 28, 8);
      blob(ctx, 0, 4, 24, 18, "bee-body", "#ffe86a", "#ffe14a", "#c4a018");
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 18, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-9, -14, 7, 36);
      ctx.fillRect(3, -14, 7, 36);
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 18, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#c4a018";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.save();
      ctx.translate(-8, -12);
      ctx.rotate(-0.5 - flap);
      blob(ctx, -6, -4, 14, 10, "bee-wing", "rgba(220,240,255,0.95)", "rgba(160,200,240,0.75)", "rgba(100,140,180,0.9)");
      ctx.restore();
      ctx.save();
      ctx.translate(8, -12);
      ctx.rotate(0.5 + flap);
      blob(ctx, 6, -4, 14, 10, "bee-wing", "rgba(220,240,255,0.95)", "rgba(160,200,240,0.75)", "rgba(100,140,180,0.9)");
      ctx.restore();
      blob(ctx, 22, 0, 8, 8, "bee-head", "#ffe86a", "#ffe14a", "#c4a018");
      glossyEye(ctx, 24, -2, 4.2, t, 0.6);
      blob(ctx, -26, 4, 8, 5, "bee-stinger", "#3a3a3a", "#1a1a1a", "#000000");
    },

    monkey: function (ctx, t) {
      contactShadow(ctx, 0, 36, 30, 9);
      blob(ctx, -26, -8, 14, 14, "mon-ear", "#c47a3a", "#b56a32", "#7a4018");
      blob(ctx, 26, -8, 14, 14, "mon-ear", "#c47a3a", "#b56a32", "#7a4018");
      blobSolid(ctx, -26, -8, 8, 8, "#f0c8a0");
      blobSolid(ctx, 26, -8, 8, 8, "#f0c8a0");
      blob(ctx, 0, 0, 28, 27, "mon-head", "#d4924a", "#c47a3a", "#7a4018");
      blob(ctx, 0, 10, 20, 16, "mon-muzzle", "#f8d8b8", "#f0c8a0", "#c49870");
      blob(ctx, -10, -6, 8, 8, "mon-eyeA", "#f8d8b8", "#f0c8a0", "#c49870");
      blob(ctx, 10, -6, 8, 8, "mon-eyeA", "#f8d8b8", "#f0c8a0", "#c49870");
      glossyEye(ctx, -10, -6, 6.5, t, 2.2);
      glossyEye(ctx, 10, -6, 6.5, t, 2.55);
      blob(ctx, 0, 12, 7.5, 5.5, "mon-nose", "#d4924a", "#c47a3a", "#7a4018");
      smile(ctx, 0, 16, 10);
      blush(ctx, 0, 8, 0.8);
    }
  };

  var NAMES = [
    "lion",
    "elephant",
    "giraffe",
    "penguin",
    "frog",
    "panda",
    "bunny",
    "fish",
    "owl",
    "pig",
    "duck",
    "cat",
    "butterfly",
    "turtle",
    "bee",
    "monkey"
  ];

  function draw(ctx, name, x, y, scale, t) {
    var fn = drawers[name] || drawers.panda;
    if (t == null) t = 0;
    if (scale == null) scale = 1;
    ctx.save();
    ctx.translate(x, y);
    var bounce = Math.sin(t * 10) * 6;
    var wiggle = Math.sin(t * 7) * 0.12;
    ctx.translate(0, bounce);
    ctx.rotate(wiggle);
    ctx.scale(scale, scale);
    fn(ctx, t);
    ctx.restore();
  }

  global.GGAnimals = {
    names: NAMES,
    draw: draw
  };
})(window);
