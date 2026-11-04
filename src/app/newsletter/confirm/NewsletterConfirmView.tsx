import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { StarField } from "@/components/StarField";
import type { NewsletterContent } from "@/data/defaults";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { NEWSLETTER_CONFIRM_API_ROUTE } from "@/lib/http/routes";

export type NewsletterConfirmStatus = "confirmed" | "failed";

export type NewsletterConfirmViewState = { kind: "ask"; token: string } | { kind: NewsletterConfirmStatus };

export type NewsletterConfirmViewProps = {
  words: NewsletterContent;
  state: NewsletterConfirmViewState;
};

function cardWords(words: NewsletterContent, state: NewsletterConfirmViewState) {
  switch (state.kind) {
    case "ask":
      return { title: words.confirmPromptTitle, body: null };
    case "confirmed":
      return { title: words.confirmedTitle, body: words.confirmedBody };
    case "failed":
      return { title: words.confirmFailedTitle, body: words.confirmFailedBody };
  }
}

export function NewsletterConfirmView({ words, state }: NewsletterConfirmViewProps) {
  const { title, body } = cardWords(words, state);
  return (
    <div className="relative min-h-screen overflow-hidden bg-j-cream">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <main id="main" className="relative z-10 mx-auto max-w-[720px] px-6 py-20">
        <div className="mx-auto max-w-md rounded-2xl border border-j-blush bg-j-ivory p-10 text-center">
          <h1 className="font-display text-3xl italic text-j-text-heading">{title}</h1>
          {body ? <p className="mt-4 font-body text-base leading-[1.6] text-j-text">{body}</p> : null}
          {state.kind === "ask" ? (
            <form method="post" action={NEWSLETTER_CONFIRM_API_ROUTE} className="mt-8">
              <input type="hidden" name="token" value={state.token} />
              <Button type="submit" size="lg">
                {words.confirmButton}
              </Button>
            </form>
          ) : null}
        </div>
        <Footer />
      </main>
    </div>
  );
}
