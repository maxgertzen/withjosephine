import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchMyReadingsPage: vi.fn(),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import { listSubmissionsByRecipientUserId } from "@/lib/booking/submissions";
import { fetchMyReadingsPage } from "@/lib/sanity/fetch";

import type { MyReadingsViewProps } from "./MyReadingsView";

const sessionMock = vi.mocked(getActiveSession);
const listMock = vi.mocked(listSubmissionsByRecipientUserId);
const fetchCopyMock = vi.mocked(fetchMyReadingsPage);

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  listMock.mockReset();
  fetchCopyMock.mockReset().mockResolvedValue(null);
});

async function getPageProps(opts: { sent?: boolean } = {}): Promise<MyReadingsViewProps> {
  const Page = (await import("./page")).default;
  const element = await Page({ searchParams: Promise.resolve(opts.sent ? { sent: "1" } : {}) });
  // Server component returned a React element of <MyReadingsView ...props />.
  // Inspect props directly without rendering — keeps RSC out of @testing-library.
  return (element as { props: MyReadingsViewProps }).props;
}

describe("/my-readings page logic", () => {
  it("passes signIn state when no cookie present", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
  });

  it("passes checkEmail state when ?sent=1 and no session", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps({ sent: true });
    expect(props.state.kind).toBe("checkEmail");
  });

  it("passes list state with readings when session is active", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    listMock.mockResolvedValue([]);
    const props = await getPageProps();
    expect(props.state.kind).toBe("list");
    expect(listMock).toHaveBeenCalledWith("user_1");
  });

  it("authenticated session WITH ?sent=1 still wins as list view (data > signal)", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    listMock.mockResolvedValue([]);
    const props = await getPageProps({ sent: true });
    expect(props.state.kind).toBe("list");
  });

  it("merges Sanity copy over defaults when present", async () => {
    cookiesGet.mockReturnValue(undefined);
    fetchCopyMock.mockResolvedValue({
      listHeading: "Override",
      listSubheading: "Override sub",
      openButtonLabel: "Open",
      emptyHeading: "Empty",
      emptyCtaLabel: "Book",
      signInHeading: "Override-signin",
      signInBody: "Body",
      signInButtonLabel: "Send",
      signInFootnote: "Foot",
      checkEmailHeading: "Check",
      checkEmailBody: "Body",
      checkEmailResendLabel: "Again",
    });
    const props = await getPageProps();
    expect(props.copy.signInHeading).toBe("Override-signin");
    expect(props.copy.openButtonLabel).toBe("Open");
  });
});
