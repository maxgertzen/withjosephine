import { Globe, Mail } from "lucide-react";
import type { ReactElement } from "react";
import {
  siApplepodcasts,
  siBluesky,
  siDiscord,
  siEtsy,
  siFacebook,
  siInstagram,
  type SimpleIcon,
  siPatreon,
  siPinterest,
  siSnapchat,
  siSpotify,
  siSubstack,
  siTelegram,
  siThreads,
  siTiktok,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";

import type { SocialPlatform } from "@/lib/links/socialPlatforms";

type IconComponent = (props: { className?: string }) => ReactElement;

function brandIcon(icon: SimpleIcon): IconComponent {
  return function BrandIcon({ className }) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d={icon.path} />
      </svg>
    );
  };
}

const ICONS: Record<SocialPlatform | "twitter", IconComponent> = {
  tiktok: brandIcon(siTiktok),
  instagram: brandIcon(siInstagram),
  youtube: brandIcon(siYoutube),
  facebook: brandIcon(siFacebook),
  x: brandIcon(siX),
  twitter: brandIcon(siX),
  threads: brandIcon(siThreads),
  bluesky: brandIcon(siBluesky),
  pinterest: brandIcon(siPinterest),
  snapchat: brandIcon(siSnapchat),
  spotify: brandIcon(siSpotify),
  applepodcasts: brandIcon(siApplepodcasts),
  substack: brandIcon(siSubstack),
  patreon: brandIcon(siPatreon),
  etsy: brandIcon(siEtsy),
  discord: brandIcon(siDiscord),
  telegram: brandIcon(siTelegram),
  whatsapp: brandIcon(siWhatsapp),
  email: ({ className }) => <Mail className={className} strokeWidth={1.75} aria-hidden="true" />,
  website: ({ className }) => <Globe className={className} strokeWidth={1.75} aria-hidden="true" />,
};

export function socialIcon(platform: string, className?: string): ReactElement | null {
  const Icon = ICONS[platform as keyof typeof ICONS];
  return Icon ? <Icon className={className} /> : null;
}
