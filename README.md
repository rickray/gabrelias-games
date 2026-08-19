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

Every game has a speaker button (top right) that mutes all sounds and voices. The setting is remembered across visits and across games.

## Add another game later

1. Put the new game in its own folder under `games/`, for example `games/my-game/index.html`.
2. Keep that game self-contained (its own `css/` and `js/` if it needs them). Use relative paths, not a leading `/`.
3. Add a large tile on the home page (`index.html`) that links to that folder with a relative path, like `games/my-game/index.html`.
4. On the game page, add a home button that goes to `../../index.html`.
5. Add the game's files to the `FILES` list in `sw.js` so they work offline.

## GitHub Pages

Deploy from the `main` branch, site root (`/`). The `.nojekyll` file tells GitHub Pages to serve the files as-is.

**Important:** the service worker (`sw.js`) is cache-first. Bump `VERSION` at the top of `sw.js` on every deploy, or tablets will keep playing the old cached copy.
