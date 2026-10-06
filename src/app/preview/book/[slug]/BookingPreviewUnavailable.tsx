export function BookingPreviewUnavailable({ slug }: { slug: string }) {
  return (
    <p className="font-body text-base text-j-text-muted p-8">
      Preview unavailable: no reading or booking form found for slug &ldquo;{slug}&rdquo;.
    </p>
  );
}
