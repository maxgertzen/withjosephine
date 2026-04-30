"use client";

import { useState } from "react";

import {
  ACCEPTED_PHOTO_MIME,
  ACCEPTED_PHOTO_MIME_SET,
  MAX_PHOTO_BYTES,
  UPLOAD_URL_API_ROUTE,
} from "@/lib/booking/constants";
import { errorClasses, labelClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

const ACCEPT_ATTR = ACCEPTED_PHOTO_MIME.join(",");

type UploadStatus = "idle" | "requesting" | "uploading" | "done" | "error";

type FileUploadProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (key: string) => void;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  uploadUrlEndpoint?: string;
  requestTurnstileToken?: () => Promise<string | null>;
};


type UploadUrlResponse = {
  uploadUrl: string;
  key: string;
};

async function requestSignedUrl(
  endpoint: string,
  payload: {
    filename: string;
    contentType: string;
    size: number;
    turnstileToken: string;
  },
): Promise<UploadUrlResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Upload URL request failed (${response.status})`);
  }
  const data = (await response.json()) as UploadUrlResponse;
  if (!data.uploadUrl || !data.key) {
    throw new Error("Upload URL response missing fields");
  }
  return data;
}

async function putToR2(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }
}

export function FileUpload({
  id,
  name,
  label,
  value,
  onChange,
  helpText,
  helperPosition = "after",
  clarificationNote,
  error,
  required,
  disabled,
  uploadUrlEndpoint = UPLOAD_URL_API_ROUTE,
  requestTurnstileToken,
}: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>(value ? "done" : "idle");
  const [filename, setFilename] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_PHOTO_MIME_SET.has(file.type)) {
      setLocalError("Only JPEG, PNG, or WebP images are accepted.");
      setStatus("error");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError("File is larger than 8MB.");
      setStatus("error");
      return;
    }

    setLocalError(null);
    setFilename(file.name);
    setStatus("requesting");

    try {
      const turnstileToken = await requestTurnstileToken?.();
      if (!turnstileToken) {
        setLocalError(
          "We couldn't verify the upload. Please refresh the page and try again, or contact us if the issue persists.",
        );
        setStatus("error");
        return;
      }
      const { uploadUrl, key } = await requestSignedUrl(uploadUrlEndpoint, {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        turnstileToken,
      });
      setStatus("uploading");
      await putToR2(uploadUrl, file);
      onChange(key);
      setStatus("done");
    } catch (uploadError) {
      console.error("[FileUpload]", uploadError);
      setLocalError("Upload failed. Please try again.");
      setStatus("error");
    }
  }

  function handleRemove() {
    setStatus("idle");
    setFilename("");
    setLocalError(null);
    onChange("");
  }

  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error || localError ? `${id}-error` : undefined;
  const displayedError = error ?? localError;
  const busy = status === "requesting" || status === "uploading";

  const helperEl = helpText ? (
    <p
      id={helpId}
      className={`font-body text-xs text-j-text-muted ${
        helperPosition === "before" ? "mt-1 mb-3" : "mt-2"
      }`}
    >
      {helpText}
    </p>
  ) : null;

  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {clarificationNote ? (
        <p className="font-display italic text-sm text-j-text-muted mt-1 mb-3">
          {clarificationNote}
        </p>
      ) : null}

      {helperPosition === "before" ? helperEl : null}

      {status === "done" ? (
        <div className="flex items-center justify-between gap-3 bg-white/50 border border-j-border-subtle rounded-lg px-4 py-3">
          <span className="font-body text-sm text-j-text truncate">
            {filename || "Photo uploaded"}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="font-body text-xs uppercase tracking-wide text-j-accent hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          id={id}
          name={name}
          type="file"
          accept={ACCEPT_ATTR}
          disabled={disabled || busy}
          required={required && !value}
          aria-invalid={displayedError ? true : undefined}
          aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full font-body text-sm text-j-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-j-bg-interactive file:text-j-cream"
        />
      )}

      {busy ? (
        <p className="font-body text-xs text-j-text-muted mt-2">
          {status === "requesting" ? "Preparing upload\u2026" : "Uploading\u2026"}
        </p>
      ) : null}

      {helperPosition === "after" ? helperEl : null}

      {displayedError ? (
        <p id={errorId} role="alert" className={`${errorClasses} mt-2`}>
          {displayedError}
        </p>
      ) : null}
    </div>
  );
}
