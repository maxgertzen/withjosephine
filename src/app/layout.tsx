import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { displayFont, bodyFont } from "@/lib/fonts.generated";
import "@/styles/globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="bg-j-cream text-j-text font-body antialiased">
        {children}
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  );
}
