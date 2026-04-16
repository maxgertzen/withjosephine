import { mergeClasses } from "@/lib/utils";

type GoldDividerProps = {
  className?: string;
};

export function GoldDivider({ className }: GoldDividerProps) {
  return (
    <div
      className={mergeClasses(
        "h-px bg-gradient-to-r from-transparent via-j-accent/50 to-transparent pointer-events-none",
        className,
      )}
    />
  );
}
