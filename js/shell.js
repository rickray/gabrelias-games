/* Gabrelia's Games — shared game shell.

   Every game is one full-screen canvas with the same needs: size to the
   device pixel ratio, turn a touch anywhere into game coordinates, run a
   frame loop, and wire the two corner buttons. That lives here once, so a
   game file only contains the game.

   Usage:

     GGShell.mount({
       canvas: canvas,
       ctx: ctx,
       resize: function (w, h) { ... },   // after every size change
       start: function () { ... },        // once, after the first resize
       tap: function (x, y) { ... },      // a touch, in game coordinates
       frame: function (dt, time) { ... } // dt and time are seconds
     });

   The loop stops while the app is in the background, so a tablet left on a
   game screen is not burning battery drawing frames nobody can see. */

(function (global) {
  "use strict";

  var TAP_GAP = 40;        /* ms; ignores the double events touch screens send */
  var MAX_DPR = 2;         /* past this the Fire HD gains nothing but heat */
  var MAX_STEP = 0.033;    /* clamp dt so a stall cannot teleport anything */

  /* The two corner buttons. The hub page has a sound toggle too, so this is
     callable on its own, without a canvas. */
  function wireControls() {
    var muteBtn = document.getElementById("mute");

    function syncMute() {
      var m = GGAudio.isMuted();
      muteBtn.classList.toggle("muted", m);
      muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
      muteBtn.setAttribute("aria-label", m ? "Turn sound on" : "Turn sound off");
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        GGAudio.unlock();
        var quiet = !GGAudio.isMuted();
        GGAudio.setMuted(quiet);
        /* Unmuting clicks back, so a child hears that it worked. */
        if (!quiet) GGAudio.tap();
        syncMute();
      });
      syncMute();
    }

    var homeBtn = document.querySelector(".home-btn");
    if (homeBtn) {
      /* Never let a voice follow the child out of the game. */
      homeBtn.addEventListener("click", function () { GGAudio.hush(); });
    }
  }

  function mount(opts) {
    var canvas = opts.canvas;
    var ctx = opts.ctx;

    var width = 0;
    var height = 0;
    var lastTap = 0;
    var lastFrame = 0;
    var elapsed = 0;
    var raf = 0;
    var resizeTimer = 0;

    function size() {
      var vw = global.innerWidth;
      var vh = global.innerHeight;
      var dpr = Math.max(1, Math.min(MAX_DPR, global.devicePixelRatio || 1));
      width = vw;
      height = vh;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = vw + "px";
      canvas.style.height = vh + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opts.resize) opts.resize(width, height);
    }

    function frame(now) {
      var dt = Math.min(MAX_STEP, (now - lastFrame) / 1000);
      lastFrame = now;
      elapsed += dt;
      if (opts.frame) opts.frame(dt, elapsed);
      raf = global.requestAnimationFrame(frame);
    }

    function run() {
      if (raf) return;
      lastFrame = global.performance ? performance.now() : Date.now();
      raf = global.requestAnimationFrame(frame);
    }

    function halt() {
      if (!raf) return;
      global.cancelAnimationFrame(raf);
      raf = 0;
    }

    function point(e) {
      var rect = canvas.getBoundingClientRect();
      var src = e;
      if (e.changedTouches && e.changedTouches[0]) src = e.changedTouches[0];
      return {
        x: (src.clientX - rect.left) * (width / rect.width),
        y: (src.clientY - rect.top) * (height / rect.height)
      };
    }

    function onTap(e) {
      e.preventDefault();
      var t = global.performance ? performance.now() : Date.now();
      if (t - lastTap < TAP_GAP) return;
      lastTap = t;
      /* Audio can only start from inside a real gesture, so every touch
         tries again until it takes. */
      GGAudio.unlock();
      if (!opts.tap) return;
      var p = point(e);
      opts.tap(p.x, p.y);
    }

    wireControls();

    /* ------------------------------------------------------------- events */

    if (global.PointerEvent) {
      canvas.addEventListener("pointerdown", onTap, { passive: false });
    } else {
      canvas.addEventListener("touchstart", onTap, { passive: false });
      canvas.addEventListener("mousedown", onTap);
    }
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    global.addEventListener("resize", size);
    global.addEventListener("orientationchange", function () {
      /* The reported size lags the rotation on Fire tablets. */
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 200);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) halt();
      else run();
    });

    size();
    if (opts.start) opts.start();
    run();
  }

  global.GGShell = { mount: mount, wireControls: wireControls };
})(window);
