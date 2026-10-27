import { describe, expect, it } from "vitest";

import {
  LISTEN_FIXTURES,
  LISTEN_PREVIEW_STATES,
  SIGN_IN_LINK_PREVIEW_STATES,
  VERIFY_FIXTURES,
} from "./preview-fixtures-pages";

describe("Presentation preview states", () => {
  it("has a listen fixture for every listen link", () => {
    expect(Object.keys(LISTEN_FIXTURES)).toEqual(expect.arrayContaining(LISTEN_PREVIEW_STATES.map(({ state }) => state)));
  });

  it("has a sign-in link fixture for every sign-in link", () => {
    expect(Object.keys(VERIFY_FIXTURES)).toEqual(
      expect.arrayContaining(SIGN_IN_LINK_PREVIEW_STATES.map(({ state }) => state)),
    );
  });
});
