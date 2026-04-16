import { Button } from "@/components/Button";
import { StarField } from "@/components/StarField";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />

      <div className="relative z-10">
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
          ✦ Lost in the Stars
        </span>

        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-light italic text-j-text-heading leading-tight">
          This page doesn&rsquo;t exist
        </h1>

        <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md mx-auto">
          The path you followed leads nowhere — but the one home is always clear.
        </p>

        <div className="mt-10">
          <Button href="/" variant="primary" size="lg">
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
