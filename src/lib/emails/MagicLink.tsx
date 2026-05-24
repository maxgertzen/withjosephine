import { Link, Text } from "@react-email/components";

import type { EmailRichText } from "@/data/defaults";

import { EmailShell } from "./EmailShell";
import { PortableTextBody } from "./PortableTextBody";
import { SignOff } from "./SignOff";

export type MagicLinkProps = {
  magicLinkUrl: string;
  preview: string;
  greeting?: string | null;
  body: EmailRichText;
  signOff?: string | null;
};

export function MagicLink({ magicLinkUrl, preview, greeting, body, signOff }: MagicLinkProps) {
  return (
    <EmailShell preview={preview}>
      {greeting ? <Text className="text-base leading-[1.75]">{greeting}</Text> : null}
      <PortableTextBody value={body} />
      <Text className="text-base leading-[1.75]">
        <Link href={magicLinkUrl} className="text-ink underline">
          {magicLinkUrl}
        </Link>
      </Text>
      {signOff ? (
        <Text className="text-base leading-[1.75]">{signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
