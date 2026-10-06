import type { SubmissionRecord } from "../page-previews/types";

export type IntakeAnswer = Pick<
  SubmissionRecord["responses"][number],
  "fieldLabelSnapshot" | "fieldType" | "value"
>;

const NOISE_FIELD_TYPES: ReadonlySet<string> = new Set(["fileUpload", "consent"]);

const NO_ANSWER = "(no answer)";

export function isIntakeAnswer<T extends object>(item: T): item is T & IntakeAnswer {
  const candidate = item as Partial<Record<keyof IntakeAnswer, unknown>>;
  return typeof candidate.fieldLabelSnapshot === "string" && typeof candidate.fieldType === "string";
}

export function isVisibleIntakeAnswer(answer: Pick<IntakeAnswer, "fieldType">): boolean {
  return !NOISE_FIELD_TYPES.has(answer.fieldType);
}

export function intakeAnswersText(answers: readonly IntakeAnswer[]): string {
  return answers
    .filter(isVisibleIntakeAnswer)
    .map((answer) => `${answer.fieldLabelSnapshot.trim()}\n${answer.value?.trim() || NO_ANSWER}`)
    .join("\n\n");
}
