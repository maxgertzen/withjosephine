import { Card, Flex, Radio, Stack, Text } from "@sanity/ui";
import { type CSSProperties, useEffect, useState } from "react";
import { set, type StringInputProps, useClient, useFormValue } from "sanity";

import { LINKS_PAGE_SITE_STYLE } from "../../src/data/defaults";
import {
  BODY_FONTS,
  DISPLAY_FONTS,
  type FontCut,
  LINKS_PAGE_BOLD_NAME_CUT,
  LINKS_PAGE_SERIF_FONT_NAMES,
  LINKS_PAGE_SLANTED_NAME_CUTS,
  LINKS_PAGE_TEXT_CUT,
  LINKS_PAGE_TEXT_CUTS,
  siteFontCut,
} from "../../src/lib/theme/palette";
import { STUDIO_API_VERSION } from "../lib/studioRequests";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";
const LOADED_ATTRIBUTE = "data-font-picker";
const UPPER_CASE_STYLE: CSSProperties = { textTransform: "uppercase", letterSpacing: "0.12em" };

type Choice = { title: string; value: string };

export type FontSample = {
  words: { path: (string | number)[]; fallback: string };
  siteFont: { themeField: "displayFont" | "bodyFont"; fallback: string };
  kind: "name" | "text";
};

type Look = { kind: FontSample["kind"]; slanted: boolean; upperCase: boolean };

function cutFor(choice: string, font: string, look: Look): FontCut {
  if (choice === LINKS_PAGE_SITE_STYLE) {
    const config = look.kind === "name" ? DISPLAY_FONTS[font] : BODY_FONTS[font];
    const target = look.kind === "text" ? LINKS_PAGE_TEXT_CUT.weight : look.slanted ? "300" : "700";
    return siteFontCut(config, target, look.slanted);
  }
  if (look.kind === "text") return LINKS_PAGE_TEXT_CUTS[font] ?? LINKS_PAGE_TEXT_CUT;
  return look.slanted ? (LINKS_PAGE_SLANTED_NAME_CUTS[font] ?? LINKS_PAGE_TEXT_CUT) : LINKS_PAGE_BOLD_NAME_CUT;
}

function googleFontsHref(font: string, { weight, italic }: FontCut): string {
  const axes = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  return `${GOOGLE_FONTS_CSS}?family=${font.replace(/ /g, "+")}:${axes}&display=swap`;
}

function loadFont(href: string) {
  if (document.head.querySelector(`link[${LOADED_ATTRIBUTE}="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute(LOADED_ATTRIBUTE, href);
  document.head.append(link);
}

function sampleStyle(font: string, cut: FontCut, look: Look): CSSProperties {
  const generic = LINKS_PAGE_SERIF_FONT_NAMES.has(font) ? "serif" : "sans-serif";
  return {
    fontFamily: `"${font}", ${generic}`,
    fontWeight: Number(cut.weight),
    fontStyle: look.kind === "name" && look.slanted ? "italic" : "normal",
    ...(look.upperCase ? UPPER_CASE_STYLE : {}),
  };
}

function useThemeFont({ themeField, fallback }: FontSample["siteFont"]): string {
  const client = useClient({ apiVersion: STUDIO_API_VERSION });
  const [font, setFont] = useState(fallback);
  useEffect(() => {
    let current = true;
    client
      .fetch<string | null>(`*[_type == "theme"][0].${themeField}`)
      .then((chosen) => current && chosen && setFont(chosen))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [client, themeField]);
  return font;
}

export function fontPickerInput({ words, siteFont, kind }: FontSample) {
  return function FontPickerInput(props: StringInputProps) {
    const choices = (props.schemaType.options?.list ?? []) as Choice[];
    const typed = useFormValue(words.path);
    const nameStyle = useFormValue(["nameStyle"]);
    const letterCase = useFormValue(["buttonLetterCase"]);
    const themeFont = useThemeFont(siteFont);
    const look: Look = { kind, slanted: nameStyle !== "bold", upperCase: kind === "text" && letterCase === "upper" };
    const sampleWords = (typeof typed === "string" && typed.trim()) || words.fallback;
    const current = props.value ?? LINKS_PAGE_SITE_STYLE;

    const samples = choices.map((choice) => {
      const font = choice.value === LINKS_PAGE_SITE_STYLE ? themeFont : choice.value;
      const cut = cutFor(choice.value, font, look);
      return { choice, font, cut, href: googleFontsHref(font, cut) };
    });
    const hrefs = samples.map(({ href }) => href).join(" ");

    useEffect(() => {
      for (const href of hrefs.split(" ")) loadFont(href);
    }, [hrefs]);

    return (
      <Stack space={2} role="radiogroup">
        {samples.map(({ choice, font, cut }) => {
          const selected = current === choice.value;
          return (
            <Card
              key={choice.value}
              as="label"
              padding={3}
              radius={2}
              border
              tone={selected ? "primary" : "default"}
              style={{ cursor: props.readOnly ? "default" : "pointer" }}
            >
              <Flex align="center" gap={3}>
                <Radio
                  name={props.id}
                  value={choice.value}
                  checked={selected}
                  disabled={props.readOnly}
                  ref={selected ? props.elementProps.ref : undefined}
                  onFocus={props.elementProps.onFocus}
                  onBlur={props.elementProps.onBlur}
                  onChange={() => props.onChange(set(choice.value))}
                />
                <Stack space={2} flex={1}>
                  <Text size={1} muted>
                    {choice.title}
                  </Text>
                  <Text size={3} style={sampleStyle(font, cut, look)}>
                    {sampleWords}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          );
        })}
      </Stack>
    );
  };
}
