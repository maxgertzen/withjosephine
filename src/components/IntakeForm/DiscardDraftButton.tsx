type DiscardDraftButtonProps = {
  onConfirm: () => void;
};

export function DiscardDraftButton({ onConfirm }: DiscardDraftButtonProps) {
  function handleClick() {
    if (
      window.confirm(
        "Clear the form? This removes the saved answers on this device and resets to the first page.",
      )
    ) {
      onConfirm();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="discard-draft-button"
      className="font-display italic text-sm text-j-text-muted hover:text-j-text underline-offset-2 hover:underline transition-colors cursor-pointer"
    >
      Clear form
    </button>
  );
}
