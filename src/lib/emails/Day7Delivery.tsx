import { Button, Text } from "@react-email/components";

import type { EmailDay7DeliveryContent } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { EmailShell } from "./EmailShell";
import { SignOff } from "./SignOff";

export type Day7DeliveryVars = {
  firstName: string;
  readingName: string;
  listenUrl: string;
};

export type Day7DeliveryProps = {
  vars: Day7DeliveryVars;
  copy: EmailDay7DeliveryContent;
};

export function Day7Delivery({ vars, copy: rawCopy }: Day7DeliveryProps) {
  const copy = applyTokens(rawCopy, vars);
  return (
    <EmailShell preview={copy.preview}>
      <Text className="text-base leading-[1.75]">{copy.greeting}</Text>
      <Text className="text-base leading-[1.75]">{copy.lineReady}</Text>
      <Text className="text-base leading-[1.75]">{copy.comfortLine}</Text>
      <Button
        href={vars.listenUrl}
        className="bg-ink text-cream font-sans text-base rounded-full px-8 py-4 w-full text-center block"
      >
        {copy.openButtonLabel}
      </Button>
      <Text className="text-base leading-[1.75] mt-6">{copy.signedInDisclosure}</Text>
      <Text className="text-base leading-[1.75]">{copy.comfortFollowUp}</Text>
      {copy.signOff ? (
        <Text className="text-base leading-[1.75] mt-6">{copy.signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
