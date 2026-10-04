import { Section } from "@react-email/components";
import type { ReactNode } from "react";

export function ReadingCard({
  label,
  readingName,
  centered = false,
  children,
}: {
  label: string;
  readingName: string;
  centered?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ padding: "0 48px" }}>
      <Section
        className={centered ? "bg-warm rounded text-center" : "bg-warm rounded"}
        style={{ padding: "20px 24px" }}
      >
        <p
          className="font-sans text-muted-warm uppercase"
          style={{ margin: "0 0 4px 0", fontSize: 11, letterSpacing: "0.18em" }}
        >
          {label}
        </p>
        <p className="font-serif text-ink" style={{ margin: "0 0 12px 0", fontSize: 22 }}>
          {readingName}
        </p>
        {children}
      </Section>
    </div>
  );
}
