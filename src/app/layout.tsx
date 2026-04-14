import { displayFont, bodyFont } from "@/lib/fonts.generated";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="bg-j-cream text-j-text font-body antialiased">
        {children}
      </body>
    </html>
  );
}
