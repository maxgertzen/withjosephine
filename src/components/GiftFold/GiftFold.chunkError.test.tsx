import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/GiftSheet", () => {
  throw new Error("Loading chunk failed");
});

import { GIFT_DEFAULTS } from "@/data/defaults";
import { pick } from "@/lib/pick";

import { GiftFold } from "./GiftFold";
import { GIFT_FOLD_COPY_KEYS } from "./giftFoldCopy";

describe("GiftFold when a sheet chunk fails to load", () => {
  it("reloads the page instead of throwing to the error page", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    const user = userEvent.setup();
    render(
      <GiftFold
        readingSlug="birth-chart"
        copy={pick(GIFT_DEFAULTS, GIFT_FOLD_COPY_KEYS)}
        giftSheet={{
          reading: { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" },
          content: GIFT_DEFAULTS,
          endpoint: null,
        }}
        redeemSheet={{ readingSlug: "birth-chart", content: GIFT_DEFAULTS, endpoint: null }}
      />,
    );

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel }));
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("gift-fold")).toBeInTheDocument();
  });
});
