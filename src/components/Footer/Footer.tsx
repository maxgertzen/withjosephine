import Image from "next/image";
import { mergeClasses } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={mergeClasses(
        "border-t border-j-border-subtle py-8 px-6 text-center",
        className,
      )}
    >
      <Image
        src="/images/logo-default.png"
        alt="Josephine"
        width={80}
        height={80}
        className="mx-auto mb-4 opacity-60"
      />
      <p className="text-[0.72rem] text-j-text-muted tracking-[0.06em] opacity-60 font-body">
        &copy; {new Date().getFullYear()} Josephine. All rights reserved.
      </p>
    </footer>
  );
}
