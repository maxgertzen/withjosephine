interface BookingPageHeadingProps {
  eyebrow?: string;
  title?: string;
}

export function BookingPageHeading({ eyebrow, title }: BookingPageHeadingProps) {
  return (
    <>
      {eyebrow ? (
        <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-3">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
          {title}
        </h1>
      ) : null}
    </>
  );
}
