import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, vi } from "vitest";

import {
  __registerSqliteFactory,
  __resetSqlClientForTesting,
} from "@/lib/booking/persistence/sqlClient";
import { createSqliteClient } from "@/test/persistence/sqliteClient";

// Register the SQLite factory once. Tests stub BOOKING_DB_DRIVER=sqlite
// + BOOKING_DB_PATH=:memory: in beforeEach to get a fresh database per
// test. The actual better-sqlite3 import lives in src/test/ so it never
// enters the production bundle (NFT + webpack don't trace test files).
beforeAll(() => {
  __registerSqliteFactory(() => createSqliteClient());
});

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");
});

afterEach(async () => {
  cleanup();
  await __resetSqlClientForTesting();
});
