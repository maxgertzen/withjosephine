import { Link, Text } from "@react-email/components";

import { EmailShell } from "./EmailShell";
import { SignOff } from "./SignOff";

export type MagicLinkProps = {
  magicLinkUrl: string;
  preview: string;
  greeting: string;
  body: string[];
  signOff?: string | null;
};

export function MagicLink({ magicLinkUrl, preview, greeting, body, signOff }: MagicLinkProps) {
  const [intro, ...rest] = body;
  return (
    <EmailShell preview={preview}>
      <Text className="text-base leading-[1.75]">{greeting}</Text>
      {intro ? <Text className="text-base leading-[1.75]">{intro}</Text> : null}
      <Text className="text-base leading-[1.75]">
        <Link href={magicLinkUrl} className="text-ink underline">
          {magicLinkUrl}
        </Link>
      </Text>
      {rest.map((paragraph, index) => (
        <Text key={index} className="text-base leading-[1.75]">
          {paragraph}
        </Text>
      ))}
      {signOff ? (
        <Text className="text-base leading-[1.75]">{signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
