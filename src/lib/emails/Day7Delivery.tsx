import { Link, Text } from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

import { EmailShell } from "./shell";
import { SignOff } from "./SignOff";

export type Day7DeliveryProps = {
  firstName: string;
  readingName: string;
  listenUrl: string;
};

export function Day7Delivery({ firstName, readingName, listenUrl }: Day7DeliveryProps) {
  return (
    <EmailShell preview="Your reading is ready">
      <Text>Hi {firstName},</Text>
      <Text>Your {readingName} is ready. Everything is here:</Text>
      <Text style={{ margin: "16px 0" }}>
        <Link href={listenUrl} style={{ color: t.ink, textDecoration: "underline" }}>
          {listenUrl}
        </Link>
      </Text>
      <Text>
        The voice note is best with headphones, somewhere quiet. The PDF is yours to keep — print it, save it, mark it up, whatever feels right. Listen in one sitting if you can; some of it lands across a whole afternoon, not all at once.
      </Text>
      <Text>
        If anything you hear sits hard, or if a question opens up after, please write to me. I&apos;d rather know than not.
      </Text>
      <SignOff />
    </EmailShell>
  );
}
