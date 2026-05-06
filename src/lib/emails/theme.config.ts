import { pixelBasedPreset, type TailwindConfig } from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

/**
 * Tailwind config consumed by the `<Tailwind>` provider in `EmailShell.tsx`.
 * Single source of truth for email brand tokens — every component reads
 * colors and font families through `className="text-ink"` / `font-serif`
 * etc., so a brand-token edit lands in one file.
 *
 * `pixelBasedPreset` converts Tailwind's rem-based defaults into px (email
 * clients render rem inconsistently). All `text-*` size classes therefore
 * emit the equivalent px value.
 */
export const emailTailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        ink: t.ink,
        body: t.body,
        muted: t.muted,
        divider: t.divider,
        cream: t.cream,
        warm: t.warm,
        gold: t.gold,
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
};
