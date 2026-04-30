import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FileUpload } from "./FileUpload";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function uploadFile(input: HTMLElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

function setup(
  value = "",
  options: { requestTurnstileToken?: () => Promise<string | null> } = {},
) {
  const onChange = vi.fn();
  const requestTurnstileToken =
    options.requestTurnstileToken ?? (() => Promise.resolve("test-turnstile-token"));
  render(
    <FileUpload
      id="photo"
      name="photo"
      label="Photo"
      value={value}
      onChange={onChange}
      requestTurnstileToken={requestTurnstileToken}
    />,
  );
  return { onChange };
}

describe("FileUpload", () => {
  it("rejects unsupported mime types client-side", async () => {
    const { onChange } = setup();
    uploadFile(screen.getByLabelText(/Photo/), makeFile("doc.pdf", "application/pdf", 1024));
    expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG, PNG, or WebP/);
    expect(onChange).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects files over 8MB client-side", async () => {
    const { onChange } = setup();
    uploadFile(
      screen.getByLabelText(/Photo/),
      makeFile("big.jpg", "image/jpeg", 9 * 1024 * 1024),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/larger than 8MB/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("requests signed URL and PUTs file, then emits the R2 key", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uploadUrl: "https://r2.example/put", key: "submissions/x/photo" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { onChange } = setup();
    uploadFile(screen.getByLabelText(/Photo/), makeFile("moon.jpg", "image/jpeg", 1024));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("submissions/x/photo"));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/booking/upload-url",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://r2.example/put",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("shows error when signed URL request fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    const { onChange } = setup();
    uploadFile(screen.getByLabelText(/Photo/), makeFile("moon.jpg", "image/jpeg", 1024));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Upload failed/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the value when Remove is clicked after a successful upload", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("submissions/x/already-uploaded");
    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("shows a verification error and skips the upload when no Turnstile token is available", async () => {
    const { onChange } = setup("", {
      requestTurnstileToken: () => Promise.resolve(null),
    });
    uploadFile(screen.getByLabelText(/Photo/), makeFile("moon.jpg", "image/jpeg", 1024));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't verify the upload/i);
    expect(onChange).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
