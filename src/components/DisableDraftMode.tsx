/**
 * Floating "Exit preview" pill rendered by the root layout when draft mode is
 * active. Plain anchor (not the `Button` component) so the navigation is a
 * hard reload — the route clears the draft cookie via `redirect("/")` and we
 * want a full document swap, not a soft RSC nav. Styling uses the same
 * interactive/on-dark tokens as `Button` so the brand theme flows through.
 */
export function DisableDraftMode() {
  return (
    <a
      href="/api/draft/disable"
      className="fixed bottom-4 right-4 z-50 rounded-[50px] bg-j-bg-interactive px-4 py-2 text-[0.75rem] font-medium uppercase tracking-[0.12em] text-j-text-on-dark shadow-lg transition-colors hover:bg-j-midnight"
    >
      Exit preview
    </a>
  );
}
