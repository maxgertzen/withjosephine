import { describe, expect, it } from "vitest";

import { intakeAnswersText, isIntakeAnswer, isVisibleIntakeAnswer } from "./intakeAnswers";

describe("intakeAnswersText", () => {
  it("puts each question on its own line, its answer below, and a blank line between", () => {
    expect(
      intakeAnswersText([
        { fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Ada" },
        {
          fieldLabelSnapshot: "What brings you here?",
          fieldType: "longText",
          value: "Line one\nLine two",
        },
      ]),
    ).toBe("First name\nAda\n\nWhat brings you here?\nLine one\nLine two");
  });

  it("marks an empty answer", () => {
    expect(
      intakeAnswersText([{ fieldLabelSnapshot: "Birth time", fieldType: "time", value: "  " }]),
    ).toBe("Birth time\n(no answer)");
  });

  it("leaves out the photo upload and consent rows, as the notification email does", () => {
    expect(
      intakeAnswersText([
        { fieldLabelSnapshot: "Photo", fieldType: "fileUpload", value: "submissions/x/photo.jpg" },
        { fieldLabelSnapshot: "I don't know my birth time", fieldType: "consent", value: "true" },
        { fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Ada" },
      ]),
    ).toBe("First name\nAda");
  });
});

describe("isIntakeAnswer", () => {
  it("accepts a stored answer and rejects a row without a question or field type", () => {
    expect(isIntakeAnswer({ _key: "a", fieldLabelSnapshot: "Q", fieldType: "shortText" })).toBe(true);
    expect(isIntakeAnswer({ _key: "b", fieldType: "shortText" })).toBe(false);
    expect(isIntakeAnswer({ _key: "c", fieldLabelSnapshot: "Q" })).toBe(false);
  });
});

describe("isVisibleIntakeAnswer", () => {
  it.each([
    ["fileUpload", false],
    ["consent", false],
    ["shortText", true],
  ])("treats %s as visible: %s", (fieldType, visible) => {
    expect(isVisibleIntakeAnswer({ fieldType })).toBe(visible);
  });
});
