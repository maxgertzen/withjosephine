import { CopyIcon } from "@sanity/icons";
import { Button, Flex, Stack, useToast } from "@sanity/ui";
import type { ArrayOfObjectsInputProps } from "sanity";

import { intakeAnswersText, isIntakeAnswer } from "../../../src/lib/booking/intakeAnswers";

const COPY_LABEL = "Copy answers";
const COPIED = "Answers copied.";

export function IntakeAnswersInput(props: ArrayOfObjectsInputProps) {
  const toast = useToast();
  const answers = (props.value ?? []).filter(isIntakeAnswer);

  async function copyAnswers() {
    try {
      await navigator.clipboard.writeText(intakeAnswersText(answers));
      toast.push({ status: "success", title: COPIED });
    } catch (error) {
      toast.push({ status: "error", title: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <Stack space={3}>
      <Flex justify="flex-end">
        <Button
          icon={CopyIcon}
          text={COPY_LABEL}
          mode="ghost"
          disabled={answers.length === 0}
          onClick={copyAnswers}
        />
      </Flex>
      {props.renderDefault(props)}
    </Stack>
  );
}
