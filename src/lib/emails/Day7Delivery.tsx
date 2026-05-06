import { Link, Text } from "@react-email/components";

import { EmailShell } from "./EmailShell";

export type Day7DeliveryProps = {
  firstName: string;
  readingName: string;
  listenUrl: string;
};

export function Day7Delivery({ firstName, readingName, listenUrl }: Day7DeliveryProps) {
  return (
    <EmailShell preview="Your reading is ready">
      <Text className="text-base leading-[1.75]">Hi {firstName},</Text>
      <Text className="text-base leading-[1.75]">Your {readingName} is ready. Everything is here:</Text>
      <Text className="text-base leading-[1.75]">
        <Link href={listenUrl} className="text-ink underline">
          {listenUrl}
        </Link>
      </Text>
      <Text className="text-base leading-[1.75]">
        The voice note is best with headphones, somewhere quiet. The PDF is yours to keep — print it, save it, mark it up, whatever feels right. Listen in one sitting if you can; some of it lands across a whole afternoon, not all at once.
      </Text>
      <Text className="text-base leading-[1.75]">
        If anything you hear sits hard, or if a question opens up after, please write to me. I&apos;d rather know than not.
      </Text>
      <Text className="text-base leading-[1.75] mt-6">
        With love,
        <br />
        Josephine ✦
      </Text>
    </EmailShell>
  );
}
