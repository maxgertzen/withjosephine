import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("__notfound__");
  }),
  usePathname: () => "/gift/K7M2QX9PH4TR",
}));

vi.mock("@/components/IntakeForm", () => ({ IntakeForm: () => null }));

vi.mock("@/lib/gift/gifts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gift/gifts")>()),
  findGiftByCode: vi.fn(),
}));

vi.mock("@/lib/gift/giftCode", () => ({ deriveVerifiedGiftCode: vi.fn() }));

vi.mock("@/lib/booking/persistence/sqlClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/persistence/sqlClient")>()),
  dbExec: vi.fn(),
  dbBatch: vi.fn(),
}));

vi.mock("@/lib/auth/listenSession", () => ({ writeAudit: vi.fn() }));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadingPublished: vi.fn(),
  fetchReadingsPublished: vi.fn(),
  fetchBookingFormPublished: vi.fn(),
  fetchBookingPagePublished: vi.fn(),
  fetchLandingPagePublished: vi.fn(),
  fetchNotesStatePublished: vi.fn(),
  fetchReadingNotesPublished: vi.fn(),
  fetchGiftSettingsPublished: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getReadingById } from "@/data/readings";
import { writeAudit } from "@/lib/auth/listenSession";
import { dbBatch, dbExec } from "@/lib/booking/persistence/sqlClient";
import { deriveVerifiedGiftCode } from "@/lib/gift/giftCode";
import { findGiftByCode } from "@/lib/gift/gifts";
import type { GiftStatus } from "@/lib/gift/types";
import {
  fetchBookingFormPublished,
  fetchGiftSettingsPublished,
  fetchReadingNotesPublished,
  fetchReadingPublished,
  fetchReadingsPublished,
} from "@/lib/sanity/fetch";
import { makeGiftRecord } from "@/test/fixtures/gift";

import GiftPage, { dynamic, generateMetadata } from "./page";

const CODE = "K7M2QX9PH4TR";

const mockFindGift = vi.mocked(findGiftByCode);
const mockContext = vi.mocked(getCloudflareContext);

function params(code = CODE) {
  return { params: Promise.resolve({ code }) };
}

function giftWith(status: GiftStatus) {
  return makeGiftRecord({ status, buyerFirstName: "Dana", note: "For your birthday." });
}

async function renderPage(code = CODE) {
  return render(await GiftPage(params(code)));
}

beforeEach(() => {
  vi.stubEnv("GIFTS_ENABLED", "1");
  vi.stubEnv("ENVIRONMENT", "development");
  mockContext.mockReset().mockRejectedValue(new Error("no workerd context"));
  mockFindGift.mockReset().mockResolvedValue(null);
  vi.mocked(deriveVerifiedGiftCode).mockReset().mockResolvedValue(CODE);
  vi.mocked(fetchReadingPublished).mockResolvedValue(null);
  vi.mocked(fetchReadingsPublished).mockResolvedValue([]);
  vi.mocked(fetchReadingNotesPublished).mockResolvedValue([]);
  vi.mocked(fetchGiftSettingsPublished).mockResolvedValue(null);
  vi.mocked(fetchBookingFormPublished).mockResolvedValue({
    nonRefundableNotice: "Non-refundable.",
    sections: [],
  });
  vi.mocked(dbExec).mockClear();
  vi.mocked(dbBatch).mockClear();
  vi.mocked(writeAudit).mockClear();
});

describe("/gift/[code]", () => {
  it("is force-dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("gives an active gift the reading's metadata with noindex and the booking canonical", async () => {
    mockFindGift.mockResolvedValue(giftWith("active"));

    const metadata = await generateMetadata(params());

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe("/book/birth-chart");
  });

  it("gives every message state noindex metadata", async () => {
    const metadata = await generateMetadata(params("x"));

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("renders the booking form in gift mode without Product JSON-LD", async () => {
    mockFindGift.mockResolvedValue(giftWith("active"));

    const { container } = await renderPage();

    expect(screen.getByText("A note from Dana")).toBeTruthy();
    expect(screen.getByText("For your birthday.")).toBeTruthy();
    expect(screen.getByText("A gift, already paid")).toBeTruthy();
    expect(screen.queryByText("$89")).toBeNull();
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("renders the same page for a malformed and an unknown code", async () => {
    const malformed = (await renderPage("x")).container.innerHTML;
    document.body.innerHTML = "";
    const unknown = (await renderPage("AAAAAAAAAAAA")).container.innerHTML;

    expect(unknown).toBe(malformed);
    expect(screen.getByText("We couldn’t find this gift")).toBeTruthy();
  });

  it("renders the already-opened message with a link to book the reading", async () => {
    mockFindGift.mockResolvedValue(giftWith("redeemed"));

    await renderPage();

    expect(screen.getByText("This gift was already opened")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: `Book the ${getReadingById("birth-chart")?.name} yourself` })
        .getAttribute("href"),
    ).toBe("/book/birth-chart");
  });

  it("renders the no-longer-active message for a cancelled gift", async () => {
    mockFindGift.mockResolvedValue(giftWith("cancelled"));

    await renderPage();

    expect(screen.getByText("This gift is no longer active")).toBeTruthy();
  });

  it("lets a D1 failure reach the error boundary instead of rendering not found", async () => {
    mockFindGift.mockRejectedValue(new Error("D1 unavailable"));

    await expect(renderPage()).rejects.toThrow("D1 unavailable");
  });

  it("makes no D1 write and no audit row", async () => {
    mockFindGift.mockResolvedValue(giftWith("active"));
    await generateMetadata(params());
    await renderPage();
    await renderPage("x");

    expect(dbExec).not.toHaveBeenCalled();
    expect(dbBatch).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("calls notFound when gifts are off", async () => {
    vi.stubEnv("GIFTS_ENABLED", "0");

    await expect(renderPage()).rejects.toThrow("__notfound__");
  });

  it("renders rate_limited and looks nothing up when the limiter fails closed in production", async () => {
    vi.stubEnv("ENVIRONMENT", "production");
    mockContext.mockResolvedValue({ env: {} } as Awaited<ReturnType<typeof getCloudflareContext>>);

    await renderPage();

    expect(screen.getByText("One moment")).toBeTruthy();
    expect(mockFindGift).not.toHaveBeenCalled();
  });
});
