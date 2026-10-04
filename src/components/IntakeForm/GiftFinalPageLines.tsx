import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { goldLinkClasses } from "@/lib/textStyles";

export type GiftFinalPageCopy = {
  displayCode: string;
  codeAppliedTemplate: string;
  removeCodeLabel: string;
  giftFoot: string;
  openedNotice: string | null;
};

type GiftFinalPageLinesProps = GiftFinalPageCopy & {
  onRemove: () => void;
};

function AppliedCodeText({ template, displayCode }: { template: string; displayCode: string }) {
  const [beforeCode, afterCode = ""] = template.split("{code}");
  return (
    <>
      {beforeCode}
      <b className="font-medium tracking-[0.1em] text-j-deep">{displayCode}</b>
      {afterCode}
    </>
  );
}

export function GiftFinalPageLines({
  displayCode,
  codeAppliedTemplate,
  removeCodeLabel,
  giftFoot,
  openedNotice,
  onRemove,
}: GiftFinalPageLinesProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-body text-sm text-j-text-muted" {...CLARITY_MASK_PROPS}>
        <AppliedCodeText template={codeAppliedTemplate} displayCode={displayCode} />
        {" · "}
        <button type="button" onClick={onRemove} className={goldLinkClasses}>
          {removeCodeLabel}
        </button>
      </p>
      <p className="m-0 text-center font-display text-sm italic text-j-text-muted">{giftFoot}</p>
      {openedNotice ? (
        <p className="m-0 font-body text-sm text-j-text-muted">{openedNotice}</p>
      ) : null}
    </div>
  );
}
