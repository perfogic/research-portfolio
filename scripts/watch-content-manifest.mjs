import { watch } from "node:fs";
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_ROOT = path.resolve("content");
const OUTPUT = path.resolve("content-manifest.json");
const DEBOUNCE_MS = 120;

let timer = null;
let running = false;
let queued = false;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(process.cwd(), absolute).replaceAll(path.sep, "/"));
    }
  }

  return files.sort();
}

async function buildManifest() {
  if (running) {
    queued = true;
    return;
  }

  running = true;

  try {
    await stat(CONTENT_ROOT);
    const files = await walk(CONTENT_ROOT);
    const payload = {
      generatedAt: new Date().toISOString(),
      files,
    };
    await writeFile(OUTPUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`[content] wrote ${files.length} entries`);
  } catch (error) {
    console.error("[content] manifest build failed");
    console.error(error);
  } finally {
    running = false;
    if (queued) {
      queued = false;
      scheduleBuild();
    }
  }
}

function scheduleBuild() {
  clearTimeout(timer);
  timer = setTimeout(buildManifest, DEBOUNCE_MS);
}

await buildManifest();

const watcher = watch(CONTENT_ROOT, { recursive: true }, (_eventType, filename) => {
  if (!filename || filename.endsWith(".md")) {
    scheduleBuild();
  }
});

console.log("[content] watching content/**/*.md");

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});
