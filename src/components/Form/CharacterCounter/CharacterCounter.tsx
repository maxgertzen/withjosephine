import { applyTokens } from "@/lib/emails/applyTokens";

type CharacterCounterProps = {
  id?: string;
  length: number;
  max: number;
  showFrom: number;
  warnFrom: number;
  template: string;
};

export function CharacterCounter({
  id,
  length,
  max,
  showFrom,
  warnFrom,
  template,
}: CharacterCounterProps) {
  const isVisible = length >= showFrom;
  const isWarning = length >= warnFrom;
  return (
    <p
      id={id}
      aria-live="polite"
      className={`font-body text-xs text-right mt-1.5 ${
        isWarning ? "text-j-text-rose" : "text-j-text-muted"
      }`}
    >
      {isVisible ? applyTokens(template, { remaining: Math.max(max - length, 0) }) : null}
    </p>
  );
}
