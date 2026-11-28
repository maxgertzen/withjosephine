import type { SignupFormWords } from "../../../src/data/defaults";

export const SIGNUP_FORM_WORD_TITLES: Record<keyof SignupFormWords, string> = {
  emailLabel: "Words inside the email box",
  submit: "Button words",
  sending: "Button words while it sends",
  sent: "Words after sending",
  invalidEmail: "Words when the email is not complete",
  failed: "Words when something goes wrong",
};
