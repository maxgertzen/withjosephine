import { Button } from "@react-email/components";

import { EMAIL_LIBRARY_BUTTON_LABEL_DEFAULT } from "@/data/defaults";
import { emailTokens } from "@/lib/theme/email-tokens.generated";

export type LibraryButtonVariant = "primary" | "secondary";

export type LibraryButtonProps = {
  libraryUrl: string | undefined;
  label?: string;
  variant?: LibraryButtonVariant;
};

const SHARED_BUTTON_STYLE = {
  padding: "14px 30px",
  fontSize: 15,
  borderRadius: 50,
  letterSpacing: "0.02em",
} as const;

const VARIANT_STYLES: Record<LibraryButtonVariant, React.CSSProperties> = {
  primary: {
    color: emailTokens.cream,
    backgroundColor: emailTokens.ink,
    border: `1.5px solid ${emailTokens.ink}`,
  },
  secondary: {
    color: emailTokens.ink,
    backgroundColor: "transparent",
    border: `1.5px solid ${emailTokens.ink}`,
  },
};

export function LibraryButton({ libraryUrl, label, variant = "secondary" }: LibraryButtonProps) {
  if (!libraryUrl) return null;
  const buttonLabel = label ?? EMAIL_LIBRARY_BUTTON_LABEL_DEFAULT;
  return (
    <div style={{ padding: "12px 48px 8px 48px", textAlign: "center" }}>
      <Button
        href={libraryUrl}
        className="font-sans no-underline"
        style={{ ...SHARED_BUTTON_STYLE, ...VARIANT_STYLES[variant] }}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
