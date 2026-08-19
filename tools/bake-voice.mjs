/* Bake every spoken line in the games into an audio clip.

   Why: the tablet's own text-to-speech is the weakest thing in these games,
   it differs on every device, and it needs a network on some of them. Baking
   the lines means the voice is chosen once, here, and every child hears the
   same one, offline, mixed through the same audio bus as the sound effects.

   Sources, in priority order per line:
     1. voice/raw/<slug>.(wav|aiff|m4a|mp3)  — a real recorded human voice.
        Drop files in and re-run; recordings always win.
     2. edge-tts                             — a neural voice (the default).
        Needs `edge-tts` on PATH, or `.venv/bin/edge-tts`.
     3. macOS `say`                          — `--voice Samantha` and the
        other compact system names. Sounds dated; kept as a fallback.
     4. nothing                              — the game falls back to the
        device's speech synthesis at run time.

   Usage:
     node tools/bake-voice.mjs                      # default neural voice
     node tools/bake-voice.mjs --voice en-US-EmmaNeural --rate=-8%
     node tools/bake-voice.mjs --voice Samantha --rate 160
     node tools/bake-voice.mjs --list               # print lines, bake nothing

   Output: voice/<slug>.m4a plus voice/index.json, which maps each spoken
   string to its clip. Sentences are baked as phrases AND as reusable
   fragments, so "The lion wants a banana" is two clips rather than one of a
   hundred and sixty combinations. */

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile, stat, unlink } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "voice");
const rawDir = path.join(outDir, "raw");

/* ------------------------------------------------------------- the lines */

const ANIMALS = [
  "lion", "elephant", "giraffe", "penguin", "frog", "panda", "bunny", "fish",
  "owl", "pig", "duck", "cat", "butterfly", "turtle", "bee", "monkey"
];

/* Snack Time's tables, kept in step with games/snack-time/js/foods.js. */
const WANT = {
  banana: "a banana", bamboo: "bamboo", carrot: "a carrot", apple: "an apple",
  leaf: "a leaf", peanut: "a peanut", fish: "a fish", corn: "corn",
  steak: "a steak", milk: "milk"
};

function lines() {
  const set = new Set();

  /* Bubble Zoo and Zoo Train speak bare animal names. */
  for (const a of ANIMALS) set.add(a);

  /* Hide and Seek. */
  for (const a of ANIMALS) {
    set.add("Where's the " + a + "?");
    set.add("You found the " + a + "!");
    set.add("That's the " + a);
  }

  /* Snack Time. The request is split: 16 openings x 10 foods would be 160
     clips, but "The lion wants" + "a banana" is 26. */
  for (const a of ANIMALS) {
    set.add("The " + a + " wants");
    set.add("I'm the " + a + "!");
  }
  for (const food of Object.keys(WANT)) {
    set.add(WANT[food]);
    set.add("That's " + WANT[food]);
  }
  set.add("Yum!");

  /* Zoo Train. */
  set.add("All aboard!");

  return Array.from(set);
}

/* --------------------------------------------------------------- helpers */

function slug(text) {
  const base = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "clip";
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function recordings() {
  const found = new Map();
  if (!(await exists(rawDir))) return found;
  for (const name of await readdir(rawDir)) {
    const ext = path.extname(name).toLowerCase();
    if (![".wav", ".aiff", ".aif", ".m4a", ".mp3", ".caf"].includes(ext)) continue;
    found.set(path.basename(name, ext), path.join(rawDir, name));
  }
  return found;
}

/* Neural voices look like en-US-AvaNeural. Compact macOS names do not. */
function isNeural(name) {
  return /Neural$/i.test(name) || /^[a-z]{2}-[A-Z]{2}-/.test(name);
}

async function findEdgeTts() {
  const named = process.env.EDGE_TTS;
  const local = path.join(root, ".venv/bin/edge-tts");
  if (named && await exists(named)) return named;
  if (await exists(local)) return local;
  try {
    await run("which", ["edge-tts"]);
    return "edge-tts";
  } catch {
    throw new Error(
      "edge-tts not found. Install it with:\n" +
      "  python3 -m venv .venv && .venv/bin/pip install edge-tts"
    );
  }
}

/* AAC in an m4a container: every browser that can run these games can decode
   it. Mono, and not squeezed: the whole voice is only about 1.3 MB, it is
   fetched once into the service-worker cache, and clarity matters more than
   a few hundred kilobytes when a 4-year-old is learning the words. */
async function toM4a(input, output) {
  /* Trim the dead air neural TTS leaves on either end, then a short pad so
     joined fragments ("The lion wants" + "a banana") do not slam together. */
  try {
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", input,
      "-ac", "1",
      "-ar", "24000",
      "-c:a", "aac",
      "-b:a", "48000",
      "-af",
      "silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.05:detection=peak," +
      "areverse," +
      "silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.05:detection=peak," +
      "areverse," +
      "apad=pad_dur=0.04",
      output
    ]);
    return;
  } catch {
    /* ffmpeg is only needed for neural mp3; recordings and `say` aiff still
       convert with the macOS tool. */
  }
  await run("afconvert", [
    input, output,
    "-f", "m4af",
    "-d", "aac",
    "-b", "48000",
    "--mix", "-c", "1"
  ]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function speak(text, voice, rate, dest, edgeTts) {
  if (edgeTts) {
    const args = [
      "--voice", voice,
      "--rate", String(rate),
      "--text", text,
      "--write-media", dest
    ];
    let last;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await run(edgeTts, args);
        return;
      } catch (err) {
        last = err;
        await sleep(400 * (attempt + 1));
      }
    }
    throw last;
  }
  /* Compact `say` voices: no pitch bump. The old [[pbas +8]] is what made
     Samantha sound like a toy from 1984. */
  await run("say", ["-v", voice, "-r", String(rate), "-o", dest, text]);
}

/* ------------------------------------------------------------------ main */

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const prefix = "--" + name;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === prefix) return argv[i + 1];
    if (argv[i].startsWith(prefix + "=")) return argv[i].slice(prefix.length + 1);
  }
  return fallback;
}

const voice = flag("voice", "en-US-AvaNeural");
const neural = isNeural(voice);
const rate = flag("rate", neural ? "-10%" : "160");
const all = lines();

if (argv.includes("--list")) {
  console.log(all.map((t) => slug(t).padEnd(28) + t).join("\n"));
  console.log("\n" + all.length + " lines");
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const raw = await recordings();
const index = {};
const edgeTts = neural ? await findEdgeTts() : null;
const tmp = path.join(outDir, neural ? ".bake.mp3" : ".bake.aiff");
let spoken = 0;
let recorded = 0;

try {
  for (const text of all) {
    const id = slug(text);
    const out = path.join(outDir, id + ".m4a");
    const source = raw.get(id);
    if (source) {
      await toM4a(source, out);
      recorded++;
    } else {
      await speak(text, voice, rate, tmp, edgeTts);
      await toM4a(tmp, out);
      spoken++;
    }
    index[text] = id + ".m4a";
  }
} finally {
  if (await exists(tmp)) await unlink(tmp);
}

await writeFile(
  path.join(outDir, "index.json"),
  JSON.stringify({ voice: recorded ? voice + " + recordings" : voice, clips: index }, null, 1) + "\n"
);

let bytes = 0;
for (const name of Object.keys(index)) {
  const sz = (await stat(path.join(outDir, index[name]))).size;
  if (sz < 1500) throw new Error("clip too small: " + index[name]);
  bytes += sz;
}

console.log(
  all.length + " clips (" + recorded + " recorded, " + spoken + " synthesised), " +
  Math.round(bytes / 1024) + " KB total"
);
