import { Fragment, type ReactNode } from "react";

const SLOT_SPLIT = /(\{[a-zA-Z]+\})/g;
const SLOT_MATCH = /^\{([a-zA-Z]+)\}$/;

export function renderWithSlots(
  template: string,
  slots: Record<string, ReactNode>,
): ReactNode {
  return template.split(SLOT_SPLIT).map((part, index) => {
    const match = SLOT_MATCH.exec(part);
    if (match && slots[match[1]] !== undefined) {
      return <Fragment key={index}>{slots[match[1]]}</Fragment>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
