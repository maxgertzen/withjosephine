import type { LetterContent } from "@/app/book/[readingId]/letter/LetterView";

export const LETTER_VIEW_BASE_CONTENT: LetterContent = {
  letterOpener:
    "Before I read for you, I want to know a little about you. A few details, a few questions you'd like held.",
  letterBridge: "Take your time with this. There's no wrong answer.",
  letterClosing:
    "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
  dropCapCta: "Tell me about you →",
  dropCapCaption:
    "The intake form: about five minutes. You'll review before paying.",
};

export const LETTER_VIEW_SHORT_CONTENT: LetterContent = {
  ...LETTER_VIEW_BASE_CONTENT,
  letterOpener: "Tell me what brought you here.",
  letterBridge: "One sentence is enough.",
  dropCapCta: "Begin →",
};
