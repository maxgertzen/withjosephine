/**
 * Filters a Sanity-shaped submission to "ready to deliver to the customer":
 * `deliveredAt` set AND both asset URLs populated. The artifact references
 * ARE the readiness flag — no separate boolean, no TOCTOU.
 */

export type SanitySubmissionDeliveryShape = {
  _id: string;
  deliveredAt?: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
};

export type DeliverableSubmission = {
  _id: string;
  deliveredAt: string;
  voiceNoteUrl: string;
  pdfUrl: string;
};

export function isDeliverable(
  doc: SanitySubmissionDeliveryShape,
): doc is DeliverableSubmission {
  return Boolean(doc.deliveredAt && doc.voiceNoteUrl && doc.pdfUrl);
}
