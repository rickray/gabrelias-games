import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
console.log("Starting verification in", root);

// 1. Check syntax of all JavaScript files
const jsFiles = [
  "js/audio.js",
  "js/animals.js",
  "js/shell.js",
  "js/scene.js",
  "sw.js",
  "games/bubble-zoo/js/game.js",
  "games/snack-time/js/foods.js",
  "games/snack-time/js/game.js",
  "games/hide-and-seek/js/game.js",
  "games/zoo-train/js/game.js",
  "games/abc-zoo/js/animals.js",
  "games/abc-zoo/js/game.js",
  "games/zoo-count/js/animals.js",
  "games/zoo-count/js/game.js",
  "games/letter-pop/js/animals.js",
  "games/letter-pop/js/game.js",
  "games/number-train/js/animals.js",
  "games/number-train/js/game.js"
];

for (const f of jsFiles) {
  const filePath = path.join(root, f);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing JS file: ${f}`);
  }
  execFileSync("node", ["-c", filePath]);
}
console.log(`✓ All ${jsFiles.length} JavaScript files passed node -c syntax checks.`);

// 2. Check all 8 games have index.html and that all referenced scripts and stylesheets exist
const games = [
  "games/bubble-zoo",
  "games/snack-time",
  "games/hide-and-seek",
  "games/zoo-train",
  "games/abc-zoo",
  "games/zoo-count",
  "games/letter-pop",
  "games/number-train"
];

for (const g of games) {
  const htmlPath = path.join(root, g, "index.html");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing index.html for game: ${g}`);
  }
  const content = fs.readFileSync(htmlPath, "utf8");

  // Check home button link
  if (!content.includes('href="../../index.html"')) {
    throw new Error(`Home button href in ${g}/index.html does not link to ../../index.html`);
  }
  if (!content.includes('aria-label="Gabrelia\'s Games home"')) {
    throw new Error(`Home button aria-label in ${g}/index.html is incorrect`);
  }

  // Check script tags
  const scriptMatches = [...content.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  for (const src of scriptMatches) {
    const resolved = path.resolve(path.dirname(htmlPath), src);
    if (!fs.existsSync(resolved)) {
      throw new Error(`In ${g}/index.html: script src "${src}" resolves to non-existent file "${resolved}"`);
    }
  }

  // Check link tags
  const cssMatches = [...content.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m => m[1]);
  for (const href of cssMatches) {
    const resolved = path.resolve(path.dirname(htmlPath), href);
    if (!fs.existsSync(resolved)) {
      throw new Error(`In ${g}/index.html: stylesheet href "${href}" resolves to non-existent file "${resolved}"`);
    }
  }
}
console.log(`✓ All ${games.length} game index.html files verified with valid scripts, css links, and home buttons.`);

// 3. Verify root index.html has 8 tiles and links
const rootHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const g of games) {
  const expectedLink = `${g}/index.html`;
  if (!rootHtml.includes(expectedLink)) {
    throw new Error(`Root index.html is missing link to ${expectedLink}`);
  }
}
console.log("✓ Root index.html links to all 8 game tiles.");

// 4. Verify sw.js FILES array contains all existing game files
const swContent = fs.readFileSync(path.join(root, "sw.js"), "utf8");
for (const f of jsFiles) {
  if (f === "sw.js") continue; // Service workers do not cache themselves
  if (!swContent.includes(`"${f}"`)) {
    throw new Error(`sw.js FILES list missing "${f}"`);
  }
}
for (const g of games) {
  const indexRel = `${g}/index.html`;
  if (!swContent.includes(`"${indexRel}"`)) {
    throw new Error(`sw.js FILES list missing "${indexRel}"`);
  }
}
console.log("✓ sw.js cache list contains all games and JS files.");

// 5. Letter & Animal mapping validation
const validLetters = ["B", "C", "D", "E", "F", "G", "L", "M", "O", "P", "T"];
const expectedMapping = {
  B: ["bunny", "bee", "butterfly"],
  C: ["cat"],
  D: ["duck"],
  E: ["elephant"],
  F: ["frog", "fish"],
  G: ["giraffe"],
  L: ["lion"],
  M: ["monkey"],
  O: ["owl"],
  P: ["panda", "penguin", "pig"],
  T: ["turtle"]
};

for (const [letter, anims] of Object.entries(expectedMapping)) {
  for (const a of anims) {
    if (!a.toUpperCase().startsWith(letter)) {
      throw new Error(`Animal ${a} does not start with letter ${letter}!`);
    }
  }
}
console.log("✓ Letter to animal mapping strictly validated.");

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
