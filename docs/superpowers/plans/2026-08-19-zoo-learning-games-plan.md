# Four New Zoo Learning Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new playable zoo learning games (ABC Zoo, Zoo Count, Letter Pop, Number Train) teaching letters and numbers with speech audio, canvas art, and Silk-friendly responsiveness to `gabrelias-games`.

**Architecture:** Static HTML5 / Canvas 2D / ES5 JavaScript architecture following existing games pattern (`GGShell`, `GGAudio`, `GGAnimals`/`BubbleAnimals`, `GGScene`). Reusable components and responsive canvas rendering.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 standard), Web Audio API, Web Speech API (SpeechSynthesis), Service Worker.

## Global Constraints
- Target device: Amazon Fire HD 11 / Silk browser + mobile / desktop.
- Audio: Voice rate 0.86, pitch 1.2, en-US speech with `GGAudio` audio effects and `SpeechSynthesis` speech generation. First user gesture unlocks audio.
- Allowed animals: lion, elephant, giraffe, penguin, frog, panda, bunny, fish, owl, pig, duck, cat, butterfly, turtle, bee, monkey.
- Supported letters (ONLY animals starting with that letter): B C D E F G L M O P T.
- Navigation: Standard home button (64px, `../../index.html`) & sound toggle button on all games.
- Static relative paths only, no npm dependencies, no external network requests.

---

### Task 1: Animal Library Setup for New Games
**Files:**
- Create: `js/animals.js` (alias `window.BubbleAnimals = window.GGAnimals`)
- Create: `games/abc-zoo/js/animals.js`
- Create: `games/zoo-count/js/animals.js`
- Create: `games/letter-pop/js/animals.js`
- Create: `games/number-train/js/animals.js`

**Interfaces:**
- Produces: `window.BubbleAnimals` and `window.GGAnimals` containing `{ names: [...], draw: function(ctx, name, x, y, scale, t) }`

- [ ] **Step 1: Check root animals.js export and add BubbleAnimals alias**
Ensure `js/animals.js` sets both `global.GGAnimals` and `global.BubbleAnimals` so scripts referencing either work identically.
- [ ] **Step 2: Copy `js/animals.js` into each game folder's `js/animals.js`**
Create directories `games/abc-zoo/js/`, `games/zoo-count/js/`, `games/letter-pop/js/`, `games/number-train/js/` and copy `animals.js` to each.
- [ ] **Step 3: Verify syntax of created animal files**
Run `node -c games/abc-zoo/js/animals.js` etc.
- [ ] **Step 4: Commit animal setup**

---

### Task 2: Implement Game 1 — ABC Zoo (`games/abc-zoo/`)
**Files:**
- Create: `games/abc-zoo/index.html`
- Create: `games/abc-zoo/js/game.js`

**Interfaces:**
- Consumes: `GGShell`, `GGAudio`, `GGScene`, `GGAnimals` / `BubbleAnimals`
- Features:
  - Big letter at top (e.g., "B") with soft pill background and clear typography.
  - Speaks prompt: `"[Letter] is for [animal]"` (e.g., "B is for bunny").
  - 3 animal options on grass (1 correct starting with that letter, 2 decoys starting with other letters).
  - Tapping correct animal: bounces, triggers `GGAudio.sparkle()`, `scene.confetti()`, speaks animal name ("Bunny!"), and advances to next letter after brief delay.
  - Tapping decoy animal: wiggles, triggers `GGAudio.wiggle()`, speaks `"That's the [animal]"`, then re-prompts `"[Letter] is for [animal]"`.
  - Tapping top letter card: repeats speech prompt `"[Letter] is for [animal]"`.
  - Unlocks audio on first tap.

- [ ] **Step 1: Write `games/abc-zoo/index.html`**
- [ ] **Step 2: Write `games/abc-zoo/js/game.js`**
- [ ] **Step 3: Syntax check `node -c games/abc-zoo/js/game.js`**
- [ ] **Step 4: Commit ABC Zoo**

---

### Task 3: Implement Game 2 — Zoo Count (`games/zoo-count/`)
**Files:**
- Create: `games/zoo-count/index.html`
- Create: `games/zoo-count/js/game.js`

**Interfaces:**
- Consumes: `GGShell`, `GGAudio`, `GGScene`, `GGAnimals` / `BubbleAnimals`
- Features:
  - Spawns 1–5 copies of the SAME animal on the grass in well-spaced, lively layout.
  - Speaks prompt `"How many [animal]s?"` (or `"How many?"`).
  - 3 large number tiles at bottom (1 correct count, 2 nearby wrong counts in 1..5).
  - Tapping correct number tile: tile bounces, `GGAudio.sparkle()`, `scene.confetti()`, speaks number (e.g., "Three!"), advances to next round.
  - Tapping wrong number tile: tile wiggles, `GGAudio.wiggle()`, speaks `"That's [N]"`, stays on same round.
  - Tapping animal on grass: playful hop, small bounce sound `GGAudio.tap()` / `GGAudio.bounce()`, helping the child count.
  - Unlocks audio on first tap.

- [ ] **Step 1: Write `games/zoo-count/index.html`**
- [ ] **Step 2: Write `games/zoo-count/js/game.js`**
- [ ] **Step 3: Syntax check `node -c games/zoo-count/js/game.js`**
- [ ] **Step 4: Commit Zoo Count**

---

### Task 4: Implement Game 3 — Letter Pop (`games/letter-pop/`)
**Files:**
- Create: `games/letter-pop/index.html`
- Create: `games/letter-pop/js/game.js`

**Interfaces:**
- Consumes: `GGShell`, `GGAudio`, `GGScene`, `GGAnimals` / `BubbleAnimals`
- Features:
  - 5–7 floating colorful bubbles, each displaying a big capital letter (from B, C, D, E, F, G, L, M, O, P, T).
  - Target letter chosen from letters currently on screen.
  - Speaks prompt `"Find the [Letter]."`
  - Tapping correct letter bubble: `GGAudio.pop()`, burst particles & ring, matching animal emerges with squash/stretch, speaks `"[Letter] is for [animal]"` (e.g. "M is for monkey"). New round starts after short pause.
  - Tapping wrong letter bubble: bubble wobbles, `GGAudio.wiggle()`, speaks `"That's [Letter]"`, then repeats `"Find the [Target]"` with non-interrupting delay.
  - Popped / dying bubbles recycled smoothly.
  - Unlocks audio on first tap.

- [ ] **Step 1: Write `games/letter-pop/index.html`**
- [ ] **Step 2: Write `games/letter-pop/js/game.js`**
- [ ] **Step 3: Syntax check `node -c games/letter-pop/js/game.js`**
- [ ] **Step 4: Commit Letter Pop**

---

### Task 5: Implement Game 4 — Number Train (`games/number-train/`)
**Files:**
- Create: `games/number-train/index.html`
- Create: `games/number-train/js/game.js`

**Interfaces:**
- Consumes: `GGShell`, `GGAudio`, `GGScene`, `GGAnimals` / `BubbleAnimals`
- Features:
  - Train with engine + 3 cars labeled with big numerals "1", "2", "3".
  - 4 waiting animals on a lower platform.
  - Prompts with the next empty car (e.g. "Car 1!", "Car 2!", "Car 3!").
  - Tapping empty car (e.g. Car 2): Next available platform animal hops into car 2, `GGAudio.toot()`, speaks `"Car 2! [Animal]!"`.
  - Tapping full car: Car wiggles, `GGAudio.wiggle()`, speaks `"Car [N] is full"`.
  - Tapping an animal directly on platform: boards the next empty car.
  - When all 3 cars (1, 2, 3) are full: `GGAudio.cheer()`, speaks `"All aboard!"`, `GGAudio.chug()`, confetti burst, train rolls off to right, and a new empty numbered train arrives from left with new animals.
  - Unlocks audio on first tap.

- [ ] **Step 1: Write `games/number-train/index.html`**
- [ ] **Step 2: Write `games/number-train/js/game.js`**
- [ ] **Step 3: Syntax check `node -c games/number-train/js/game.js`**
- [ ] **Step 4: Commit Number Train**

---

### Task 6: Home Page, Hub CSS, and Offline Cache Updates
**Files:**
- Modify: `index.html`
- Modify: `css/hub.css`
- Modify: `sw.js`
- Modify: `README.md`

**Details:**
- `index.html`: Add 4 new tiles with distinct vibrant gradient styles and matching emojis/animations:
  - ABC Zoo: `games/abc-zoo/index.html` (🔤 or 🐰)
  - Zoo Count: `games/zoo-count/index.html` (🔢 or 🐸)
  - Letter Pop: `games/letter-pop/index.html` (🎈 or 🦉)
  - Number Train: `games/number-train/index.html` (🚃 or 🦁)
- `css/hub.css`: Adjust grid and tile dimensions for 8 tiles across portrait & landscape on Fire HD 11.
- `sw.js`: Add all new files to `FILES` array, bump `VERSION` to `"7"`.
- `README.md`: Update Games section to describe all 8 games.

- [ ] **Step 1: Update `index.html` with 8 game tiles**
- [ ] **Step 2: Update `css/hub.css` with tile styling and responsive grid**
- [ ] **Step 3: Update `sw.js` with new files and bumped cache version**
- [ ] **Step 4: Update `README.md`**
- [ ] **Step 5: Commit Home Page & Hub Updates**

---

### Task 7: Comprehensive Testing & Verification
**Files:**
- Automated test script: `test/verify.js` (or run headless via Node/Playwright if available, or static validation)

- [ ] **Step 1: Verify all HTML files load properly, all relative links are valid**
- [ ] **Step 2: Check all JS files for syntax errors using `node -c`**
- [ ] **Step 3: Run static link integrity verification across all 8 games and root**
- [ ] **Step 4: Verify speech fallbacks, rate, pitch, and animal mappings**
- [ ] **Step 5: Commit any fixes and final polish**

---

### Task 8: Ship to Remote & Create Pull Request
- [ ] **Step 1: Push branch to `origin`**
- [ ] **Step 2: Create Pull Request with `ManagePullRequest`**
- [ ] **Step 3: Summary of completed work**
