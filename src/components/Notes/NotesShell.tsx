import type { ComponentProps, ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";

export type NotesFooterProps = Pick<
  ComponentProps<typeof Footer>,
  "content" | "socialLinks" | "notesLink"
>;

export type NotesNavProps = Pick<ComponentProps<typeof Navigation>, "content" | "notesLink">;

export function NotesShell({
  nav,
  footer,
  children,
}: {
  nav: NotesNavProps;
  footer: NotesFooterProps;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-j-cream">
      <Navigation {...nav} page="notes" />
      <main id="main" className="px-5 pt-28 pb-14 md:pt-40">
        <div className="mx-auto max-w-[36rem]">{children}</div>
      </main>
      <Footer {...footer} className="border-t-0" />
    </div>
  );
}
