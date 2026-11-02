import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSENT_STORAGE_KEY as STORAGE_KEY, readConsent, writeConsent } from "./consent";
import { CONSENT_COOKIE, consentCookie } from "./consentCookie";

function clearConsentCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
}

beforeEach(() => {
  window.localStorage.clear();
  clearConsentCookie();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readConsent / writeConsent", () => {
  it("returns null when no choice has been written", () => {
    expect(readConsent()).toBeNull();
  });

  it("round-trips 'granted'", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
  });

  it("round-trips 'declined'", () => {
    writeConsent("declined");
    expect(readConsent()).toBe("declined");
  });

  it("returns null when localStorage holds an unknown value", () => {
    window.localStorage.setItem(STORAGE_KEY, "maybe");
    expect(readConsent()).toBeNull();
  });

  it("survives a getItem that throws (private mode / blocked storage)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readConsent()).toBeNull();
  });

  it("survives a setItem that throws (quota / blocked storage)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeConsent("granted")).not.toThrow();
  });
});

describe("consent shared across the production hosts", () => {
  function onHost(hostname: string) {
    vi.spyOn(window, "location", "get").mockReturnValue({ hostname } as Location);
  }

  it("builds one cookie for withjosephine.com and its production subdomains", () => {
    expect(consentCookie("granted")).toBe(
      "josephine_consent=granted; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.withjosephine.com; Secure",
    );
  });

  it("reads the shared cookie before this host's own choice on a production host", () => {
    onHost("links.withjosephine.com");
    window.localStorage.setItem(STORAGE_KEY, "declined");
    vi.spyOn(document, "cookie", "get").mockReturnValue("josephine_consent=granted");
    expect(readConsent()).toBe("granted");
  });

  it("writes the shared cookie on a production host and asks the server to set it too", () => {
    onHost("withjosephine.com");
    const set = vi.spyOn(document, "cookie", "set");
    const send = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    writeConsent("declined");
    expect(set).toHaveBeenCalledWith(consentCookie("declined"));
    expect(send).toHaveBeenCalledWith("/api/consent", { method: "POST", body: "declined", keepalive: true });
  });

  it("ignores the shared cookie on staging and keeps staging's own choice", () => {
    onHost("staging.withjosephine.com");
    window.localStorage.setItem(STORAGE_KEY, "declined");
    vi.spyOn(document, "cookie", "get").mockReturnValue("josephine_consent=granted");
    const set = vi.spyOn(document, "cookie", "set");
    const send = vi.spyOn(globalThis, "fetch");
    expect(readConsent()).toBe("declined");
    writeConsent("granted");
    expect(set).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
