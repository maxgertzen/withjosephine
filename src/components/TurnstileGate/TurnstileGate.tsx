"use client";

import { Turnstile } from "@marsidev/react-turnstile";

export type TurnstileGateProps = {
  siteKey: string | undefined;
  onToken: (token: string | null) => void;
};

export function TurnstileGate({ siteKey, onToken }: TurnstileGateProps) {
  if (!siteKey) return null;

  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onToken}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
}
