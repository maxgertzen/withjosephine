import { Gift } from "lucide-react";

import { IconDisc } from "@/components/IconDisc";

type GiftDiscProps = {
  className?: string;
};

export function GiftDisc({ className }: GiftDiscProps) {
  return <IconDisc icon={Gift} className={className} />;
}
