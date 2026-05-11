import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.test.{ts,tsx}", "studio/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"],
    // Module-init env reads (e.g. R2_PUBLIC_ORIGIN in src/lib/constants.ts)
    // happen before vitest.setup.ts runs, so per-test stubs can't help.
    // These values are the source of truth for the test runtime — anything
    // a test wants to vary must use vi.stubEnv().
    env: {
      NEXT_PUBLIC_R2_PUBLIC_HOST: "images.withjosephine.com",
      NEXT_PUBLIC_SANITY_PROJECT_ID: "test-project",
      NEXT_PUBLIC_SANITY_DATASET: "test-dataset",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` is a Next.js-runtime guard that throws on import
      // in any non-server context. Vitest's jsdom environment trips that
      // guard, so route the import to a no-op stub for tests. Production
      // bundling honors the real module via Next's build pipeline.
      "server-only": path.resolve(__dirname, "src/test/server-only.stub.ts"),
    },
  },
});
