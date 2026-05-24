import { errorClassesSmall } from "@/lib/formStyles";

export function InlineError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p role="alert" className={className ?? errorClassesSmall}>
      {message}
    </p>
  );
}
