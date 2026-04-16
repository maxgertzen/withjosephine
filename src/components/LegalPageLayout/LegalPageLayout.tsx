import Link from "next/link";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { ROUTES } from "@/lib/constants";

import { BackLink } from "./BackLink";

interface LegalPageLayoutProps {
  tag: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ tag, title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <header className="relative z-10 max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <BackLink />
        <Link href={ROUTES.home}>
          <span className="font-display text-xl italic text-j-deep">Josephine</span>
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body">
          {tag}
        </span>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-light italic text-j-text-heading leading-tight mt-2">
          {title}
        </h1>
        <p className="font-body text-sm text-j-text-muted mt-3">Last updated: {lastUpdated}</p>

        <GoldDivider className="my-10 max-w-xs" />

        {children}

        <GoldDivider className="mt-16 max-w-xs mx-auto" />
      </main>

      <Footer />
    </div>
  );
}
