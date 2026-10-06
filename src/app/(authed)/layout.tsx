import { SiteNavigation } from "@/components/Navigation/SiteNavigation";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNavigation />
      {children}
    </>
  );
}
