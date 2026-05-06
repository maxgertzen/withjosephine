import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { ContactMessage } from "./ContactMessage";
import { visibleText } from "./test-helpers";

const PROPS = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello,\nI'd like to ask about a reading.",
};

describe("ContactMessage — visual parity with legacy resend.tsx", () => {
  it("renders the heading + From line + message body", async () => {
    const text = visibleText(await render(<ContactMessage {...PROPS} />));
    expect(text).toContain("New message from Ada Lovelace");
    expect(text).toContain("From: Ada Lovelace <ada@example.com>");
    expect(text).toContain("Hello,");
    expect(text).toContain("I'd like to ask about a reading.");
  });

  it("preserves multiline messages as separate <br/> segments", async () => {
    const html = await render(<ContactMessage {...PROPS} />);
    expect(html).toContain("Hello,<br/>");
  });

  it("escapes HTML in name + email + message", async () => {
    const html = await render(
      <ContactMessage
        name="<bad>"
        email="x@y"
        message="<script>alert(1)</script>"
      />,
    );
    expect(html).not.toContain("<bad>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;bad&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("uses serif font for heading + divider color from tokens", async () => {
    const html = await render(<ContactMessage {...PROPS} />);
    expect(html).toMatch(/Cormorant Garamond/);
    expect(html.toLowerCase()).toContain("#e8d5c4");
  });
});
