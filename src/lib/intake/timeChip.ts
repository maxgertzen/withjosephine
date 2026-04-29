export function timeChip(savedAt: Date | null, now: Date = new Date()): string {
  if (!savedAt) return "";
  const diffMs = now.getTime() - savedAt.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "Saved a moment ago";
  if (seconds < 60) return `Saved ${Math.floor(seconds / 10) * 10 || 5} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "Saved a minute ago";
  if (minutes < 60) return `Saved ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Saved an hour ago";
  if (hours < 24) return `Saved ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Saved yesterday";
  return `Saved ${days} days ago`;
}
