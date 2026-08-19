/* Bubble Zoo — pop, then say the animal's name. Uses the device's built-in voice. */

(function (global) {
  "use strict";

  var ctx = null;
  var unlocked = false;
  var master = null;
  var voicesReady = false;

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

  var NAMES = {
    lion: "lion",
    elephant: "elephant",
    giraffe: "giraffe",
    penguin: "penguin",
    frog: "frog",
    panda: "panda",
    bunny: "bunny",
    fish: "fish",
    owl: "owl",
    pig: "pig",
    duck: "duck",
    cat: "cat",
    butterfly: "butterfly",
    turtle: "turtle",
    bee: "bee",
    monkey: "monkey"
  };

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
    voicesReady = true;
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
      /* Some tablets only start voices after a speak() in the tap. */
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

  function pop() {
    if (!ensure()) return;
    var t = t0();
    var rate = ctx.sampleRate;
    var dur = 0.1;
    var length = Math.max(1, Math.floor(rate * (dur + 0.05)));
    var buffer = ctx.createBuffer(1, length, rate);
    var data = buffer.getChannelData(0);
    var i;
    for (i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.value = 0.7;
    var g = env(t, 0.34, 0.006, 0.02, dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);

    var o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.11);
    var og = env(t, 0.2, 0.01, 0.02, 0.1);
    o.connect(og);
    og.connect(master);
    o.start(t);
    o.stop(t + 0.14);
  }

  function speakName(name) {
    if (muted || !global.speechSynthesis) return;
    var text = NAMES[name] || String(name || "");
    if (!text) return;
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.86;
      u.pitch = 1.2;
      u.volume = 1;
      var voice = pickVoice();
      if (voice) u.voice = voice;
      global.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function animal(name) {
    speakName(name);
  }

  global.BubbleAudio = {
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    setMuted: setMuted,
    isMuted: function () { return muted; },
    pop: pop,
    animal: animal
  };
})(window);
