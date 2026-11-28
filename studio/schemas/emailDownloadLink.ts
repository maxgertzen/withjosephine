import { EMAIL_DOWNLOAD_LINK_DEFAULTS } from "../../src/data/defaults";
import { oneButtonEmailSchema } from "./_shared/oneButtonEmail";

export const emailDownloadLink = oneButtonEmailSchema({
  name: "emailDownloadLink",
  title: "Download Link → Links Page Visitor",
  whenSent:
    "Sent when someone types their email on a links page button that asks for an email first. The button in the email opens the file or website.",
  defaults: EMAIL_DOWNLOAD_LINK_DEFAULTS,
});
