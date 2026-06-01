import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Image, { resolveSrc } from "./next-image";

describe("resolveSrc (jmt52c7r)", () => {
  it("swaps absolute-path string src for the transparent pixel", () => {
    const result = resolveSrc("/images/hero.jpg");
    expect(result.swapped).toBe(true);
    expect(result.src.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("passes through https URLs unchanged", () => {
    const url = "https://cdn.example.com/hero.jpg";
    expect(resolveSrc(url)).toEqual({ src: url, swapped: false });
  });

  it("passes through protocol-relative `//` URLs unchanged", () => {
    const url = "//cdn.example.com/hero.jpg";
    expect(resolveSrc(url)).toEqual({ src: url, swapped: false });
  });

  it("swaps empty string for the transparent pixel", () => {
    const result = resolveSrc("");
    expect(result.swapped).toBe(true);
  });

  it("resolves `{ src }` and `{ default: { src } }` shapes through the same rules", () => {
    expect(resolveSrc({ src: "/local.png" }).swapped).toBe(true);
    expect(resolveSrc({ src: "https://x/y.png" }).swapped).toBe(false);
    expect(
      resolveSrc({ default: { src: "https://x/y.png" } }).swapped,
    ).toBe(false);
  });
});

describe("Image (jmt52c7r)", () => {
  it("renders a bare <img> when src is a passthrough URL", () => {
    const { container } = render(
      <Image src="https://cdn.example.com/hero.jpg" alt="hero" width={100} height={80} />,
    );
    expect(container.querySelector("[data-preview-image-hidden]")).toBeNull();
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/hero.jpg");
  });

  it("wraps swapped src in a badge wrapper with data-preview-image-hidden", () => {
    const { container } = render(
      <Image src="/local-hero.jpg" alt="hero" width={100} height={80} />,
    );
    const wrapper = container.querySelector("[data-preview-image-hidden='true']");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.textContent).toContain("Image hidden in preview");
  });

  it("uses the fill-mode wrapper (absolute, inset 0, 100% width+height) so the badge sizes correctly", () => {
    const { container } = render(
      <Image src="/local-hero.jpg" alt="hero" fill />,
    );
    const wrapper = container.querySelector<HTMLElement>(
      "[data-preview-image-hidden='true']",
    );
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.position).toBe("absolute");
    expect(wrapper?.style.width).toBe("100%");
    expect(wrapper?.style.height).toBe("100%");
  });
});
