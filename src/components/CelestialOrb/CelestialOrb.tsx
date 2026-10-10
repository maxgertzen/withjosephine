import { mergeClasses } from "@/lib/utils";

interface CelestialOrbProps {
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
  className?: string;
}

export function CelestialOrb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  opacity = 0.25,
  className,
}: CelestialOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={mergeClasses(
        "pointer-events-none rounded-full absolute",
        className,
      )}
      style={{
        background: color,
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        opacity,
      }}
    />
  );
}
