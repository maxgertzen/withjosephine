import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { displayFont, bodyFont } from "@/lib/fonts.generated";
import { SanityLive } from "@/lib/sanity/live";
import { DisableDraftMode } from "@/components/DisableDraftMode";
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
        {/*
          Always-on. Subscribes the server to Sanity's content-change stream
          and revalidates affected page caches — required for live preview to
          update without a manual refresh.
        */}
        <SanityLive />
        {isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  );
}
