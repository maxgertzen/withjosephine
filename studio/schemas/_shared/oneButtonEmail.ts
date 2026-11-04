import { defineField, defineType } from "sanity";

import type { EmailOneButtonContent } from "../../../src/data/defaults";
import type { EmailTemplateKey } from "../../../src/lib/emails/slots";
import { tokenReferenceField } from "../../lib/tokenHelp";
import { slotValidation } from "../../lib/validateSlots";

export function oneButtonEmailSchema(args: {
  name: EmailTemplateKey;
  title: string;
  whenSent: string;
  defaults: EmailOneButtonContent;
}) {
  const { name, title, whenSent, defaults } = args;
  return defineType({
    name,
    title,
    type: "document",
    description: whenSent,
    fields: [
      tokenReferenceField(name),
      defineField({ name: "subject", title: "Subject", type: "string", placeholder: defaults.subject }),
      defineField({
        name: "preview",
        title: "Preview text",
        type: "string",
        description: "The short line people see under the subject in their inbox.",
        placeholder: defaults.preview,
      }),
      defineField({ name: "heroLine", title: "Big line at the top", type: "string", placeholder: defaults.heroLine }),
      defineField({ name: "buttonLabel", title: "Button words", type: "string", placeholder: defaults.buttonLabel }),
      defineField({
        name: "body",
        title: "Words above the button",
        type: "array",
        of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
        description: "Each paragraph you type becomes one paragraph in the email. Leave blank to use the words shown in the preview.",
        validation: slotValidation(name),
      }),
    ],
    preview: { prepare: () => ({ title, subtitle: whenSent }) },
  });
}
