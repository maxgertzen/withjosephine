import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_IMAGES = path.resolve(__dirname, "../public/images");

type ImageFormat = "webp" | "avif";

interface Target {
  file: string;
  width: number;
  quality: number;
  format?: ImageFormat;
  outputName?: string;
}

const TARGETS: Target[] = [
  { file: "josephine-portrait.jpg", width: 600, quality: 80 },
  { file: "under-construction.png", width: 800, quality: 80 },
  { file: "logo-main.png", width: 960, quality: 85 },
  { file: "logo-main.png", width: 560, quality: 85, outputName: "logo-main-560" },
  { file: "logo-main.png", width: 240, quality: 85, outputName: "logo-main-240" },
  { file: "logo-main.png", width: 960, quality: 60, format: "avif" },
  { file: "logo-main.png", width: 560, quality: 60, format: "avif", outputName: "logo-main-560" },
  { file: "logo-horizontal.png", width: 480, quality: 85 },
  { file: "logo-horizontal-text.png", width: 480, quality: 85 },
];

async function optimizeImages() {
  for (const target of TARGETS) {
    const inputPath = path.join(PUBLIC_IMAGES, target.file);
    const format = target.format ?? "webp";
    const outputFile = `${target.outputName ?? path.parse(target.file).name}.${format}`;
    const outputPath = path.join(PUBLIC_IMAGES, outputFile);

    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${target.file} — file not found`);
      continue;
    }

    const inputStats = fs.statSync(inputPath);
    const inputSizeKB = Math.round(inputStats.size / 1024);

    await sharp(inputPath)
      .resize(target.width, undefined, { withoutEnlargement: true })
      .toFormat(format, { quality: target.quality })
      .toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputSizeKB = Math.round(outputStats.size / 1024);
    const savings = Math.round((1 - outputStats.size / inputStats.size) * 100);

    console.log(
      `${target.file} (${inputSizeKB} KB) → ${outputFile} (${outputSizeKB} KB) — ${savings}% smaller`,
    );
  }

  console.log("\nDone.");
}

optimizeImages().catch(console.error);
