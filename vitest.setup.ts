import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { __resetSqlClientForTesting } from "@/lib/booking/persistence/sqlClient";

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");
});

afterEach(async () => {
  cleanup();
  await __resetSqlClientForTesting();
});
