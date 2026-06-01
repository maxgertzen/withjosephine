import type { PortableTextBlock } from "@portabletext/types";
import { render } from "@react-email/render";
import { describe, expect, it, vi } from "vitest";

import {
  PortableTextBody,
  PortableTextInline,
  stringToPortableTextBlocks,
} from "./PortableTextBody";

function stripWhitespace(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

describe("PortableTextBody runtime defensive coercion", () => {
  it("coerces a stray string into Portable Text blocks at render time", async () => {
    const stringInput = "Hi {firstName}, your reading is booked.";
    const ptInput = stringToPortableTextBlocks(stringInput);

    const ptRender = await render(<PortableTextBody value={ptInput} />);
    const stringRender = await render(
      <PortableTextBody value={stringInput as unknown as PortableTextBlock[]} />,
    );

    expect(stripWhitespace(stringRender)).toBe(stripWhitespace(ptRender));
  });

  it("coerces a stray string[] into Portable Text blocks at render time", async () => {
    const stringArrayInput = ["First paragraph.", "Second paragraph."];
    const ptInput = stringArrayInput.flatMap((line) => stringToPortableTextBlocks(line));

    const ptRender = await render(<PortableTextBody value={ptInput} />);
    const stringArrayRender = await render(
      <PortableTextBody value={stringArrayInput as unknown as PortableTextBlock[]} />,
    );

    expect(stripWhitespace(stringArrayRender)).toBe(stripWhitespace(ptRender));
  });

  it("renders nothing for empty / null / whitespace string input", async () => {
    const nullRender = await render(<PortableTextBody value={null} />);
    const undefinedRender = await render(<PortableTextBody value={undefined} />);
    const emptyArrayRender = await render(<PortableTextBody value={[]} />);
    const whitespaceRender = await render(
      <PortableTextBody value={"   " as unknown as PortableTextBlock[]} />,
    );
    expect(nullRender).toBe(undefinedRender);
    expect(emptyArrayRender).toBe(undefinedRender);
    expect(whitespaceRender).toBe(undefinedRender);
  });
});

describe("PortableTextBody unknown marks", () => {
  it("renders text content when a span carries an unknown mark with no markDef", async () => {
    const blockWithUnknownMark: PortableTextBlock = {
      _type: "block",
      _key: "b1",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "s1",
          text: "Underlined text",
          marks: ["underline"],
        },
      ],
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const html = await render(<PortableTextBody value={[blockWithUnknownMark]} />);

    expect(html).toContain("Underlined text");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("PortableTextInline runtime defensive coercion", () => {
  it("coerces a stray string into Portable Text blocks at render time", async () => {
    const stringInput = "A small note for {firstName}.";
    const ptInput = stringToPortableTextBlocks(stringInput);

    const ptRender = await render(<PortableTextInline value={ptInput} />);
    const stringRender = await render(
      <PortableTextInline value={stringInput as unknown as PortableTextBlock[]} />,
    );

    expect(stripWhitespace(stringRender)).toBe(stripWhitespace(ptRender));
  });

  it("renders nothing for empty input", async () => {
    const nullRender = await render(<PortableTextInline value={null} />);
    const emptyArrayRender = await render(<PortableTextInline value={[]} />);
    expect(nullRender).toBe(emptyArrayRender);
  });
});
