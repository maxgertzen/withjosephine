import { mergeClasses } from "@/lib/utils";

interface StarFieldProps {
  count?: number;
  className?: string;
}

function round(n: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

export function StarField({ count = 110, className }: StarFieldProps) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x: round((Math.sin(i * 2.41) * 0.5 + 0.5) * 100, 2),
    y: round((Math.cos(i * 1.73) * 0.5 + 0.5) * 100, 2),
    size: round(Math.abs(Math.sin(i * 3.14)) * 2 + 0.5, 2),
    duration: round(2.5 + Math.abs(Math.cos(i * 1.31)) * 3.5, 2),
    delay: round(Math.abs(Math.sin(i * 2.17)) * 3, 2),
  }));

  return (
    <div
      aria-hidden="true"
      className={mergeClasses("absolute inset-0 overflow-hidden pointer-events-none", className)}
    >
      {stars.map((star, i) => (
        <div
          key={i}
          className="rounded-full bg-white/80 absolute j-animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
