import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
  listGiftsByPurchaserUserId: vi.fn(),
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchMyReadingsPage: vi.fn().mockResolvedValue(null),
  fetchMyGiftsPage: vi.fn().mockResolvedValue(null),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import {
  listGiftsByPurchaserUserId,
  listSubmissionsByRecipientUserId,
} from "@/lib/booking/submissions";

import type { LibraryViewProps } from "../_shared/LibraryView";

const sessionMock = vi.mocked(getActiveSession);
const listReadingsMock = vi.mocked(listSubmissionsByRecipientUserId);
const listGiftsMock = vi.mocked(listGiftsByPurchaserUserId);

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  listReadingsMock.mockReset();
  listGiftsMock.mockReset();
});

async function getPageProps(): Promise<LibraryViewProps> {
  const Page = (await import("./page")).default;
  const element = await Page({ searchParams: Promise.resolve({}) });
  return (element as { props: LibraryViewProps }).props;
}

describe("/my-readings/gifts deep-link page", () => {
  it("renders with defaultTab=gifts regardless of data shape", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([]);
    listGiftsMock.mockResolvedValue([]);
    const props = await getPageProps();
    expect(props.defaultTab).toBe("gifts");
  });

  it("renders with defaultTab=gifts even when user has readings (deep link wins)", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([]);
    listGiftsMock.mockResolvedValue([]);
    const props = await getPageProps();
    expect(props.defaultTab).toBe("gifts");
  });

  it("passes signIn state with defaultTab=gifts when unauthenticated", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
    expect(props.defaultTab).toBe("gifts");
  });
});
