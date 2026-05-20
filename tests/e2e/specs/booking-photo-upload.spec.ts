import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";

const UPLOAD_URL_ROUTE = "/api/booking/upload-url";
const R2_SIGNED_URL_RE =
  /^https:\/\/[^.]+\.r2\.cloudflarestorage\.com\/[^/]+\/submissions\/[^/]+\/photo-\d+-[a-z0-9._-]+\?[^"\s]*X-Amz-Expires=/;

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
});

test.describe("Booking photo upload — signed PUT contract — mock mode", () => {
  test("happy path mints a signed R2 URL bound to ContentType and ContentLength", async ({
    request,
  }) => {
    const res = await request.post(UPLOAD_URL_ROUTE, {
      headers: { "content-type": "application/json" },
      data: {
        filename: "Birth Chart Photo.jpg",
        contentType: "image/jpeg",
        size: 123456,
        turnstileToken: "stub-turnstile-token",
      },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { uploadUrl: string; key: string };
    expect(body.uploadUrl).toMatch(R2_SIGNED_URL_RE);
    expect(body.key).toMatch(/^submissions\/[^/]+\/photo-\d+-birth-chart-photo\.jpg$/);
  });

  test("browser PUT against the signed URL carries Content-Type and body size the route signed", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const mintRes = await request.post(UPLOAD_URL_ROUTE, {
      headers: { "content-type": "application/json" },
      data: {
        filename: "selfie.png",
        contentType: "image/png",
        size: 4096,
        turnstileToken: "stub-turnstile-token",
      },
    });
    expect(mintRes.status()).toBe(200);
    const { uploadUrl } = (await mintRes.json()) as { uploadUrl: string; key: string };

    let captured: { method: string; contentType: string | null; bodySize: number } | null =
      null;
    await page.route(uploadUrl, async (route) => {
      const req = route.request();
      const buf = req.postDataBuffer();
      captured = {
        method: req.method(),
        contentType: req.headers()["content-type"] ?? null,
        bodySize: buf?.byteLength ?? 0,
      };
      await route.fulfill({ status: 200, body: "" });
    });

    // Drive the PUT from the page context so headers and CORS match what the
    // production uploader does. Content-Length is a forbidden header the
    // browser sets automatically from the body — R2's signed URL signature
    // is bound to it via the body size, which is what gets asserted here.
    await page.goto("/");
    const status = await page.evaluate(async (url) => {
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: new Blob([new Uint8Array(4096)], { type: "image/png" }),
      });
      return resp.status;
    }, uploadUrl);

    expect(status).toBe(200);
    expect(captured).not.toBeNull();
    expect(captured!.method).toBe("PUT");
    expect(captured!.contentType).toBe("image/png");
    expect(captured!.bodySize).toBe(4096);
  });

  test("missing turnstile token rejected with 400", async ({ request }) => {
    const res = await request.post(UPLOAD_URL_ROUTE, {
      headers: { "content-type": "application/json" },
      data: {
        filename: "x.jpg",
        contentType: "image/jpeg",
        size: 100,
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/verification token/i);
  });

  test("unsupported MIME type rejected with 415", async ({ request }) => {
    const res = await request.post(UPLOAD_URL_ROUTE, {
      headers: { "content-type": "application/json" },
      data: {
        filename: "doc.pdf",
        contentType: "application/pdf",
        size: 100,
        turnstileToken: "stub-turnstile-token",
      },
    });
    expect(res.status()).toBe(415);
  });

  test("oversize file rejected with 413", async ({ request }) => {
    const res = await request.post(UPLOAD_URL_ROUTE, {
      headers: { "content-type": "application/json" },
      data: {
        filename: "huge.jpg",
        contentType: "image/jpeg",
        size: 100 * 1024 * 1024,
        turnstileToken: "stub-turnstile-token",
      },
    });
    expect(res.status()).toBe(413);
  });
});
