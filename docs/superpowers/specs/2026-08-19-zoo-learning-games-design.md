# Four New Zoo Learning Games Design

## Overview
This design doc defines the architecture, behavior, and assets for 4 new zoo games teaching letters and numbers to 4-year-old Gabrelia on Amazon Fire HD 11 / Silk browser for `rickray/gabrelias-games` (hosted at `https://rickray.github.io/gabrelias-games/`).

## Core Principles & Constraints
- Audience: 4-year-old child on Amazon Fire HD 11 / Silk browser.
- High accessibility: Big tap targets (>60px), bright cheerful colors, high contrast, short sessions.
- Safe & positive: No accounts, no ads, no in-app purchases, no score tracking, no failure/punishment/buzzers, no scary visuals/sounds.
- Speech: Speaks everything! SpeechSynthesis fallback with en-US, rate 0.86, pitch 1.2, female-leaning voice, plus Web Audio sound effects.
- Orientation: Supports both Portrait and Landscape seamlessly via `GGShell.mount` resize hooks.
- Tech Stack: Pure static HTML5, Canvas 2D, ES5-compatible JS, CSS3, relative paths, zero dependencies/npm/build steps.
- Code reuse:
  - Copy `games/bubble-zoo/js/animals.js` into each game as `js/animals.js` (defining `window.BubbleAnimals` and `window.GGAnimals` for maximum compatibility).
  - Common home button (`<a class="home-btn" href="../../index.html" aria-label="Gabrelia's Games home">...</a>`) and mute button.
  - Common game styling via `../../css/game.css`, `../../css/controls.css`.
  - Common shell via `../../js/shell.js`, audio via `../../js/audio.js`, scene via `../../js/scene.js`.

---

## Shared Animal Letter Mapping
Animals: lion, elephant, giraffe, penguin, frog, panda, bunny, fish, owl, pig, duck, cat, butterfly, turtle, bee, monkey.

Letter mapping (ONLY animals that start with that letter):
- **B**: bunny, bee, butterfly
- **C**: cat
- **D**: duck
- **E**: elephant
- **F**: frog, fish
- **G**: giraffe
- **L**: lion
- **M**: monkey
- **O**: owl
- **P**: panda, penguin, pig
- **T**: turtle
Letters supported in ABC Zoo / Letter Pop: `['B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'O', 'P', 'T']`.

---

## Game 1: ABC Zoo (`games/abc-zoo/`)
- **Concept**: Show a giant letter at top (e.g. "B"). Voice says "B is for bunny" (random animal matching letter B). Show 3 large animals on the grass (1 correct, 2 decoys from other letters).
- **Interaction**:
  - First tap: Unlocks audio and asks current prompt if not already spoken.
  - Correct tap: Animal bounces/celebrates, sparkle particles, sound effect `GGAudio.sparkle()`, speak animal name ("Bunny!"), brief celebration, then advance to next letter.
  - Wrong tap: Wiggle animation, sound effect `GGAudio.wiggle()`, speak "That's the lion", remain on current letter, re-prompt "B is for bunny".
  - Letter cycling: Random shuffle of the 11 valid letters, ensuring no immediate repetition.

---

## Game 2: Zoo Count (`games/zoo-count/`)
- **Concept**: Spawn 1 to 5 of the SAME animal on the grass (random count in 1..5, different from previous round). Voice asks "How many?" or "How many lions?". Bottom displays 3 large number tiles (1 correct count, 2 nearby wrong count options in 1..5).
- **Interaction**:
  - First tap: Unlocks audio and speaks prompt.
  - Correct number tap: Number tile bounces/celebrates, sparkles/confetti, sound effect `GGAudio.sparkle()`, speak number ("Three!"), brief pause, then next round.
  - Tapping animal on grass: Animal does a cute hop and sounds a soft bounce/number count feedback to help 4-year-old count them.
  - Wrong number tap: Number tile wiggles, `GGAudio.wiggle()`, speaks "That's 2", stays on same round.

---

## Game 3: Letter Pop (`games/letter-pop/`)
- **Concept**: Colorful floating bubbles, each carrying a large capital letter (from the 11 valid letters). Voice prompts "Find the M." Maintain ~5-7 active floating bubbles on screen.
- **Interaction**:
  - First tap: Unlocks audio and asks "Find the [Letter]."
  - Correct bubble tap: Bubble bursts with pop sound (`GGAudio.pop()`) + ring/sparkle effect, the matching animal emerges in squash-and-stretch animation, voice speaks "[Letter] is for [animal]" (e.g., "M is for monkey"). Advance prompt to a new letter after brief moment.
  - Wrong bubble tap: Bubble wobbles/shakes, `GGAudio.wiggle()`, voice speaks "That's P", then follows up with "Find the M."
  - Recycling: New bubbles drift in / spawn to maintain target count (5-7).

---

## Game 4: Number Train (`games/number-train/`)
- **Concept**: A train engine with 3 cars clearly labeled "1", "2", "3" (large, high-contrast numerals on the side of each car). 4 waiting animals on the platform. Voice announces "Car 1!" or "Car 2!" or "Car 3!" (next empty car).
- **Interaction**:
  - Tap numbered car: The next waiting animal on the platform hops enthusiastically into that car with squash-and-stretch trajectory. Sound `GGAudio.toot()`, speak number and animal ("Car 2! Monkey!").
  - Tap already full car: Car wiggles gently, voice speaks "Car 2 is full", no state change.
  - Train Departure: When all 3 cars (1, 2, 3) are filled, train toots whistle (`GGAudio.cheer()`, `GGAudio.toot()`), voice says "All aboard!", puffing steam particles and confetti burst, train rolls off to the right. A new empty train rolls in with 3 cars (1, 2, 3) and a new set of platform animals.

---

## Home Hub (`index.html`) & Hub CSS (`css/hub.css`)
- Display 8 real game tiles in responsive grid:
  1. Bubble Zoo (`games/bubble-zoo/index.html`) - 🐼
  2. Snack Time (`games/snack-time/index.html`) - 🍌
  3. Hide and Seek (`games/hide-and-seek/index.html`) - 🦁
  4. Zoo Train (`games/zoo-train/index.html`) - 🚂
  5. ABC Zoo (`games/abc-zoo/index.html`) - 🔤
  6. Zoo Count (`games/zoo-count/index.html`) - 🔢
  7. Letter Pop (`games/letter-pop/index.html`) - 🎈
  8. Number Train (`games/number-train/index.html`) - 🚃
- Tile Design: Big rounded white-border tiles with distinct vibrant gradients, playful floating decorative elements, smooth tap animations.
- Responsive grid adjustments in `css/hub.css` for 8 tiles to fit comfortably in both portrait and landscape on Fire HD 11 without overlapping or excessive scrolling.
- Update `sw.js` cache list and bump cache version.
- Update `README.md` games list.
