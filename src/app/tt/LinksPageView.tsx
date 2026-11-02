import Image from "next/image";
import type { CSSProperties } from "react";

import { SocialLinks } from "@/components/SocialLinks";
import type { LinksPageButtonShape, LinksPageNameSize } from "@/data/defaults";
import type { LinkDestination } from "@/lib/links/linkKey";
import type { MappedSocialLink } from "@/lib/sanity/mappers";
import { mergeClasses } from "@/lib/utils";

export type LinksPageButton = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  destination: LinkDestination;
  standOut: boolean;
  position: number;
};

export type LinksPageViewProps = {
  photoUrl?: string;
  name: string;
  intro: string;
  footerLine: string;
  nameSize: LinksPageNameSize;
  buttonShape: LinksPageButtonShape;
  buttons: LinksPageButton[];
  socialLinks: MappedSocialLink[];
  colourVariables: Record<string, string>;
  pageColour?: string;
  fontVariables?: Record<string, string>;
};

const NAME_SIZE_CLASSES: Record<LinksPageNameSize, string> = {
  small: "text-[2rem]",
  medium: "text-[2.6rem]",
  large: "text-[3.2rem]",
};

const PHOTO_PX = 112;

const BUTTON_CLASSES =
  "flex min-h-12 w-full flex-col items-center justify-center gap-1 bg-j-bg-interactive px-6 py-3 font-body text-j-text-on-dark transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-deep";

const BUTTON_SHAPE_CLASSES: Record<LinksPageButtonShape, string> = {
  round: "rounded-[50px]",
  square: "rounded-none",
  squareShadow: "rounded-none shadow-[0_3px_0_0_var(--j-cream),0_8px_0_0_var(--j-bg-interactive)]",
};

const STAND_OUT_CLASSES = "ring-2 ring-j-ornament ring-offset-2 ring-offset-j-cream";

const SOCIAL_LINK_CLASSES = "text-j-text-heading hover:opacity-70 transition-opacity";

function trackingAttributes(button: LinksPageButton) {
  return {
    "data-mp-event": "links_link_click",
    "data-mp-link-key": button.key,
    "data-mp-destination-type": button.destination,
    "data-mp-destination-label": button.label,
    "data-mp-position": String(button.position),
    "data-mp-stand-out": String(button.standOut),
    "data-mp-transport": "sendBeacon",
    "data-clarity-event": "tt_link_click",
    "data-clarity-tag-tt-link": button.key,
  };
}

export function LinksPageView({
  photoUrl,
  name,
  intro,
  footerLine,
  nameSize,
  buttonShape,
  buttons,
  socialLinks,
  colourVariables,
  pageColour,
  fontVariables,
}: LinksPageViewProps) {
  const style = { ...colourVariables, ...fontVariables } as CSSProperties;

  return (
    <div style={style} className="min-h-dvh bg-j-cream text-j-text">
      {pageColour ? <style>{`body{background-color:${pageColour}}`}</style> : null}
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-col items-center px-6 pt-14 pb-10 text-center [body:has(#consent-banner-title)_&]:pb-72"
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            width={PHOTO_PX}
            height={PHOTO_PX}
            priority
            className="mb-6 h-28 w-28 rounded-full border-2 border-j-text-heading object-cover"
          />
        ) : null}
        <h1
          className={mergeClasses(
            "m-0 font-display font-light italic leading-tight text-j-text-heading",
            NAME_SIZE_CLASSES[nameSize],
          )}
        >
          {name}
        </h1>
        {intro ? (
          <p className="mt-3 font-body text-[0.95rem] leading-relaxed text-j-text-muted">{intro}</p>
        ) : null}
        <SocialLinks
          links={socialLinks}
          linkClassName={SOCIAL_LINK_CLASSES}
          className="mt-6"
          emailAsIcon
        />
        <ul className="mt-8 flex w-full list-none flex-col gap-3 p-0">
          {buttons.map((button) => (
            <li key={button.key}>
              <a
                href={button.href}
                className={mergeClasses(
                  BUTTON_CLASSES,
                  BUTTON_SHAPE_CLASSES[buttonShape],
                  button.standOut && STAND_OUT_CLASSES,
                )}
                {...trackingAttributes(button)}
              >
                <span className="text-[0.82rem] font-medium uppercase tracking-[0.12em]">{button.label}</span>
                {button.subtitle ? (
                  <span className="text-[0.8rem] normal-case tracking-normal opacity-85">{button.subtitle}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
        {footerLine ? (
          <p className="mt-8 font-body text-xs tracking-wide text-j-text-muted opacity-70">{footerLine}</p>
        ) : null}
      </main>
    </div>
  );
}
