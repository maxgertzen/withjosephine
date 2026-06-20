import { cookies } from "next/headers";
import Link from "next/link";

import { UserMenu } from "@/components/UserMenu";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = cookieValue ? await getActiveSession({ cookieValue }) : null;
  const user = session ? await findUserById(session.userId) : null;

  return (
    <>
      <header aria-label="Site" className="sticky top-0 z-20 bg-j-cream border-b border-j-border-subtle">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="font-display italic text-lg text-j-text-heading">
            <span aria-hidden="true">✦</span> Josephine
          </Link>
          {user ? <UserMenu email={user.email} /> : null}
        </div>
      </header>
      {children}
    </>
  );
}
