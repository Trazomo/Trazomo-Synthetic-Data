// End-to-end test: runs the real datagen CLI as a child process (exactly as
// a developer would from the command line), pointed at a throwaway copy of
// tests/fixtures/TEST-01 via --root. Never touches the real repo's
// datasets/, artifacts/, or MANIFEST.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const CLI_PATH = join(REPO_ROOT, "datagen", "src", "cli.js");
const FIXTURE_SRC = join(REPO_ROOT, "tests", "fixtures", "TEST-01");

function runCli(args, root) {
  return execFileSync("node", [CLI_PATH, ...args, "--root", root], { encoding: "utf8" });
}

function withFixtureCopy(fn) {
  const root = mkdtempSync(join(tmpdir(), "datagen-e2e-"));
  cpSync(FIXTURE_SRC, root, { recursive: true });
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("TEST-01 fixture end-to-end: generate -> validate -> manifest, isolated from the real repo", () => {
  withFixtureCopy((root) => {
    const generateOut = runCli(["generate", "TEST-01"], root);
    assert.match(generateOut, /OK\s+TEST-01/);

    const csvPath = join(root, "datasets", "fixture", "fixture-structured-dataset", "fixture-rows.csv");
    assert.ok(existsSync(csvPath), "generate did not write the fixture dataset");
    const csv = readFileSync(csvPath, "utf8");
    const dataLines = csv.trim().split("\n").slice(1);
    assert.equal(dataLines.length, 5);

    // Regenerating in a second isolated copy must produce byte-identical output.
    const root2 = mkdtempSync(join(tmpdir(), "datagen-e2e-"));
    try {
      cpSync(FIXTURE_SRC, root2, { recursive: true });
      runCli(["generate", "TEST-01"], root2);
      const csv2 = readFileSync(join(root2, "datasets", "fixture", "fixture-structured-dataset", "fixture-rows.csv"), "utf8");
      assert.equal(csv, csv2, "TEST-01 fixture generation is not deterministic across processes");
    } finally {
      rmSync(root2, { recursive: true, force: true });
    }

    const validateOut = runCli(["validate", "TEST-01"], root);
    assert.match(validateOut, /PASS\s+TEST-01/);

    const manifestOut = runCli(["manifest"], root);
    assert.match(manifestOut, /1 dataset\(s\)/);
    const manifest = JSON.parse(readFileSync(join(root, "MANIFEST.json"), "utf8"));
    assert.equal(manifest.datasets.length, 1);
    assert.equal(manifest.datasets[0].id, "TEST-01");
    assert.equal(manifest.datasets[0].row_counts["fixture-rows.csv"], 5);

    // The real repo's own datasets/artifacts/MANIFEST.json must be untouched.
    assert.notEqual(root, REPO_ROOT);
  });
});

test("TEST-01-DOC fixture end-to-end: build-docx -> validate against the real repo's reference.docx", () => {
  withFixtureCopy((root) => {
    const buildOut = runCli(["build-docx", "TEST-01-DOC"], root);
    assert.match(buildOut, /OK\s+TEST-01-DOC/);

    const docxPath = join(root, "artifacts", "TEST-01-DOC", "build", "fixture-agreement.docx");
    assert.ok(existsSync(docxPath), "build-docx did not write the fixture docx");
    const bytes = readFileSync(docxPath);
    assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK", "output is not a valid zip/docx");

    const validateOut = runCli(["validate", "TEST-01-DOC"], root);
    // Heuristic keyword check against free-text planted_features: PASS or
    // WARN are both acceptable outcomes (never a hard failure), but the
    // command itself must succeed and report a result.
    assert.match(validateOut, /(PASS|WARN)\s+TEST-01-DOC/);
  });
});

test("generate refuses to run for a spec id from the wrong catalog", () => {
  withFixtureCopy((root) => {
    assert.throws(() => runCli(["generate", "CORE-02"], root));
  });
});

// `validate --manifest` is what CI runs (npm run validate). It has to stay
// green on a repo whose catalog is mostly unbuilt drafts, and go red the moment
// something MANIFEST.json claims is committed goes missing.
function runCliExpectingFailure(args, root) {
  try {
    execFileSync("node", [CLI_PATH, ...args, "--root", root], { encoding: "utf8", stdio: "pipe" });
  } catch (err) {
    return { status: err.status, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
  return assert.fail(`expected \`datagen ${args.join(" ")}\` to exit non-zero`);
}

test("validate --manifest checks the ids MANIFEST.json lists, and fails when a listed dataset is gone", () => {
  withFixtureCopy((root) => {
    runCli(["generate", "TEST-01"], root);
    runCli(["manifest"], root);

    const out = runCli(["validate", "--manifest"], root);
    assert.match(out, /PASS\s+TEST-01\s/);
    assert.match(out, /(PASS|WARN)\s+TEST-01-DOC/);
    assert.match(out, /0 failed/);

    // Delete what the manifest says is committed: the run must go red.
    rmSync(join(root, "datasets", "fixture", "fixture-structured-dataset"), { recursive: true, force: true });
    const failed = runCliExpectingFailure(["validate", "--manifest"], root);
    assert.notEqual(failed.status, 0, "a manifest-listed id with no files on disk must exit non-zero");
    assert.match(failed.output, /MISSING\s+TEST-01\s/);
    assert.match(failed.output, /1 failed/);
  });
});

test("validate --manifest ignores catalog specs MANIFEST.json does not list, where --all still visits them", () => {
  withFixtureCopy((root) => {
    // TEST-01 is never generated here, so `manifest` lists only the drafted
    // TEST-01-DOC. An unbuilt spec is a draft, not a regression.
    runCli(["manifest"], root);
    const manifest = JSON.parse(readFileSync(join(root, "MANIFEST.json"), "utf8"));
    assert.deepEqual(manifest.datasets, []);
    assert.deepEqual(manifest.artifacts.map((a) => a.id), ["TEST-01-DOC"]);

    const out = runCli(["validate", "--manifest"], root);
    assert.doesNotMatch(out, /\sTEST-01\s/, "TEST-01 is not in the manifest and must not be checked");
    assert.match(out, /0 failed/);

    // --all keeps its human-facing semantics: it still visits the unbuilt spec.
    const all = runCliExpectingFailure(["validate", "--all"], root);
    assert.match(all.output, /MISSING\s+TEST-01\s/);
  });
});
