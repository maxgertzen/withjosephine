import { timeChip } from "@/lib/intake/timeChip";

type SavedIndicatorProps = {
  lastSavedAt: Date | null;
  // Counter that increments every 30s; consumed only as a render trigger
  // so `timeChip(lastSavedAt)` re-evaluates its relative-time string
  // without `lastSavedAt` itself changing.
  chipTick: number;
};

export function SavedIndicator({ lastSavedAt, chipTick }: SavedIndicatorProps) {
  void chipTick;
  if (!lastSavedAt) return null;
  return (
    <span className="font-display italic text-xs text-j-text-muted inline-flex items-center gap-1">
      <span aria-hidden="true" className="text-j-accent">
        ✦
      </span>
      {timeChip(lastSavedAt)}
    </span>
  );
}
