import { Link, Section } from "@react-email/components";

export function DataExportLine({
  url,
  heading,
  buttonLabel,
}: {
  url: string | null | undefined;
  heading: string;
  buttonLabel: string;
}) {
  if (!url) return null;
  return (
    <Section
      className="font-sans text-muted"
      style={{ padding: "0 48px 32px 48px", fontSize: 12, lineHeight: 1.7 }}
    >
      <p style={{ margin: 0 }}>
        {heading}{" "}
        <Link href={url} className="text-ink">
          {buttonLabel} &rarr;
        </Link>
      </p>
    </Section>
  );
}
