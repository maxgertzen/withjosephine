"use client";

import { type ComponentType, useState } from "react";

type SheetVisibility = { open: boolean; onClose: () => void };

type OpenSheetPreviewProps<SheetProps extends SheetVisibility> = {
  sheet: ComponentType<SheetProps>;
  props: Omit<SheetProps, keyof SheetVisibility>;
};

export function OpenSheetPreview<SheetProps extends SheetVisibility>({
  sheet: Sheet,
  props,
}: OpenSheetPreviewProps<SheetProps>) {
  const [open, setOpen] = useState(true);
  const sheetProps = { ...props, open, onClose: () => setOpen(false) } as SheetProps;
  return <Sheet {...sheetProps} />;
}
