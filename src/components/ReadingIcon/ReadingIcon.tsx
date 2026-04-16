import { mergeClasses } from "@/lib/utils";

interface ReadingIconProps {
  slug: string;
  className?: string;
}

/**
 * Decorative SVG illustration for each reading type.
 * Line-art style using brand gold accent, "Quiet Archivist" aesthetic.
 */
export function ReadingIcon({ slug, className }: ReadingIconProps) {
  const classes = mergeClasses("text-j-accent", className);

  switch (slug) {
    case "soul-blueprint":
      return <SoulBlueprintIcon className={classes} />;
    case "birth-chart":
      return <BirthChartIcon className={classes} />;
    case "akashic-record":
      return <AkashicRecordIcon className={classes} />;
    default:
      return null;
  }
}

/** Layered geometric star mandala — signature, most intricate */
function SoulBlueprintIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="36" opacity="0.5" />
      <circle cx="40" cy="40" r="24" opacity="0.4" />
      <polygon
        points="40,8 52,32 76,32 56,48 64,72 40,56 16,72 24,48 4,32 28,32"
        opacity="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="40,20 54,40 40,60 26,40"
        opacity="0.45"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="40" r="2.5" fill="currentColor" opacity="0.7" stroke="none" />
      <line x1="40" y1="4" x2="40" y2="14" opacity="0.4" />
      <line x1="40" y1="66" x2="40" y2="76" opacity="0.4" />
      <line x1="4" y1="40" x2="14" y2="40" opacity="0.4" />
      <line x1="66" y1="40" x2="76" y2="40" opacity="0.4" />
      <line x1="11" y1="11" x2="18" y2="18" opacity="0.3" />
      <line x1="62" y1="62" x2="69" y2="69" opacity="0.3" />
      <line x1="69" y1="11" x2="62" y2="18" opacity="0.3" />
      <line x1="11" y1="69" x2="18" y2="62" opacity="0.3" />
    </svg>
  );
}

/** Circular chart with orbital rings and crescent moon */
function BirthChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="36" opacity="0.45" />
      <circle cx="40" cy="40" r="26" opacity="0.4" />
      <circle cx="40" cy="40" r="16" opacity="0.35" />
      <line x1="40" y1="4" x2="40" y2="76" opacity="0.25" />
      <line x1="4" y1="40" x2="76" y2="40" opacity="0.25" />
      <line x1="14.5" y1="14.5" x2="65.5" y2="65.5" opacity="0.18" />
      <line x1="65.5" y1="14.5" x2="14.5" y2="65.5" opacity="0.18" />
      <path
        d="M44,22 A12,12 0 1,0 44,58 A9,9 0 1,1 44,22Z"
        opacity="0.55"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="4" r="2" fill="currentColor" opacity="0.6" stroke="none" />
      <circle cx="66" cy="40" r="1.8" fill="currentColor" opacity="0.55" stroke="none" />
      <circle cx="22" cy="58" r="1.5" fill="currentColor" opacity="0.45" stroke="none" />
      <circle cx="14" cy="18" r="1" fill="currentColor" opacity="0.35" stroke="none" />
      <circle cx="68" cy="20" r="1" fill="currentColor" opacity="0.35" stroke="none" />
      <circle cx="62" cy="66" r="1" fill="currentColor" opacity="0.35" stroke="none" />
    </svg>
  );
}

/** Open book with radiating light and star accents */
function AkashicRecordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      aria-hidden="true"
    >
      <line x1="40" y1="28" x2="40" y2="68" opacity="0.5" />
      <path
        d="M40,28 Q38,30 14,34 L14,64 Q38,60 40,68Z"
        opacity="0.45"
        strokeLinejoin="round"
      />
      <path
        d="M40,28 Q42,30 66,34 L66,64 Q42,60 40,68Z"
        opacity="0.45"
        strokeLinejoin="round"
      />
      <line x1="20" y1="40" x2="36" y2="38" opacity="0.25" />
      <line x1="20" y1="46" x2="36" y2="44" opacity="0.25" />
      <line x1="20" y1="52" x2="36" y2="50" opacity="0.25" />
      <line x1="44" y1="38" x2="60" y2="40" opacity="0.25" />
      <line x1="44" y1="44" x2="60" y2="46" opacity="0.25" />
      <line x1="44" y1="50" x2="60" y2="52" opacity="0.25" />
      <line x1="40" y1="24" x2="40" y2="10" opacity="0.4" />
      <line x1="40" y1="24" x2="28" y2="14" opacity="0.35" />
      <line x1="40" y1="24" x2="52" y2="14" opacity="0.35" />
      <line x1="40" y1="24" x2="20" y2="20" opacity="0.25" />
      <line x1="40" y1="24" x2="60" y2="20" opacity="0.25" />
      <circle cx="40" cy="8" r="1.8" fill="currentColor" opacity="0.6" stroke="none" />
      <circle cx="26" cy="12" r="1.2" fill="currentColor" opacity="0.4" stroke="none" />
      <circle cx="54" cy="12" r="1.2" fill="currentColor" opacity="0.4" stroke="none" />
      <circle cx="18" cy="18" r="1" fill="currentColor" opacity="0.3" stroke="none" />
      <circle cx="62" cy="18" r="1" fill="currentColor" opacity="0.3" stroke="none" />
    </svg>
  );
}
