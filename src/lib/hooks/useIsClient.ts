import { useFirstClientRead } from "./useFirstClientRead";

const alwaysTrue = () => true;

export function useIsClient(): boolean {
  return useFirstClientRead(alwaysTrue) === true;
}
