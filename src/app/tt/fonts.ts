import localFont from "next/font/local";

import type { LinksPageNameStyle } from "@/data/defaults";

const cormorantGaramond = localFont({
  src: [{ path: "./fonts/cormorant-garamond-300-italic.woff2", weight: "300", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const playfairDisplay = localFont({
  src: [{ path: "./fonts/playfair-display-400-italic.woff2", weight: "400", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const ebGaramond = localFont({
  src: [{ path: "./fonts/eb-garamond-400-italic.woff2", weight: "400", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const lora = localFont({
  src: [{ path: "./fonts/lora-400-italic.woff2", weight: "400", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const crimsonText = localFont({
  src: [{ path: "./fonts/crimson-text-400-italic.woff2", weight: "400", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const libreBaskerville = localFont({
  src: [{ path: "./fonts/libre-baskerville-400-italic.woff2", weight: "400", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const bitter = localFont({
  src: [{ path: "./fonts/bitter-300-italic.woff2", weight: "300", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const zillaSlab = localFont({
  src: [{ path: "./fonts/zilla-slab-300-italic.woff2", weight: "300", style: "italic" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const robotoSlab = localFont({
  src: [{ path: "./fonts/roboto-slab-300.woff2", weight: "300", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const cormorantGaramondBold = localFont({
  src: [{ path: "./fonts/cormorant-garamond-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const playfairDisplayBold = localFont({
  src: [{ path: "./fonts/playfair-display-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const ebGaramondBold = localFont({
  src: [{ path: "./fonts/eb-garamond-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const loraBold = localFont({
  src: [{ path: "./fonts/lora-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const crimsonTextBold = localFont({
  src: [{ path: "./fonts/crimson-text-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const libreBaskervilleBold = localFont({
  src: [{ path: "./fonts/libre-baskerville-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const bitterBold = localFont({
  src: [{ path: "./fonts/bitter-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const zillaSlabBold = localFont({
  src: [{ path: "./fonts/zilla-slab-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const robotoSlabBold = localFont({
  src: [{ path: "./fonts/roboto-slab-700.woff2", weight: "700", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const inter = localFont({
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
});

const dmSans = localFont({
  src: [
    { path: "./fonts/dm-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-sans-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
});

const sourceSans3 = localFont({
  src: [
    { path: "./fonts/source-sans-3-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-sans-3-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
});

const nunitoSans = localFont({
  src: [
    { path: "./fonts/nunito-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/nunito-sans-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
});

const workSans = localFont({
  src: [
    { path: "./fonts/work-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/work-sans-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
});

const loraText = localFont({
  src: [
    { path: "./fonts/lora-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/lora-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const bitterText = localFont({
  src: [
    { path: "./fonts/bitter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/bitter-500.woff2", weight: "500", style: "normal" },
  ],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const libreBaskervilleText = localFont({
  src: [{ path: "./fonts/libre-baskerville-400.woff2", weight: "400", style: "normal" }],
  preload: false,
  adjustFontFallback: "Times New Roman",
});

type LoadedFont = { style: { fontFamily: string } };

export const LINKS_PAGE_NAME_FONTS: Record<string, LoadedFont> = {
  "Cormorant Garamond": cormorantGaramond,
  "Playfair Display": playfairDisplay,
  "EB Garamond": ebGaramond,
  Lora: lora,
  "Crimson Text": crimsonText,
  "Libre Baskerville": libreBaskerville,
  Bitter: bitter,
  "Zilla Slab": zillaSlab,
  "Roboto Slab": robotoSlab,
};

export const LINKS_PAGE_BOLD_NAME_FONTS: Record<string, LoadedFont> = {
  "Cormorant Garamond": cormorantGaramondBold,
  "Playfair Display": playfairDisplayBold,
  "EB Garamond": ebGaramondBold,
  Lora: loraBold,
  "Crimson Text": crimsonTextBold,
  "Libre Baskerville": libreBaskervilleBold,
  Bitter: bitterBold,
  "Zilla Slab": zillaSlabBold,
  "Roboto Slab": robotoSlabBold,
};

export const LINKS_PAGE_BODY_FONTS: Record<string, LoadedFont> = {
  Inter: inter,
  "DM Sans": dmSans,
  "Source Sans 3": sourceSans3,
  "Nunito Sans": nunitoSans,
  "Work Sans": workSans,
  Lora: loraText,
  Bitter: bitterText,
  "Libre Baskerville": libreBaskervilleText,
};

export function linksPageFontVariables(
  nameFont: string | undefined,
  textFont: string | undefined,
  nameStyle: LinksPageNameStyle,
): Record<string, string> {
  const variables: Record<string, string> = {};
  const nameFonts = nameStyle === "bold" ? LINKS_PAGE_BOLD_NAME_FONTS : LINKS_PAGE_NAME_FONTS;
  const name = nameFont ? nameFonts[nameFont] : undefined;
  const text = textFont ? LINKS_PAGE_BODY_FONTS[textFont] : undefined;
  if (name) variables["--font-display-source"] = name.style.fontFamily;
  if (text) variables["--font-body-source"] = text.style.fontFamily;
  return variables;
}
