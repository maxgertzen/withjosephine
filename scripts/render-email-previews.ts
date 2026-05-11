// Render every email component to a standalone HTML file under
// `email-previews/` so a human can open them in a browser and visually
// verify parity. Run via `pnpm email:preview`. Output dir is gitignored.
//
// Sample data is hardcoded here, NOT imported from `src/test/fixtures` —
// these previews are for visual review, not test fixtures, and decoupling
// avoids letting fixture changes silently shift the preview output.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";

import { render } from "@react-email/render";

import { EMAIL_DAY7_DELIVERY_DEFAULTS } from "../src/data/defaults";
import { ContactMessage } from "../src/lib/emails/ContactMessage";
import { Day2Started } from "../src/lib/emails/Day2Started";
import { Day7Delivery } from "../src/lib/emails/Day7Delivery";
import { Day7OverdueAlert } from "../src/lib/emails/Day7OverdueAlert";
import { JosephineNotification } from "../src/lib/emails/JosephineNotification";
import { OrderConfirmation } from "../src/lib/emails/OrderConfirmation";

const SAMPLE_RESPONSES = [
  { fieldKey: "first_name", fieldLabelSnapshot: "First name", fieldType: "text", value: "Ada" },
  { fieldKey: "dob", fieldLabelSnapshot: "Birth date", fieldType: "date", value: "1990-04-12" },
  {
    fieldKey: "focus",
    fieldLabelSnapshot: "Focus areas",
    fieldType: "checkbox",
    value: "Soul Purpose, Karmic Patterns, Relationships",
  },
];

const previews = [
  {
    name: "01-order-confirmation",
    element: React.createElement(OrderConfirmation, {
      firstName: "Ada",
      readingName: "Soul Blueprint",
      readingPriceDisplay: "$129",
      amountPaidDisplay: "$129.00",
    }),
  },
  {
    name: "02-day-2-started",
    element: React.createElement(Day2Started, { firstName: "Ada" }),
  },
  {
    name: "03-day-7-delivery",
    element: React.createElement(Day7Delivery, {
      vars: {
        firstName: "Ada",
        readingName: "Soul Blueprint",
        listenUrl: "https://withjosephine.com/listen/sub_preview",
      },
      copy: EMAIL_DAY7_DELIVERY_DEFAULTS,
    }),
  },
  {
    name: "04-josephine-notification",
    element: React.createElement(JosephineNotification, {
      readingName: "Soul Blueprint",
      readingPriceDisplay: "$129",
      amountPaidDisplay: "$129.00",
      email: "ada@example.com",
      createdAt: "2026-05-01T00:00:00.000Z",
      submissionId: "sub_preview",
      photoUrl: "https://images.withjosephine.com/sub_preview/photo.jpg",
      responses: SAMPLE_RESPONSES,
    }),
  },
  {
    name: "05-day-7-overdue-alert",
    element: React.createElement(Day7OverdueAlert, {
      email: "ada@example.com",
      readingName: "Soul Blueprint",
      submissionId: "sub_preview",
      createdAt: "2026-04-20T00:00:00.000Z",
    }),
  },
  {
    name: "06-contact-message",
    element: React.createElement(ContactMessage, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      message:
        "Hello Josephine,\n\nI'd like to ask about a Soul Blueprint reading. Is there a typical wait time?\n\nThanks!",
    }),
  },
];

const outDir = resolve("email-previews");
mkdirSync(outDir, { recursive: true });

for (const { name, element } of previews) {
  const html = await render(element);
  const path = resolve(outDir, `${name}.html`);
  writeFileSync(path, html);
  console.log(`  → ${path}`);
}

console.log(`\nRendered ${previews.length} previews to ${outDir}`);
console.log("Open each .html in a browser to visually verify parity.");
