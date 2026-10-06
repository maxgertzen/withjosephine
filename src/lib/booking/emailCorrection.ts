import { findUserByEmail, getOrCreateUser, normalizeEmail, setUserEmail } from "@/lib/auth/users";

import {
  correctSubmissionEmail,
  countSubmissionsByRecipientUserId,
  extractFirstName,
  type SubmissionRecord,
} from "./submissions";

async function recipientUserIdFor(
  submission: SubmissionRecord,
  email: string,
): Promise<string> {
  const currentUserId = submission.recipientUserId;
  const [existing, currentUserSubmissions] = await Promise.all([
    findUserByEmail(email),
    currentUserId ? countSubmissionsByRecipientUserId(currentUserId) : Promise.resolve(0),
  ]);
  if (existing) return existing.id;
  if (currentUserId && currentUserSubmissions <= 1) {
    await setUserEmail(currentUserId, email);
    return currentUserId;
  }
  const { userId } = await getOrCreateUser({
    email,
    name: extractFirstName(submission.responses),
  });
  return userId;
}

export async function correctCustomerEmail(
  submission: SubmissionRecord,
  newEmail: string,
): Promise<SubmissionRecord> {
  const email = normalizeEmail(newEmail);
  const recipientUserId = await recipientUserIdFor(submission, email);
  await correctSubmissionEmail(submission._id, { email, recipientUserId });
  return { ...submission, email, recipientUserId };
}
