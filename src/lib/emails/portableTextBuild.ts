import type { PortableTextBlock } from "@portabletext/types";

function hashKey(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, "0");
}

export function stringToPortableTextBlocks(value: string): PortableTextBlock[] {
  const key = hashKey(value);
  return [
    {
      _type: "block",
      _key: key,
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `${key}-s0`, text: value, marks: [] }],
    },
  ];
}
