import { Text } from "@react-email/components";

import type { EmailDay2StartedContent } from "@/data/defaults";

import { EmailShell } from "./EmailShell";
import { SignOff } from "./SignOff";

export type Day2StartedVars = { firstName: string };

export type Day2StartedProps = {
  vars: Day2StartedVars;
  copy: EmailDay2StartedContent;
};

function template(text: string, vars: Day2StartedVars): string {
  return text.replaceAll("{firstName}", vars.firstName);
}

export function Day2Started({ vars, copy }: Day2StartedProps) {
  return (
    <EmailShell preview={copy.preview}>
      <Text className="text-base leading-[1.75]">{template(copy.greeting, vars)}</Text>
      {copy.body.map((paragraph, index) => (
        <Text key={index} className="text-base leading-[1.75]">
          {paragraph}
        </Text>
      ))}
      {copy.signOff ? (
        <Text className="text-base leading-[1.75] mt-6">{copy.signOff}</Text>
      ) : (
        <SignOff />
      )}
    </EmailShell>
  );
}
