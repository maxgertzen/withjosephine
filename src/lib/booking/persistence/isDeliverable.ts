export type SanitySubmissionDeliveryShape = {
  _id: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
};

export type DeliverableSubmission = {
  _id: string;
  voiceNoteUrl: string;
  pdfUrl: string;
};

export function isDeliverable(
  doc: SanitySubmissionDeliveryShape,
): doc is DeliverableSubmission {
  return Boolean(doc.voiceNoteUrl && doc.pdfUrl);
}
