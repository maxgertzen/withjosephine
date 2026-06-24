// memoryQueue needs the WORKER_SELF_REFERENCE service binding (wrangler.jsonc).
// No tagCache by design: on-demand revalidateTag is the read-storm path that
// sank the reverted Stage 2; time-based ISR needs only incrementalCache + queue.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
