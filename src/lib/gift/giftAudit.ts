import "server-only";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { writeAudit } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";

import { giftClientReferenceId } from "./clientReference";

type InvalidGiftLinkEvent =
  | typeof AUDIT_EVENT_TYPE.gift_code_invalid
  | typeof AUDIT_EVENT_TYPE.gift_send_link_invalid;

export async function auditInvalidGiftLink(
  request: Request,
  eventType: InvalidGiftLinkEvent,
): Promise<void> {
  await writeAudit({
    eventType,
    success: false,
    userId: null,
    submissionId: null,
    ...(await getRequestAuditContext(request)),
  });
}

export async function auditGiftSent(
  request: Request,
  { giftId, success }: { giftId: string; success: boolean },
): Promise<void> {
  await writeAudit({
    eventType: AUDIT_EVENT_TYPE.gift_sent,
    success,
    userId: null,
    submissionId: giftClientReferenceId(giftId),
    ...(await getRequestAuditContext(request)),
  });
}

export async function auditGiftRedeemed(
  request: Request,
  { submissionId, userId }: { submissionId: string; userId: string | null },
): Promise<void> {
  await writeAudit({
    eventType: AUDIT_EVENT_TYPE.gift_redeemed,
    userId,
    submissionId,
    ...(await getRequestAuditContext(request)),
  });
}
