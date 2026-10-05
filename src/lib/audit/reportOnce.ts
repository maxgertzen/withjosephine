import "server-only";

import * as Sentry from "@sentry/cloudflare";

import { type AuditRow, writeAuditOnce } from "@/lib/auth/listenSession";

export async function isFirstReport(auditId: string, row: AuditRow): Promise<boolean> {
  try {
    return await writeAuditOnce(auditId, row);
  } catch (error) {
    Sentry.captureException(error, { extra: { eventType: row.eventType } });
    console.error(`[audit] ${row.eventType} write failed, reporting anyway`);
    return true;
  }
}
