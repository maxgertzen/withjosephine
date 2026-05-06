import { NextResponse } from "next/server";

import { generateAnonymousDistinctId, serverTrack } from "@/lib/analytics/server";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { parseDisplayToCents } from "@/lib/pricing";
import { fetchReadings } from "@/lib/sanity/fetch";

type DriftSummary = {
  checked: number;
  drift_count: number;
};

async function runCron(): Promise<DriftSummary> {
  const readings = await fetchReadings();
  const distinctId = generateAnonymousDistinctId();
  let driftCount = 0;

  for (const reading of readings) {
    const parsed = parseDisplayToCents(reading.priceDisplay ?? "");
    if (parsed === reading.price) continue;

    driftCount += 1;
    void serverTrack("pricing_drift_detected", {
      distinct_id: distinctId,
      reading_slug: reading.slug,
      price_cents: reading.price,
      price_display: reading.priceDisplay ?? "",
      parsed_display_cents: parsed,
    });
  }

  return { checked: readings.length, drift_count: driftCount };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runCron();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
