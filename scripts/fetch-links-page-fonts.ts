import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  LINKS_PAGE_BOLD_NAME_CUT,
  LINKS_PAGE_NAME_FONT_NAMES,
  LINKS_PAGE_SLANTED_NAME_CUTS,
  LINKS_PAGE_TEXT_CUT,
  LINKS_PAGE_TEXT_CUTS,
  LINKS_PAGE_TEXT_FONT_NAMES,
  fontFileName,
  fontFileSlug,
  type FontCut,
} from "../src/lib/theme/palette";
import { isMainModule } from "./_lib/main.mts";

const FONTS_DIR = path.resolve(import.meta.dirname, "../src/app/tt/fonts");
const LICENSES_DIR = path.join(FONTS_DIR, "licenses");
const CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const WORD_WEIGHT = "400";
const LICENSE_FOLDERS = ["ofl", "apache"];
const LICENSE_FILES = ["OFL.txt", "LICENSE.txt"];

function cutsToFetch(): { family: string; cut: FontCut }[] {
  const nameCuts = LINKS_PAGE_NAME_FONT_NAMES.flatMap((family) => [
    { family, cut: LINKS_PAGE_SLANTED_NAME_CUTS[family] },
    { family, cut: LINKS_PAGE_BOLD_NAME_CUT },
  ]);
  const wordCuts = LINKS_PAGE_TEXT_FONT_NAMES.flatMap((family) => {
    const buttonCut = LINKS_PAGE_TEXT_CUTS[family] ?? LINKS_PAGE_TEXT_CUT;
    const weights = new Set([WORD_WEIGHT, buttonCut.weight]);
    return [...weights].map((weight) => ({ family, cut: { weight, italic: false } }));
  });
  return [...nameCuts, ...wordCuts];
}

async function latinFileAddress(family: string, cut: FontCut): Promise<string> {
  const axis = `ital,wght@${cut.italic ? 1 : 0},${cut.weight}`;
  const cssAddress = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}&display=swap`;
  const response = await fetch(cssAddress, { headers: { "User-Agent": CHROME_USER_AGENT } });
  if (!response.ok)
    throw new Error(`${family} ${cut.weight}: Google Fonts answered ${response.status}`);
  const css = await response.text();
  const latinBlock = css.split("/* latin */")[1]?.split("}")[0];
  const address = latinBlock?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!address)
    throw new Error(`${family} ${cut.weight}: no latin woff2 in the Google Fonts answer`);
  return address;
}

async function download(address: string): Promise<Buffer> {
  const response = await fetch(address);
  if (!response.ok) throw new Error(`${address}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function licenseText(family: string): Promise<string> {
  const folder = family.toLowerCase().replace(/ /g, "");
  for (const licenseFolder of LICENSE_FOLDERS) {
    for (const file of LICENSE_FILES) {
      const response = await fetch(
        `https://raw.githubusercontent.com/google/fonts/main/${licenseFolder}/${folder}/${file}`,
      );
      if (response.ok) return response.text();
    }
  }
  throw new Error(`${family}: no license file found in google/fonts`);
}

async function main() {
  await mkdir(LICENSES_DIR, { recursive: true });
  const cuts = cutsToFetch();
  for (const { family, cut } of cuts) {
    const file = fontFileName(family, cut);
    await writeFile(
      path.join(FONTS_DIR, file),
      await download(await latinFileAddress(family, cut)),
    );
    console.log(file);
  }
  for (const family of new Set(cuts.map(({ family }) => family))) {
    const file = `${fontFileSlug(family)}.txt`;
    await writeFile(path.join(LICENSES_DIR, file), await licenseText(family));
  }
}

if (isMainModule(import.meta.url)) await main();
