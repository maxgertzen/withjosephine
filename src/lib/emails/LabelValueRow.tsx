import { Text } from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Bold label followed by a value, both inline in a `<Text>` block. Used by
 * the Josephine-facing notification emails (booking summary + overdue
 * alert) to keep the visual rhythm consistent across rows.
 */
export type LabelValueRowProps = {
  label: string;
  children: ReactNode;
};

export function LabelValueRow({ label, children }: LabelValueRowProps) {
  return (
    <Text>
      <strong>{label}:</strong> {children}
    </Text>
  );
}
