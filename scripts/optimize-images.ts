import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_IMAGES = path.resolve(__dirname, "../public/images");
const SRC_ROOT = path.resolve(__dirname, "../src");

const TARGETS = [
  { file: "akasha.png", width: 600, quality: 80 },
  { file: "under-construction.png", width: 800, quality: 80 },
  { file: "Logo.png", width: 480, quality: 85 },
];

function updateSourceRefs(oldRef: string, newRef: string) {
  const extensions = [".ts", ".tsx"];
  let count = 0;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes(oldRef)) {
          fs.writeFileSync(fullPath, content.replaceAll(oldRef, newRef));
          count++;
          console.log(`  Updated: ${path.relative(SRC_ROOT, fullPath)}`);
        }
      }
    }
  }

  walk(SRC_ROOT);
  return count;
}

async function optimizeImages() {
  for (const target of TARGETS) {
    const inputPath = path.join(PUBLIC_IMAGES, target.file);
    const baseName = path.parse(target.file).name;
    const outputPath = path.join(PUBLIC_IMAGES, `${baseName}.webp`);

    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${target.file} — file not found`);
      continue;
    }

    const inputStats = fs.statSync(inputPath);
    const inputSizeKB = Math.round(inputStats.size / 1024);

    await sharp(inputPath)
      .resize(target.width, undefined, { withoutEnlargement: true })
      .webp({ quality: target.quality })
      .toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputSizeKB = Math.round(outputStats.size / 1024);
    const savings = Math.round((1 - outputStats.size / inputStats.size) * 100);

    console.log(
      `${target.file} (${inputSizeKB} KB) → ${baseName}.webp (${outputSizeKB} KB) — ${savings}% smaller`,
    );

    const oldRef = `/images/${target.file}`;
    const newRef = `/images/${baseName}.webp`;
    const updated = updateSourceRefs(oldRef, newRef);
    if (updated === 0) {
      console.log(`  No source references to ${oldRef} found`);
    }
  }

  console.log("\nDone.");
}

optimizeImages().catch(console.error);
