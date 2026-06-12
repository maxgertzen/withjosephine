"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import type { MyReadingsPageContent } from "@/data/defaults";

type ExportStatus = "idle" | "pending" | "success" | "error";

/**
 * GDPR Art. 20 self-service export. POSTs to the cookie-gated
 * /api/privacy/export endpoint, which emails a private 7-day download link.
 * The 429 (throttle) and 413 (too many submissions) responses carry a
 * human-readable `error` string that we surface verbatim.
 */
export function ExportDataButton({ copy }: { copy: MyReadingsPageContent }) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function requestExport() {
    if (status === "pending") return;
    setStatus("pending");
    setMessage(null);
    try {
      const res = await fetch("/api/privacy/export", { method: "POST" });
      if (res.status === 202) {
        setStatus("success");
        setMessage(copy.exportSuccessMessage ?? null);
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const serverMessage = typeof body?.error === "string" ? body.error : null;
      setStatus("error");
      setMessage(serverMessage ?? copy.exportErrorMessage ?? null);
    } catch {
      setStatus("error");
      setMessage(copy.exportErrorMessage ?? null);
    }
  }

  return (
    <div className="text-center">
      <h2 className="font-display italic text-2xl text-j-text-heading">{copy.exportHeading}</h2>
      <p className="font-body text-base text-j-text mt-3 max-w-md mx-auto leading-[1.6]">
        {copy.exportBody}
      </p>
      <div className="mt-6">
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={requestExport}
          disabled={status === "pending"}
          aria-busy={status === "pending"}
        >
          {status === "pending" ? copy.exportPendingLabel : copy.exportButtonLabel}
        </Button>
      </div>
      {message ? (
        <p
          role="status"
          data-testid="export-status"
          className={`font-body text-sm mt-4 max-w-md mx-auto ${
            status === "error" ? "text-j-rose" : "text-j-text-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
