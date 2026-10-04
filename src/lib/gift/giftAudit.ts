import "server-only";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { writeAudit } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";

export async function auditInvalidGiftCode(request: Request): Promise<void> {
  await writeAudit({
    eventType: AUDIT_EVENT_TYPE.gift_code_invalid,
    success: false,
    userId: null,
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
