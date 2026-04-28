import { NextResponse } from "next/server";

import { ACCEPTED_PHOTO_MIME_SET, MAX_PHOTO_BYTES } from "@/lib/booking/constants";
import { buildPhotoKey, getSignedUploadUrl } from "@/lib/r2";

type UploadUrlBody = {
  filename: unknown;
  contentType: unknown;
  size: unknown;
};

function isUploadUrlBody(body: unknown): body is UploadUrlBody {
  return typeof body === "object" && body !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isUploadUrlBody(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { filename, contentType, size } = body;

  if (typeof filename !== "string" || filename.length === 0) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (typeof contentType !== "string" || !ACCEPTED_PHOTO_MIME_SET.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, or WebP." },
      { status: 415 },
    );
  }
  if (typeof size !== "number" || size <= 0) {
    return NextResponse.json({ error: "size is required" }, { status: 400 });
  }
  if (size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "File is larger than 8MB." }, { status: 413 });
  }

  const tempId = crypto.randomUUID();
  const key = buildPhotoKey(tempId, filename);

  try {
    const uploadUrl = await getSignedUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("[upload-url] failed to sign", error);
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
}
