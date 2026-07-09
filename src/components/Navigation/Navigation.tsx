"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useScrolled } from "@/hooks/useScrolled";
import { pickDefined } from "@/lib/sanity/pickDefined";
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

type NavigationProps = {
  content?: NavigationContent;
  className?: string;
};

export function Navigation({ content, className }: NavigationProps) {
  const { navLinks, navCtaText } = {
    ...NAV_DEFAULTS,
    ...pickDefined(content ?? {}),
  };
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  useLockBodyScroll(menuOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  // Move focus into the open overlay, keep Tab trapped inside it, close on
  // Escape, and restore focus to the toggle when it closes.
  useEffect(() => {
    if (!menuOpen) return;
    const overlay = overlayRef.current;
    const toggle = toggleRef.current;
    overlay?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !overlay) return;
      const focusable = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      toggle?.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        aria-label="Primary"
        className={mergeClasses(
          "fixed top-0 left-0 right-0 z-[100] border-b transition-all duration-300 ease-in-out",
          scrolled
            ? "bg-j-cream/95 backdrop-blur-[10px] border-j-border-subtle shadow-j-soft"
            : "border-transparent bg-transparent",
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
              className="h-auto w-[140px] nav:hidden"
            />
            <Image
              src="/images/logo-horizontal-text.webp"
              alt="Josephine Soul Readings"
              width={480}
              height={160}
              priority
              className="hidden h-auto w-[clamp(120px,8vw,160px)] nav:block"
            />
          </Link>

          <div className="flex items-center gap-3 nav:gap-6">
            <div className="hidden nav:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.sectionId}
                  type="button"
                  onClick={() => scrollToSection(link.sectionId)}
                  className="relative text-[0.78rem] tracking-[0.12em] uppercase font-body font-medium text-j-deep after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-j-accent after:transition-transform after:duration-300 after:ease-in-out after:content-[''] hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                >
                  {link.label}
                </button>
              ))}
              <Button variant="outlined" size="sm" onClick={() => scrollToSection("readings")}>
                {navCtaText}
              </Button>
            </div>

            <button
              ref={toggleRef}
              type="button"
              className="flex h-11 w-11 items-center justify-center text-j-deep nav:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <div
        ref={overlayRef}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={mergeClasses(
          "fixed inset-0 z-[99] bg-j-cream/[0.98] backdrop-blur-[20px] flex flex-col items-center justify-center gap-8 transition-opacity duration-300 ease-in-out nav:hidden",
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
