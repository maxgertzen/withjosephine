import { describe, expect, it } from "vitest";

import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import { findUserByEmail, findUserById, getOrCreateUser, normalizeEmail } from "./users";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Becky@Example.COM  ")).toBe("becky@example.com");
  });
});

describe("getOrCreateUser", () => {
  it("creates a new user with a uuid id and isNew=true", async () => {
    const result = await getOrCreateUser({ email: "alice@example.com", name: "Alice" });
    expect(result.isNew).toBe(true);
    expect(result.userId).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await dbQuery<{ id: string; email: string; name: string | null }>(
      `SELECT id, email, name FROM user WHERE id = ?`,
      [result.userId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: result.userId, email: "alice@example.com", name: "Alice" });
  });

  it("returns the same userId on a second call with the same email (isNew=false)", async () => {
    const first = await getOrCreateUser({ email: "bob@example.com", name: "Bob" });
    const second = await getOrCreateUser({ email: "bob@example.com", name: "Bob" });
    expect(second.userId).toBe(first.userId);
    expect(second.isNew).toBe(false);
  });

  it("treats casing + whitespace as the same email", async () => {
    const lower = await getOrCreateUser({ email: "carla@example.com" });
    const messy = await getOrCreateUser({ email: "  CARLA@Example.COM  " });
    expect(messy.userId).toBe(lower.userId);
    expect(messy.isNew).toBe(false);
  });

  it("stores the email lowercased + trimmed", async () => {
    const result = await getOrCreateUser({ email: "  Dana@Example.com  " });
    const rows = await dbQuery<{ email: string }>(
      `SELECT email FROM user WHERE id = ?`,
      [result.userId],
    );
    expect(rows[0]!.email).toBe("dana@example.com");
  });

  it("treats a missing or whitespace-only name as null", async () => {
    const result = await getOrCreateUser({ email: "ed@example.com", name: "   " });
    const rows = await dbQuery<{ name: string | null }>(
      `SELECT name FROM user WHERE id = ?`,
      [result.userId],
    );
    expect(rows[0]!.name).toBeNull();
  });

  it("throws when given an empty/whitespace email", async () => {
    await expect(getOrCreateUser({ email: "   " })).rejects.toThrow(/email is required/);
  });

  it("does not overwrite the existing name on a second call", async () => {
    const first = await getOrCreateUser({ email: "fran@example.com", name: "Fran" });
    await getOrCreateUser({ email: "fran@example.com", name: "Different Name" });
    const rows = await dbQuery<{ name: string | null }>(
      `SELECT name FROM user WHERE id = ?`,
      [first.userId],
    );
    expect(rows[0]!.name).toBe("Fran");
  });

  it("concurrent calls for the same email yield exactly one user, both return same userId", async () => {
    // Validates fix #2 — single-statement INSERT…ON CONFLICT DO UPDATE
    // RETURNING. Under the previous INSERT-then-SELECT pattern, two
    // simultaneous callers could each get a different new UUID.
    const [a, b] = await Promise.all([
      getOrCreateUser({ email: "race@example.com" }),
      getOrCreateUser({ email: "race@example.com" }),
    ]);
    expect(a.userId).toBe(b.userId);
    const rows = await dbQuery<{ id: string }>(
      `SELECT id FROM user WHERE email = ?`,
      ["race@example.com"],
    );
    expect(rows).toHaveLength(1);
  });

  it("returned isNew flag is true on first call, false on subsequent — single-statement upsert preserves the discriminator", async () => {
    const first = await getOrCreateUser({ email: "newflag@example.com" });
    const second = await getOrCreateUser({ email: "newflag@example.com" });
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
  });
});

describe("findUserByEmail / findUserById", () => {
  it("finds a user by email after creation", async () => {
    const created = await getOrCreateUser({ email: "gina@example.com" });
    const byEmail = await findUserByEmail("GINA@example.com");
    expect(byEmail).toEqual({ id: created.userId, email: "gina@example.com" });
  });

  it("returns null for an unknown email", async () => {
    expect(await findUserByEmail("nobody@example.com")).toBeNull();
  });

  it("returns null for an empty email", async () => {
    expect(await findUserByEmail("   ")).toBeNull();
  });

  it("finds a user by id", async () => {
    const created = await getOrCreateUser({ email: "henry@example.com" });
    const byId = await findUserById(created.userId);
    expect(byId).toEqual({ id: created.userId, email: "henry@example.com" });
  });

  it("returns null for an unknown id", async () => {
    expect(await findUserById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
