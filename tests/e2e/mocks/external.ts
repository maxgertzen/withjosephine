import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const externalHandlers = [
  http.post("https://api.resend.com/emails", () =>
    HttpResponse.json({ id: "mock-email-id" }, { status: 200 }),
  ),
  http.post("https://api.resend.com/v1/emails", () =>
    HttpResponse.json({ id: "mock-email-id" }, { status: 200 }),
  ),
  http.post("https://api.stripe.com/v1/*", () =>
    HttpResponse.json({ id: "mock-stripe-id" }, { status: 200 }),
  ),
  http.get("https://api.stripe.com/v1/*", () =>
    HttpResponse.json({ id: "mock-stripe-id" }, { status: 200 }),
  ),
  http.all("https://buy.stripe.com/*", () =>
    new HttpResponse("<html><body>mock stripe checkout</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  ),
];

export const mswServer = setupServer(...externalHandlers);
