import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadCities, resetCitiesCache, searchCities } from "./cities";

const SAMPLE = [
  { name: "London", country: "United Kingdom", geonameid: 2643743, population: 8908081 },
  { name: "Londrina", country: "Brazil", geonameid: 3458449, population: 506645 },
  { name: "Paris", country: "France", geonameid: 2988507, population: 2138551 },
  { name: "Tokyo", country: "Japan", geonameid: 1850147, population: 8336599 },
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  resetCitiesCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadCities", () => {
  it("fetches the cities JSON exactly once across multiple callers", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    await loadCities();
    await loadCities();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates the error and clears the cache on failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 500 }));
    await expect(loadCities()).rejects.toThrow();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    const data = await loadCities();
    expect(data).toEqual(SAMPLE);
  });
});

describe("searchCities", () => {
  it("returns an empty list for queries shorter than 2 chars", async () => {
    expect(await searchCities("L")).toEqual([]);
    expect(await searchCities(" ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns up to 8 matches sorted by population", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    const results = await searchCities("Lond");
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(8);
    expect(results[0].population).toBeGreaterThanOrEqual(
      results[results.length - 1].population,
    );
  });

  it("formats the display string as `<name>, <country>`", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    const results = await searchCities("Tokyo");
    expect(results[0].display).toBe("Tokyo, Japan");
  });

  it("includes geonameid on each match", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    const results = await searchCities("Paris");
    expect(results[0].geonameid).toBe(2988507);
  });
});
