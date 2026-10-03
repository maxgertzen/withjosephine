import { findDay7Entry } from "../../src/lib/booking/day7Entry";

type FileField = { asset?: unknown };

export type SendReadingNowDocument = {
  status?: string;
  email?: string;
  voiceNote?: FileField;
  readingPdf?: FileField;
  emailsFired?: Array<{ type?: string; sentAt?: string }>;
  deliveryRequestedAt?: string;
  deliveryFailedAt?: string;
};

type SendReadingNowState =
  | "filesMissing"
  | "unpublishedChanges"
  | "ready"
  | "requested"
  | "sent"
  | "failed";

type SubmissionVersions = {
  published: SendReadingNowDocument;
  draft?: unknown;
};

export function requestBlocker({
  published,
  draft,
}: SubmissionVersions): "filesMissing" | "unpublishedChanges" | null {
  if (!published.voiceNote?.asset || !published.readingPdf?.asset) return "filesMissing";
  if (draft) return "unpublishedChanges";
  return null;
}

export function sendReadingNowState(versions: SubmissionVersions): SendReadingNowState {
  const { published } = versions;
  if (findDay7Entry(published.emailsFired)) return "sent";
  if (published.deliveryRequestedAt) return "requested";
  if (published.deliveryFailedAt) return "failed";
  return requestBlocker(versions) ?? "ready";
}
