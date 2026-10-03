import { render } from "@testing-library/react";
import type { VisualEditingProps } from "next-sanity/visual-editing";
import { describe, expect, it, vi } from "vitest";

import { PreviewVisualEditing } from "./PreviewVisualEditing";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let receivedProps: VisualEditingProps | undefined;
vi.mock("next-sanity/visual-editing", () => ({
  VisualEditing: (props: VisualEditingProps) => {
    receivedProps = props;
    return null;
  },
}));

describe("PreviewVisualEditing", () => {
  it.each(["mutation", "manual"] as const)("re-renders the preview on a %s refresh from Presentation", async (source) => {
    refresh.mockClear();
    render(<PreviewVisualEditing />);
    await receivedProps?.refresh?.({ source, livePreviewEnabled: false } as never);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
