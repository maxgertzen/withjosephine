import { devices } from "@playwright/test";

export const MOBILE_AND_DESKTOP = [
  { name: "375px", viewport: { width: 375, height: 812 } },
  { name: "Desktop Chrome", viewport: devices["Desktop Chrome"].viewport },
] as const;
