export const inputClasses =
  "bg-white/50 border border-j-border-subtle rounded-lg px-4 py-3 font-body text-j-text focus:outline-none focus:border-j-accent transition-colors w-full";

export const labelClasses =
  "font-body text-sm text-j-text-muted tracking-wide uppercase mb-2 block";

export const errorClasses = "font-body text-sm text-red-600";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
