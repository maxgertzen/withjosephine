import { renderHook } from "@testing-library/react";
import type { DocumentActionProps } from "sanity";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sanity/ui", () => ({
  Box: () => null,
  Button: () => null,
  Stack: () => null,
  Text: () => null,
  TextInput: () => null,
  useToast: () => ({ push: vi.fn() }),
}));

vi.mock("@sanity/icons", () => ({ TrashIcon: () => null }));

import { deleteCustomerDataAction } from "./deleteCustomerData";

type SubmissionVersion = { _id: string; _type: string; status: string } | null;

const submissionDoc = (status: string) => ({ _id: "sub_1", _type: "submission", status });

const renderAction = (versions: { published: SubmissionVersion; draft: SubmissionVersion }) =>
  renderHook(() =>
    deleteCustomerDataAction({
      id: "sub_1",
      type: "submission",
      onComplete: vi.fn(),
      ...versions,
    } as unknown as DocumentActionProps),
  ).result.current;

describe("deleteCustomerDataAction", () => {
  it.each(["pending", "paid", "expired"])("is offered on a %s submission", (status) => {
    expect(renderAction({ published: submissionDoc(status), draft: null })).toMatchObject({
      label: "Delete customer data",
    });
  });

  it.each(["gift_waiting", "gift_cancelled"])("is hidden on a %s submission", (status) => {
    expect(renderAction({ published: submissionDoc(status), draft: null })).toBeNull();
  });

  it("reads the status from the draft when there is no published version", () => {
    expect(renderAction({ published: null, draft: submissionDoc("gift_waiting") })).toBeNull();
  });
});
