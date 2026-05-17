import { Button, Section, Text } from "@react-email/components";

import type { EmailPrivacyExportContent } from "@/data/defaults";

import { EmailShell } from "./EmailShell";
import { SignOff } from "./SignOff";

export type PrivacyExportVars = {
  downloadUrl: string;
  submissionCount: number;
  expiryDays: number;
};

export type PrivacyExportProps = {
  vars: PrivacyExportVars;
  copy: EmailPrivacyExportContent;
};

function interpolate(text: string, vars: PrivacyExportVars): string {
  return text
    .replaceAll("{submissionCount}", String(vars.submissionCount))
    .replaceAll("{expiryDays}", String(vars.expiryDays));
}

export function PrivacyExport({ vars, copy }: PrivacyExportProps) {
  return (
    <EmailShell preview={copy.preview}>
      <Text className="text-base leading-[1.75]">{copy.greeting}</Text>
      <Text className="text-base leading-[1.75]">{copy.introLine}</Text>
      <Text className="text-base leading-[1.75]">{interpolate(copy.contentsLine, vars)}</Text>
      <Section className="my-6">
        <Button
          href={vars.downloadUrl}
          className="bg-ink text-cream rounded-full px-6 py-3 text-base"
        >
          {copy.ctaLabel}
        </Button>
      </Section>
      <Text className="text-base leading-[1.75]">{interpolate(copy.expiryLine, vars)}</Text>
      {copy.signOff ? (
        <Text className="text-base leading-[1.75]">{copy.signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
