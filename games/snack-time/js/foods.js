/* Snack Time — simple canvas foods. */

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

  var drawers = {
    banana: function (ctx) {
      ctx.save();
      ctx.rotate(-0.4);
      ellipse(ctx, 0, 4, 12, 30, "#ffe14a");
      ellipse(ctx, -4, 4, 6, 24, "#fff3a0");
      ellipse(ctx, 0, -28, 6, 5, "#c4a020");
      ellipse(ctx, 2, 32, 5, 4, "#c4a020");
      ctx.restore();
    },
    bamboo: function (ctx) {
      var i;
      for (i = -1; i <= 1; i++) {
        ellipse(ctx, i * 14, 2, 7, 28, i === 0 ? "#7ed957" : "#5ec64a");
        ctx.fillStyle = "#2f8a28";
        ctx.fillRect(i * 14 - 7, -8, 14, 3);
        ctx.fillRect(i * 14 - 7, 10, 14, 3);
      }
      ellipse(ctx, -8, -30, 8, 5, "#3aaa2a", -0.5);
      ellipse(ctx, 10, -28, 8, 5, "#3aaa2a", 0.4);
    },
    carrot: function (ctx) {
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(-14, -10);
      ctx.lineTo(14, -10);
      ctx.closePath();
      ctx.fillStyle = "#ff8a1a";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(-10, -32);
      ctx.lineTo(-1, -16);
      ctx.lineTo(2, -34);
      ctx.lineTo(8, -16);
      ctx.lineTo(12, -30);
      ctx.lineTo(6, -10);
      ctx.closePath();
      ctx.fillStyle = "#4de06a";
      ctx.fill();
    },
    apple: function (ctx) {
      circle(ctx, -8, 4, 18, "#ff4d5a");
      circle(ctx, 8, 4, 18, "#ff4d5a");
      ellipse(ctx, 0, 6, 20, 18, "#ff6a6a");
      ctx.strokeStyle = "#6a3a10";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(6, -22, 2, -28);
      ctx.stroke();
      ellipse(ctx, 12, -20, 8, 5, "#5ed44a", 0.5);
    },
    leaf: function (ctx) {
      ctx.save();
      ctx.rotate(-0.4);
      ellipse(ctx, 0, 0, 14, 30, "#5ed44a");
      ellipse(ctx, -3, 0, 6, 22, "#8ef06a");
      ctx.strokeStyle = "#2f8a28";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, -26);
      ctx.stroke();
      ctx.restore();
    },
    peanut: function (ctx) {
      ellipse(ctx, 0, -10, 14, 16, "#e0b060");
      ellipse(ctx, 0, 12, 13, 15, "#d4a050");
      ellipse(ctx, -4, -12, 6, 8, "#f0d090");
      ellipse(ctx, -3, 12, 5, 7, "#f0d090");
    },
    fish: function (ctx) {
      ellipse(ctx, -4, 0, 22, 14, "#2ec5ff");
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(34, -12);
      ctx.lineTo(28, 0);
      ctx.lineTo(34, 12);
      ctx.closePath();
      ctx.fillStyle = "#5ad8ff";
      ctx.fill();
      circle(ctx, -14, -3, 4, "#fff");
      circle(ctx, -13, -3, 2, "#1a1a1a");
      ellipse(ctx, -6, 4, 5, 3, "#ff8a1a");
    },
    corn: function (ctx) {
      ellipse(ctx, 0, 6, 14, 26, "#ffe14a");
      var r, c;
      for (r = -2; r <= 3; r++) {
        for (c = -1; c <= 1; c++) {
          circle(ctx, c * 7 + (r % 2 ? 2 : 0), r * 8, 3.2, "#ffd24a");
        }
      }
      ellipse(ctx, -12, -20, 8, 14, "#5ed44a", -0.5);
      ellipse(ctx, 12, -20, 8, 14, "#5ed44a", 0.5);
    },
    steak: function (ctx) {
      ellipse(ctx, 2, 4, 26, 18, "#c46a4a");
      ellipse(ctx, 2, 4, 18, 12, "#e09060");
      ellipse(ctx, -20, -6, 8, 6, "#f0d8b0");
      ellipse(ctx, 22, 10, 7, 5, "#f0d8b0");
      ctx.strokeStyle = "#f4e0c0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(18, 8);
      ctx.stroke();
    },
    milk: function (ctx) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(-14, 24);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-6, -18);
      ctx.lineTo(6, -18);
      ctx.lineTo(12, -8);
      ctx.lineTo(14, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#7a5cff";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#2ec5ff";
      ctx.fillRect(-8, -6, 16, 10);
      ellipse(ctx, 0, -22, 8, 4, "#fff6c8");
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
