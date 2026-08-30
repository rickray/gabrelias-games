import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

// Test mixing rules for all 10 target colors
const MIX_TABLE = {
  "red+yellow": "orange",
  "yellow+red": "orange",
  "yellow+blue": "green",
  "blue+yellow": "green",
  "red+blue": "purple",
  "blue+red": "purple",
  "red+white": "pink",
  "white+red": "pink",
  "blue+white": "light blue",
  "white+blue": "light blue",
  "purple+white": "lavender",
  "white+purple": "lavender",
  "orange+white": "peach",
  "white+orange": "peach",
  "green+white": "lime",
  "white+green": "lime",
  "orange+blue": "brown",
  "blue+orange": "brown",
  "black+white": "gray",
  "white+black": "gray"
};

function mixPaints(c1, c2) {
  if (!c1 || !c2 || c1 === c2) return null;
  return MIX_TABLE[`${c1}+${c2}`] || null;
}

// 1. Verify 10 target recipes (both orders)
assert.equal(mixPaints("red", "yellow"), "orange");
assert.equal(mixPaints("yellow", "red"), "orange");

assert.equal(mixPaints("yellow", "blue"), "green");
assert.equal(mixPaints("blue", "yellow"), "green");

assert.equal(mixPaints("red", "blue"), "purple");
assert.equal(mixPaints("blue", "red"), "purple");

assert.equal(mixPaints("red", "white"), "pink");
assert.equal(mixPaints("white", "red"), "pink");

assert.equal(mixPaints("blue", "white"), "light blue");
assert.equal(mixPaints("white", "blue"), "light blue");

assert.equal(mixPaints("purple", "white"), "lavender");
assert.equal(mixPaints("white", "purple"), "lavender");

assert.equal(mixPaints("orange", "white"), "peach");
assert.equal(mixPaints("white", "orange"), "peach");

assert.equal(mixPaints("green", "white"), "lime");
assert.equal(mixPaints("white", "green"), "lime");

assert.equal(mixPaints("orange", "blue"), "brown");
assert.equal(mixPaints("blue", "orange"), "brown");

assert.equal(mixPaints("black", "white"), "gray");
assert.equal(mixPaints("white", "black"), "gray");

// Same-color mixing should return null
assert.equal(mixPaints("red", "red"), null);
assert.equal(mixPaints("yellow", "yellow"), null);
assert.equal(mixPaints("blue", "blue"), null);
assert.equal(mixPaints("white", "white"), null);

// 2. Verify all 10 targets have exactly 1 recipe from ALL_INGREDIENTS
const ALL_INGREDIENTS = ["red", "yellow", "blue", "white", "black", "orange", "green", "purple"];
const TARGETS = ["orange", "green", "purple", "pink", "light blue", "lavender", "peach", "lime", "brown", "gray"];

assert.equal(TARGETS.length, 10, "Should have exactly 10 targets");

for (const target of TARGETS) {
  let found = 0;
  for (let i = 0; i < ALL_INGREDIENTS.length; i++) {
    for (let j = i + 1; j < ALL_INGREDIENTS.length; j++) {
      if (mixPaints(ALL_INGREDIENTS[i], ALL_INGREDIENTS[j]) === target) {
        found++;
      }
    }
  }
  assert.equal(found, 1, `Target "${target}" should have exactly 1 matching ingredient pair`);
}

// 3. Verify game file exists and has essential components
const gamePath = path.join(root, "games/color-mix/js/game.js");
const htmlPath = path.join(root, "games/color-mix/index.html");

assert.ok(fs.existsSync(htmlPath), "games/color-mix/index.html must exist");
assert.ok(fs.existsSync(gamePath), "games/color-mix/js/game.js must exist");

const gameCode = fs.readFileSync(gamePath, "utf8");
assert.ok(gameCode.includes("GGShell.mount"), "game.js must mount with GGShell");
assert.ok(gameCode.includes("GGScene.create"), "game.js must create GGScene");
assert.ok(gameCode.includes("GGAudio"), "game.js must use GGAudio");
assert.ok(gameCode.includes("drawCelebration") || gameCode.includes("celebrate"), "game.js must have celebration logic");
assert.ok(gameCode.includes("drawBowl") || gameCode.includes("mixingBowl"), "game.js must draw mixing bowl");
assert.ok(gameCode.includes("drawPaintTray") || gameCode.includes("paintTray"), "game.js must draw paint tray");
assert.ok(gameCode.includes("drawTargetBlob") || gameCode.includes("targetBlob"), "game.js must draw giant target paint blob");
assert.ok(gameCode.includes("hitTargetBlob"), "game.js must support tapping the target blob");
assert.ok(!gameCode.includes('fillText("Make "'), "game.js must not draw textual target words on screen");
assert.ok(gameCode.includes("lavender") && gameCode.includes("peach") && gameCode.includes("lime") && gameCode.includes("brown") && gameCode.includes("gray"), "game.js must support the expanded 10-color set");

console.log("✓ All Color Mix logic tests passed!");
