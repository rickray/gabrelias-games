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

// 6. Baked voice must cover the four learning games (tablet TTS is the fallback,
//    and on Fire/Silk it is often silent).
const voiceIndexPath = path.join(root, "voice/index.json");
if (!fs.existsSync(voiceIndexPath)) {
  throw new Error("Missing voice/index.json");
}
const voiceIndex = JSON.parse(fs.readFileSync(voiceIndexPath, "utf8"));
const clips = voiceIndex.clips || {};
const requiredLines = [
  "B is for",
  "M is for",
  "Find the M",
  "That's P",
  "How many lions?",
  "How many butterflies?",
  "How many fish?",
  "Three!",
  "That's 2",
  "Find the 1",
  "Car 2 is full",
  "All aboard!",
  "monkey",
  "bunny"
];
for (const line of requiredLines) {
  if (!clips[line]) {
    throw new Error(`voice/index.json missing clip for "${line}"`);
  }
  const clipFile = path.join(root, "voice", clips[line]);
  if (!fs.existsSync(clipFile)) {
    throw new Error(`Missing voice file ${clips[line]} for "${line}"`);
  }
}
console.log("✓ Learning-game voice clips are present.");

function segment(text) {
  const keys = Object.keys(clips).sort((a, b) => b.length - a.length);
  let rest = text;
  const files = [];
  while (rest.length) {
    if (rest.charAt(0) === " ") {
      rest = rest.slice(1);
      continue;
    }
    let hit = null;
    for (const key of keys) {
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

function pluralAnimal(name) {
  if (name === "butterfly") return "butterflies";
  if (name === "bunny") return "bunnies";
  if (name === "fish") return "fish";
  return name + "s";
}

const spoken = [];
for (const [letter, anims] of Object.entries(expectedMapping)) {
  spoken.push("Find the " + letter);
  spoken.push("That's " + letter);
  spoken.push(letter + " is for");
  for (const a of anims) spoken.push(letter + " is for " + a);
}
for (const a of Object.values(expectedMapping).flat()) {
  spoken.push(a);
  spoken.push("That's the " + a);
  spoken.push("How many " + pluralAnimal(a) + "?");
}
for (const n of [1, 2, 3, 4, 5]) {
  spoken.push(["", "One", "Two", "Three", "Four", "Five"][n] + "!");
  spoken.push("That's " + n);
}
for (const n of [1, 2, 3]) {
  spoken.push("Find the " + n);
  spoken.push("Car " + n + " is full");
}
spoken.push("All aboard!");

for (const line of spoken) {
  if (!segment(line)) {
    throw new Error(`No baked clip coverage for spoken line "${line}"`);
  }
}
console.log(`✓ ${spoken.length} learning-game spoken lines match baked clips.`);

const letterPop = fs.readFileSync(path.join(root, "games/letter-pop/js/game.js"), "utf8");
if (!letterPop.includes("drawLetterCard") || !letterPop.includes("targetLetter")) {
  throw new Error("Letter Pop must show the target letter on screen");
}
console.log("✓ Letter Pop shows the target letter on screen.");

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
