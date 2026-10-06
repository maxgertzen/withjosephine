import type { LucideIcon } from "lucide-react";

import { mergeClasses } from "@/lib/utils";

type IconDiscProps = {
  icon: LucideIcon;
  className?: string;
};

export function IconDisc({ icon: Icon, className }: IconDiscProps) {
  return (
    <div
      className={mergeClasses(
        "mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10",
        className,
      )}
    >
      <Icon className="w-9 h-9 text-j-ornament" strokeWidth={1.5} />
    </div>
  );
}
