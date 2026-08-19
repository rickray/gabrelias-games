# Gabrelia's Games

One project with several short tap games for Gabrelia (about 4 years old). Built for Amazon Fire HD 11 (Silk first): big tap targets, bright colors, short sessions. No accounts, ads, or in-app purchases. It is a static site, so it works offline in the browser after the page has loaded.

## Play

Home: https://rickray.github.io/gabrelias-games/

The old standalone Bubble Zoo site still works for now: https://rickray.github.io/bubble-zoo/

### On a Fire HD 11 (Silk)

1. Open Silk.
2. Go to https://rickray.github.io/gabrelias-games/
3. Tap a game tile (start with Bubble Zoo).
4. Optional: bookmark the home page, or use Silk’s Add to Home Screen so it opens full-screen next time.

## Games

- **Bubble Zoo** — tap bubbles, meet animals. Lives in `games/bubble-zoo/`.

## Add another game later

1. Put the new game in its own folder under `games/`, for example `games/my-game/index.html`.
2. Keep that game self-contained (its own `css/` and `js/` if it needs them). Use relative paths, not a leading `/`.
3. Add a large tile on the home page (`index.html`) that links to that folder with a relative path, like `games/my-game/index.html`.
4. On the game page, add a home button that goes to `../../index.html`.

## GitHub Pages

Deploy from the `main` branch, site root (`/`). The `.nojekyll` file tells GitHub Pages to serve the files as-is.
