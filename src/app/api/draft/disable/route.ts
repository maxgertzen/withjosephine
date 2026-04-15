import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Exits draft mode and redirects back to the live homepage.
 * Linked from the `<VisualEditing />` overlay.
 */
export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect("/");
}
