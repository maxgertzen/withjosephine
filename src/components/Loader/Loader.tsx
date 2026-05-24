import { type CSSProperties } from "react";

import { mergeClasses } from "@/lib/utils";

import styles from "./Loader.module.css";

const sizePresets = {
  sm: 32,
  md: 56,
  lg: 96,
  xl: 144,
} as const;

type LoaderSize = keyof typeof sizePresets | number;

interface LoaderProps {
  size?: LoaderSize;
  label?: string;
  className?: string;
  // Pass true when an ancestor already exposes role="status" or aria-live — the
  // Loader becomes decorative and screen readers only announce once.
  decorative?: boolean;
}

export function Loader({
  size = "md",
  label = "Loading",
  className,
  decorative = false,
}: LoaderProps) {
  const sizePx = typeof size === "number" ? size : sizePresets[size];

  const style = {
    "--jl-size": `${sizePx}px`,
  } as CSSProperties;

  const a11yProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "status", "aria-live": "polite" as const, "aria-label": label };

  return (
    <span
      {...a11yProps}
      className={mergeClasses(styles.root, className)}
      style={style}
    >
      <span className={styles.star} aria-hidden="true">
        <svg viewBox="-50 -50 100 100">
          <path
            d="M 0 -50 C 6 -16, 16 -6, 50 0 C 16 6, 6 16, 0 50 C -6 16, -16 6, -50 0 C -16 -6, -6 -16, 0 -50 Z"
          />
        </svg>
      </span>
    </span>
  );
}
