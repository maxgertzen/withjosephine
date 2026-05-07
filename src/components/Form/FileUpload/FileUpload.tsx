"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  ACCEPTED_PHOTO_MIME,
  ACCEPTED_PHOTO_MIME_SET,
  MAX_PHOTO_BYTES,
  PHOTO_PUBLIC_URL_BASE,
  UPLOAD_URL_API_ROUTE,
} from "@/lib/booking/constants";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Local preview URL for the picked File. Computed in render via useMemo so
  // we don't cascade a setState inside an effect; cleanup runs in a separate
  // effect that revokes the previous URL whenever the file changes.
  const objectUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Preview source priority:
  //   1. fresh file from this session (object URL)
  //   2. existing R2 key (e.g. resumed from a saved draft) → public CDN URL
  const previewSrc = objectUrl ?? (value ? `${PHOTO_PUBLIC_URL_BASE}/${value}` : null);

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
    setSelectedFile(file);
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
    setSelectedFile(null);
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
        <div
          className="flex items-center justify-between gap-3 bg-white/50 border border-j-border-subtle rounded-lg px-4 py-3"
          // Clarity replays a captured DOM snapshot from the visitor's browser
          // cache — including any `<img src="blob:...">` thumbnail. Mask the
          // preview container so the photo isn't exposed in replays.
          {...CLARITY_MASK_PROPS}
        >
          <div className="flex items-center gap-3 min-w-0">
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded object-cover border border-j-border-subtle flex-none"
                unoptimized
              />
            ) : null}
            <span className="font-body text-sm text-j-text block min-w-0 flex-1 truncate">
              {filename || "Photo uploaded"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="font-body text-xs uppercase tracking-wide text-j-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-none"
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
          className="block w-full font-body text-sm text-j-text cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-j-bg-interactive file:text-j-cream file:cursor-pointer disabled:cursor-not-allowed disabled:file:cursor-not-allowed"
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
