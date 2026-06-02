import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FORBIDDEN_SPECIFIERS,
  checkStory,
  findStoryFiles,
} from "./check-stories-import-graph.mts";

function makeTempProject(): { src: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "story-graph-"));
  const src = path.join(dir, "src");
  fs.mkdirSync(src, { recursive: true });
  return {
    src,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

function write(file: string, body: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

describe("FORBIDDEN_SPECIFIERS", () => {
  it("contains the four binding-reaching specifiers", () => {
    expect(FORBIDDEN_SPECIFIERS.has("@opennextjs/cloudflare")).toBe(true);
    expect(FORBIDDEN_SPECIFIERS.has("next/headers")).toBe(true);
    expect(FORBIDDEN_SPECIFIERS.has("next/cache")).toBe(true);
    expect(FORBIDDEN_SPECIFIERS.has("server-only")).toBe(true);
  });

  it("does not forbid path prefixes (transitive-binding-reach semantics)", () => {
    expect(FORBIDDEN_SPECIFIERS.has("@/lib/booking/constants")).toBe(false);
    expect(FORBIDDEN_SPECIFIERS.has("@/lib/auth/users")).toBe(false);
    expect(FORBIDDEN_SPECIFIERS.has("@/lib/sanity/types")).toBe(false);
  });
});

describe("checkStory", () => {
  let tmp: ReturnType<typeof makeTempProject>;

  beforeEach(() => {
    tmp = makeTempProject();
  });

  afterEach(() => {
    tmp.cleanup();
  });

  it("passes when the story imports nothing forbidden, even transitively", () => {
    const storyFile = path.join(tmp.src, "components/Hero/Hero.stories.tsx");
    const hero = path.join(tmp.src, "components/Hero/Hero.tsx");
    write(hero, `export function Hero() { return null }\n`);
    write(
      storyFile,
      `import { Hero } from "./Hero";\nimport { thing } from "@/lib/booking/constants";\nexport default { component: Hero };\n`,
    );
    write(
      path.join(tmp.src, "lib/booking/constants.ts"),
      `export const thing = "ok";\n`,
    );

    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toEqual([]);
  });

  it("fails when the story directly imports a forbidden specifier", () => {
    const storyFile = path.join(tmp.src, "components/Bad/Bad.stories.tsx");
    write(
      storyFile,
      `import { getCloudflareContext } from "@opennextjs/cloudflare";\nexport default {};\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toHaveLength(1);
    expect(violations[0].forbiddenSpecifier).toBe("@opennextjs/cloudflare");
    expect(violations[0].chain).toEqual([storyFile]);
  });

  it("fails when a transitive import reaches a forbidden specifier", () => {
    const storyFile = path.join(tmp.src, "components/View/View.stories.tsx");
    const viewFile = path.join(tmp.src, "components/View/View.tsx");
    const helperFile = path.join(tmp.src, "lib/booking/notifyPaid.ts");

    write(helperFile, `import { x } from "@opennextjs/cloudflare";\nexport const y = x;\n`);
    write(
      viewFile,
      `import { y } from "@/lib/booking/notifyPaid";\nexport function View() { return null }\n`,
    );
    write(
      storyFile,
      `import { View } from "./View";\nexport default { component: View };\n`,
    );

    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toHaveLength(1);
    expect(violations[0].forbiddenSpecifier).toBe("@opennextjs/cloudflare");
    expect(violations[0].chain.map((p) => path.basename(p))).toEqual([
      "View.stories.tsx",
      "View.tsx",
      "notifyPaid.ts",
    ]);
  });

  it("ignores type-only imports of forbidden specifiers (erased at build)", () => {
    const storyFile = path.join(tmp.src, "components/View/View.stories.tsx");
    write(
      storyFile,
      `import type { CloudflareContext } from "@opennextjs/cloudflare";\nexport default {};\nexport type X = CloudflareContext;\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toEqual([]);
  });

  it("ignores imports whose every named binding is type-only", () => {
    const storyFile = path.join(tmp.src, "components/View/View.stories.tsx");
    write(
      storyFile,
      `import { type Foo, type Bar } from "next/headers";\nexport default {};\nexport type T = [Foo, Bar];\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toEqual([]);
  });

  it("flags re-export passthroughs (runtime side-effects can still happen)", () => {
    const storyFile = path.join(tmp.src, "components/Reexport/Reexport.stories.tsx");
    const barrel = path.join(tmp.src, "lib/barrel.ts");
    write(barrel, `export { headers } from "next/headers";\n`);
    write(
      storyFile,
      `import { headers } from "@/lib/barrel";\nexport default {};\nexport const h = headers;\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toHaveLength(1);
    expect(violations[0].forbiddenSpecifier).toBe("next/headers");
  });

  it("resolves directory imports via index.ts", () => {
    const storyFile = path.join(tmp.src, "components/View/View.stories.tsx");
    const helperDir = path.join(tmp.src, "lib/scheduling");
    write(path.join(helperDir, "index.ts"), `export * from "./impl";\n`);
    write(path.join(helperDir, "impl.ts"), `import "server-only";\nexport const x = 1;\n`);
    write(
      storyFile,
      `import { x } from "@/lib/scheduling";\nexport default {};\nexport const y = x;\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toHaveLength(1);
    expect(violations[0].forbiddenSpecifier).toBe("server-only");
  });

  it("walks dynamic imports with string-literal specifiers", () => {
    const storyFile = path.join(tmp.src, "components/Dyn/Dyn.stories.tsx");
    write(
      storyFile,
      `export default {};\nexport const load = () => import("next/cache");\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toHaveLength(1);
    expect(violations[0].forbiddenSpecifier).toBe("next/cache");
  });

  it("does not double-walk shared dependencies (memoised)", () => {
    const storyFile = path.join(tmp.src, "components/Share/Share.stories.tsx");
    const a = path.join(tmp.src, "lib/a.ts");
    const b = path.join(tmp.src, "lib/b.ts");
    const c = path.join(tmp.src, "lib/c.ts");
    write(c, `export const c = 1;\n`);
    write(a, `import { c } from "./c";\nexport const a = c;\n`);
    write(b, `import { c } from "./c";\nexport const b = c;\n`);
    write(
      storyFile,
      `import { a } from "@/lib/a";\nimport { b } from "@/lib/b";\nexport default {};\nexport const v = a + b;\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations).toEqual([]);
  });

  it("returns at most one violation per (story, forbidden) edge but not per chain", () => {
    const storyFile = path.join(tmp.src, "components/View/View.stories.tsx");
    write(
      storyFile,
      `import { x } from "@opennextjs/cloudflare";\nimport { y } from "next/headers";\nexport default {};\nexport const z = [x, y];\n`,
    );
    const violations = checkStory(storyFile, { src: tmp.src });
    expect(violations.map((v) => v.forbiddenSpecifier).sort()).toEqual([
      "@opennextjs/cloudflare",
      "next/headers",
    ]);
  });
});

describe("findStoryFiles", () => {
  let tmp: ReturnType<typeof makeTempProject>;

  beforeEach(() => {
    tmp = makeTempProject();
  });

  afterEach(() => {
    tmp.cleanup();
  });

  it("finds .stories.tsx files recursively and skips node_modules + dotdirs", () => {
    write(path.join(tmp.src, "components/A/A.stories.tsx"), "export default {}\n");
    write(path.join(tmp.src, "components/A/A.tsx"), "export const A = 1\n");
    write(path.join(tmp.src, "deep/nested/path/B.stories.tsx"), "export default {}\n");
    write(path.join(tmp.src, "deep/nested/path/B.tsx"), "export const B = 1\n");
    write(path.join(tmp.src, "node_modules/pkg/C.stories.tsx"), "export default {}\n");
    write(path.join(tmp.src, ".hidden/D.stories.tsx"), "export default {}\n");
    write(path.join(tmp.src, "components/A/A.test.tsx"), "export {}\n");

    const found = findStoryFiles(tmp.src).map((p) => path.relative(tmp.src, p));
    expect(found.sort()).toEqual([
      path.join("components/A/A.stories.tsx"),
      path.join("deep/nested/path/B.stories.tsx"),
    ]);
  });
});
