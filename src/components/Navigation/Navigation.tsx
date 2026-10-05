"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useScrolled } from "@/hooks/useScrolled";
import { homeSectionAnchor } from "@/lib/http/routes";
import type { NotesLink } from "@/lib/notes/notes";
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

const READINGS_SECTION_ID = "readings";
const CONTACT_SECTION_ID = "contact";

type NavItem = { key: string; label: string; href?: string; current?: boolean };

type NavPage = "home" | "notes" | "other";

function buildNavItems(navLinks: NavLink[], page: NavPage, notesLink: NotesLink | undefined): NavItem[] {
  const items: NavItem[] = navLinks.map(({ label, sectionId }) =>
    page === "home"
      ? { key: sectionId, label }
      : { key: sectionId, label, href: homeSectionAnchor(sectionId) },
  );
  if (!notesLink) return items;
  const notesItem: NavItem = { key: "notes", ...notesLink, current: page === "notes" };
  const contactIndex = items.findIndex((item) => item.key === CONTACT_SECTION_ID);
  items.splice(contactIndex === -1 ? items.length : contactIndex, 0, notesItem);
  return items;
}

const DESKTOP_ITEM_CLASSES =
  "relative text-[0.78rem] tracking-[0.12em] uppercase font-body font-medium text-j-deep after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-j-accent after:transition-transform after:duration-300 after:ease-in-out after:content-[''] hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";
const DESKTOP_CURRENT_CLASSES = "after:scale-x-100";
const MOBILE_ITEM_CLASSES =
  "font-display text-[2.2rem] font-light italic text-j-deep transition-colors hover:text-j-midnight";
const MOBILE_CURRENT_CLASSES = "text-j-text-gold-lg hover:text-j-text-gold-lg";

function NavItemControl({
  item,
  className,
  onScroll,
  onNavigate,
}: {
  item: NavItem;
  className: string;
  onScroll: (sectionId: string) => void;
  onNavigate: () => void;
}) {
  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={item.current ? "page" : undefined}
        onClick={onNavigate}
        className={className}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onScroll(item.key)} className={className}>
      {item.label}
    </button>
  );
}

function NavCta({
  href,
  size,
  label,
  onScroll,
  onNavigate,
}: {
  href: string | undefined;
  size: "sm" | "default";
  label: string;
  onScroll: (sectionId: string) => void;
  onNavigate: () => void;
}) {
  if (href) {
    return (
      <Button variant="outlined" size={size} href={href} onClick={onNavigate}>
        {label}
      </Button>
    );
  }
  return (
    <Button variant="outlined" size={size} onClick={() => onScroll(READINGS_SECTION_ID)}>
      {label}
    </Button>
  );
}

type NavigationProps = {
  content?: NavigationContent;
  notesLink?: NotesLink;
  page?: NavPage;
  className?: string;
};

export function Navigation({ content, notesLink, page = "home", className }: NavigationProps) {
  const { navLinks, navCtaText } = {
    ...NAV_DEFAULTS,
    ...pickDefined(content ?? {}),
  };
  const items = buildNavItems(navLinks, page, notesLink);
  const ctaHref = page === "home" ? undefined : homeSectionAnchor(READINGS_SECTION_ID);
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  useLockBodyScroll(menuOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  useFocusTrap({
    active: menuOpen,
    containerRef: overlayRef,
    onEscape: closeMenu,
    extraFocusables: [toggleRef],
    initialFocus: "firstFocusable",
    returnFocusRef: toggleRef,
  });

  return (
    <>
      <nav
        aria-label="Primary"
        className={mergeClasses(
          "fixed top-0 left-0 right-[var(--j-scroll-lock-gutter,0px)] z-[100] border-b transition-all duration-300 ease-in-out",
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
              {items.map((item) => (
                <NavItemControl
                  key={item.key}
                  item={item}
                  onScroll={scrollToSection}
                  onNavigate={closeMenu}
                  className={mergeClasses(
                    DESKTOP_ITEM_CLASSES,
                    item.current && DESKTOP_CURRENT_CLASSES,
                  )}
                />
              ))}
              <NavCta
                href={ctaHref}
                size="sm"
                label={navCtaText}
                onScroll={scrollToSection}
                onNavigate={closeMenu}
              />
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
          "fixed top-0 bottom-0 left-0 right-[var(--j-scroll-lock-gutter,0px)] z-[99] bg-j-cream/[0.98] backdrop-blur-[20px] flex flex-col items-center justify-center gap-8 transition-opacity duration-300 ease-in-out nav:hidden",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col items-center gap-6" aria-label="Mobile navigation">
          {items.map((item) => (
            <NavItemControl
              key={item.key}
              item={item}
              onScroll={scrollToSection}
              onNavigate={closeMenu}
              className={mergeClasses(MOBILE_ITEM_CLASSES, item.current && MOBILE_CURRENT_CLASSES)}
            />
          ))}
        </nav>

        <GoldDivider className="w-24" />

        <NavCta
          href={ctaHref}
          size="default"
          label={navCtaText}
          onScroll={scrollToSection}
          onNavigate={closeMenu}
        />
      </div>
    </>
  );
}
