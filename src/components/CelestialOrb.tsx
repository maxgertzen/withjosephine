import { cn } from "@/lib/utils";

interface CelestialOrbProps {
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
  blur?: number;
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
  blur = 80,
  className,
}: CelestialOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none rounded-full absolute j-animate-glow",
        className
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
        filter: `blur(${blur}px)`,
      }}
    />
  );
}
