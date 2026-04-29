export const inputClasses =
  "peer bg-white/50 border border-j-border-subtle rounded-lg px-4 pt-6 pb-2 min-h-14 font-body text-base text-j-text focus:outline-none focus:border-j-accent transition-colors w-full placeholder:text-transparent";

export const floatingLabelClasses =
  "pointer-events-none absolute left-4 top-1.5 z-[1] origin-[0] font-body uppercase tracking-[0.18em] text-[0.7rem] text-j-accent transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-j-text-muted peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[0.7rem] peer-focus:text-j-accent peer-disabled:opacity-60";

export const floatingLabelMultilineClasses =
  "pointer-events-none absolute left-4 top-1.5 z-[1] origin-[0] font-body uppercase tracking-[0.18em] text-[0.7rem] text-j-accent transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-j-text-muted peer-focus:top-1.5 peer-focus:text-[0.7rem] peer-focus:text-j-accent peer-disabled:opacity-60";

export const labelClasses =
  "font-body text-sm text-j-text-muted tracking-wide uppercase mb-2 block";

export const errorClasses = "font-body text-sm text-red-600";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
