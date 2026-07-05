import { renderToString } from "react-dom/server";

import { ListenView } from "@/app/(authed)/listen/[id]/ListenView";
import { deriveThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/deriveThankYouViewProps";
import { ThankYouView } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";
import { VerifyPageView } from "@/app/auth/verify/VerifyPageView";
import type {
  ListenPageContent,
  MagicLinkVerifyPageContent,
} from "@/data/defaults";
import {
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
} from "@/data/defaults";
import type { SanityThankYouPage } from "@/lib/sanity/types";

import {
  LISTEN_FIXTURES,
  type PreviewSurface,
  THANKYOU_FIXTURES,
  VERIFY_FIXTURES,
} from "./preview-fixtures-pages";

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

// Display + body font fallback chains end in a generic family so the iframe
// stays legible if the Google Fonts request is ever blocked by a tightened
// Studio CSP. The chain mirrors src/app/layout.tsx's Inter / Cormorant CSS
// variables (--font-display / --font-body), with system serif/sans-serif
// terminals so the browser always has something to render.
const FONT_VARIABLES = `:root{--font-display-source:'Cormorant Garamond',Georgia,'Times New Roman',serif;--font-body-source:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}html,body{margin:0;padding:0;font-family:var(--font-body-source);}`;

export async function renderPagePreview(
  surface: PreviewSurface,
  stateKey: string,
  sanityCopy: unknown,
  styles: string,
): Promise<string> {
  const markup = renderSurfaceMarkup(surface, stateKey, sanityCopy);
  return wrapHtmlDocument(markup, styles);
}

function renderSurfaceMarkup(
  surface: PreviewSurface,
  stateKey: string,
  sanityCopy: unknown,
): string {
  const merged = (sanityCopy as object | null) ?? {};
  if (surface === "listen") {
    const state = LISTEN_FIXTURES[stateKey] ?? LISTEN_FIXTURES.delivered;
    const copy = { ...LISTEN_PAGE_DEFAULTS, ...merged } as ListenPageContent;
    return renderToString(<ListenView copy={copy} state={state} />);
  }
  if (surface === "thank-you") {
    const context = THANKYOU_FIXTURES[stateKey] ?? THANKYOU_FIXTURES["full-price"];
    const props = deriveThankYouViewProps({
      context,
      thankYouPageContent: (sanityCopy as SanityThankYouPage | null) ?? null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    return renderToString(<ThankYouView {...props} />);
  }
  const state = VERIFY_FIXTURES[stateKey] ?? VERIFY_FIXTURES.confirm;
  const copy = { ...MAGIC_LINK_VERIFY_PAGE_DEFAULTS, ...merged } as MagicLinkVerifyPageContent;
  return renderToString(<VerifyPageView copy={copy} state={state} />);
}

function wrapHtmlDocument(markup: string, styles: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="https://withjosephine.com/">${FONT_LINKS}<style>${styles}</style><style>${FONT_VARIABLES}</style></head><body>${markup}</body></html>`;
}
