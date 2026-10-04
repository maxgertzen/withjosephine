"use client";

import { useState } from "react";

import { GiftSheet, type GiftSheetProps } from "@/components/GiftSheet";

export function OpenGiftSheet(props: Omit<GiftSheetProps, "open" | "onClose">) {
  const [open, setOpen] = useState(true);
  return <GiftSheet {...props} open={open} onClose={() => setOpen(false)} />;
}
