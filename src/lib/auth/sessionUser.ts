import { cookies } from "next/headers";

import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { findUserById, type UserRecord } from "@/lib/auth/users";

export async function getSignedInUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = cookieValue ? await getActiveSession({ cookieValue }) : null;
  return session ? findUserById(session.userId) : null;
}
