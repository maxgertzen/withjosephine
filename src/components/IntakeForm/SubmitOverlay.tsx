type SubmitOverlayProps = {
  text?: string;
};

const DEFAULT_COPY = "One moment \u2014 taking you to checkout.";

export function SubmitOverlay({ text }: SubmitOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-j-ivory/95 backdrop-blur-[1px] j-fade-in"
    >
      <span aria-hidden="true" className="font-display text-2xl text-j-accent mb-2">
        ✦
      </span>
      <p className="font-display italic text-lg text-j-text-heading text-center max-w-prose px-6">
        {text ?? DEFAULT_COPY}
      </p>
    </div>
  );
}
