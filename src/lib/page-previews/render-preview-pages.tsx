import { renderToString } from "react-dom/server";

import { VerifyPageView } from "@/app/auth/verify/VerifyPageView";
import { ListenView } from "@/app/listen/[id]/ListenView";
import { MyGiftsView } from "@/app/my-gifts/MyGiftsView";
import { MyReadingsView } from "@/app/my-readings/MyReadingsView";
import { VellumShell } from "@/components/VellumShell";
import type {
  GiftClaimPageContent,
  GiftIntakePageContent,
  ListenPageContent,
  MagicLinkVerifyPageContent,
  MyGiftsPageContent,
  MyReadingsPageContent,
} from "@/data/defaults";
import {
  GIFT_CLAIM_PAGE_DEFAULTS,
  GIFT_INTAKE_PAGE_DEFAULTS,
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  MY_GIFTS_PAGE_DEFAULTS,
  MY_READINGS_PAGE_DEFAULTS,
} from "@/data/defaults";

import { GiftIntakePagePreview } from "./GiftIntakePagePreview";
import {
  GIFT_INTAKE_FIXTURE_READING_NAME,
  GIFT_INTAKE_FIXTURES,
  LISTEN_FIXTURES,
  MY_GIFTS_FIXTURES,
  MY_READINGS_FIXTURES,
  type PreviewSurface,
  VERIFY_FIXTURES,
} from "./preview-fixtures-pages";

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

const FONT_VARIABLES = `:root{--font-display-source:'Cormorant Garamond',serif;--font-body-source:'Inter',sans-serif;}html,body{margin:0;padding:0;font-family:var(--font-body-source);}`;

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
  if (surface === "my-readings") {
    const state = MY_READINGS_FIXTURES[stateKey] ?? MY_READINGS_FIXTURES["list-populated"];
    const copy = { ...MY_READINGS_PAGE_DEFAULTS, ...merged } as MyReadingsPageContent;
    return renderToString(<MyReadingsView copy={copy} state={state} />);
  }
  if (surface === "my-gifts") {
    const state = MY_GIFTS_FIXTURES[stateKey] ?? MY_GIFTS_FIXTURES["list-populated"];
    const copy = { ...MY_GIFTS_PAGE_DEFAULTS, ...merged } as MyGiftsPageContent;
    return renderToString(<MyGiftsView copy={copy} state={state} />);
  }
  if (surface === "gift-claim") {
    const copy = { ...GIFT_CLAIM_PAGE_DEFAULTS, ...merged } as GiftClaimPageContent;
    return renderToString(renderGiftClaimSurface(stateKey, copy));
  }
  if (surface === "magic-link-verify") {
    const state = VERIFY_FIXTURES[stateKey] ?? VERIFY_FIXTURES.confirm;
    const copy = { ...MAGIC_LINK_VERIFY_PAGE_DEFAULTS, ...merged } as MagicLinkVerifyPageContent;
    return renderToString(<VerifyPageView copy={copy} state={state} />);
  }
  const state = GIFT_INTAKE_FIXTURES[stateKey] ?? GIFT_INTAKE_FIXTURES.welcome;
  const copy = { ...GIFT_INTAKE_PAGE_DEFAULTS, ...merged } as GiftIntakePageContent;
  return renderToString(
    <GiftIntakePagePreview
      copy={copy}
      state={state}
      fixtureReadingName={GIFT_INTAKE_FIXTURE_READING_NAME}
    />,
  );
}

function renderGiftClaimSurface(stateKey: string, copy: GiftClaimPageContent) {
  if (stateKey === "invalid") {
    return <VellumShell heading={copy.alreadyClaimedHeading} body={copy.alreadyClaimedBody} />;
  }
  if (stateKey === "expired") {
    return <VellumShell heading={copy.sessionExpiredHeading} body={copy.sessionExpiredBody} />;
  }
  return <VellumShell heading={copy.noTokenHeading} body={copy.noTokenBody} />;
}

function wrapHtmlDocument(markup: string, styles: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="https://withjosephine.com/">${FONT_LINKS}<style>${styles}</style><style>${FONT_VARIABLES}</style></head><body>${markup}</body></html>`;
}
