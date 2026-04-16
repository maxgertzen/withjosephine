import Script from "next/script";

export function CloudflareAnalytics({ token }: { token: string }) {
  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token":"${token}"}`}
      strategy="afterInteractive"
    />
  );
}
