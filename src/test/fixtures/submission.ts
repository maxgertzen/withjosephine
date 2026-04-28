import type { SubmissionContext } from "@/lib/resend";

const BASE_SUBMISSION: SubmissionContext = {
  id: "sub_123",
  email: "client@example.com",
  readingName: "Soul Blueprint Reading",
  readingPriceDisplay: "$179",
  responses: [
    { fieldLabelSnapshot: "Birth date", fieldType: "date", value: "1990-04-12" },
    {
      fieldLabelSnapshot: "Focus areas",
      fieldType: "multiSelectExact",
      value: "Soul Purpose, Karmic Patterns, Relationships",
    },
  ],
  photoUrl: "https://images.example.com/photo.jpg",
  createdAt: "2026-04-28T16:30:00Z",
};

export function buildSubmission(overrides: Partial<SubmissionContext> = {}): SubmissionContext {
  return { ...BASE_SUBMISSION, ...overrides };
}
