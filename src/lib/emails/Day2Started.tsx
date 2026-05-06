import { Text } from "@react-email/components";

import { EmailShell } from "./shell";
import { SignOff } from "./SignOff";

export type Day2StartedProps = {
  firstName: string;
};

export function Day2Started({ firstName }: Day2StartedProps) {
  return (
    <EmailShell preview="A quick note — I've started your reading">
      <Text>Hi {firstName},</Text>
      <Text>
        Just a quick note to let you know I&apos;ve sat down with your chart and your records this week. I always want my clients to know when the work begins, so it doesn&apos;t feel like silence on your end.
      </Text>
      <Text>
        I&apos;m not going to preview anything — your reading should arrive whole, the way it&apos;s meant to. But I wanted you to know it&apos;s in good hands, and that I&apos;m taking the time it asks for.
      </Text>
      <Text>You&apos;ll hear from me again when it&apos;s ready, within the next five days.</Text>
      <SignOff />
    </EmailShell>
  );
}
