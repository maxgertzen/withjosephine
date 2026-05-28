import Link from "next/link";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 bg-j-cream border-b border-j-blush">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-display italic text-lg text-j-text-heading">
            <span aria-hidden="true">✦</span> Josephine
          </Link>
          <Link
            href="/"
            className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors"
          >
            Home
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
