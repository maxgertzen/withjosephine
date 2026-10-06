import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReadingFoldPrePaint } from "./ReadingFoldPrePaint";

describe("ReadingFoldPrePaint", () => {
  it("puts the script in the server HTML", () => {
    expect(renderToString(<ReadingFoldPrePaint slug="soul-blueprint" />)).toContain(
      "josephine.intake.draft.soul-blueprint",
    );
  });

  it("renders no script on a client-side navigation", () => {
    const { container } = render(<ReadingFoldPrePaint slug="soul-blueprint" />);

    expect(container.querySelector("script")).toBeNull();
  });
});
