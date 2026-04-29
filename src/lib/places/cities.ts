export type CityRecord = {
  name: string;
  country: string;
  geonameid: number;
  population: number;
};

export type CityMatch = CityRecord & { display: string };

const CITIES_JSON_URL = "/data/cities.json";
const MAX_RESULTS = 8;

let citiesPromise: Promise<CityRecord[]> | null = null;
let fuseInstance: import("fuse.js").default<CityRecord> | null = null;

export function resetCitiesCache() {
  citiesPromise = null;
  fuseInstance = null;
}

export async function loadCities(): Promise<CityRecord[]> {
  if (!citiesPromise) {
    citiesPromise = fetch(CITIES_JSON_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Cities load failed (${response.status})`);
        return response.json() as Promise<CityRecord[]>;
      })
      .catch((cause) => {
        citiesPromise = null;
        throw cause;
      });
  }
  return citiesPromise;
}

export async function searchCities(query: string): Promise<CityMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cities = await loadCities();
  if (!fuseInstance) {
    const Fuse = (await import("fuse.js")).default;
    fuseInstance = new Fuse(cities, {
      keys: ["name", "country"],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: false,
    });
  }

  const results = fuseInstance.search(trimmed, { limit: MAX_RESULTS * 4 });
  return results
    .map((result) => result.item)
    .sort((a, b) => b.population - a.population)
    .slice(0, MAX_RESULTS)
    .map((city) => ({
      ...city,
      display: `${city.name}, ${city.country}`,
    }));
}
