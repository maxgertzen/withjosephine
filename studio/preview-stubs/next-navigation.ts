type AppRouterStub = {
  refresh: () => void;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  prefetch: (href: string) => void;
};

const STUB_ROUTER: AppRouterStub = {
  refresh: () => {},
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

export function useRouter(): AppRouterStub {
  return STUB_ROUTER;
}

export function usePathname(): string {
  return "";
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, string | string[]> {
  return {};
}

export function redirect(): never {
  throw new Error("redirect() called inside Studio preview — not supported");
}

export function notFound(): never {
  throw new Error("notFound() called inside Studio preview — not supported");
}
