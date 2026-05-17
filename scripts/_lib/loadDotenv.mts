import fs from "node:fs";

export function loadDotenv(filenames: readonly string[] = [".env.local", ".env"]): void {
  for (const filename of filenames) {
    try {
      const raw = fs.readFileSync(filename, "utf-8");
      for (const line of raw.split("\n")) {
        const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^"|"$/g, "");
        }
      }
      return;
    } catch {
      // Try next filename.
    }
  }
}
