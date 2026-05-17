// role="alert" so screen readers announce the message when it appears after
// a failed submit.
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
