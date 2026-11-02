import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { SocialLinks } from "@/components/SocialLinks";
import { socialIcon } from "@/components/SocialLinks/socialIcons";
import type {
  LinksPageButtonShape,
  LinksPageLetterCase,
  LinksPageNameSize,
  LinksPageNameStyle,
  LinksPageShareWords,
} from "@/data/defaults";
import type { LinkDestination } from "@/lib/links/linkKey";
import { SHARE_APPS, type ShareApp } from "@/lib/links/shareTargets";
import type { MappedSocialLink } from "@/lib/sanity/mappers";
import { mergeClasses } from "@/lib/utils";

import { ShareMenu } from "./ShareMenu";
import { TikTokVideoCard } from "./TikTokVideoCard";

export type LinksPageButton = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  shareHref?: string;
  countsTaps: boolean;
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
  photoSize: number;
  buttonShape: LinksPageButtonShape;
  nameStyle: LinksPageNameStyle;
  buttonLetterCase: LinksPageLetterCase;
  buttons: LinksPageButton[];
  shareWords?: LinksPageShareWords;
  videosTitle: string;
  videoIds: string[];
  playVideo: string;
  socialLinks: MappedSocialLink[];
  colourVariables: Record<string, string>;
  pageColour?: string;
  fontVariables?: Record<string, string>;
  inStudioPreview?: boolean;
};

const NAME_SIZE_CLASSES: Record<LinksPageNameSize, string> = {
  small: "text-[2rem]",
  medium: "text-[2.6rem]",
  large: "text-[3.2rem]",
};

const NAME_STYLE_CLASSES: Record<LinksPageNameStyle, string> = {
  slanted: "font-light italic",
  bold: "font-bold not-italic",
};

const BUTTON_WORDS_CLASSES: Record<LinksPageLetterCase, string> = {
  normal: "text-[0.95rem] font-medium",
  upper: "text-[0.82rem] font-medium uppercase tracking-[0.12em]",
};

const SHARE_ICONS_DRAWN_ON_THE_SERVER = Object.fromEntries(
  SHARE_APPS.map((app) => [app, socialIcon(app, "h-5 w-5")]),
) as Record<ShareApp, ReactNode>;

const socialLinkIcon = (platform: string) => socialIcon(platform, "h-7 w-7");

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
  photoSize,
  buttonShape,
  nameStyle,
  buttonLetterCase,
  buttons,
  shareWords,
  videosTitle,
  videoIds,
  playVideo,
  socialLinks,
  colourVariables,
  pageColour,
  fontVariables,
  inStudioPreview = false,
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
            width={photoSize}
            height={photoSize}
            style={{ width: photoSize, height: photoSize }}
            priority
            className="mb-6 rounded-full border-2 border-j-text-heading object-cover"
          />
        ) : null}
        <h1
          className={mergeClasses(
            "m-0 font-display leading-tight text-j-text-heading",
            NAME_STYLE_CLASSES[nameStyle],
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
          renderIcon={socialLinkIcon}
        />
        <ul className="mt-8 flex w-full list-none flex-col gap-3 p-0">
          {buttons.map((button) => {
            const share =
              shareWords && button.shareHref
                ? { words: shareWords, href: button.shareHref }
                : undefined;
            return (
              <li key={button.key} className="relative">
                <a
                  href={button.href}
                  className={mergeClasses(
                    BUTTON_CLASSES,
                    BUTTON_SHAPE_CLASSES[buttonShape],
                    button.standOut && STAND_OUT_CLASSES,
                    share && "px-11",
                  )}
                  {...trackingAttributes(button)}
                >
                  <span className={BUTTON_WORDS_CLASSES[buttonLetterCase]}>{button.label}</span>
                  {button.subtitle ? (
                    <span className="text-[0.8rem] opacity-85">{button.subtitle}</span>
                  ) : null}
                </a>
                {share ? (
                  <ShareMenu
                    label={button.label}
                    shareHref={share.href}
                    linkKey={button.key}
                    words={share.words}
                    appIcons={SHARE_ICONS_DRAWN_ON_THE_SERVER}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        {videoIds.length > 0 ? (
          <section className="mt-10 w-full" aria-labelledby="links-page-videos">
            <h2
              id="links-page-videos"
              className="m-0 mb-3 font-body text-base font-semibold text-j-text-heading"
            >
              {videosTitle}
            </h2>
            <ul className="m-0 flex w-full list-none snap-x snap-mandatory gap-3 overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {videoIds.map((videoId, index) => (
                <li key={videoId} className="w-[38%] shrink-0 snap-start">
                  <TikTokVideoCard
                    videoId={videoId}
                    title={`${videosTitle} ${index + 1}`}
                    playLabel={playVideo}
                    inStudioPreview={inStudioPreview}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {footerLine ? (
          <p className="mt-8 font-body text-xs tracking-wide text-j-text-muted opacity-70">
            {footerLine}
          </p>
        ) : null}
      </main>
    </div>
  );
}
