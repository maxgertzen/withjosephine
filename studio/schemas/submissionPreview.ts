const previewDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const previewPaidDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatIso(value: unknown, formatter: Intl.DateTimeFormat) {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return formatter.format(new Date(parsed));
}

export function prepareSubmissionPreview(selection: Record<string, unknown>) {
  const { email, status, createdAt, paidAt } = selection;
  const created = formatIso(createdAt, previewDateFormatter) ?? "no date";
  const emailLabel = typeof email === "string" && email !== "" ? email : "no email";
  const statusLabel = typeof status === "string" && status !== "" ? status : "pending";
  const paidLabel = formatIso(paidAt, previewPaidDateFormatter);
  return {
    title: `${created} — ${emailLabel}`,
    subtitle: paidLabel ? `${statusLabel} · paid ${paidLabel}` : statusLabel,
  };
}
