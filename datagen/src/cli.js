#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSpecs, trackDir } from "./specLoader.js";
import { loadCanonCompanies } from "./canon.js";
import { generateArtifact } from "./engine.js";
import { hasGenerator, implementedIds } from "./generators/index.js";
import { NotImplementedError } from "./errors.js";
import { buildManifest } from "./manifest.js";
import { evaluateAllowlist, loadAllowlist, validateOne } from "./validate.js";
import { pandocAvailable, buildWithPandoc, buildWithDocxFallback } from "./docx.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DEFAULT_ROOT = join(__dirname, "..", ".."); // datagen/src/.. .. -> repo root

async function main(argv) {
  const { command, positional, options } = parseArgs(argv);
  const root = options.root ? resolvePath(options.root) : REPO_DEFAULT_ROOT;

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case "generate":
      return runGenerate({ root, positional, options });
    case "build-docx":
      return runBuildDocx({ root, positional, options });
    case "validate":
      return runValidate({ root, positional, options });
    case "manifest":
      return runManifest({ root, options });
    case "help":
    case "--help":
    case "-h":
      printUsage();
      return;
    default:
      console.error(`Unknown command "${command}".`);
      printUsage();
      process.exitCode = 1;
  }
}

function printUsage() {
  console.log(`datagen -- spec-driven synthetic data / document CLI

Usage:
  datagen generate <ID>              Generate one deterministic spec's structured output
  datagen generate --all-structured  Generate every deterministic spec with a registered generator
  datagen build-docx <ID>            Convert artifacts/<ID>/*.md to DOCX
  datagen build-docx --all           Convert every artifacts/<ID>/*.md found on disk
  datagen validate <ID>              Validate one spec (keyword check or determinism diff)
  datagen validate --all             Validate every spec in the catalog
  datagen manifest                   Regenerate MANIFEST.json from disk + specs

Options:
  --root <path>    Repo root to operate under (default: this repo's root; tests point at tests/fixtures/TEST-01)
  --specs <path>   Override specs/artifact-specs.yaml path (default: <root>/specs/artifact-specs.yaml)
  --canon <path>   Override canon/companies.md path (default: <root>/canon/companies.md)
  --allowlist <path>  Override the permanent-WARN allowlist (default: <root>/datagen/validate-allowlist.yaml)
`);
}

function paths(root, options) {
  return {
    specsPath: options.specs ? resolvePath(options.specs) : join(root, "specs", "artifact-specs.yaml"),
    canonPath: options.canon ? resolvePath(options.canon) : join(root, "canon", "companies.md"),
    allowlistPath: options.allowlist
      ? resolvePath(options.allowlist)
      : join(root, "datagen", "validate-allowlist.yaml"),
  };
}

// ---------------------------------------------------------------- generate

function runGenerate({ root, positional, options }) {
  const { specsPath, canonPath } = paths(root, options);
  const specs = loadSpecs(specsPath);
  const canon = loadCanonCompanies(canonPath);

  const targets = options["all-structured"]
    ? specs.artifacts.filter((s) => s.generation === "deterministic")
    : resolveIdArgs(positional, specs);

  if (targets.length === 0) {
    console.error("generate: no target spec id given. Use `generate <ID>` or `generate --all-structured`.");
    process.exitCode = 1;
    return;
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const spec of targets) {
    if (spec.generation !== "deterministic") {
      console.log(`SKIP  ${spec.id}  (generation: ${spec.generation}, not deterministic -- use build-docx for drafted artifacts)`);
      skipped += 1;
      continue;
    }
    try {
      const files = generateArtifact(spec, canon);
      const track = trackDir(spec.id);
      const outDir = join(root, "datasets", track, spec.name);
      mkdirSync(outDir, { recursive: true });
      for (const file of files) {
        const outPath = join(outDir, file.path);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, file.content, "utf8");
      }
      console.log(`OK    ${spec.id}  -> datasets/${track}/${spec.name}/ (${files.length} file${files.length === 1 ? "" : "s"})`);
      ok += 1;
    } catch (err) {
      if (err instanceof NotImplementedError) {
        console.log(`STUB  ${spec.id}  ${err.message}`);
        skipped += 1;
      } else {
        console.error(`FAIL  ${spec.id}  ${err.message}`);
        failed += 1;
        if (!options["all-structured"]) throw err;
      }
    }
  }

  console.log(`\ngenerate summary: ${ok} generated, ${skipped} skipped/stubbed, ${failed} failed (out of ${targets.length}).`);
  if (failed > 0) process.exitCode = 1;
}

// --------------------------------------------------------------- build-docx

async function runBuildDocx({ root, positional, options }) {
  const { specsPath } = paths(root, options);
  const specs = loadSpecs(specsPath);

  const targets = options.all
    ? specs.artifacts.filter((s) => s.generation === "drafted-frozen" && existsSync(join(root, "artifacts", s.id)))
    : resolveIdArgs(positional, specs);

  if (targets.length === 0) {
    console.error("build-docx: no target spec id given, or --all found no artifacts/<ID>/ directories on disk.");
    process.exitCode = 1;
    return;
  }

  const referenceDocx = join(__dirname, "..", "assets", "reference.docx");
  const usePandoc = pandocAvailable();
  console.log(usePandoc ? "build-docx: using pandoc" : "build-docx: pandoc not found, using docx fallback");

  let ok = 0;
  let missing = 0;
  let failed = 0;

  for (const spec of targets) {
    const srcDir = join(root, "artifacts", spec.id);
    if (!existsSync(srcDir)) {
      console.log(`MISS  ${spec.id}  no artifacts/${spec.id}/ directory on disk`);
      missing += 1;
      continue;
    }
    const mdFiles = readdirSync(srcDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
    if (mdFiles.length === 0) {
      console.log(`MISS  ${spec.id}  artifacts/${spec.id}/ has no .md source files`);
      missing += 1;
      continue;
    }
    const buildDir = join(srcDir, "build");
    mkdirSync(buildDir, { recursive: true });
    for (const mdFile of mdFiles) {
      const mdPath = join(srcDir, mdFile);
      const outPath = join(buildDir, mdFile.replace(/\.md$/, ".docx"));
      try {
        if (usePandoc) {
          buildWithPandoc(mdPath, outPath, referenceDocx);
        } else {
          await buildWithDocxFallback(mdPath, outPath);
        }
        console.log(`OK    ${spec.id}  ${mdFile} -> artifacts/${spec.id}/build/${basename(outPath)}`);
        ok += 1;
      } catch (err) {
        console.error(`FAIL  ${spec.id}  ${mdFile}  ${err.message}`);
        failed += 1;
      }
    }
  }

  console.log(`\nbuild-docx summary: ${ok} built, ${missing} missing source, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

function basename(p) {
  return p.split("/").pop();
}

// Allowlist reasons are paragraphs, and a 700-character terminal line is not
// readable. Wrap on whitespace; never split a word.
function wrap(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- validate

function runValidate({ root, positional, options }) {
  const { specsPath, canonPath, allowlistPath } = paths(root, options);
  const specs = loadSpecs(specsPath);
  const canon = loadCanonCompanies(canonPath);
  const allowlist = loadAllowlist(allowlistPath);

  const targets = options.all ? specs.artifacts : resolveIdArgs(positional, specs);
  if (targets.length === 0) {
    console.error("validate: no target spec id given. Use `validate <ID>` or `validate --all`.");
    process.exitCode = 1;
    return;
  }

  let failCount = 0;
  let allowedCount = 0;
  const resultsById = new Map();
  for (const spec of targets) {
    const result = validateOne({ root, spec, canon, allowlist });
    resultsById.set(spec.id, result);
    if (result.kind === "drafted") {
      console.log(`${result.status.padEnd(5)} ${spec.id}  (drafted, ${result.results?.length ?? 0} planted_features checked)`);
      if (result.status !== "PASS" && result.reason) console.log(`      ${result.reason}`);
      for (const r of result.results ?? []) {
        if (r.status === "PASS") continue;
        if (r.status === "ALLOWED") {
          // Informational, not a warning: a known-unconfirmable feature with a
          // recorded reason. Still printed, so it stays visible rather than
          // disappearing into the allowlist file.
          allowedCount += 1;
          console.log(`      ALLOWED  "${r.feature}" -- missing: ${r.missing.join(", ")}`);
          for (const line of wrap(`reason: ${r.allowReason}`, 88)) console.log(`               ${line}`);
          continue;
        }
        // A feature with nothing left to check carries a reason and an empty
        // `missing` list; every other WARN names the tokens it could not find.
        // Printing "missing: (none)" for the former described a ratio that
        // was never computed.
        console.log(`      WARN  "${r.feature}" -- ${r.reason ?? `missing: ${r.missing.join(", ")}`}`);
      }
      if (result.status === "FAIL" || result.status === "MISSING") failCount += 1;
    } else {
      console.log(`${result.status.padEnd(5)} ${spec.id}  (structured, determinism check)`);
      if (result.reason) console.log(`      ${result.reason}`);
      for (const f of result.files ?? []) {
        if (f.status !== "MATCH") console.log(`      ${f.status}  ${f.path}`);
      }
      if (result.status === "FAIL") failCount += 1;
    }
  }

  const stale = evaluateAllowlist({ allowlist, specs: specs.artifacts, resultsById });
  for (const { entry, problem } of stale) {
    console.log(`FAIL  allowlist entry for ${entry.artifact}: ${problem}`);
    console.log(`      "${entry.feature}"`);
  }

  const staleNote = stale.length > 0
    ? `, ${stale.length} stale allowlist ${stale.length === 1 ? "entry" : "entries"}`
    : "";
  console.log(
    `\nvalidate summary: ${targets.length} checked, ${failCount} failed, ${allowedCount} allowlisted${staleNote}.`
  );
  if (failCount > 0 || stale.length > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------- manifest

function runManifest({ root, options }) {
  const { specsPath } = paths(root, options);
  const specs = loadSpecs(specsPath);
  const manifestPath = join(root, "MANIFEST.json");
  const existingManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

  const manifest = buildManifest({ root, specs, existingManifest });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n", "utf8");
  console.log(`Wrote ${manifestPath}: ${manifest.datasets.length} dataset(s), ${manifest.artifacts.length} drafted artifact(s).`);
}

// ------------------------------------------------------------------- utils

function resolveIdArgs(positional, specs) {
  const out = [];
  for (const id of positional) {
    const spec = specs.byId.get(id);
    if (!spec) throw new Error(`unknown spec id "${id}" (not present in the loaded spec catalog)`);
    out.push(spec);
  }
  return out;
}

function resolvePath(p) {
  return p.startsWith("/") ? p : join(process.cwd(), p);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, options };
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.message ?? err);
    if (process.env.DATAGEN_DEBUG) console.error(err.stack);
    process.exitCode = 1;
  });
}

export { main, hasGenerator, implementedIds };
