import { Button, Section, Text } from "@react-email/components";

import type { EmailPrivacyExportContent } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { EmailShell } from "./EmailShell";
import { PortableTextInline } from "./PortableTextBody";
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

export function PrivacyExport({ vars, copy: rawCopy }: PrivacyExportProps) {
  const copy = applyTokens(rawCopy, vars);
  return (
    <EmailShell preview={copy.preview}>
      <Text className="text-base leading-[1.75]">{copy.greeting}</Text>
      <Text className="text-base leading-[1.75]">
        <PortableTextInline value={copy.introLine} />
      </Text>
      <Text className="text-base leading-[1.75]">
        <PortableTextInline value={copy.contentsLine} />
      </Text>
      <Section className="my-6">
        <Button
          href={vars.downloadUrl}
          className="bg-ink text-cream rounded-full px-6 py-3 text-base"
        >
          {copy.ctaLabel}
        </Button>
      </Section>
      <Text className="text-base leading-[1.75]">
        <PortableTextInline value={copy.expiryLine} />
      </Text>
      {copy.signOff ? (
        <Text className="text-base leading-[1.75]">{copy.signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
