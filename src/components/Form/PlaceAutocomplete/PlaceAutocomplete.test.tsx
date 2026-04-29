import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetCitiesCache } from "@/lib/places/cities";

import { PlaceAutocomplete } from "./PlaceAutocomplete";

const SAMPLE = [
  { name: "London", country: "United Kingdom", geonameid: 2643743, population: 8908081 },
  { name: "Londrina", country: "Brazil", geonameid: 3458449, population: 506645 },
  { name: "Paris", country: "France", geonameid: 2988507, population: 2138551 },
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify(SAMPLE), { status: 200 }));
  resetCitiesCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type HostProps = {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  onGeonameIdChange?: (id: number | null) => void;
};

function Host({ initialValue = "", onValueChange, onGeonameIdChange }: HostProps) {
  const [value, setValue] = useState(initialValue);
  return (
    <PlaceAutocomplete
      id="place"
      name="place"
      label="Place of birth"
      value={value}
      onChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      onGeonameIdChange={onGeonameIdChange}
    />
  );
}

describe("PlaceAutocomplete", () => {
  it("does not fetch the cities JSON until the user types", async () => {
    render(<Host />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders matches inside a listbox after the user types", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText(/Place of birth/);
    await user.click(input);
    await user.type(input, "London");

    await waitFor(
      () => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(
      screen.getByRole("option", { name: /London, United Kingdom/ }),
    ).toBeInTheDocument();
  });

  it("commits the highlighted match on Enter and emits the geonameid", async () => {
    const user = userEvent.setup();
    const onGeonameIdChange = vi.fn();
    const onValueChange = vi.fn();
    render(<Host onValueChange={onValueChange} onGeonameIdChange={onGeonameIdChange} />);

    const input = screen.getByLabelText(/Place of birth/);
    await user.click(input);
    await user.type(input, "London");

    await waitFor(
      () => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith("London, United Kingdom");
    });
    expect(onGeonameIdChange).toHaveBeenLastCalledWith(2643743);
  });

  it("renders the empty-result hint when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText(/Place of birth/);
    await user.click(input);
    await user.type(input, "zzzzzz");

    await waitFor(
      () => {
        expect(screen.getByText(/Can.t find your town/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("clears the geonameid when the user resumes typing after a match", async () => {
    const user = userEvent.setup();
    const onGeonameIdChange = vi.fn();
    render(
      <Host initialValue="London, United Kingdom" onGeonameIdChange={onGeonameIdChange} />,
    );

    const input = screen.getByLabelText(/Place of birth/);
    await user.click(input);
    await user.type(input, "x");

    expect(onGeonameIdChange).toHaveBeenCalledWith(null);
  });

  it("declares ARIA combobox attributes for screen readers", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText(/Place of birth/);
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.click(input);
    await user.type(input, "London");
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-expanded", "true");
    });
  });
});
