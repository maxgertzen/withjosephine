import type { ReactNode } from "react";

type AnimatedCollapseProps = {
  id: string;
  open: boolean;
  labelledBy?: string;
  animated?: boolean;
  children: ReactNode;
};

export function AnimatedCollapse({ id, open, labelledBy, animated = true, children }: AnimatedCollapseProps) {
  return (
    <div
      id={id}
      role={labelledBy ? "region" : undefined}
      aria-labelledby={labelledBy}
      inert={!open}
      className={`grid ${animated ? "transition-[grid-template-rows,opacity] duration-250 ease-in-out motion-reduce:transition-none" : ""}`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
