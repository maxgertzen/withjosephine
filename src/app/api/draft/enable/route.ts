import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { sanityClient } from "@/lib/sanity/client";

/**
 * Draft-mode entry point wired up by Sanity's Presentation tool.
 *
 * `defineEnableDraftMode` validates the incoming `?sanity-preview-secret`
 * against Sanity's API (using our read token), then sets the Next.js draft
 * cookie with `SameSite=None; Secure` so the cross-origin Studio iframe
 * (hosted at sanity.io / *.sanity.studio) can carry it on subsequent
 * requests. This is what lets `<VisualEditing />` actually mount.
 */
export const { GET } = defineEnableDraftMode({
  client: sanityClient.withConfig({ token: process.env.SANITY_READ_TOKEN }),
});
