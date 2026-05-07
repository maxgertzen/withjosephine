import type { SanityFormFieldOption } from "@/lib/sanity/types";

export const NAME_FOLLOWUP_PREFIX = "name_followup_";
export const NAME_FOLLOWUP_MAX_LENGTH = 80;

export function nameFollowupKey(optionValue: string) {
  return `${NAME_FOLLOWUP_PREFIX}${optionValue}`;
}

export function isNameFollowupKey(key: string) {
  return key.startsWith(NAME_FOLLOWUP_PREFIX);
}

export function nameFollowupOptionValue(key: string) {
  return key.slice(NAME_FOLLOWUP_PREFIX.length);
}

export function isNameFollowupEnabled(option: SanityFormFieldOption | undefined) {
  return option?.nameFollowup?.enabled === true;
}

export function statusLineFor(count: number, target: number) {
  if (count === 0) return `Choose ${spelledOut(target)} to begin.`;
  if (count >= target) return `${capitalSpelledOut(target)} chosen.`;
  const remaining = target - count;
  if (count === 1) return `One chosen — ${spelledOut(remaining)} to go.`;
  return `${capitalSpelledOut(count)} chosen — ${spelledOut(remaining)} to go.`;
}

const SPELLED = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function spelledOut(n: number) {
  return SPELLED[n] ?? String(n);
}
function capitalSpelledOut(n: number) {
  const word = spelledOut(n);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const LIMIT_MESSAGE_DEFAULT = "Three is the limit — release one to choose another.";
export const LIMIT_MESSAGE_TIMEOUT_MS = 3500;
