/* Hide and Seek — unlock, speak, sparkle, wiggle. */

(function (global) {
  "use strict";

  var ctx = null;
  var unlocked = false;
  var master = null;

  var MUTE_KEY = "gg-muted";
  var muted = false;
  try {
    muted = !!(global.localStorage && global.localStorage.getItem(MUTE_KEY) === "1");
  } catch (e) {}

  function applyMute() {
    if (master) master.gain.value = muted ? 0 : 0.55;
  }

  function setMuted(m) {
    muted = !!m;
    try {
      if (global.localStorage) global.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (e) {}
    applyMute();
    if (muted && global.speechSynthesis) global.speechSynthesis.cancel();
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
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

  function sparkle() {
    if (!ensure()) return;
    var t = t0();
    var notes = [880, 1174, 1568, 1976];
    var i;
    for (i = 0; i < notes.length; i++) {
      (function (freq, when) {
        var o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, when);
        var g = env(when, 0.16, 0.01, 0.03, 0.14);
        o.connect(g);
        g.connect(master);
        o.start(when);
        o.stop(when + 0.2);
      })(notes[i], t + i * 0.055);
    }
  }

  function wiggle() {
    if (!ensure()) return;
    var t = t0();
    var o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.14);
    var g = env(t, 0.16, 0.01, 0.03, 0.12);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.18);
  }

  function speak(text, delay) {
    if (!global.speechSynthesis) return;
    var go = function () {
      if (muted) return;
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

  global.HideAudio = {
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    setMuted: setMuted,
    isMuted: function () { return muted; },
    speak: speak,
    sparkle: sparkle,
    wiggle: wiggle
  };
})(window);
