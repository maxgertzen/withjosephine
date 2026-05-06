import { Text } from "@react-email/components";
import type { ReactNode } from "react";

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
