import { BookingPageShell } from "@/components/BookingPageShell";
import { Button } from "@/components/Button";
import { GiftMessageCard } from "@/components/GiftMessageCard";
import type { NotesFooterProps, NotesNavProps } from "@/components/Notes/NotesShell";

export type GiftMessageViewProps = {
  nav: NotesNavProps;
  footer?: NotesFooterProps;
  backHref: string;
  backLabel?: string;
  reading: { tag: string; name: string; priceLabel: string } | null;
  heading: string;
  body: string;
  action?: { label: string; href: string };
};

export function GiftMessageView({
  nav,
  footer,
  backHref,
  backLabel,
  reading,
  heading,
  body,
  action,
}: GiftMessageViewProps) {
  return (
    <BookingPageShell
      nav={nav}
      footer={footer}
      backHref={backHref}
      backLabel={backLabel}
      readingTag={reading?.tag ?? ""}
      readingName={reading?.name ?? ""}
      readingPrice={reading?.priceLabel ?? ""}
    >
      <GiftMessageCard
        heading={heading}
        body={<p className="m-0">{body}</p>}
        action={
          action ? (
            <Button
              href={action.href}
              variant="outlined"
              size="sm"
              className="block w-full text-center"
            >
              {action.label}
            </Button>
          ) : undefined
        }
      />
    </BookingPageShell>
  );
}
