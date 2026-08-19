# Gabrelia's Games

One project with several short tap games for Gabrelia (about 4 years old). Built for Amazon Fire HD 11 (Silk first): big tap targets, bright colors, short sessions. No accounts, ads, or in-app purchases. A service worker caches the whole site, so after one visit it works fully offline.

## Play

Home: https://rickray.github.io/gabrelias-games/

The old standalone Bubble Zoo site still works for now: https://rickray.github.io/bubble-zoo/

### On a Fire HD 11 (Silk)

1. Open Silk.
2. Go to https://rickray.github.io/gabrelias-games/
3. Tap a game tile.
4. Optional: use Silk’s Add to Home Screen — the site is a PWA, so it installs as a full-screen app with its own icon and works offline.

## Games

- **Bubble Zoo** — tap bubbles, meet animals. Lives in `games/bubble-zoo/`.
- **Snack Time** — feed hungry animals the food they want. A thought bubble shows the food, and the voice asks for it out loud. Lives in `games/snack-time/`.
- **Hide and Seek** — find the animal you hear. Tap the sky to hear the question again. Lives in `games/hide-and-seek/`.
- **Zoo Train** — hop animals onto the train cars. Lives in `games/zoo-train/`.
- **ABC Zoo** — learn letters and find matching zoo animal friends. Lives in `games/abc-zoo/`.
- **Zoo Count** — count 1 to 5 happy animals on the grass and tap the matching number tile. Lives in `games/zoo-count/`.
- **Letter Pop** — pop floating letter bubbles to reveal hidden animals and hear their letters. Lives in `games/letter-pop/`.
- **Number Train** — count and board animals into train cars 1, 2, and 3. Lives in `games/number-train/`.

Every screen, including the home page, has a speaker button (top right) that mutes all sounds and voices. The setting is remembered across visits and across games.

## How it is put together

No build step, no dependencies. Plain files served as-is; every game is one full-screen canvas.

Shared code lives at the root and every game uses it:

| File | Job |
| --- | --- |
| `js/audio.js` | `GGAudio` — sound effects and the speaking voice |
| `js/animals.js` | `GGAnimals` — the 16 animals, drawn from shapes, no images |
| `js/scene.js` | `GGScene` — sky, sun, clouds, hills, grass, flowers, particles |
| `js/shell.js` | `GGShell` — canvas sizing, taps, frame loop, corner buttons |
| `css/game.css` | the full-screen game skin |
| `css/controls.css` | the home and speaker buttons |
| `css/hub.css` | the home page |
| `voice/` | the spoken lines, baked to audio (see below) |
| `tools/bake-voice.mjs` | rebuilds `voice/` |

A game file (`games/<game>/js/game.js`) therefore contains only its own game, and ends with one call:

```js
GGShell.mount({
  canvas: canvas,
  ctx: ctx,
  resize: function (w, h) { /* lay out for a new size */ },
  start: function () { /* first round */ },
  tap: function (x, y) { /* one touch, in game coordinates */ },
  frame: function (dt, time) { /* update and draw; seconds */ }
});
```

`GGShell` handles the device pixel ratio, touch-vs-mouse events, the tap debounce, orientation changes, the two corner buttons, and unlocking audio inside a real gesture. It stops the frame loop while the app is in the background, so a tablet left on a game screen is not drawing frames nobody can see.

### The voice

The spoken lines are **not** read by the tablet's text-to-speech. Every line is baked into an audio clip up front by `tools/bake-voice.mjs`, and the games play those. That means one chosen voice on every device instead of whatever the tablet ships, no waiting for a voice list, nothing to fetch, and the words run through the same mixer as the effects.

```
python3 -m venv .venv && .venv/bin/pip install edge-tts   # once
node tools/bake-voice.mjs                                 # Ava, slightly slow
node tools/bake-voice.mjs --voice en-US-EmmaNeural --rate=-8%
node tools/bake-voice.mjs --voice Samantha --rate 160     # old compact voice
node tools/bake-voice.mjs --list                          # show the lines, bake nothing
```

183 clips, about 1.2 MB of AAC, listed in `voice/index.json`. Sentences are stored as reusable fragments — "The lion wants" plus "a banana", "B is for" plus "bunny" — so Snack Time and ABC Zoo do not need a clip for every combination. `GGAudio.say()` matches a line against the available clips longest-first and plays the pieces back to back.

**To use a real human voice** — which is what a 4-year-old actually wants — drop recordings into `voice/raw/` named after the slugs printed by `--list` (`wheres-the-lion.wav`, `yum.wav`, …) and re-run the baker. Recordings always win over synthesis, and you can do them a handful at a time; anything missing stays synthesised.

Anything a game says that has no clip falls back to the device's own speech synthesis, with the two tablet quirks handled: the voice list arrives asynchronously, and a `speak()` issued in the same tick as `cancel()` is silently dropped.

Speech can queue instead of interrupting: `say(text, { delay: 1400, interrupt: false })` waits for the current line to finish, so a follow-up prompt no longer chops off the middle of a word. Only the newest waiting line is kept, so fast taps cannot build up a backlog. `hush()` stops everything.

### Sound effects

Synthesised at run time, so there is nothing to download.

- Effects share one bus: a short reverb for depth, then a compressor and a soft clipper, so overlapping sounds cannot crackle on a tablet speaker. Muting fades rather than snapping.
- Effects are pitched from a C major pentatonic scale, with a few cents of random drift, so repeated taps never sound mechanical and nothing clashes. `sparkle()` and `yum()` climb a step per correct answer in a row; a wrong answer resets the ladder.
- The voice has its own path — high-passed, with a presence lift so words stay clear on a small speaker — and the effects duck under it. Everything stops the moment the page is hidden or left.

Games call: `pop`, `sparkle`, `yum`, `wiggle`, `bounce`, `toot`, `chug`, `cheer`, `whoosh`, `tap`.

### Look

Everything is drawn with canvas shapes — no image files. `GGScene` paints a layered backdrop (sky, sun with slow rays, parallax clouds, three hill layers, swaying grass and flowers, drifting butterflies) and owns the confetti and sparkle particles. `GGAnimals` draws the cast with gradient shading, outlines, glossy blinking eyes, contact shadows, and small per-animal movement — fluttering wings, tilting ears, a swishing tail.

Gradients are built once and cached, and nothing uses `ctx.shadowBlur`, which is far too slow for a tablet — soft shadows are gradient ellipses instead. All four games hold 60 fps at 2048×1200.

## Add another game later

1. Put the new game in its own folder under `games/`, for example `games/my-game/index.html`.
2. Copy an existing game's `index.html`: it links the shared CSS and scripts with relative paths (`../../css/game.css`, `../../js/audio.js`, …), then its own `js/game.js`. Never use a leading `/`.
3. Write `games/my-game/js/game.js` against `GGShell.mount(...)` as above, and use `GGAudio`, `GGAnimals` and `GGScene` rather than adding sound or drawing code of your own.
4. Add a large tile on the home page (`index.html`) linking to the new folder.
5. Add the game's files to the `FILES` list in `sw.js` so they work offline.
6. If it says anything new, add the lines to `tools/bake-voice.mjs` and re-run it. The service worker caches whatever `voice/index.json` lists, so `sw.js` needs no edit for clips.

## GitHub Pages

Deploy from the `main` branch, site root (`/`). The `.nojekyll` file tells GitHub Pages to serve the files as-is.

The service worker serves from the cache first, then refreshes each file in the background, so an updated game appears on the next launch. Bump `VERSION` in `sw.js` only when files are added, renamed, or removed — that drops the whole old cache at once.
