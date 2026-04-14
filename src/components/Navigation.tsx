"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { useScrolled } from "@/hooks/useScrolled";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

const NAV_LINKS = [
  { label: "Readings", id: "readings" },
  { label: "About", id: "about" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Contact", id: "contact" },
] as const;

type NavigationProps = {
  className?: string;
};

export function Navigation({ className }: NavigationProps) {
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
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out",
          scrolled
            ? "bg-j-cream/95 backdrop-blur-[10px] border-b border-j-border-subtle shadow-j-soft"
            : "bg-transparent",
          className
        )}
      >
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[72px]">
          <Link href="/">
            <span className="font-display text-2xl italic text-j-deep">
              Josephine
            </span>
          </Link>

          <div
            className="hidden md:flex items-center gap-8"
            role="navigation"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="text-[0.78rem] tracking-[0.12em] uppercase font-body font-medium text-j-deep hover:text-j-midnight hover:underline hover:decoration-j-accent hover:underline-offset-4 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Button
              variant="primary"
              size="sm"
              onClick={() => scrollToSection("contact")}
            >
              Book a Reading
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
        className={cn(
          "fixed inset-0 z-[99] bg-j-cream/[0.98] backdrop-blur-[20px] flex flex-col items-center justify-center gap-8 transition-opacity duration-300 ease-in-out md:hidden",
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        <nav
          className="flex flex-col items-center gap-6"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="font-display text-[2.2rem] font-light italic text-j-deep transition-colors hover:text-j-midnight"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <GoldDivider className="w-24" />

        <Button
          variant="primary"
          size="default"
          onClick={() => scrollToSection("contact")}
        >
          Book a Reading
        </Button>
      </div>
    </>
  );
}
