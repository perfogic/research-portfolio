import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_ROOT = path.resolve("content");
const OUTPUT = path.resolve("content-manifest.json");

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

async function main() {
  await stat(CONTENT_ROOT);
  const files = await walk(CONTENT_ROOT);
  const payload = {
    generatedAt: new Date().toISOString(),
    files
  };
  await writeFile(OUTPUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${files.length} entries to ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
