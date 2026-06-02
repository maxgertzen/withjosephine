import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { isMainModule } from "./_lib/main.mts";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SRC = path.join(ROOT, "src");

export const FORBIDDEN_SPECIFIERS: ReadonlySet<string> = new Set([
  "@opennextjs/cloudflare",
  "next/headers",
  "next/cache",
  "server-only",
]);

const RESOLVE_EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs"] as const;

const STORY_FILENAME_RE = /\.stories\.tsx$/;

export interface Violation {
  storyFile: string;
  forbiddenSpecifier: string;
  chain: string[];
}

interface ImportEdge {
  specifier: string;
  typeOnly: boolean;
}

function extractImports(filePath: string): ImportEdge[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const edges: ImportEdge[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const clauseTypeOnly = !!node.importClause?.isTypeOnly;
        const named = node.importClause?.namedBindings;
        const allNamedTypeOnly =
          !!named &&
          ts.isNamedImports(named) &&
          named.elements.length > 0 &&
          named.elements.every((el) => el.isTypeOnly);
        edges.push({
          specifier: node.moduleSpecifier.text,
          typeOnly: clauseTypeOnly || allNamedTypeOnly,
        });
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        edges.push({
          specifier: node.moduleSpecifier.text,
          typeOnly: !!node.isTypeOnly,
        });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      edges.push({ specifier: node.arguments[0].text, typeOnly: false });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return edges;
}

function resolveLocal(specifier: string, fromFile: string, src = SRC): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = path.join(src, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates: string[] = [base];
  for (const ext of RESOLVE_EXTS) candidates.push(base + ext);
  for (const ext of RESOLVE_EXTS) candidates.push(path.join(base, "index" + ext));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

export interface CheckOptions {
  src?: string;
  forbidden?: ReadonlySet<string>;
  readImports?: (file: string) => ImportEdge[];
  resolve?: (specifier: string, fromFile: string) => string | null;
}

export function checkStory(storyFile: string, opts: CheckOptions = {}): Violation[] {
  const src = opts.src ?? SRC;
  const forbidden = opts.forbidden ?? FORBIDDEN_SPECIFIERS;
  const read = opts.readImports ?? extractImports;
  const resolve = opts.resolve ?? ((s, f) => resolveLocal(s, f, src));

  const violations: Violation[] = [];
  const visited = new Set<string>();
  const queue: { file: string; chain: string[] }[] = [{ file: storyFile, chain: [storyFile] }];

  while (queue.length > 0) {
    const { file, chain } = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    let edges: ImportEdge[];
    try {
      edges = read(file);
    } catch {
      continue;
    }

    for (const edge of edges) {
      if (edge.typeOnly) continue;
      if (forbidden.has(edge.specifier)) {
        violations.push({
          storyFile,
          forbiddenSpecifier: edge.specifier,
          chain,
        });
        continue;
      }
      const resolved = resolve(edge.specifier, file);
      if (resolved && !visited.has(resolved)) {
        queue.push({ file: resolved, chain: [...chain, resolved] });
      }
    }
  }
  return violations;
}

export function findStoryFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && STORY_FILENAME_RE.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function formatViolation(v: Violation): string {
  const rel = (p: string) => path.relative(ROOT, p);
  const lines: string[] = [];
  lines.push(`  ${rel(v.storyFile)}`);
  lines.push(`    forbidden import: ${v.forbiddenSpecifier}`);
  lines.push(`    chain (story → importer):`);
  for (const f of v.chain) lines.push(`      ${rel(f)}`);
  return lines.join("\n");
}

async function main(): Promise<void> {
  const stories = findStoryFiles(SRC);
  if (stories.length === 0) {
    console.error("No .stories.tsx files found under src/. Did the source tree move?");
    process.exit(1);
  }
  const allViolations: Violation[] = [];
  for (const story of stories) {
    allViolations.push(...checkStory(story));
  }

  if (allViolations.length === 0) {
    console.log(
      `✓ check-stories-import-graph: ${stories.length} stories clean. ` +
        `No transitive imports of ${[...FORBIDDEN_SPECIFIERS].join(", ")}.`,
    );
    return;
  }

  console.error(
    `✗ check-stories-import-graph: ${allViolations.length} violation(s) across ${stories.length} stories.\n`,
  );
  for (const v of allViolations) {
    console.error(formatViolation(v));
    console.error();
  }
  console.error(
    "These imports reach workerd-only bindings and will fail when the story renders.",
  );
  console.error(
    "Move the binding access into the container (page.tsx / derive*.ts), and pass the derived data as a prop.",
  );
  console.error("Convention: docs/CONTAINER_PRESENTATIONAL.md");
  process.exit(1);
}

if (isMainModule(import.meta.url)) {
  await main();
}
