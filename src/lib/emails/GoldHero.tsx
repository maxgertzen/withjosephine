import { Section } from "@react-email/components";

export function GoldHero({ text, nowrap = false }: { text: string; nowrap?: boolean }) {
  const baseStyle = { padding: "0 16px", fontWeight: 500, fontSize: 28, lineHeight: 1.2 } as const;
  const style = nowrap ? { ...baseStyle, whiteSpace: "nowrap" as const } : baseStyle;
  return (
    <Section className="text-center" style={{ padding: "32px 48px 8px 48px" }}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tbody>
          <tr>
            <td width="18%">
              <div className="border-t border-gold" />
            </td>
            <td align="center" className="font-serif text-ink" style={style}>
              {text}
            </td>
            <td width="18%">
              <div className="border-t border-gold" />
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}
