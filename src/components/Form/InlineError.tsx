/**
 * Top-of-form inline error message. ARIA-live so screen readers announce the
 * change when the message appears after a failed submit. Renders nothing when
 * `message` is falsy so callers can pass `null` without conditional wrappers.
 */
export function InlineError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={
        className ?? "font-body text-xs text-j-rose"
      }
    >
      {message}
    </p>
  );
}
