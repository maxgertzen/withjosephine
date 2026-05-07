import { pixelBasedPreset, type TailwindConfig } from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

// `pixelBasedPreset` converts Tailwind's rem-based defaults to px — email
// clients render rem inconsistently.
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
