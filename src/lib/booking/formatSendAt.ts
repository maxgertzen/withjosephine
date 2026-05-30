export function formatSendAt(iso: string, tz?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: tz ?? "UTC",
  });
}
