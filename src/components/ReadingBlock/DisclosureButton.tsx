import type { ReactNode } from "react";

import { mergeClasses } from "@/lib/utils";

type DisclosureButtonProps = {
  id: string;
  controls: string;
  open: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function DisclosureButton({
  id,
  controls,
  open,
  onToggle,
  icon,
  className,
  children,
}: DisclosureButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={mergeClasses(
        "w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-display italic text-lg leading-snug text-j-text-heading",
        className,
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      <span
        aria-hidden="true"
        className="shrink-0 font-body not-italic text-xl leading-none text-j-ornament transition-transform duration-200 motion-reduce:transition-none"
        style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
      >
        +
      </span>
    </button>
  );
}
