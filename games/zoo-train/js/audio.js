/* Zoo Train — unlock, speak, toot, chug. */

(function (global) {
  "use strict";

  var ctx = null;
  var unlocked = false;
  var master = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    return ctx;
  }

  function loadVoices() {
    if (!global.speechSynthesis) return;
    global.speechSynthesis.getVoices();
  }

  if (global.speechSynthesis) {
    loadVoices();
    if (global.speechSynthesis.onvoiceschanged !== undefined) {
      global.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function pickVoice() {
    if (!global.speechSynthesis) return null;
    var voices = global.speechSynthesis.getVoices() || [];
    var i, v, score, best = null, bestScore = -1;
    for (i = 0; i < voices.length; i++) {
      v = voices[i];
      score = 0;
      var name = (v.name || "").toLowerCase();
      var lang = (v.lang || "").toLowerCase();
      if (lang.indexOf("en") === 0) score += 5;
      if (lang.indexOf("en-us") === 0 || lang.indexOf("en_us") === 0) score += 2;
      if (name.indexOf("female") !== -1 || name.indexOf("woman") !== -1) score += 3;
      if (name.indexOf("samantha") !== -1 || name.indexOf("karen") !== -1 ||
          name.indexOf("moira") !== -1 || name.indexOf("zira") !== -1 ||
          name.indexOf("susan") !== -1 || name.indexOf("salli") !== -1 ||
          name.indexOf("jenny") !== -1 || name.indexOf("aria") !== -1 ||
          name.indexOf("child") !== -1 || name.indexOf("girl") !== -1) score += 4;
      if (v.localService) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  function unlock() {
    var c = ensure();
    if (c && c.state === "suspended") c.resume();
    unlocked = true;
    loadVoices();
    if (global.speechSynthesis) {
      global.speechSynthesis.cancel();
    }
  }

  function t0() {
    return ctx ? ctx.currentTime : 0;
  }

  function env(start, peak, attack, hold, release) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), start + attack);
    g.gain.setValueAtTime(Math.max(0.001, peak), start + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    return g;
  }

  function toot() {
    if (!ensure()) return;
    var t = t0();
    var notes = [
      { f: 392, d: 0.18, wait: 0 },
      { f: 330, d: 0.28, wait: 0.16 }
    ];
    var i;
    for (i = 0; i < notes.length; i++) {
      (function (n) {
        var when = t + n.wait;
        var o = ctx.createOscillator();
        o.type = "square";
        o.frequency.setValueAtTime(n.f, when);
        var g = env(when, 0.14, 0.02, n.d * 0.4, n.d * 0.5);
        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        o.connect(filter);
        filter.connect(g);
        g.connect(master);
        o.start(when);
        o.stop(when + n.d + 0.05);
      })(notes[i]);
    }
  }

  function chug() {
    if (!ensure()) return;
    var t = t0();
    var i;
    for (i = 0; i < 10; i++) {
      (function (when, peak) {
        var o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(90, when);
        o.frequency.exponentialRampToValueAtTime(55, when + 0.08);
        var g = env(when, peak, 0.008, 0.02, 0.07);
        o.connect(g);
        g.connect(master);
        o.start(when);
        o.stop(when + 0.12);
      })(t + i * 0.12, 0.18 - i * 0.008);
    }
  }

  function speak(text, delay) {
    if (!global.speechSynthesis) return;
    var go = function () {
      try {
        global.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(String(text || ""));
        u.lang = "en-US";
        u.rate = 0.86;
        u.pitch = 1.2;
        u.volume = 1;
        var voice = pickVoice();
        if (voice) u.voice = voice;
        global.speechSynthesis.speak(u);
      } catch (e) {}
    };
    if (delay) setTimeout(go, delay);
    else go();
  }

  global.TrainAudio = {
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    speak: speak,
    toot: toot,
    chug: chug
  };
})(window);
