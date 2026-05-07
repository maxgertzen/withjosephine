// Shared Microsoft Clarity types + attribute constants. Centralized here
// so the case-sensitive `data-clarity-mask="True"` (capital T per Microsoft's
// docs) can't drift via typo at any call site, and so the `window.clarity`
// surface is typed consistently across the consent helper, route-tracking,
// and any future Clarity-touching code.
//
// Microsoft Clarity client API reference:
//   learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api

export interface ClarityFn {
  (command: "consent", granted: boolean): void;
  (command: "set", key: string, value: string): void;
}

export interface ClarityWindow extends Window {
  clarity?: ClarityFn;
}

export const CLARITY_MASK_PROPS = {
  "data-clarity-mask": "True",
} as const;
