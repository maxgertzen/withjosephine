import { describe, expect, it } from "vitest";

import { NEWSLETTER_DEFAULTS } from "@/data/defaults";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import {
  deleteEmailSignupsFor,
  deleteSignupsNeverConfirmed,
  findEmailSignup,
  findEmailSignupsFor,
  markEmailsSent,
  markNewsletterConfirmed,
  saveEmailSignup,
} from "./emailSignups";

const CONSENT = NEWSLETTER_DEFAULTS.consentText;

const NOW = new Date("2026-11-04T10:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("email signups", () => {
  it("stores the address in lower case with the exact newsletter words when the box is ticked", async () => {
    const signup = await saveEmailSignup({ email: " Ada@Example.com ", source: "footer", consentText: CONSENT, now: NOW });

    expect(await findEmailSignup(signup.id)).toEqual({
      id: signup.id,
      email: "ada@example.com",
      source: "footer",
      consentText: CONSENT,
      createdAt: NOW.toISOString(),
      emailsSentAt: null,
      confirmedAt: null,
      providerSyncedAt: null,
    });
  });

  it("stores no consent words for a download without the newsletter box", async () => {
    const signup = await saveEmailSignup({ email: "ada@example.com", source: "links:file:1", consentText: null });

    expect((await findEmailSignup(signup.id))?.consentText).toBeNull();
  });

  it("confirms a newsletter signup once and never a download-only signup", async () => {
    const newsletter = await saveEmailSignup({ email: "a@example.com", source: "footer", consentText: CONSENT });
    const download = await saveEmailSignup({ email: "b@example.com", source: "links:file:1", consentText: null });

    expect(await markNewsletterConfirmed(newsletter.id, NOW)).toBe(true);
    expect(await markNewsletterConfirmed(newsletter.id, daysAgo(-1))).toBe(false);
    expect(await markNewsletterConfirmed(download.id, NOW)).toBe(false);
    expect((await findEmailSignup(newsletter.id))?.confirmedAt).toBe(NOW.toISOString());
  });

  it("deletes signups never confirmed after 30 days and keeps confirmed ones", async () => {
    const old = await saveEmailSignup({ email: "old@example.com", source: "footer", consentText: CONSENT, now: daysAgo(31) });
    const recent = await saveEmailSignup({ email: "new@example.com", source: "footer", consentText: CONSENT, now: daysAgo(29) });
    const confirmed = await saveEmailSignup({ email: "kept@example.com", source: "footer", consentText: CONSENT, now: daysAgo(90) });
    await markNewsletterConfirmed(confirmed.id, daysAgo(89));

    expect(await deleteSignupsNeverConfirmed(NOW)).toBe(1);
    const ids = (await dbQuery<{ id: string }>("SELECT id FROM email_signups")).map(({ id }) => id).sort();
    expect(ids).toEqual([recent.id, confirmed.id].sort());
    expect(await findEmailSignup(old.id)).toBeNull();
  });

  it("returns the same signup while its emails are unsent and the same address signs up the same way within a day", async () => {
    const first = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT, now: daysAgo(1.5) });
    const again = await saveEmailSignup({ email: "ADA@example.com", source: "footer", consentText: CONSENT, now: daysAgo(1) });
    const nextDay = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT, now: NOW });
    const download = await saveEmailSignup({ email: "ada@example.com", source: "links:file:1", consentText: null, now: NOW });
    const downloadAgain = await saveEmailSignup({ email: "ada@example.com", source: "links:file:1", consentText: null, now: NOW });

    expect(again).toEqual(first);
    expect(nextDay.id).not.toBe(first.id);
    expect(downloadAgain).toEqual(download);
    expect(await dbQuery("SELECT id FROM email_signups")).toHaveLength(3);
  });

  it("starts a new signup once the earlier one's emails were sent or the words changed", async () => {
    const sent = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT, now: NOW });
    await markEmailsSent(sent.id, NOW);
    const askedAgain = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT, now: NOW });
    const newWords = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: "New words.", now: NOW });

    expect(new Set([sent.id, askedAgain.id, newWords.id]).size).toBe(3);
    expect((await findEmailSignup(sent.id))?.emailsSentAt).toBe(NOW.toISOString());
  });

  it("lists every signup for an address, oldest first", async () => {
    const footer = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT, now: daysAgo(2) });
    const download = await saveEmailSignup({ email: "ada@example.com", source: "links:file:1", consentText: null, now: NOW });
    await saveEmailSignup({ email: "other@example.com", source: "footer", consentText: CONSENT, now: NOW });

    expect(await findEmailSignupsFor("Ada@Example.com")).toEqual([footer, download]);
  });

  it("deletes every signup for an address, whatever its case", async () => {
    await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT });
    await saveEmailSignup({ email: "ADA@example.com", source: "links:file:1", consentText: null });
    await saveEmailSignup({ email: "other@example.com", source: "footer", consentText: CONSENT });

    expect(await deleteEmailSignupsFor("Ada@Example.com")).toBe(2);
    expect(await dbQuery("SELECT email FROM email_signups")).toEqual([{ email: "other@example.com" }]);
  });
});
