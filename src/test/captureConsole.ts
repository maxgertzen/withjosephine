import { vi } from "vitest";

const CAPTURED_METHODS = ["log", "info", "warn", "error"] as const;

function describeArg(arg: unknown): string {
  return arg instanceof Error ? `${arg.message} ${arg.stack}` : String(arg);
}

export function captureConsole(): { text(): string } {
  const spies = CAPTURED_METHODS.map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
  return {
    text: () =>
      spies
        .flatMap((spy) => spy.mock.calls.flat())
        .map(describeArg)
        .join("\n"),
  };
}
