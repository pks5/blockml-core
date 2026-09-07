#!/usr/bin/env node
/**
 * Compare each .bml file's working-tree parse against its git predecessor.
 *
 * Asserts that the preferred-format rewrite did not drop semantic content:
 * type, name, baseType, is, documentation, summaries, properties, aggregations,
 * associations, capabilities, references, subBlocks, compositions, etc.
 *
 * Format-only noise is ignored (legacy <block> wrapper, xsi/schemaLocation,
 * authored <name>/<type> children, source spans, pretty-print whitespace).
 *
 * Usage:
 *   node scripts/verify-format-migration.mjs
 *   node scripts/verify-format-migration.mjs --rev HEAD
 *   node scripts/verify-format-migration.mjs --src blocks
 *   node scripts/verify-format-migration.mjs --json
 *   node scripts/verify-format-migration.mjs --help
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@blockml/parser";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FORMAT_KEYS = new Set([
  "wrapperForm",
  "authoredNameChild",
  "authoredTypeChild",
  "authoredCharacterDataForm",
  "authoredEmptyElementForm",
  "authoredInAggregationsSection",
  "authoredPlacement",
  "source",
  "typeSource",
  "baseTypeSource",
  "inputTypeSource",
  "outputTypeSource",
  "sourceLocation",
  "xmlTrivia",
  "memberSectionTrivia",
  "metadataTrivia",
]);

const FALSEY_OPTIONAL = new Set([
  "abstract",
  "final",
  "override",
  "readOnly",
  "snippet",
  "legacy",
  "default",
]);

function parseArgs(argv) {
  const opts = { rev: "HEAD", src: ROOT, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rev") {
      opts.rev = argv[++i];
    } else if (arg === "--src") {
      opts.src = resolve(ROOT, argv[++i]);
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function walkBml(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkBml(full, out);
    } else if (entry.name.endsWith(".bml")) {
      out.push(full);
    }
  }
}

function gitShow(rev, rel) {
  try {
    return execFileSync("git", ["show", `${rev}:${rel}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const message = err.stderr?.toString() ?? err.message;
    if (/exists on disk, but not in|does not exist|path .* does not exist/i.test(message)) {
      return null;
    }
    throw new Error(`git show ${rev}:${rel} failed: ${message.trim()}`);
  }
}

function leadingComments(text) {
  const chunks = [];
  const re = /<!--([\s\S]*?)-->/g;
  let index = 0;
  while (index < text.length) {
    const slice = text.slice(index);
    const ws = slice.match(/^\s*/)?.[0] ?? "";
    index += ws.length;
    if (!text.startsWith("<!--", index)) {
      break;
    }
    re.lastIndex = index;
    const match = re.exec(text);
    if (!match || match.index !== index) {
      break;
    }
    chunks.push(match[1]);
    index = match.index + match[0].length;
  }
  return chunks.map(normText).filter(Boolean);
}

function normText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function semanticValue(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const text = normText(value);
    return text === "" ? undefined : text;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value.map(semanticValue).filter((item) => item !== undefined);
    return items.length === 0 ? undefined : items;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORMAT_KEYS.has(key)) {
      continue;
    }
    const next = semanticValue(child);
    if (next === undefined) {
      continue;
    }
    if (FALSEY_OPTIONAL.has(key) && next === false) {
      continue;
    }
    out[key] = next;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

function parseSemantic(text, filePath) {
  const parsed = parse(text, { filePath, continueOnError: true });
  if (!parsed.document) {
    return {
      ok: false,
      errors: parsed.diagnostics.filter((d) => d.severity === "error"),
    };
  }
  return {
    ok: true,
    errors: parsed.diagnostics.filter((d) => d.severity === "error"),
    snapshot: {
      leadingComments: leadingComments(text),
      kind: parsed.document.kind,
      block: semanticValue(parsed.document.block),
    },
  };
}

function identityKey(value, fallbackIndex) {
  if (!isPlainObject(value)) {
    return `$${fallbackIndex}`;
  }
  if (value.kind && value.name) {
    return `${value.kind}:${value.namespace ?? ""}:${value.name}`;
  }
  if (value.name && value.type) {
    return `def:${value.type}`;
  }
  if (value.name) {
    return `name:${value.name}`;
  }
  if (value.typeFqn && value.term) {
    return `kw:${value.typeFqn}:${value.term}`;
  }
  if (value.typeFqn && value.name) {
    return `alias:${value.typeFqn}:${value.name}`;
  }
  if (value.namespace !== undefined && value.languageFqn && value.text) {
    return `prose:${value.namespace}:${value.languageFqn}`;
  }
  if (value.type || value.relationFqn || value.instance || value.file || value.url) {
    return `ref:${value.type ?? ""}:${value.relationFqn ?? ""}:${value.property ?? ""}:${value.aggregation ?? ""}:${value.association ?? ""}:${value.capability ?? ""}:${value.instance ?? ""}:${value.file ?? ""}:${value.url ?? ""}`;
  }
  if (value.kind === "blockInstance" && value.instance?.typeFqn) {
    return `inst:${value.instance.id ?? ""}:${value.instance.typeFqn}:${fallbackIndex}`;
  }
  if (value.aggregationName) {
    return `agg:${value.aggregationName}:${fallbackIndex}`;
  }
  if (value.version && value.text) {
    return `log:${value.version}`;
  }
  if (value.title) {
    return `ex:${value.title}`;
  }
  return `$${fallbackIndex}`;
}

function diffValues(before, after, path, diffs) {
  if (before === after) {
    return;
  }
  if (before === undefined) {
    diffs.push({ path, kind: "added", before: undefined, after });
    return;
  }
  if (after === undefined) {
    diffs.push({ path, kind: "removed", before, after: undefined });
    return;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    diffArrays(asArray(before), asArray(after), path, diffs);
    return;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      diffValues(before[key], after[key], path ? `${path}.${key}` : key, diffs);
    }
    return;
  }
  diffs.push({ path, kind: "changed", before, after });
}

function asArray(value) {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function diffArrays(before, after, path, diffs) {
  const named = before.every((item, i) => identityKey(item, i)[0] !== "$")
    && after.every((item, i) => identityKey(item, i)[0] !== "$");
  if (named) {
    const beforeMap = new Map();
    for (const [i, item] of before.entries()) {
      beforeMap.set(identityKey(item, i), item);
    }
    const afterMap = new Map();
    for (const [i, item] of after.entries()) {
      afterMap.set(identityKey(item, i), item);
    }
    const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    for (const key of [...keys].sort()) {
      diffValues(beforeMap.get(key), afterMap.get(key), `${path}[${key}]`, diffs);
    }
    return;
  }
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i++) {
    diffValues(before[i], after[i], `${path}[${i}]`, diffs);
  }
}

function compareFile(rel, beforeText, afterText) {
  const before = parseSemantic(beforeText, `${rel}#before`);
  const after = parseSemantic(afterText, `${rel}#after`);
  if (!before.ok || !after.ok) {
    return {
      rel,
      status: "parse-failed",
      beforeErrors: before.errors ?? [],
      afterErrors: after.errors ?? [],
      diffs: [],
    };
  }
  const diffs = [];
  diffValues(before.snapshot, after.snapshot, "", diffs);
  return {
    rel,
    status: diffs.length === 0 ? "ok" : "diff",
    diffs,
  };
}

function formatValue(value) {
  if (value === undefined) {
    return "∅";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/verify-format-migration.mjs [--rev git-rev] [--src dir] [--json]
Compare working-tree .bml files against their git predecessor (default HEAD).`);
    process.exit(0);
  }
  if (!statSync(opts.src).isDirectory()) {
    throw new Error(`--src is not a directory: ${opts.src}`);
  }

  const files = [];
  walkBml(opts.src, files);
  files.sort();
  if (files.length === 0) {
    console.error("No .bml files found.");
    process.exit(1);
  }

  const results = [];
  let missingInGit = 0;
  for (const file of files) {
    const rel = relative(ROOT, file).split("\\").join("/");
    const afterText = readFileSync(file, "utf8");
    const beforeText = gitShow(opts.rev, rel);
    if (beforeText === null) {
      missingInGit += 1;
      results.push({ rel, status: "no-predecessor", diffs: [] });
      continue;
    }
    results.push(compareFile(rel, beforeText, afterText));
  }

  const ok = results.filter((r) => r.status === "ok");
  const diffs = results.filter((r) => r.status === "diff");
  const failed = results.filter((r) => r.status === "parse-failed");
  const fresh = results.filter((r) => r.status === "no-predecessor");

  if (opts.json) {
    console.log(JSON.stringify({ rev: opts.rev, results, ok: ok.length, diffs: diffs.length, failed: failed.length, fresh: fresh.length }, null, 2));
  } else {
    for (const result of results) {
      if (result.status === "ok") {
        continue;
      }
      if (result.status === "no-predecessor") {
        console.log(`NEW  ${result.rel} — not in ${opts.rev}`);
        continue;
      }
      if (result.status === "parse-failed") {
        console.log(`FAIL ${result.rel}`);
        for (const err of [...result.beforeErrors, ...result.afterErrors]) {
          console.log(`  ${err.code} ${err.message}`);
        }
        continue;
      }
      console.log(`DIFF ${result.rel}`);
      for (const diff of result.diffs) {
        const label = diff.path || "(root)";
        if (diff.kind === "removed") {
          console.log(`  removed ${label}: ${formatValue(diff.before)}`);
        } else if (diff.kind === "added") {
          console.log(`  added ${label}: ${formatValue(diff.after)}`);
        } else {
          console.log(`  changed ${label}: ${formatValue(diff.before)} → ${formatValue(diff.after)}`);
        }
      }
    }
    console.log(
      `compared=${results.length} equal=${ok.length} semantic-diffs=${diffs.length} parse-failed=${failed.length} no-predecessor=${missingInGit} rev=${opts.rev}`,
    );
    if (diffs.length === 0 && failed.length === 0) {
      console.log("Safe: no semantic content removed or changed versus the git predecessor.");
    } else if (failed.length === 0) {
      console.log("Review the DIFF lines — those fields differ after ignoring format-only rewrite noise.");
    }
  }

  if (failed.length > 0 || diffs.length > 0) {
    process.exit(1);
  }
}

main();
