import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { FOOTER_DEFAULTS } from "@/data/defaults";
import { ROUTES } from "@/lib/constants";

export type NotesFooterProps = Pick<
  ComponentProps<typeof Footer>,
  "content" | "socialLinks" | "notesLink"
>;

export function NotesShell({
  footer,
  children,
}: {
  footer: NotesFooterProps;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-j-cream">
      <header className="mx-auto max-w-[36rem] px-5 pt-8">
        <Link href={ROUTES.home} className="font-display text-xl italic text-j-deep">
          {footer.content?.brandName || FOOTER_DEFAULTS.brandName}
        </Link>
      </header>
      <main id="main" className="px-5 pt-10 pb-14 md:pt-16">
        <div className="mx-auto max-w-[36rem]">{children}</div>
      </main>
      <Footer {...footer} />
    </div>
  );
}
