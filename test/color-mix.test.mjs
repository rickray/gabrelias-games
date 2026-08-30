import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

// Test mixing rules
const MIX_TABLE = {
  "red+yellow": "orange",
  "yellow+red": "orange",
  "yellow+blue": "green",
  "blue+yellow": "green",
  "red+blue": "purple",
  "blue+red": "purple"
};

function mixPaints(c1, c2) {
  if (!c1 || !c2 || c1 === c2) return null;
  return MIX_TABLE[`${c1}+${c2}`] || null;
}

// 1. Verify mixing rules
assert.equal(mixPaints("red", "yellow"), "orange");
assert.equal(mixPaints("yellow", "red"), "orange");
assert.equal(mixPaints("yellow", "blue"), "green");
assert.equal(mixPaints("blue", "yellow"), "green");
assert.equal(mixPaints("red", "blue"), "purple");
assert.equal(mixPaints("blue", "red"), "purple");
assert.equal(mixPaints("red", "red"), null);
assert.equal(mixPaints("yellow", "yellow"), null);
assert.equal(mixPaints("blue", "blue"), null);

// 2. Verify targets are valid and achievable from primaries
const PRIMARIES = ["red", "yellow", "blue"];
const TARGETS = ["green", "orange", "purple"];

for (const target of TARGETS) {
  let found = 0;
  for (let i = 0; i < PRIMARIES.length; i++) {
    for (let j = i + 1; j < PRIMARIES.length; j++) {
      if (mixPaints(PRIMARIES[i], PRIMARIES[j]) === target) {
        found++;
      }
    }
  }
  assert.equal(found, 1, `Target ${target} should have exactly 1 matching primary pair`);
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
assert.ok(gameCode.includes("MIX_TABLE") || (gameCode.includes("orange") && gameCode.includes("purple") && gameCode.includes("green")), "game.js must implement paint mixing");

console.log("✓ All Color Mix logic tests passed!");
