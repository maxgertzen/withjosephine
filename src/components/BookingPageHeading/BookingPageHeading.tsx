interface BookingPageHeadingProps {
  title: string;
}

export function BookingPageHeading({ title }: BookingPageHeadingProps) {
  return (
    <h2 className="font-display italic font-light text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
      {title}
    </h2>
  );
}
