import { giftClientReferenceId } from "./clientReference";

export function giftPaymentEventFields(giftId: string) {
  return {
    distinct_id: giftClientReferenceId(giftId),
    gift_id: giftId,
    submission_id: null,
    stripe_session_id: null,
  };
}
