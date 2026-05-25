import { describe, expect, it } from "vitest";

import { PREVIEW_TEMPLATE_KEYS, renderEmailPreview } from "./render-preview";

describe.each(PREVIEW_TEMPLATE_KEYS)("email HTML byte-equality: %s", (templateKey) => {
  it("renders the exact same HTML as the baseline snapshot", async () => {
    const html = await renderEmailPreview(templateKey, null);
    expect(html).toMatchSnapshot();
  });
});
