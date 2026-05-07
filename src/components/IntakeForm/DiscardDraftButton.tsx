type DiscardDraftButtonProps = {
  onConfirm: () => void;
};

export function DiscardDraftButton({ onConfirm }: DiscardDraftButtonProps) {
  function handleClick() {
    if (
      window.confirm(
        "Start fresh? This clears the saved answers on this device. The form will reset to the first page.",
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
      className="font-display italic text-xs text-j-text-muted hover:text-j-text underline-offset-2 hover:underline transition-colors cursor-pointer"
    >
      Start fresh
    </button>
  );
}
