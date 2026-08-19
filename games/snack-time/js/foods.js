/* Snack Time — sticker-style canvas foods. */

(function (global) {
  "use strict";

  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, fill, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function strokeEllipse(ctx, x, y, rx, ry, stroke, lw, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  function radial(ctx, x, y, r0, r1, c0, c1) {
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }

  function gloss(ctx, x, y, r) {
    circle(ctx, x, y, r, "rgba(255,255,255,0.72)");
    circle(ctx, x + r * 0.25, y + r * 0.2, r * 0.35, "rgba(255,255,255,0.45)");
  }

  var drawers = {
    banana: function (ctx) {
      ctx.save();
      ctx.rotate(-0.4);
      ellipse(ctx, 0, 4, 13, 31, radial(ctx, -4, -6, 2, 30, "#fff3a0", "#f0c820"));
      strokeEllipse(ctx, 0, 4, 13, 31, "#c49a18", 2.6);
      ellipse(ctx, -4, 2, 6, 22, "rgba(255,255,255,0.35)");
      ellipse(ctx, 0, -28, 6, 5, "#b88818");
      strokeEllipse(ctx, 0, -28, 6, 5, "#8a6410", 1.8);
      ellipse(ctx, 2, 32, 5, 4, "#b88818");
      gloss(ctx, -5, -8, 4);
      ctx.restore();
    },
    bamboo: function (ctx) {
      var i;
      for (i = -1; i <= 1; i++) {
        ellipse(ctx, i * 14, 2, 8, 29, radial(ctx, i * 14 - 3, -8, 2, 28, "#a8f070", i === 0 ? "#5ec64a" : "#3aaa2a"));
        strokeEllipse(ctx, i * 14, 2, 8, 29, "#2f6a20", 2.4);
        ctx.fillStyle = "#2f8a28";
        ctx.fillRect(i * 14 - 7, -8, 14, 3);
        ctx.fillRect(i * 14 - 7, 10, 14, 3);
        ellipse(ctx, i * 14 - 2, -6, 3, 10, "rgba(255,255,255,0.28)");
      }
      ellipse(ctx, -20, -22, 13, 5, "#4aba30", -0.95);
      strokeEllipse(ctx, -20, -22, 13, 5, "#2f6a20", 1.6, -0.95);
      ellipse(ctx, 20, -20, 13, 5, "#4aba30", 0.95);
      strokeEllipse(ctx, 20, -20, 13, 5, "#2f6a20", 1.6, 0.95);
    },
    carrot: function (ctx) {
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(-14, -10);
      ctx.lineTo(14, -10);
      ctx.closePath();
      ctx.fillStyle = radial(ctx, -4, 0, 2, 28, "#ffc060", "#e86a00");
      ctx.fill();
      ctx.strokeStyle = "#b84800";
      ctx.lineWidth = 2.6;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = "rgba(180,70,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, 18);
      ctx.lineTo(-8, -2);
      ctx.moveTo(3, 16);
      ctx.lineTo(6, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(-10, -32);
      ctx.lineTo(-1, -16);
      ctx.lineTo(2, -34);
      ctx.lineTo(8, -16);
      ctx.lineTo(12, -30);
      ctx.lineTo(6, -10);
      ctx.closePath();
      ctx.fillStyle = radial(ctx, 0, -20, 2, 16, "#8ef06a", "#2f9a28");
      ctx.fill();
      ctx.strokeStyle = "#1f6a18";
      ctx.lineWidth = 2;
      ctx.stroke();
      gloss(ctx, -4, 2, 3.5);
    },
    apple: function (ctx) {
      circle(ctx, -8, 4, 18, radial(ctx, -12, -2, 2, 18, "#ff8a90", "#d02030"));
      circle(ctx, 8, 4, 18, radial(ctx, 4, -2, 2, 18, "#ff8a90", "#d02030"));
      ellipse(ctx, 0, 6, 20, 18, radial(ctx, -4, 0, 2, 22, "#ff7a80", "#e03040"));
      ctx.beginPath();
      ctx.arc(-8, 4, 18, 0, Math.PI * 2);
      ctx.arc(8, 4, 18, 0, Math.PI * 2);
      ctx.strokeStyle = "#9a1020";
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = "#6a3a10";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(6, -22, 2, -28);
      ctx.stroke();
      ellipse(ctx, 12, -20, 8, 5, radial(ctx, 10, -22, 1, 8, "#8ef06a", "#3aaa2a"), 0.5);
      strokeEllipse(ctx, 12, -20, 8, 5, "#2f6a20", 1.8, 0.5);
      gloss(ctx, -10, -4, 5);
    },
    leaf: function (ctx) {
      ctx.save();
      ctx.rotate(-0.4);
      ellipse(ctx, 0, 0, 14, 30, radial(ctx, -4, -8, 2, 28, "#a8f070", "#3aaa2a"));
      strokeEllipse(ctx, 0, 0, 14, 30, "#1f6a18", 2.6);
      ellipse(ctx, -3, 0, 6, 22, "rgba(255,255,255,0.28)");
      ctx.strokeStyle = "#2f8a28";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, -26);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(10, -2, 8, 6);
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(-10, 8, -7, 16);
      ctx.stroke();
      gloss(ctx, -4, -10, 3.5);
      ctx.restore();
    },
    peanut: function (ctx) {
      ellipse(ctx, 0, -10, 14, 16, radial(ctx, -4, -16, 2, 16, "#f0d090", "#c48830"));
      strokeEllipse(ctx, 0, -10, 14, 16, "#8a6020", 2.4);
      ellipse(ctx, 0, 12, 13, 15, radial(ctx, -3, 6, 2, 15, "#e8c070", "#b87828"));
      strokeEllipse(ctx, 0, 12, 13, 15, "#8a6020", 2.4);
      ellipse(ctx, -4, -12, 6, 8, "rgba(255,255,255,0.35)");
      ellipse(ctx, -3, 12, 5, 7, "rgba(255,255,255,0.3)");
      ctx.strokeStyle = "rgba(138,96,32,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(0, 4, 8, 0);
      ctx.stroke();
      gloss(ctx, -5, -14, 3);
    },
    fish: function (ctx) {
      ellipse(ctx, -4, 0, 22, 14, radial(ctx, -10, -4, 2, 22, "#8ae8ff", "#1890d0"));
      strokeEllipse(ctx, -4, 0, 22, 14, "#0a5a90", 2.6);
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(34, -12);
      ctx.lineTo(28, 0);
      ctx.lineTo(34, 12);
      ctx.closePath();
      ctx.fillStyle = radial(ctx, 24, 0, 2, 14, "#8ae8ff", "#1890d0");
      ctx.fill();
      ctx.strokeStyle = "#0a5a90";
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
      circle(ctx, -14, -3, 4.5, "#fff");
      circle(ctx, -13, -3, 2.2, "#1a1a1a");
      circle(ctx, -12.2, -3.8, 0.9, "#fff");
      ellipse(ctx, -6, 4, 5, 3, "#ff8a1a");
      ellipse(ctx, -8, -6, 5, 3, "rgba(255,255,255,0.35)");
      ctx.beginPath();
      ctx.moveTo(-2, -12);
      ctx.quadraticCurveTo(2, -22, 8, -14);
      ctx.lineTo(4, -10);
      ctx.closePath();
      ctx.fillStyle = "#2ec5ff";
      ctx.fill();
      ctx.strokeStyle = "#0a5a90";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    },
    corn: function (ctx) {
      ellipse(ctx, 0, 6, 15, 27, radial(ctx, -4, -4, 2, 28, "#fff3a0", "#e0b020"));
      strokeEllipse(ctx, 0, 6, 15, 27, "#a88810", 2.6);
      var r, c;
      for (r = -2; r <= 3; r++) {
        for (c = -1; c <= 1; c++) {
          circle(ctx, c * 7 + (r % 2 ? 2 : 0), r * 8, 3.4, radial(ctx, c * 7 - 1, r * 8 - 1, 0.5, 3.4, "#fff6c0", "#f0c830"));
        }
      }
      ellipse(ctx, -12, -20, 8, 14, radial(ctx, -14, -24, 1, 14, "#8ef06a", "#3aaa2a"), -0.5);
      strokeEllipse(ctx, -12, -20, 8, 14, "#1f6a18", 1.8, -0.5);
      ellipse(ctx, 12, -20, 8, 14, radial(ctx, 10, -24, 1, 14, "#8ef06a", "#3aaa2a"), 0.5);
      strokeEllipse(ctx, 12, -20, 8, 14, "#1f6a18", 1.8, 0.5);
      gloss(ctx, -5, -6, 3.5);
    },
    steak: function (ctx) {
      ellipse(ctx, 2, 4, 26, 18, radial(ctx, -4, -2, 2, 26, "#e09070", "#8a3020"));
      strokeEllipse(ctx, 2, 4, 26, 18, "#5a1810", 2.8);
      ellipse(ctx, 2, 4, 18, 12, radial(ctx, -2, 0, 2, 18, "#f0a880", "#c05030"));
      ellipse(ctx, -20, -6, 8, 6, radial(ctx, -22, -8, 1, 8, "#fff0d0", "#e0c090"));
      strokeEllipse(ctx, -20, -6, 8, 6, "#b89860", 1.6);
      ellipse(ctx, 22, 10, 7, 5, radial(ctx, 20, 8, 1, 7, "#fff0d0", "#e0c090"));
      strokeEllipse(ctx, 22, 10, 7, 5, "#b89860", 1.6);
      ctx.strokeStyle = "#f4e0c0";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(18, 8);
      ctx.stroke();
      gloss(ctx, -6, -4, 4);
    },
    milk: function (ctx) {
      ctx.beginPath();
      ctx.moveTo(-14, 24);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-6, -18);
      ctx.lineTo(6, -18);
      ctx.lineTo(12, -8);
      ctx.lineTo(14, 24);
      ctx.closePath();
      ctx.fillStyle = radial(ctx, -4, -4, 2, 28, "#ffffff", "#e8eef8");
      ctx.fill();
      ctx.strokeStyle = "#5a40c0";
      ctx.lineWidth = 3.2;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.fillStyle = radial(ctx, 0, -2, 1, 12, "#7ad8ff", "#2a90d0");
      ctx.fillRect(-8, -6, 16, 10);
      ctx.strokeStyle = "#1a60a0";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -6, 16, 10);
      ellipse(ctx, 0, -22, 8, 4, radial(ctx, -2, -24, 1, 8, "#fffaf0", "#e8d080"));
      strokeEllipse(ctx, 0, -22, 8, 4, "#b89840", 1.6);
      ellipse(ctx, -5, 4, 3, 8, "rgba(255,255,255,0.55)");
      gloss(ctx, -6, -10, 2.5);
    }
  };

  var SAY = {
    banana: "That's a banana",
    bamboo: "That's bamboo",
    carrot: "That's a carrot",
    apple: "That's an apple",
    leaf: "That's a leaf",
    peanut: "That's a peanut",
    fish: "That's a fish",
    corn: "That's corn",
    steak: "That's a steak",
    milk: "That's milk"
  };

  var WANT = {
    banana: "a banana",
    bamboo: "bamboo",
    carrot: "a carrot",
    apple: "an apple",
    leaf: "a leaf",
    peanut: "a peanut",
    fish: "a fish",
    corn: "corn",
    steak: "a steak",
    milk: "milk"
  };

  function draw(ctx, name, x, y, scale) {
    var fn = drawers[name] || drawers.apple;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    fn(ctx);
    ctx.restore();
  }

  global.SnackFoods = {
    names: Object.keys(drawers),
    draw: draw,
    sayWrong: function (name) { return SAY[name] || "That's food"; },
    wantPhrase: function (name) { return WANT[name] || name; }
  };
})(window);
