// Stricter than booking form's `isValidEmail` (which permits `<>` etc).
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const EMAIL_MAX_LENGTH = 254;

export function isValidAuthEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(trimmed);
}
