import Image from "next/image";

const FRAME_SIZE_CLASS = { 40: "size-10", 56: "size-14" } as const;
const IMAGE_NUDGE_CLASS = { 40: "translate-y-[1.5px]", 56: "" } as const;

export function PortraitAvatar({
  src,
  size,
}: {
  src: string;
  size: keyof typeof FRAME_SIZE_CLASS;
}) {
  return (
    <span
      className={`${FRAME_SIZE_CLASS[size]} shrink-0 overflow-hidden rounded-full border border-j-border-gold bg-j-warm`}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`block size-full max-w-none object-cover object-[50%_22%] scale-[1.7] origin-[50%_30%] ${IMAGE_NUDGE_CLASS[size]}`}
      />
    </span>
  );
}
