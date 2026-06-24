# Perf: Restore Static Rendering Migration Plan

**Status:** PLAN — awaiting Max review. No code written yet.
**Date:** 2026-06-21
**Owner-review gate:** every Stage below ends with a real-browser checklist only Max can run (EU-geo consent + Sanity Presentation overlay cannot be verified in CI/headless).

---

## 1. Problem

Every visitor-facing page renders **dynamically on every request** on Cloudflare Workers, running uncached Sanity GROQ each time → **~1–2s on every link click** (Max, site-wide).

**Evidence:**
- `.next/prerender-manifest.json` prerenders only `/_global-error` + `/robots.txt`; `dynamicRoutes: {}`. Zero content pages are static.
- Build route table marks **all** routes `ƒ` (dynamic), including `/terms`, `/` and `/book/[readingId]` (the latter even declares `generateStaticParams`).

**Root cause (two layers):**
1. `src/app/layout.tsx:22-23` calls `await draftMode()` + `await headers()` (for `CONSENT_HEADER`) **unconditionally in the root layout** → opts the whole route tree dynamic.
2. `src/lib/sanity/live.ts` — `sanityFetch` (from `defineLive`) **calls `draftMode()` internally** to switch perspective. So **any** page that fetches Sanity content is dynamic regardless of the layout. Removing the layout call alone does NOT make pages static.

This is why a client-side or cookie hack can't fix it, and why the real fix is a rendering-model change.

---

## 2. Decision (from the evidence-cited Council, 2026-06-21)

| Approach | Verdict | Why |
|---|---|---|
| **B — client-cookie refactor** | ❌ Rejected (unanimous) | Sanity **stega** (click-to-edit encoding) is applied **server-side at fetch time** keyed on the draft perspective. A static page + client cookie can't inject stega into already-emitted HTML → Presentation overlay has nothing to bind → **breaks live preview** (binding constraint). Also doesn't work: `sanityFetch` still reads `draftMode()` internally. |
| **C — R2 incremental cache only** | ❌ Skipped | R2 incremental cache stores ISR/SSG snapshots; it is **never consulted for dynamic SSR routes**. With every route dynamic, it caches nothing relevant — "a latency mask over an unfixed root cause." |
| **A — `cacheComponents` (Next 16 PPR), staged** | ✅ Chosen | The framework's purpose-built fix: prerenders a static shell, streams dynamic islands. `draftMode()` is **allowed inside `use cache`** (Next bypasses the cache when draft is on) → published pages cache as static, preview requests go dynamic **with stega intact**. Static shell serves from **Workers Static Assets without invoking the Worker** (infra expert, corrected with citation; the OpenNext "cache interception doesn't work with PPR" caveat is narrow — it only affects the ISR cold-start bypass, set `enableCacheInterception: false`). |

**Residual uncertainty to retire early:** whether OpenNext/CF has fully wired PPR's shell-then-stream *resume* today. Worst case A degrades to "static shell + dynamic tail" — still far better than 0 prerendered pages. → De-risk with a one-page spike on staging (Stage 1.5).

**Sources:** Next `cacheComponents` doc (v16.2.9); Sanity agent-toolkit `nextjs.md`; Sanity `nextjs-16-sanitylive-status`; OpenNext Cloudflare caching docs.

---

## 3. Current relevant state

- `next` 16.2.6 · `next-sanity` **^12.4.5** (Sanity flags this as **not recommended on Next 16**; advises v13) · `@sanity/client` ^7.22.0
- `next.config.ts`: `experimental: { taint: true }`, `images.unoptimized`, empty `outputFileTracingExcludes` (⚠️ landmine — any non-empty value duplicates AsyncLocalStorage → InvariantError; do NOT touch)
- `open-next.config.ts`: `defineCloudflareConfig({})` — no incremental cache by design
- `src/app/layout.tsx`: unconditional `draftMode()` + `headers()`; conditionally renders `<SanityLive/>`/`<VisualEditing/>`/`<DisableDraftMode/>` only when `isDraftMode` (already correct per Sanity's overage guidance)
- `src/lib/sanity/live.ts`: `defineLive({ client, serverToken })`; `sanityFetch` switches perspective on `draftMode()`
- `src/middleware.ts:155`: sets `CONSENT_HEADER` (`x-josephine-consent-required`) when EU geo
- `src/app/api/draft/enable|disable/route.ts`: `defineEnableDraftMode` (Node runtime), cross-origin draft cookie `SameSite=None; Secure`

---

## 4. Staged plan

### Stage 0 — Baseline (no code)
- Capture current staging nav timing (TTFB on `/`, `/terms`, `/book/soul-blueprint`) and confirm `prerender-manifest.json` = 0 content pages. This is the before-number to prove the win.

### Stage 1 — `next-sanity` v13 upgrade (isolated PR, no behavior change)
**Why first:** v13 is the Next-16-supported line; it's the riskiest surface for the binding preview constraint, so isolate it.
- **Files:** `package.json`, `pnpm-lock.yaml` (⚠️ restore the security `overrides` after install — local pnpm 11.6.0 drops them); review API compatibility in `src/lib/sanity/live.ts` (`defineLive`, `SanityLive`), `src/lib/sanity/client.ts` (`stega.studioUrl`), `src/app/api/draft/enable|disable/route.ts` (`defineEnableDraftMode`), `src/lib/sanity/fetch.ts`.
- **Risk:** v12→v13 API changes (signatures of `defineLive`/`sanityFetch`/`defineEnableDraftMode`); the hand-typed `sanityFetch` wrapper in `live.ts` may need adjustment.
- **Gates:** typecheck + lint + test + build green; deploy staging.
- **🔴 Max real-browser verify (staging):** open Studio Presentation → a known page draws **click-to-edit handles** (stega working); edit a field → **live refresh** updates without manual reload. If broken → STOP; v13 is the issue, roll back the bump.
- **Rollback:** revert the two files.

### Stage 1.5 — PPR-on-CF spike (throwaway, de-risks the bet)
- On a branch, enable `cacheComponents` and convert **one** simple page (e.g. `/terms`) to static; deploy to staging; confirm (a) it appears in `prerender-manifest.json`, (b) it serves fast (asset path, no Worker), (c) Presentation still works on it. If the resume path is broken on OpenNext/CF, we learn it here for ~1 page, not the whole app.

### Stage 2 — Enable `cacheComponents` + lift dynamic reads out of the static path (the main PR)
- **`next.config.ts`:** add `cacheComponents: true`. ⚠️ Verify interaction with `experimental.taint` (taint may need to stay; confirm they coexist or migrate). Note: `cacheComponents` activates `ppr` + `use cache` + `dynamicIO` app-wide simultaneously.
- **`open-next.config.ts`:** set `enableCacheInterception: false` (per OpenNext PPR guidance) and disable auto cache purge if enabled.
- **Data layer (`src/lib/sanity/*`):** wrap published reads in `use cache` so `sanityFetch`'s internal `draftMode()` is cached-when-published / bypassed-when-draft. Apply `cacheTag`/`cacheLife` for revalidation. Keep `<SanityLive/>` for draft live updates.
- **`src/app/layout.tsx`:** remove the unconditional `draftMode()`/`headers()` reads from the shell. Move:
  - **Draft chrome** (`SanityLive`/`VisualEditing`/`DisableDraftMode`) into a dedicated component that reads `draftMode()` inside its own boundary (dynamic island; shell stays static).
  - **Consent** (`headers()` → `CONSENT_HEADER`) into a `Suspense`-wrapped dynamic island (the consent banner) so the shell prerenders; the banner streams in. Confirm `AnalyticsBootstrap` still gates analytics on consent.
- **`generateStaticParams`** (`src/app/book/[readingId]/page.tsx` + any others): fetch with `perspective: 'published'`, `stega: false`.
- **App-wide audit:** with `cacheComponents` on, every uncached `headers()`/`cookies()`/`draftMode()` **outside** a Suspense/`use cache` boundary becomes a **build error**. Audit + fix: the FAQ `nonce` (CSP, likely from `headers()`), authed routes (`/my-readings`, `/listen`, gift — these legitimately stay dynamic; that's fine), API routes (unaffected).
- **Risk:** highest blast radius of the arc; many build errors to resolve; CSP nonce handling; `3 MiB` worker cap; must NOT touch `outputFileTracingExcludes`.
- **Gates:** typecheck/lint/test/build; **`prerender-manifest.json` now lists content pages** (the proof); deploy staging.
- **🔴 Max real-browser verify (pre-merge, staging):**
  1. **EU consent banner** fires from a real EU exit (VPN) — GDPR legal gate.
  2. **Studio Presentation overlay** still live + edit handles + live refresh.
  3. **Nav speed** — every link click is fast (compare to Stage 0 baseline).
  4. Authed pages (`/my-readings`, `/listen/<id>`, gift flow) still render correctly.
- **Rollback:** `cacheComponents: false` + revert layout split.

### Stage 3 — Account menu, redone for the static world (separate PR)
Once pages are static, per-user header UI **must** be client-resolved (a static page can't know the user). This re-does the parked account-menu work correctly:
- Client-resolve via an instant **hint** (non-HttpOnly cookie set at sign-in / cleared at sign-out) so the icon/"Sign in" renders at first paint — no blink, no `/api/auth/me` round-trip on every page.
- **z-index fix:** `UserMenu` popover `z-50` → above the nav's `z-[100]` (e.g. `z-[110]`).
- (The server-resolve approach is explicitly NOT used here — it would re-break static rendering.)

---

## 5. Verification matrix (owner gates)

| Stage | CI-verifiable | 🔴 Max real-browser (staging) |
|---|---|---|
| 1 (v13) | typecheck/build/test | Presentation overlay handles + live refresh |
| 1.5 (spike) | prerender-manifest shows the page | page fast + preview OK on it |
| 2 (cacheComponents) | manifest lists content pages | EU consent · Presentation overlay · nav speed · authed pages |
| 3 (account menu) | unit tests | no blink · menu above nav · sign-in/out |

---

## 6. Open questions for Max
1. **EU verification:** can you test from an EU exit (VPN) to confirm the consent banner? If not, we need another way to validate the GDPR gate before merge.
2. **Scope of Stage 2:** convert *all* public pages to static, or start with the highest-traffic (`/`, `/book/[readingId]`) and leave the long tail for a follow-up?
3. **Sequencing vs the held #291:** this arc is independent of the v1.11.0 prod merge. Land it on its own release line, or after #291 ships?
4. **next-sanity v13 breaking changes:** if v13 changes the `defineLive`/`sanityFetch` API materially, accept a larger Stage 1, or pin and revisit?

---

## 7. What this plan deliberately does NOT do
- Does not touch `outputFileTracingExcludes` (documented AsyncLocalStorage landmine).
- Does not ship approach B (breaks stega/preview) or rely on C alone (caches nothing dynamic).
- Does not server-resolve the account menu (would re-break static rendering).
