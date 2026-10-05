import { checkDeliveryWakeRateLimit } from "@/lib/booking/deliveryWakeRateLimit";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { canRunStudioRequests, runStudioRequests } from "@/lib/booking/runStudioRequests";

const STUDIO_ORIGIN = "https://withjosephine.sanity.studio";
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9-]{1,100}$/;

function answer(status: number): Response {
  return new Response(null, {
    status,
    headers: { "Access-Control-Allow-Origin": STUDIO_ORIGIN, Vary: "Origin" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const submissionId = new URL(request.url).searchParams.get("submission") ?? "";
  if (!SUBMISSION_ID_PATTERN.test(submissionId)) return answer(400);
  if (!(await checkDeliveryWakeRateLimit(request.headers))) return answer(429);
  if (!canRunStudioRequests()) return answer(500);

  runMirror(
    runStudioRequests({ submissionId }).then(
      () => undefined,
      (error: unknown) => console.error("[delivery-wake] run failed", error),
    ),
  );
  return answer(202);
}
