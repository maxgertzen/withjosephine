import { Button } from "@/components/Button";
import { Portal } from "@/components/Portal";
import { NOT_FOUND_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchNotFoundPage } from "@/lib/sanity/fetch";

export default async function NotFound() {
  const content = (await fetchNotFoundPage()) ?? NOT_FOUND_PAGE_DEFAULTS;
  const { tag, heading, description, buttonText } = content;

  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center">
        <Portal />

        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4 mt-8">
          {tag}
        </span>

        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-light italic text-j-text-heading leading-tight">
          {heading}
        </h1>

        <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md mx-auto">
          {description}
        </p>

        <div className="mt-10">
          <Button href="/" variant="primary" size="lg">
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
