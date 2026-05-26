import { Button } from "@react-email/components";

import { EMAIL_LIBRARY_BUTTON_LABEL_DEFAULT } from "@/data/defaults";

/**
 * Outlined secondary library-link button used by every purchaser-facing
 * email template (OrderConfirmation, Day7Delivery, GiftPurchaseConfirmation
 * both variants). Renders nothing when `libraryUrl` is undefined so the
 * caller can stay declarative.
 *
 * Visual treatment: transparent fill + ink border + ink text. Visually
 * subordinate to the primary CTA (Day7 listen button, gift share button)
 * which uses solid `bg-ink text-cream`. OC has no primary today, so the
 * outlined treatment is intentionally lower-weight than a solid CTA.
 */
export type LibraryButtonProps = {
  libraryUrl: string | undefined;
  label?: string;
};

export function LibraryButton({ libraryUrl, label }: LibraryButtonProps) {
  if (!libraryUrl) return null;
  const buttonLabel = label ?? EMAIL_LIBRARY_BUTTON_LABEL_DEFAULT;
  return (
    <div style={{ padding: "12px 48px 8px 48px", textAlign: "center" }}>
      <Button
        href={libraryUrl}
        className="font-sans no-underline"
        style={{
          padding: "14px 30px",
          fontSize: 15,
          borderRadius: 50,
          letterSpacing: "0.02em",
          color: "#1C1935",
          backgroundColor: "transparent",
          border: "1.5px solid #1C1935",
        }}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
