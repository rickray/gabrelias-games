/* Gabrelia's Games — shared sound engine.

   One engine for every game. Two jobs:

   1. Sound effects, synthesised live (no audio files to download).
      Everything runs through a shared bus: reverb for depth, a compressor
      and a soft clipper so overlapping sounds never crackle on a tablet
      speaker, then a master gain that fades instead of snapping.

   2. The speaking voice, via the device's own speech synthesis.
      Tablets are fussy here, so this file works around the two real bugs:
      cancel() immediately followed by speak() drops the utterance, and the
      voice list arrives asynchronously (so the first word would otherwise
      come out in whatever default, often male, voice was loaded).

   Sound effects are pitched from a C major pentatonic ladder, so nothing
   ever clashes, and reward sounds climb a step per correct answer. */

(function (global) {
  "use strict";

  var MUTE_KEY = "gg-muted";
  var MASTER_LEVEL = 0.72;   /* full volume of the master bus */
  var DUCK_LEVEL = 0.3;      /* effects bus volume while the voice talks */
  var REVERB_SEND = 0.16;
  var VOICE_LEVEL = 1.15;    /* baked lines sit a little above the effects */

  var ctx = null;
  var master = null;   /* mute + master volume */
  var mix = null;      /* everything lands here before the safety chain */
  var sfx = null;      /* effects only, ducked under speech */
  var send = null;     /* effects -> reverb */
  var voiceBus = null; /* spoken lines, filtered for a small speaker */

  var unlocked = false;
  var noise = null;    /* one reusable noise buffer, never re-allocated */
  var shaper = null;

  var muted = false;
  try {
    muted = !!(global.localStorage && global.localStorage.getItem(MUTE_KEY) === "1");
  } catch (e) {}

  /* ---------------------------------------------------------------- notes */

  /* C major pentatonic, in semitones above C5. Nothing here can sound sour. */
  var C5 = 523.251;
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  var streak = 0;      /* correct answers in a row; reward pitch climbs */
  var STREAK_CAP = 5;  /* stop climbing before it gets shrill */

  function note(step) {
    var i = Math.max(0, Math.min(PENTA.length - 1, step | 0));
    return C5 * Math.pow(2, PENTA[i] / 12);
  }

  /* A few cents of drift keeps repeated taps from sounding like a machine. */
  function human(freq) {
    return freq * Math.pow(2, (Math.random() * 16 - 8) / 1200);
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  /* ---------------------------------------------------------------- graph */

  function softCurve() {
    /* tanh-shaped limiter: loud peaks lean over instead of squaring off. */
    var n = 1024;
    var curve = new Float32Array(n);
    var k = 1.8;
    var top = Math.tanh(k);
    var i, x;
    for (i = 0; i < n; i++) {
      x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / top;
    }
    return curve;
  }

  function reverb(input, out) {
    /* Three short delay lines with damped feedback. Far cheaper than a
       convolver, which matters on a Fire tablet, and plenty for a toy: it
       just stops every sound landing bone dry. */
    var times = [0.0297, 0.0411, 0.0533];
    var pans = [-0.55, 0.55, 0];
    var i, delay, damp, fb, panner;
    for (i = 0; i < times.length; i++) {
      delay = ctx.createDelay(0.2);
      delay.delayTime.value = times[i];
      damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = 2600;
      fb = ctx.createGain();
      fb.gain.value = 0.55;

      input.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);       /* the tail */

      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.value = pans[i];
        damp.connect(panner);
        panner.connect(out);
      } else {
        damp.connect(out);
      }
    }
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }

    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_LEVEL;

    shaper = ctx.createWaveShaper();
    shaper.curve = softCurve();
    if ("oversample" in shaper) shaper.oversample = "2x";

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.14;

    mix = ctx.createGain();
    sfx = ctx.createGain();
    send = ctx.createGain();
    send.gain.value = REVERB_SEND;

    /* The spoken lines get their own path: a high-pass to lose rumble the
       tablet speaker cannot reproduce anyway, and a presence lift so words
       stay clear over the effects. The voice is never ducked; the effects
       duck under it. */
    var cut = ctx.createBiquadFilter();
    cut.type = "highpass";
    cut.frequency.value = 110;
    var presence = ctx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 3200;
    presence.Q.value = 0.9;
    presence.gain.value = 3.5;
    voiceBus = ctx.createGain();
    voiceBus.gain.value = VOICE_LEVEL;
    voiceBus.connect(cut);
    cut.connect(presence);
    presence.connect(mix);

    sfx.connect(mix);
    sfx.connect(send);
    reverb(send, mix);
    mix.connect(comp);
    comp.connect(shaper);
    shaper.connect(master);
    master.connect(ctx.destination);

    /* One second of noise, reused by every sound that needs it. */
    var len = Math.floor(ctx.sampleRate);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noise.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function fade(param, to, seconds) {
    var t = now();
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(to, t + seconds);
  }

  /* ------------------------------------------------------------- building */

  /* Sound effects are short-lived node graphs. Everything created here is
     disconnected when the source ends, so nothing accumulates over a long
     session on a low-memory tablet. */

  function env(when, peak, attack, hold, release) {
    var g = ctx.createGain();
    var p = Math.max(0.0005, peak);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(p, when + attack);
    g.gain.setValueAtTime(p, when + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
    g.gain.setValueAtTime(0, when + attack + hold + release + 0.001);
    return g;
  }

  function cleanup(src, nodes) {
    src.onended = function () {
      var i;
      src.onended = null;
      try { src.disconnect(); } catch (e) {}
      for (i = 0; i < nodes.length; i++) {
        try { nodes[i].disconnect(); } catch (e) {}
      }
    };
  }

  /* One oscillator voice. `slide` is an optional target frequency. */
  function tone(opts) {
    var when = opts.when;
    var dur = opts.attack + opts.hold + opts.release;
    var o = ctx.createOscillator();
    o.type = opts.type || "sine";
    o.frequency.setValueAtTime(opts.freq, when);
    if (opts.slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), when + (opts.slideTime || dur));
    }
    var g = env(when, opts.peak, opts.attack, opts.hold, opts.release);
    var nodes = [g];
    var tail = g;
    if (opts.cutoff) {
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = opts.cutoff;
      g.connect(lp);
      nodes.push(lp);
      tail = lp;
    }
    o.connect(g);
    tail.connect(sfx);
    cleanup(o, nodes);
    o.start(when);
    o.stop(when + dur + 0.02);
    return dur;
  }

  /* A slice of the cached noise buffer through a band-pass sweep. */
  function breath(opts) {
    var when = opts.when;
    var dur = opts.attack + opts.hold + opts.release;
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var band = ctx.createBiquadFilter();
    band.type = opts.filter || "bandpass";
    band.frequency.setValueAtTime(opts.freq, when);
    if (opts.slide) {
      band.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slide), when + dur);
    }
    band.Q.value = opts.q || 1;
    var g = env(when, opts.peak, opts.attack, opts.hold, opts.release);
    src.connect(band);
    band.connect(g);
    g.connect(sfx);
    cleanup(src, [band, g]);
    src.start(when, rand(0, 0.9 - Math.min(0.8, dur)), dur + 0.05);
    return dur;
  }

  /* A bell: fundamental plus a quieter octave, which is what makes a
     synthesised note read as "sparkle" rather than "beep". */
  function bell(freq, when, peak, release) {
    tone({ when: when, freq: freq, type: "sine", peak: peak, attack: 0.008, hold: 0.02, release: release });
    tone({ when: when, freq: freq * 2, type: "sine", peak: peak * 0.3, attack: 0.006, hold: 0.01, release: release * 0.7 });
  }

  function live() {
    if (muted) return false;
    return !!ensure();
  }

  /* --------------------------------------------------------------- sounds */

  /* Bubble pop: a wet click plus a quick downward blip, randomised so a
     handful of pops in a row still sound like separate bubbles. */
  function pop() {
    if (!live()) return;
    var t = now();
    var centre = rand(1500, 2400);
    breath({ when: t, freq: centre, slide: centre * 0.4, q: 5, peak: 0.42, attack: 0.004, hold: 0.012, release: 0.07 });
    tone({
      when: t, freq: human(rand(620, 880)), slide: 170, slideTime: 0.1,
      type: "sine", peak: 0.34, attack: 0.005, hold: 0.015, release: 0.1
    });
  }

  /* Reward: a rising run up the pentatonic ladder, starting a step higher
     for every correct answer in a row. */
  function sparkle() {
    if (!live()) return;
    var t = now();
    var base = Math.min(streak, STREAK_CAP);
    var i;
    for (i = 0; i < 4; i++) {
      bell(human(note(base + i)), t + i * 0.06, 0.2, 0.34);
    }
    bell(human(note(base + 6)), t + 0.26, 0.1, 0.6);
    streak++;
  }

  /* Eating: two soft munches, then a small reward run. */
  function yum() {
    if (!live()) return;
    var t = now();
    tone({ when: t, freq: 250, slide: 150, type: "triangle", peak: 0.22, attack: 0.01, hold: 0.02, release: 0.1, cutoff: 900 });
    tone({ when: t + 0.13, freq: 210, slide: 125, type: "triangle", peak: 0.2, attack: 0.01, hold: 0.02, release: 0.1, cutoff: 900 });
    var base = Math.min(streak, STREAK_CAP);
    var i;
    for (i = 0; i < 3; i++) {
      bell(human(note(base + i + 1)), t + 0.3 + i * 0.07, 0.19, 0.3);
    }
    streak++;
  }

  /* Gentle "not that one": a gliding minor third down, never a buzzer. */
  function wiggle() {
    if (!live()) return;
    var t = now();
    streak = 0;
    tone({ when: t, freq: 392, slide: 330, type: "triangle", peak: 0.19, attack: 0.012, hold: 0.05, release: 0.12, cutoff: 1600 });
    tone({ when: t + 0.16, freq: 330, slide: 262, type: "triangle", peak: 0.17, attack: 0.012, hold: 0.05, release: 0.16, cutoff: 1400 });
  }

  /* Soft rubber bump, with a smaller second hop. */
  function bounce() {
    if (!live()) return;
    var t = now();
    streak = 0;
    tone({ when: t, freq: 330, slide: 150, type: "sine", peak: 0.27, attack: 0.006, hold: 0.02, release: 0.13 });
    tone({ when: t + 0.11, freq: 260, slide: 130, type: "sine", peak: 0.15, attack: 0.006, hold: 0.01, release: 0.1 });
  }

  /* Train whistle: two detuned reeds a fifth apart, with a breath of steam
     underneath and a slow attack, so it swells like a real whistle. */
  function toot() {
    if (!live()) return;
    var t = now();
    var blasts = [
      { at: 0, hold: 0.1, release: 0.16, gain: 1 },
      { at: 0.2, hold: 0.16, release: 0.26, gain: 0.85 }
    ];
    var i, b, f;
    for (i = 0; i < blasts.length; i++) {
      b = blasts[i];
      f = human(i === 0 ? 392 : 330);
      tone({ when: t + b.at, freq: f, type: "square", peak: 0.12 * b.gain, attack: 0.045, hold: b.hold, release: b.release, cutoff: 1300 });
      tone({ when: t + b.at, freq: f * 1.5 * 1.004, type: "square", peak: 0.07 * b.gain, attack: 0.05, hold: b.hold, release: b.release, cutoff: 1500 });
      breath({ when: t + b.at, freq: 1800, q: 0.8, peak: 0.05 * b.gain, attack: 0.04, hold: b.hold, release: b.release * 0.8 });
    }
  }

  /* Departing train: steam and thump, speeding up as it pulls away. */
  function chug() {
    if (!live()) return;
    var t = now();
    var at = 0;
    var gap = 0.17;
    var i;
    for (i = 0; i < 9; i++) {
      var level = 1 - i * 0.07;
      tone({ when: t + at, freq: 92, slide: 54, type: "triangle", peak: 0.19 * level, attack: 0.006, hold: 0.02, release: 0.08 });
      breath({ when: t + at, freq: 900, slide: 2400, q: 0.7, peak: 0.11 * level, attack: 0.008, hold: 0.02, release: 0.09 });
      at += gap;
      gap = Math.max(0.1, gap - 0.009);
    }
  }

  /* Round complete: a bright triad stab with a ringing top note. */
  function cheer() {
    if (!live()) return;
    var t = now();
    var chord = [0, 2, 4, 7];
    var i;
    for (i = 0; i < chord.length; i++) {
      bell(human(note(chord[i])), t + i * 0.05, 0.16, 0.7);
    }
    bell(human(note(10)), t + 0.24, 0.12, 0.9);
  }

  /* Movement, transitions. */
  function whoosh() {
    if (!live()) return;
    breath({ when: now(), freq: 420, slide: 2800, q: 0.6, peak: 0.12, attack: 0.09, hold: 0.05, release: 0.28 });
  }

  /* Buttons. Quiet on purpose — it is feedback, not an event. */
  function tap() {
    if (!live()) return;
    var t = now();
    tone({ when: t, freq: human(note(5)), type: "sine", peak: 0.11, attack: 0.004, hold: 0.01, release: 0.06 });
  }

  /* -------------------------------------------------------- home theme

     Twinkle Twinkle Little Star (public domain) as a quiet music box.
     Tablets will not autoplay, so the hub starts this from a real tap.
     Phrases are scheduled a bar at a time so mute/leave can cut it. */

  var TWINKLE = [
    [0, 0, 7, 7, 9, 9, 7],
    [5, 5, 4, 4, 2, 2, 0],
    [7, 7, 5, 5, 4, 4, 2],
    [7, 7, 5, 5, 4, 4, 2],
    [0, 0, 7, 7, 9, 9, 7],
    [5, 5, 4, 4, 2, 2, 0]
  ];
  var THEME_BEAT = 0.46;
  var themeOn = false;
  var themeTimer = 0;
  var themeGen = 0;

  function plink(semi, when, long) {
    var freq = C5 * Math.pow(2, semi / 12);
    var peak = long ? 0.12 : 0.09;
    var rel = long ? 0.7 : 0.38;
    tone({ when: when, freq: freq, type: "sine", peak: peak, attack: 0.016, hold: 0.03, release: rel });
    tone({ when: when, freq: freq * 2, type: "sine", peak: peak * 0.26, attack: 0.012, hold: 0.02, release: rel * 0.65 });
  }

  function stopWelcome() {
    themeOn = false;
    themeGen++;
    if (themeTimer) {
      clearTimeout(themeTimer);
      themeTimer = 0;
    }
  }

  function welcome() {
    if (muted || themeOn) return;
    if (!ensure()) return;
    themeOn = true;
    var gen = themeGen;
    var phrase = 0;

    function bar() {
      if (gen !== themeGen || !themeOn || muted) return;
      var notes = TWINKLE[phrase];
      var t = now() + 0.03;
      var at = 0;
      var i, long, freq;
      for (i = 0; i < notes.length; i++) {
        long = i === notes.length - 1;
        plink(notes[i], t + at, long);
        if (i === 0) {
          freq = C5 * Math.pow(2, notes[i] / 12) / 2;
          tone({ when: t + at, freq: freq, type: "sine", peak: 0.05, attack: 0.02, hold: 0.06, release: 0.85 });
        }
        at += long ? THEME_BEAT * 2 : THEME_BEAT;
      }
      phrase++;
      if (phrase >= TWINKLE.length) {
        phrase = 0;
        at += 1.4;
      }
      themeTimer = setTimeout(bar, at * 1000);
    }
    bar();
  }

  /* ------------------------------------------------------------ baked voice

     Every line the games speak is pre-recorded into voice/*.m4a by
     tools/bake-voice.mjs. Playing those instead of the tablet's own
     text-to-speech means one chosen voice on every device, no network, no
     waiting for a voice list, and the words run through the same mixer as
     the effects. Anything with no clip still falls back to the device.

     Sentences are stored as reusable fragments, so "The lion wants a banana"
     is matched as "The lion wants" + "a banana" rather than needing a clip
     for all 160 combinations. */

  var clips = null;      /* spoken text -> file name */
  var clipKeys = [];     /* the same keys, longest first, for matching */
  var clipBase = "";
  var buffers = {};      /* file name -> decoded AudioBuffer */
  var playing = [];      /* sources for the line being spoken */
  var generation = 0;    /* bumped on every interrupt, to strand stale loads */

  /* The games live in games/<name>/, the hub at the root, and both load this
     file by relative path. Derive the clip folder from our own <script> src
     so neither has to be told where it is. */
  function findBase() {
    var list = document.getElementsByTagName("script");
    var tail = "js/audio.js";
    var i, src;
    for (i = 0; i < list.length; i++) {
      src = list[i].getAttribute("src") || "";
      if (src.slice(-tail.length) === tail) return src.slice(0, -tail.length) + "voice/";
    }
    return "voice/";
  }

  function loadIndex() {
    if (!global.fetch) return;
    clipBase = findBase();
    global.fetch(clipBase + "index.json").then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      if (!data || !data.clips) return;
      clips = data.clips;
      clipKeys = Object.keys(clips).sort(function (a, b) { return b.length - a.length; });
    })["catch"](function () {});
  }

  loadIndex();

  /* Split a line into clips we actually have, longest match first.
     Returns null if any part of it is unavailable. */
  function segment(text) {
    var rest = text;
    var files = [];
    var i, key, hit;
    while (rest.length) {
      if (rest.charAt(0) === " ") {
        rest = rest.slice(1);
        continue;
      }
      hit = null;
      for (i = 0; i < clipKeys.length; i++) {
        key = clipKeys[i];
        if (rest.length >= key.length && rest.slice(0, key.length) === key) {
          hit = key;
          break;
        }
      }
      if (!hit) return null;
      files.push(clips[hit]);
      rest = rest.slice(hit.length);
    }
    return files.length ? files : null;
  }

  function fetchBuffer(file) {
    if (buffers[file]) return Promise.resolve(buffers[file]);
    return global.fetch(clipBase + file).then(function (res) {
      if (!res.ok) throw new Error("missing clip");
      return res.arrayBuffer();
    }).then(function (bytes) {
      return new Promise(function (resolve, reject) {
        /* Older Chromium only has the callback form of decodeAudioData. */
        var out = ctx.decodeAudioData(bytes, function (buf) { resolve(buf); }, reject);
        if (out && out.then) out.then(resolve, reject);
      });
    }).then(function (buf) {
      buffers[file] = buf;
      return buf;
    });
  }

  function stopClips() {
    var i;
    for (i = 0; i < playing.length; i++) {
      try { playing[i].onended = null; playing[i].stop(0); } catch (e) {}
      try { playing[i].disconnect(); } catch (e) {}
    }
    playing.length = 0;
  }

  function clipsBusy() {
    return playing.length > 0;
  }

  /* Play a line as clips. Returns false when it cannot, so the caller can
     fall back to the device voice. */
  function playClips(item) {
    if (!clips || !ensure()) return false;
    var files = segment(item.text);
    if (!files) return false;

    var gen = ++generation;
    var loads = [];
    var i;
    for (i = 0; i < files.length; i++) loads.push(fetchBuffer(files[i]));

    Promise.all(loads).then(function (bufs) {
      if (gen !== generation || muted) return;
      var at = ctx.currentTime + 0.03;
      var total = 0.03;
      var k, src, last = null;
      for (k = 0; k < bufs.length; k++) {
        src = ctx.createBufferSource();
        src.buffer = bufs[k];
        src.connect(voiceBus);
        src.start(at + total);
        /* A breath between fragments, so a split sentence still scans. */
        total += bufs[k].duration + (k + 1 < bufs.length ? 0.06 : 0);
        playing.push(src);
        last = src;
      }
      duckFor(total);
      last.onended = function () {
        if (gen !== generation) return;
        stopClips();
        unduck(0.3);
        drain();
      };
    })["catch"](function () {
      if (gen !== generation) return;
      /* A clip failed to load: say it with the device voice instead. */
      utter(item);
    });
    return true;
  }

  /* ---------------------------------------------------------------- voice */

  var synth = global.speechSynthesis || null;
  var voice = null;
  var voicesSeen = false;
  var pending = null;      /* the one utterance waiting its turn */
  var pendingTimer = 0;
  var speakTimer = 0;
  var duckTimer = 0;
  var talking = false;

  /* Prefer a clear, local, female English voice: easiest for a 4-year-old
     to follow. Fire tablets expose several, and the default is rarely the
     best one. */
  var FAVOURED = [
    "samantha", "karen", "moira", "tessa", "fiona", "serena",
    "zira", "susan", "salli", "joanna", "jenny", "aria", "michelle",
    "child", "girl", "female", "woman"
  ];

  function scoreVoice(v) {
    var name = (v.name || "").toLowerCase();
    var lang = (v.lang || "").replace("_", "-").toLowerCase();
    var score = 0;
    var i;
    if (lang.indexOf("en") !== 0) return -1;
    score += 5;
    if (lang.indexOf("en-us") === 0) score += 3;
    else if (lang.indexOf("en-gb") === 0) score += 2;
    for (i = 0; i < FAVOURED.length; i++) {
      if (name.indexOf(FAVOURED[i]) !== -1) {
        score += 8 - Math.min(6, i * 0.4);
        break;
      }
    }
    if (name.indexOf("male") !== -1 && name.indexOf("female") === -1) score -= 3;
    if (v.localService) score += 2;   /* no network round trip, works offline */
    if (v["default"]) score += 1;
    return score;
  }

  function refreshVoice() {
    if (!synth) return false;
    var list;
    try {
      list = synth.getVoices() || [];
    } catch (e) {
      return false;
    }
    if (!list.length) return false;
    voicesSeen = true;
    var best = null;
    var bestScore = -1;
    var i, s;
    for (i = 0; i < list.length; i++) {
      s = scoreVoice(list[i]);
      if (s > bestScore) {
        bestScore = s;
        best = list[i];
      }
    }
    /* Nothing English at all: leave the device default alone. */
    voice = bestScore > 0 ? best : null;
    return true;
  }

  if (synth) {
    refreshVoice();
    if ("onvoiceschanged" in synth) {
      synth.onvoiceschanged = refreshVoice;
    }
  }

  function unduck(seconds) {
    if (duckTimer) {
      clearTimeout(duckTimer);
      duckTimer = 0;
    }
    talking = false;
    if (sfx) fade(sfx.gain, 1, seconds || 0.25);
  }

  /* Duck the effects for a known length: baked clips know exactly how long
     they run. */
  function duckFor(seconds) {
    talking = true;
    if (sfx) fade(sfx.gain, DUCK_LEVEL, 0.08);
    clearTimeout(duckTimer);
    duckTimer = setTimeout(function () {
      duckTimer = 0;
      unduck(0.4);
    }, seconds * 1000 + 900);
  }

  function duck(text) {
    /* The device voice never says how long it will take, and tablets do not
       reliably fire onend, so estimate and recover. */
    duckFor(0.7 + text.length * 0.095 + 1.5);
  }

  function utter(item) {
    var u;
    try {
      u = new SpeechSynthesisUtterance(item.text);
    } catch (e) {
      return;
    }
    u.lang = (voice && voice.lang) || "en-US";
    u.rate = item.rate;
    u.pitch = item.pitch;
    u.volume = 1;
    if (voice) u.voice = voice;

    u.onstart = function () { duck(item.text); };
    u.onend = function () {
      unduck(0.3);
      drain();
    };
    u.onerror = function () {
      unduck(0.2);
      drain();
    };

    try {
      if (synth.paused) synth.resume();
      synth.speak(u);
    } catch (e) {
      unduck(0.1);
    }
  }

  function speakItem(item) {
    if (!playClips(item)) utter(item);
  }

  function voiceBusy() {
    return clipsBusy() || !!(synth && (synth.speaking || synth.pending));
  }

  /* Start whatever is waiting, once the voice is free. */
  function drain() {
    if (!pending || muted) return;
    if (voiceBusy()) return;
    var item = pending;
    pending = null;
    speakItem(item);
  }

  function begin(item) {
    if (muted) return;
    if (!clips && !synth) return;

    /* Hold the newest line only. Rapid taps must not queue up a stale
       backlog a child has stopped caring about. */
    pending = item;

    if (item.interrupt && voiceBusy()) {
      generation++;
      stopClips();
      if (synth) {
        try { synth.cancel(); } catch (e) {}
      }
      /* Chromium (so also Silk) swallows a speak() issued in the same tick
         as cancel(). A short gap is the reliable fix. */
      clearTimeout(speakTimer);
      speakTimer = setTimeout(function () {
        speakTimer = 0;
        drain();
      }, 90);
      return;
    }
    if (!item.interrupt && voiceBusy()) return;  /* the end of the line drains it */
    drain();
  }

  /* Speak `text`. Options: delay (ms), interrupt (default true), rate, pitch.
     With interrupt false the line waits for the current one to finish. */
  function say(text, opts) {
    if (!clips && !synth) return;
    text = String(text == null ? "" : text);
    if (!text) return;
    opts = opts || {};

    var item = {
      text: text,
      rate: opts.rate || 0.88,
      pitch: opts.pitch || 1.2,
      interrupt: opts.interrupt !== false
    };

    var delay = opts.delay || 0;
    if (delay > 0) {
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(function () {
        pendingTimer = 0;
        begin(item);
      }, delay);
      return;
    }
    begin(item);
  }

  /* Stop talking now and forget anything scheduled. */
  function hush() {
    pending = null;
    generation++;
    stopClips();
    stopWelcome();
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = 0; }
    if (speakTimer) { clearTimeout(speakTimer); speakTimer = 0; }
    if (synth) {
      try { synth.cancel(); } catch (e) {}
    }
    unduck(0.1);
  }

  /* --------------------------------------------------------------- states */

  function applyMute() {
    if (master) fade(master.gain, muted ? 0 : MASTER_LEVEL, 0.08);
  }

  function setMuted(m) {
    muted = !!m;
    try {
      if (global.localStorage) global.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (e) {}
    if (muted) {
      hush();
      applyMute();
    } else {
      ensure();
      applyMute();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }
  }

  /* Call from inside a real touch or click. Tablets refuse to start audio
     any other way. */
  function unlock() {
    var c = ensure();
    if (!c) return;
    if (c.state === "suspended") {
      try { c.resume(); } catch (e) {}
    }
    if (!unlocked) {
      unlocked = true;
      /* Ease the master in so the very first sound cannot arrive as a thud. */
      master.gain.setValueAtTime(0, c.currentTime);
      fade(master.gain, muted ? 0 : MASTER_LEVEL, 0.12);
      /* A silent buffer inside the gesture is what actually convinces
         older Silk builds that audio is allowed. */
      try {
        var s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, c.sampleRate);
        s.connect(c.destination);
        s.start(0);
      } catch (e) {}
    }
    if (synth && !voicesSeen) refreshVoice();
  }

  /* Leaving the page or backgrounding the app must silence it immediately;
     a voice that keeps talking from a closed game is the worst bug here. */
  function sleep() {
    hush();
    if (ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (e) {}
    }
  }

  function wake() {
    if (!unlocked || !ctx) return;
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (e) {}
    }
  }

  global.addEventListener("pagehide", sleep);
  global.addEventListener("beforeunload", hush);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) sleep();
    else wake();
  });

  global.GGAudio = {
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    setMuted: setMuted,
    isMuted: function () { return muted; },

    say: say,
    hush: hush,

    pop: pop,
    sparkle: sparkle,
    yum: yum,
    wiggle: wiggle,
    bounce: bounce,
    toot: toot,
    chug: chug,
    cheer: cheer,
    whoosh: whoosh,
    tap: tap,
    welcome: welcome
  };
})(window);
