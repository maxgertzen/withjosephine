import { Button, Text } from "@react-email/components";

import type { EmailDay7DeliveryContent } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { EmailShell } from "./EmailShell";
import { hasBodyContent, PortableTextBody, PortableTextInline } from "./PortableTextBody";
import { SignOff } from "./SignOff";

export type Day7DeliveryVars = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  listenUrl: string;
};

export type Day7DeliveryProps = {
  vars: Day7DeliveryVars;
  copy: EmailDay7DeliveryContent;
};

export function Day7Delivery({ vars, copy: rawCopy }: Day7DeliveryProps) {
  const copy = applyTokens(rawCopy, vars);
  const useFoldedIntro = hasBodyContent(copy.bodyIntro);
  const useFoldedPost = hasBodyContent(copy.bodyPostButton);
  return (
    <EmailShell preview={copy.preview}>
      {useFoldedIntro ? (
        <PortableTextBody value={copy.bodyIntro} />
      ) : (
        <>
          <Text className="text-base leading-[1.75]">{copy.greeting}</Text>
          <Text className="text-base leading-[1.75]">{copy.lineReady}</Text>
          <Text className="text-base leading-[1.75]">
            <PortableTextInline value={copy.comfortLine} />
          </Text>
        </>
      )}
      <Button
        href={vars.listenUrl}
        className="bg-ink text-cream font-sans text-base rounded-full px-8 py-4 w-full text-center block"
      >
        {copy.openButtonLabel}
      </Button>
      {useFoldedPost ? (
        <PortableTextBody value={copy.bodyPostButton} />
      ) : (
        <>
          <Text className="text-base leading-[1.75] mt-6">
            <PortableTextInline value={copy.signedInDisclosure} />
          </Text>
          <Text className="text-base leading-[1.75]">
            <PortableTextInline value={copy.accessWindowLine} />
          </Text>
          <Text className="text-base leading-[1.75]">
            <PortableTextInline value={copy.comfortFollowUp} />
          </Text>
        </>
      )}
      {copy.signOff ? (
        <Text className="text-base leading-[1.75] mt-6">{copy.signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
