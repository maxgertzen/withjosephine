import {
  Bitter,
  Cormorant_Garamond,
  Crimson_Text,
  DM_Sans,
  EB_Garamond,
  Inter,
  Libre_Baskerville,
  Lora,
  Nunito_Sans,
  Playfair_Display,
  Roboto_Slab,
  Source_Sans_3,
  Work_Sans,
  Zilla_Slab,
} from "next/font/google";

import type { LinksPageNameStyle } from "@/data/defaults";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const bitter = Bitter({
  subsets: ["latin"],
  weight: ["300"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const zillaSlab = Zilla_Slab({
  subsets: ["latin"],
  weight: ["300"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["300"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const cormorantGaramondBold = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const playfairDisplayBold = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const ebGaramondBold = EB_Garamond({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const loraBold = Lora({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const crimsonTextBold = Crimson_Text({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const libreBaskervilleBold = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const bitterBold = Bitter({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const zillaSlabBold = Zilla_Slab({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const robotoSlabBold = Roboto_Slab({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  display: "swap",
  preload: false,
});

const loraText = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const bitterText = Bitter({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  display: "swap",
  preload: false,
});
const libreBaskervilleText = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
  preload: false,
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
