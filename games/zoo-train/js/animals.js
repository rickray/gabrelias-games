/* Bubble Zoo — original canvas animals. Simple shapes, high contrast. */

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

  function eye(ctx, x, y, r) {
    circle(ctx, x, y, r, "#fff");
    circle(ctx, x + r * 0.15, y + r * 0.1, r * 0.48, "#1a1a1a");
    circle(ctx, x + r * 0.32, y - r * 0.18, r * 0.16, "#fff");
  }

  function smile(ctx, x, y, w) {
    ctx.beginPath();
    ctx.arc(x, y, w, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function blush(ctx, x, y) {
    ellipse(ctx, x - 22, y + 8, 8, 5, "rgba(255,120,150,0.45)");
    ellipse(ctx, x + 22, y + 8, 8, 5, "rgba(255,120,150,0.45)");
  }

  var drawers = {
    lion: function (ctx) {
      var i;
      for (i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        ellipse(ctx, Math.cos(a) * 38, Math.sin(a) * 38, 16, 12, i % 2 ? "#ff8a1a" : "#ffb028", a);
      }
      circle(ctx, 0, 0, 30, "#ffd36a");
      ellipse(ctx, -22, -22, 10, 8, "#ffd36a");
      ellipse(ctx, 22, -22, 10, 8, "#ffd36a");
      ellipse(ctx, -22, -22, 5, 4, "#f4a0b8");
      ellipse(ctx, 22, -22, 5, 4, "#f4a0b8");
      eye(ctx, -11, -4, 7);
      eye(ctx, 11, -4, 7);
      ellipse(ctx, 0, 8, 7, 5, "#c46a20");
      smile(ctx, 0, 12, 12);
    },

    elephant: function (ctx) {
      ellipse(ctx, -36, 4, 22, 26, "#9aa6b8");
      ellipse(ctx, 36, 4, 22, 26, "#9aa6b8");
      ellipse(ctx, -36, 4, 14, 18, "#c5cedb");
      ellipse(ctx, 36, 4, 14, 18, "#c5cedb");
      circle(ctx, 0, 4, 30, "#b7c2d1");
      ctx.save();
      ctx.translate(0, 22);
      ctx.rotate(0.25);
      ellipse(ctx, 6, 22, 8, 22, "#9aa6b8");
      ellipse(ctx, 8, 22, 4, 16, "#c5cedb");
      ctx.restore();
      eye(ctx, -10, -2, 6);
      eye(ctx, 12, -2, 6);
      circle(ctx, -18, 16, 4, "#fff");
      circle(ctx, 18, 16, 4, "#fff");
    },

    giraffe: function (ctx) {
      ellipse(ctx, 0, 28, 22, 16, "#ffd24a");
      ellipse(ctx, -4, 2, 10, 26, "#ffd24a");
      circle(ctx, 2, -26, 18, "#ffd24a");
      var spots = [
        [-10, 22], [8, 30], [-6, 8], [4, -2], [-8, -28], [10, -22]
      ];
      var s;
      for (s = 0; s < spots.length; s++) {
        circle(ctx, spots[s][0], spots[s][1], 5, "#d4891a");
      }
      ellipse(ctx, -8, -42, 4, 8, "#ffd24a");
      ellipse(ctx, 10, -42, 4, 8, "#ffd24a");
      circle(ctx, -8, -50, 4, "#c46a20");
      circle(ctx, 10, -50, 4, "#c46a20");
      ellipse(ctx, -16, -30, 7, 5, "#ffd24a");
      ellipse(ctx, 16, -28, 7, 5, "#ffd24a");
      eye(ctx, -4, -28, 5);
      eye(ctx, 10, -26, 5);
      ellipse(ctx, 6, -18, 6, 4, "#e09040");
    },

    penguin: function (ctx) {
      ellipse(ctx, 0, 6, 26, 36, "#1d2430");
      ellipse(ctx, 0, 12, 18, 26, "#fff");
      ellipse(ctx, -22, 10, 10, 14, "#1d2430", -0.5);
      ellipse(ctx, 22, 10, 10, 14, "#1d2430", 0.5);
      circle(ctx, 0, -22, 16, "#1d2430");
      circle(ctx, 0, -18, 12, "#fff");
      eye(ctx, -6, -20, 5);
      eye(ctx, 6, -20, 5);
      ellipse(ctx, 0, -12, 8, 4, "#ff8a1a");
      ellipse(ctx, -10, 40, 10, 5, "#ff8a1a");
      ellipse(ctx, 10, 40, 10, 5, "#ff8a1a");
    },

    frog: function (ctx) {
      ellipse(ctx, 0, 10, 32, 24, "#5ed44a");
      circle(ctx, -16, -14, 12, "#5ed44a");
      circle(ctx, 16, -14, 12, "#5ed44a");
      eye(ctx, -16, -16, 8);
      eye(ctx, 16, -16, 8);
      ellipse(ctx, 0, 14, 16, 10, "#8ef06a");
      smile(ctx, 0, 12, 14);
      circle(ctx, -22, 8, 4, "#3aaa2a");
      circle(ctx, 22, 8, 4, "#3aaa2a");
    },

    panda: function (ctx) {
      circle(ctx, -26, -26, 14, "#1a1a1a");
      circle(ctx, 26, -26, 14, "#1a1a1a");
      circle(ctx, 0, 0, 32, "#fff");
      ellipse(ctx, -13, -6, 10, 12, "#1a1a1a", -0.3);
      ellipse(ctx, 13, -6, 10, 12, "#1a1a1a", 0.3);
      eye(ctx, -12, -4, 6);
      eye(ctx, 12, -4, 6);
      circle(ctx, 0, 8, 6, "#1a1a1a");
      smile(ctx, 0, 12, 10);
      blush(ctx, 0, 6);
    },

    bunny: function (ctx) {
      ellipse(ctx, -14, -40, 8, 22, "#fff6f0");
      ellipse(ctx, 14, -40, 8, 22, "#fff6f0");
      ellipse(ctx, -14, -40, 4, 14, "#ffb0c8");
      ellipse(ctx, 14, -40, 4, 14, "#ffb0c8");
      circle(ctx, 0, 2, 28, "#fff6f0");
      eye(ctx, -10, -2, 6);
      eye(ctx, 10, -2, 6);
      circle(ctx, 0, 8, 5, "#ff7aa0");
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
      ctx.lineWidth = 1.5;
      ctx.stroke();
      smile(ctx, 0, 12, 8);
    },

    fish: function (ctx) {
      ellipse(ctx, -4, 0, 30, 20, "#ff8a2a");
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(46, -16);
      ctx.lineTo(40, 0);
      ctx.lineTo(46, 16);
      ctx.closePath();
      ctx.fillStyle = "#ffb03a";
      ctx.fill();
      ellipse(ctx, -6, -18, 10, 7, "#ffb03a", -0.2);
      ellipse(ctx, -8, 6, 8, 5, "#ffd24a");
      eye(ctx, -18, -4, 7);
      circle(ctx, -28, 4, 3, "#ff5a7a");
    },

    owl: function (ctx) {
      ellipse(ctx, 0, 6, 28, 32, "#c47a28");
      ellipse(ctx, -16, -8, 16, 16, "#f4e0b0");
      ellipse(ctx, 16, -8, 16, 16, "#f4e0b0");
      eye(ctx, -16, -8, 9);
      eye(ctx, 16, -8, 9);
      ctx.beginPath();
      ctx.moveTo(-6, 6);
      ctx.lineTo(0, 16);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fillStyle = "#ff8a1a";
      ctx.fill();
      ellipse(ctx, -22, -30, 10, 8, "#c47a28", -0.4);
      ellipse(ctx, 22, -30, 10, 8, "#c47a28", 0.4);
    },

    pig: function (ctx) {
      circle(ctx, 0, 4, 30, "#ffb0c0");
      ellipse(ctx, -24, -22, 10, 14, "#ffb0c0");
      ellipse(ctx, 24, -22, 10, 14, "#ffb0c0");
      ellipse(ctx, -24, -22, 5, 8, "#ff88a0");
      ellipse(ctx, 24, -22, 5, 8, "#ff88a0");
      eye(ctx, -12, -4, 6);
      eye(ctx, 12, -4, 6);
      ellipse(ctx, 0, 10, 14, 10, "#ff88a0");
      circle(ctx, -5, 10, 3, "#e06080");
      circle(ctx, 5, 10, 3, "#e06080");
    },

    duck: function (ctx) {
      ellipse(ctx, 0, 14, 28, 20, "#ffe14a");
      circle(ctx, 10, -16, 16, "#ffe14a");
      ellipse(ctx, 26, -12, 14, 7, "#ff8a1a");
      eye(ctx, 12, -20, 5);
      ellipse(ctx, -18, 8, 12, 8, "#ffd24a", -0.4);
      ellipse(ctx, -8, 32, 10, 5, "#ff8a1a");
      ellipse(ctx, 8, 32, 10, 5, "#ff8a1a");
    },

    cat: function (ctx) {
      circle(ctx, 0, 4, 28, "#ffb14a");
      ctx.beginPath();
      ctx.moveTo(-24, -8);
      ctx.lineTo(-18, -36);
      ctx.lineTo(-6, -16);
      ctx.closePath();
      ctx.fillStyle = "#ffb14a";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(24, -8);
      ctx.lineTo(18, -36);
      ctx.lineTo(6, -16);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, -18, -20, 4, 8, "#ff88a0");
      ellipse(ctx, 18, -20, 4, 8, "#ff88a0");
      eye(ctx, -10, 0, 6);
      eye(ctx, 10, 0, 6);
      circle(ctx, 0, 8, 4, "#ff7aa0");
      smile(ctx, 0, 10, 8);
      blush(ctx, 0, 4);
    },

    butterfly: function (ctx) {
      ellipse(ctx, -22, -10, 18, 22, "#ff5ad5", -0.35);
      ellipse(ctx, 22, -10, 18, 22, "#ff5ad5", 0.35);
      ellipse(ctx, -20, 16, 14, 16, "#7a6bff", 0.25);
      ellipse(ctx, 20, 16, 14, 16, "#7a6bff", -0.25);
      circle(ctx, -20, -12, 6, "#ffe14a");
      circle(ctx, 20, -12, 6, "#ffe14a");
      ellipse(ctx, 0, 4, 6, 28, "#3a2010");
      circle(ctx, 0, -24, 7, "#3a2010");
      eye(ctx, -3, -25, 3);
      eye(ctx, 3, -25, 3);
    },

    turtle: function (ctx) {
      ellipse(ctx, 0, 4, 30, 24, "#3aaa2a");
      ellipse(ctx, 0, 4, 22, 16, "#8ed44a");
      circle(ctx, -8, 0, 6, "#2a8a20");
      circle(ctx, 8, 4, 5, "#2a8a20");
      circle(ctx, 0, 10, 5, "#2a8a20");
      circle(ctx, 26, 2, 12, "#5ed44a");
      eye(ctx, 30, -2, 4);
      ellipse(ctx, -8, 26, 8, 5, "#5ed44a");
      ellipse(ctx, 10, 26, 8, 5, "#5ed44a");
      ellipse(ctx, -26, 12, 8, 5, "#5ed44a");
    },

    bee: function (ctx) {
      ellipse(ctx, 0, 4, 24, 18, "#ffe14a");
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-8, -12, 6, 32);
      ctx.fillRect(4, -12, 6, 32);
      ellipse(ctx, -10, -16, 14, 10, "rgba(180,220,255,0.85)", -0.4);
      ellipse(ctx, 10, -16, 14, 10, "rgba(180,220,255,0.85)", 0.4);
      circle(ctx, 22, 0, 8, "#ffe14a");
      eye(ctx, 24, -2, 4);
      ellipse(ctx, -26, 4, 8, 5, "#1a1a1a");
    },

    monkey: function (ctx) {
      circle(ctx, -26, -8, 14, "#b56a32");
      circle(ctx, 26, -8, 14, "#b56a32");
      circle(ctx, 0, 0, 28, "#c47a3a");
      ellipse(ctx, 0, 10, 20, 16, "#f0c8a0");
      ellipse(ctx, -10, -6, 8, 8, "#f0c8a0");
      ellipse(ctx, 10, -6, 8, 8, "#f0c8a0");
      eye(ctx, -10, -6, 6);
      eye(ctx, 10, -6, 6);
      ellipse(ctx, 0, 12, 7, 5, "#c47a3a");
      smile(ctx, 0, 14, 10);
    }
  };

  var NAMES = Object.keys(drawers);

  function draw(ctx, name, x, y, scale, t) {
    var fn = drawers[name] || drawers.panda;
    ctx.save();
    ctx.translate(x, y);
    var bounce = Math.sin(t * 10) * 6;
    var wiggle = Math.sin(t * 7) * 0.12;
    ctx.translate(0, bounce);
    ctx.rotate(wiggle);
    ctx.scale(scale, scale);
    fn(ctx);
    ctx.restore();
  }

  global.BubbleAnimals = {
    names: NAMES,
    draw: draw
  };
})(window);
