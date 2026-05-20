import type { Page } from "@playwright/test";

// Manual-execute Turnstile widgets defer iframe injection until .execute() —
// in headless Chromium that injection silently no-ops. Stub the JS API so the
// form's requestFreshTurnstileToken resolves. Server-side siteverify still
// runs against Cloudflare's always-pass test secret.
export async function stubTurnstile(
  page: Page,
  token = "XXXX.DUMMY.TOKEN.XXXX",
): Promise<void> {
  await page.addInitScript((dummyToken) => {
    type WidgetParams = {
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      execution?: "render" | "execute";
    };
    const widgets = new Map<string, { params: WidgetParams; el: Element }>();
    let counter = 0;

    const stub = {
      render(container: string | Element, params: WidgetParams): string {
        const id = `tstile-${++counter}`;
        const el =
          typeof container === "string"
            ? document.querySelector(container)
            : container;
        if (!el) return id;
        widgets.set(id, { params, el });
        let input = el.querySelector<HTMLInputElement>(
          'input[name="cf-turnstile-response"]',
        );
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "cf-turnstile-response";
          el.appendChild(input);
        }
        input.value = dummyToken;
        if (params.execution !== "execute") {
          queueMicrotask(() => params.callback?.(dummyToken));
        }
        return id;
      },
      execute(target: string | Element): void {
        if (typeof target === "string") {
          const widget = widgets.get(target);
          widget?.params.callback?.(dummyToken);
          return;
        }
        for (const { params, el } of widgets.values()) {
          if (target === el || target?.contains?.(el)) {
            params.callback?.(dummyToken);
            return;
          }
        }
      },
      reset(): void {
        for (const { el } of widgets.values()) {
          const input = el.querySelector<HTMLInputElement>(
            'input[name="cf-turnstile-response"]',
          );
          if (input) input.value = dummyToken;
        }
      },
      remove(): void {
        widgets.clear();
      },
      getResponse(): string {
        return dummyToken;
      },
      isExpired(): boolean {
        return false;
      },
      ready(cb: () => void): void {
        cb();
      },
    };

    (window as unknown as { turnstile: typeof stub }).turnstile = stub;
  }, token);
}
