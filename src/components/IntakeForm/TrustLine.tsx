type TrustLineProps = {
  text: string;
  className?: string;
};

export function TrustLine({ text, className }: TrustLineProps) {
  return (
    <p
      className={[
        "font-display text-base italic text-j-text leading-relaxed text-center max-w-prose mx-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </p>
  );
}
