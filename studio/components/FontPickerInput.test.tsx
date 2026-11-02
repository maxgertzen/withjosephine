import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sanity/ui", () => {
  const passthrough = ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={style}>{children}</div>
  );
  return {
    Card: passthrough,
    Flex: passthrough,
    Stack: passthrough,
    Text: passthrough,
    Radio: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input type="radio" {...props} />,
  };
});

const formValues: Record<string, unknown> = {};
vi.mock("sanity", () => ({
  set: (value: unknown) => ({ type: "set", value }),
  useFormValue: (path: (string | number)[]) => formValues[path.join(".")],
  useClient: () => themeClient,
}));

const themeClient = { fetch: vi.fn(() => Promise.resolve("Playfair Display")) };

import type { StringInputProps } from "sanity";

import { fontPickerInput } from "./FontPickerInput";

const NameFontInput = fontPickerInput({
  kind: "name",
  words: { path: ["name"], fallback: "Josephine" },
  siteFont: { themeField: "displayFont", fallback: "Cormorant Garamond" },
});

function renderPicker(value?: string) {
  const onChange = vi.fn();
  const props = {
    id: "nameFont",
    value,
    onChange,
    readOnly: false,
    elementProps: { ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
    schemaType: {
      options: {
        list: [
          { title: "Same as the rest of the site", value: "site" },
          { title: "Zilla Slab", value: "Zilla Slab" },
          { title: "Lora", value: "Lora" },
          { title: "Roboto Slab", value: "Roboto Slab" },
        ],
      },
    },
  } as unknown as StringInputProps;
  render(<NameFontInput {...props} />);
  return onChange;
}

afterEach(() => {
  document.head.querySelectorAll("link[data-font-picker]").forEach((link) => link.remove());
  delete formValues.name;
  delete formValues.nameStyle;
});

describe("FontPickerInput", () => {
  it("writes the page name in each font, thin and slanted like the page", () => {
    formValues.name = "withjosephine";
    renderPicker();
    const samples = screen.getAllByText("withjosephine");
    expect(samples).toHaveLength(4);
    expect(samples[1].style).toMatchObject({ fontFamily: '"Zilla Slab", serif', fontWeight: "300", fontStyle: "italic" });
  });

  it("writes the name bold and straight when that is chosen", () => {
    formValues.nameStyle = "bold";
    renderPicker();
    expect(screen.getAllByText("Josephine")[2].style).toMatchObject({ fontWeight: "700", fontStyle: "normal" });
  });

  it("shows the Theme font for the same-as-the-site choice", async () => {
    renderPicker();
    await vi.waitFor(() => expect(screen.getAllByText("Josephine")[0].style.fontFamily).toBe('"Playfair Display", serif'));
  });

  it("uses the built-in words when nothing is typed", () => {
    renderPicker();
    expect(screen.getAllByText("Josephine")).toHaveLength(4);
  });

  it("loads each font once, asking for the slant only where the font has an italic", () => {
    renderPicker();
    renderPicker();
    const links = [...document.head.querySelectorAll("link[data-font-picker]")].map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&display=swap",
      "https://fonts.googleapis.com/css2?family=Zilla+Slab:ital,wght@1,300&display=swap",
      "https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,400&display=swap",
      "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@300&display=swap",
    ]);
  });

  it("slants a font with no italic the way the page does", () => {
    renderPicker();
    expect(screen.getAllByText("Josephine")[3].style).toMatchObject({ fontStyle: "italic", fontWeight: "300" });
  });

  it("uses the heaviest weight the site font really has when the name is bold", () => {
    formValues.nameStyle = "bold";
    renderPicker();
    expect(screen.getAllByText("Josephine")[0].style.fontWeight).toBe("600");
  });

  it("marks the chosen font and saves a new choice", () => {
    const onChange = renderPicker("Lora");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => radio.checked)).toEqual([false, false, true, false]);

    fireEvent.click(radios[1]);

    expect(onChange).toHaveBeenCalledWith({ type: "set", value: "Zilla Slab" });
  });
});
