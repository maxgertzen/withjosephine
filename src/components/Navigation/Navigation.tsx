"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useScrolled } from "@/hooks/useScrolled";
import { mergeClasses } from "@/lib/utils";

interface NavLink {
  label: string;
  sectionId: string;
}

interface NavigationContent {
  navLinks: NavLink[];
  navCtaText: string;
}

const NAV_DEFAULTS: NavigationContent = {
  navLinks: [
    { label: "Readings", sectionId: "readings" },
    { label: "About", sectionId: "about" },
    { label: "How It Works", sectionId: "how-it-works" },
    { label: "Contact", sectionId: "contact" },
  ],
  navCtaText: "Book a Reading",
};

type NavigationProps = {
  content?: NavigationContent;
  className?: string;
};

export function Navigation({ content, className }: NavigationProps) {
  const { navLinks, navCtaText } = content ?? NAV_DEFAULTS;
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  useLockBodyScroll(menuOpen);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  return (
    <>
      <nav
        className={mergeClasses(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out",
          scrolled
            ? "bg-j-cream/95 backdrop-blur-[10px] border-b border-j-border-subtle shadow-j-soft"
            : "bg-transparent",
          className,
        )}
      >
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[72px]">
          <Link href="/" className="block">
            <Image
              src="/images/logo-horizontal.webp"
              alt="Josephine Soul Readings"
              width={480}
              height={160}
              priority
              className="h-auto w-[140px] md:hidden"
            />
            <Image
              src="/images/logo-horizontal-text.webp"
              alt="Josephine Soul Readings"
              width={480}
              height={160}
              priority
              className="hidden h-auto w-[clamp(120px,8vw,160px)] md:block"
            />
          </Link>

          <div
            className="hidden md:flex items-center gap-8"
            role="navigation"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <button
                key={link.sectionId}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="text-[0.78rem] tracking-[0.12em] cursor-pointer uppercase font-body font-medium text-j-deep hover:text-j-midnight hover:underline hover:decoration-j-accent hover:underline-offset-4 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Button variant="outlined" size="sm" onClick={() => scrollToSection("readings")}>
              {navCtaText}
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-j-deep"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <div
        aria-hidden={!menuOpen}
        className={mergeClasses(
          "fixed inset-0 z-[99] bg-j-cream/[0.98] backdrop-blur-[20px] flex flex-col items-center justify-center gap-8 transition-opacity duration-300 ease-in-out md:hidden",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col items-center gap-6" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <button
              key={link.sectionId}
              type="button"
              onClick={() => scrollToSection(link.sectionId)}
              className="font-display text-[2.2rem] font-light italic text-j-deep transition-colors hover:text-j-midnight"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <GoldDivider className="w-24" />

        <Button variant="outlined" size="default" onClick={() => scrollToSection("readings")}>
          {navCtaText}
        </Button>
      </div>
    </>
  );
}
