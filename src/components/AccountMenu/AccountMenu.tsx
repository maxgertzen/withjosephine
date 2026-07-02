"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserMenu } from "@/components/UserMenu";
import { mergeClasses } from "@/lib/utils";

type AccountState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "signedIn"; email: string };

type AccountMenuProps = {
  signInClassName?: string;
};

const DEFAULT_SIGN_IN_CLASSES =
  "font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-9 px-2";

export function AccountMenu({ signInClassName }: AccountMenuProps) {
  const [state, setState] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.signedIn && typeof data.email === "string") {
          setState({ status: "signedIn", email: data.email });
        } else {
          setState({ status: "anon" });
        }
      })
      .catch(() => {
        if (active) setState({ status: "anon" });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <span aria-hidden="true" className="inline-block h-9 w-9" />;
  }

  if (state.status === "signedIn") {
    return <UserMenu email={state.email} />;
  }

  return (
    <Link href="/" className={mergeClasses(DEFAULT_SIGN_IN_CLASSES, signInClassName)}>
      Sign in
    </Link>
  );
}
