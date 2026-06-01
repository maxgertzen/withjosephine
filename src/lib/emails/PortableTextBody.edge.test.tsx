// 3syvah89: workerd-mode regression guard for PortableTextBody.
//
// Hand-rolled PortableTextBody (PortableTextBody.tsx) exists precisely because
// `@portabletext/react`'s `<PortableText>` calls `useMemo` at the top of render,
// and the @react-email/render path inside the Cloudflare workerd worker
// dispatches into `react-dom/server.edge` where the dispatcher is null for
// hooks called from a function-component nested under `renderToReadableStream`.
//
// Vitest runs in Node, but we can drive the same edge-conditioned react-dom
// entry that workerd uses — `react-dom/server.edge` exports
// `renderToReadableStream`. If the renderer ever regressed (a hook snuck in,
// a component swapped to one that uses useMemo, etc.) this test fails with
// "Cannot read properties of null (reading 'useMemo')" before workerd ever
// loads the binary.

import type { PortableTextBlock } from "@portabletext/types";
import { renderToReadableStream } from "react-dom/server.edge";
import { describe, expect, it } from "vitest";

import { PortableTextBody } from "./PortableTextBody";

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

describe("PortableTextBody under react-dom/server.edge (workerd parity)", () => {
  it("renders a plain block without invoking any hook (no null-dispatcher throw)", async () => {
    const blocks: PortableTextBlock[] = [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Hi {firstName}, your reading is booked.",
            marks: [],
          },
        ],
      },
    ];

    const stream = await renderToReadableStream(<PortableTextBody value={blocks} />);
    await stream.allReady;
    const html = await streamToString(stream);
    expect(html).toContain("Hi {firstName}, your reading is booked.");
  });

  it("renders a block carrying strong + em + link marks under the edge runtime", async () => {
    const blocks: PortableTextBlock[] = [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        markDefs: [{ _key: "m1", _type: "link", href: "https://example.com" }],
        children: [
          { _type: "span", _key: "s1", text: "Bold ", marks: ["strong"] },
          { _type: "span", _key: "s2", text: "italic ", marks: ["em"] },
          { _type: "span", _key: "s3", text: "linked", marks: ["m1"] },
        ],
      },
    ];

    const stream = await renderToReadableStream(<PortableTextBody value={blocks} />);
    await stream.allReady;
    const html = await streamToString(stream);
    expect(html).toContain("Bold");
    expect(html).toContain("italic");
    expect(html).toContain("linked");
    expect(html).toContain("https://example.com");
  });
});
