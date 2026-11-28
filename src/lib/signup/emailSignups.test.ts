import { describe, expect, it, vi } from "vitest";

import { NEWSLETTER_DEFAULTS } from "@/data/defaults";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import {
  deleteEmailSignupsFor,
  deleteSignupsNeverConfirmed,
  findEmailSignup,
  findEmailSignupsFor,
  markEmailSent,
  markNewsletterConfirmed,
  saveEmailSignup,
} from "./emailSignups";

const CONSENT = NEWSLETTER_DEFAULTS.consentText;

const NOW = new Date("2026-11-04T10:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("email signups", () => {
  it("stores the address in lower case with the exact newsletter words when the box is ticked", async () => {
    const signup = await saveEmailSignup({ email: " Ada@Example.com ", buttonKey: null, consentText: CONSENT, now: NOW });

    expect(await findEmailSignup(signup.id)).toEqual({
      id: signup.id,
      email: "ada@example.com",
      source: "footer",
      consentText: CONSENT,
      createdAt: NOW.toISOString(),
      downloadSentAt: null,
      confirmSentAt: null,
      confirmedAt: null,
      providerSyncedAt: null,
    });
  });

  it("stores no consent words for a download without the newsletter box", async () => {
    const signup = await saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null });

    expect((await findEmailSignup(signup.id))?.consentText).toBeNull();
  });

  it("confirms a newsletter signup once and never a download-only signup", async () => {
    const newsletter = await saveEmailSignup({ email: "a@example.com", buttonKey: null, consentText: CONSENT });
    const download = await saveEmailSignup({ email: "b@example.com", buttonKey: "file:1", consentText: null });

    expect(await markNewsletterConfirmed(newsletter.id, NOW)).toBe(true);
    expect(await markNewsletterConfirmed(newsletter.id, daysAgo(-1))).toBe(false);
    expect(await markNewsletterConfirmed(download.id, NOW)).toBe(false);
    expect((await findEmailSignup(newsletter.id))?.confirmedAt).toBe(NOW.toISOString());
  });

  it("deletes signups never confirmed after 30 days and keeps confirmed ones", async () => {
    const old = await saveEmailSignup({ email: "old@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(31) });
    const recent = await saveEmailSignup({ email: "new@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(29) });
    const confirmed = await saveEmailSignup({ email: "kept@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(90) });
    await markNewsletterConfirmed(confirmed.id, daysAgo(89));

    expect(await deleteSignupsNeverConfirmed(NOW)).toBe(1);
    const ids = (await dbQuery<{ id: string }>("SELECT id FROM email_signups")).map(({ id }) => id).sort();
    expect(ids).toEqual([recent.id, confirmed.id].sort());
    expect(await findEmailSignup(old.id)).toBeNull();
  });

  it("returns the same signup while its emails are unsent and the same address signs up the same way within a day", async () => {
    const first = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(1.5) });
    const again = await saveEmailSignup({ email: "ADA@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(1) });
    const nextDay = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT, now: NOW });
    const download = await saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null, now: NOW });
    const downloadAgain = await saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null, now: NOW });

    expect(again).toEqual(first);
    expect(nextDay.id).not.toBe(first.id);
    expect(downloadAgain).toEqual(download);
    expect(await dbQuery("SELECT id FROM email_signups")).toHaveLength(3);
  });

  it("keeps returning a download signup with the newsletter box ticked until both of its emails were sent", async () => {
    const ticked = { email: "ada@example.com", buttonKey: "file:1", consentText: CONSENT, now: NOW };
    const first = await saveEmailSignup(ticked);
    await markEmailSent(first.id, "download", NOW);
    const confirmStillUnsent = await saveEmailSignup(ticked);
    await markEmailSent(first.id, "confirm", NOW);
    const bothSent = await saveEmailSignup(ticked);

    expect(confirmStillUnsent).toEqual({ ...first, downloadSentAt: NOW.toISOString() });
    expect(bothSent.id).not.toBe(first.id);
  });

  it("starts a new signup once the earlier one's email was sent or the words changed", async () => {
    const sent = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT, now: NOW });
    await markEmailSent(sent.id, "confirm", NOW);
    const askedAgain = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT, now: NOW });
    const newWords = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: "New words.", now: NOW });

    expect(new Set([sent.id, askedAgain.id, newWords.id]).size).toBe(3);
    expect((await findEmailSignup(sent.id))?.confirmSentAt).toBe(NOW.toISOString());
  });

  it("stores one signup when the same signup arrives several times at once", async () => {
    const signups = await Promise.all(
      Array.from({ length: 5 }, () =>
        saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null, now: NOW }),
      ),
    );

    expect(new Set(signups.map(({ id }) => id)).size).toBe(1);
    expect(await dbQuery("SELECT id FROM email_signups")).toHaveLength(1);
  });

  it("stores a new signup when the matching one was sent between its insert check and its read", async () => {
    const sqlClient = await import("@/lib/booking/persistence/sqlClient");
    vi.spyOn(sqlClient, "dbExec").mockResolvedValueOnce({ rowsWritten: 0 } as Awaited<ReturnType<typeof sqlClient.dbExec>>);

    const signup = await saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null, now: NOW });

    expect(await findEmailSignup(signup.id)).toEqual(signup);
    vi.restoreAllMocks();
  });

  it("lists every signup for an address, oldest first", async () => {
    const footer = await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT, now: daysAgo(2) });
    const download = await saveEmailSignup({ email: "ada@example.com", buttonKey: "file:1", consentText: null, now: NOW });
    await saveEmailSignup({ email: "other@example.com", buttonKey: null, consentText: CONSENT, now: NOW });

    expect(await findEmailSignupsFor("Ada@Example.com")).toEqual([footer, download]);
  });

  it("deletes every signup for an address, whatever its case", async () => {
    await saveEmailSignup({ email: "ada@example.com", buttonKey: null, consentText: CONSENT });
    await saveEmailSignup({ email: "ADA@example.com", buttonKey: "file:1", consentText: null });
    await saveEmailSignup({ email: "other@example.com", buttonKey: null, consentText: CONSENT });

    expect(await deleteEmailSignupsFor("Ada@Example.com")).toBe(2);
    expect(await dbQuery("SELECT email FROM email_signups")).toEqual([{ email: "other@example.com" }]);
  });
});
