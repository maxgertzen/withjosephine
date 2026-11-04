import { describe, expect, it } from "vitest";

import { fieldMapLinksPageEmailForm, fieldMapNewsletterContent } from "./signupFieldMapFixture";

const NEWSLETTER = "Site Settings › Newsletter sign-up at the bottom of every page";
const EMAIL_FORM = "Josephine's Link Tree › Words when a button asks for an email";

describe("Sanity field map: email signup", () => {
  it("feeds the footer box and the confirm page from Site Settings › Newsletter", () => {
    const words = fieldMapNewsletterContent();

    expect(words.show).toBe(true);
    expect(words.title).toBe(`[${NEWSLETTER} › Title above the box · newsletter.title]`);
    expect(words.submit).toBe(`[${NEWSLETTER} › Button words · newsletter.submit]`);
    expect(words.confirmButton).toBe(`[${NEWSLETTER} › Button on the page the email link opens · newsletter.confirmButton]`);
    expect(words.confirmFailedBody).toBe(
      `[${NEWSLETTER} › Words when the link in the email does not work · newsletter.confirmFailedBody]`,
    );
  });

  it("feeds the links page email form from Josephine's Link Tree › Words when a button asks for an email", () => {
    const { button, words } = fieldMapLinksPageEmailForm();

    expect(button.askForEmail).toBe(true);
    expect(words.prompt).toBe(`[${EMAIL_FORM} › Line above the email box · emailForm.prompt]`);
    expect(words.sent).toBe(`[${EMAIL_FORM} › Words after sending · emailForm.sent]`);
  });
});
