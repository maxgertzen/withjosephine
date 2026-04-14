import { cn } from "@/lib/utils";

type GoldDividerProps = {
  className?: string;
};

export function GoldDivider({ className }: GoldDividerProps) {
  return (
    <div
      className={cn(
        "h-px bg-gradient-to-r from-transparent via-j-accent/50 to-transparent",
        className
      )}
    />
  );
}
