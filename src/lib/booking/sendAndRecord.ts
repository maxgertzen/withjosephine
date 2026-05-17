import type { EmailSendResult } from "../resend";
import { appendEmailFired, type EmailFiredType } from "./submissions";

export async function sendAndRecord<TSend extends EmailSendResult>(opts: {
  submissionId: string;
  type: EmailFiredType;
  send: () => Promise<TSend>;
  nowIso?: string;
}): Promise<TSend & { appended: boolean }> {
  const result = await opts.send();
  if (result.kind !== "sent") {
    return { ...result, appended: false };
  }
  await appendEmailFired(opts.submissionId, {
    type: opts.type,
    sentAt: opts.nowIso ?? new Date().toISOString(),
    resendId: result.resendId,
  });
  return { ...result, appended: true };
}
