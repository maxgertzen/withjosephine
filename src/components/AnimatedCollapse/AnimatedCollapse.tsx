import type { ReactNode } from "react";

import { mergeClasses } from "@/lib/utils";

type AnimatedCollapseProps = {
  id: string;
  open: boolean;
  labelledBy?: string;
  animated?: boolean;
  className?: string;
  children: ReactNode;
};

export function AnimatedCollapse({
  id,
  open,
  labelledBy,
  animated = true,
  className,
  children,
}: AnimatedCollapseProps) {
  return (
    <div
      id={id}
      role={labelledBy ? "region" : undefined}
      aria-labelledby={labelledBy}
      inert={!open}
      className={mergeClasses(
        "grid",
        animated &&
          "transition-[grid-template-rows,opacity] duration-250 ease-in-out motion-reduce:transition-none",
        className,
      )}
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
