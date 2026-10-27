interface BookingPageHeadingProps {
  title: string;
  editTarget?: string;
}

export function BookingPageHeading({ title, editTarget }: BookingPageHeadingProps) {
  return (
    <h2 className="font-display italic font-light text-[clamp(1.5rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3" data-sanity={editTarget}>
      {title}
    </h2>
  );
}
