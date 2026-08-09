import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWithDocxFallback, buildWithPandoc, pandocAvailable } from "../../datagen/src/docx.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const FIXTURE_MD = join(REPO_ROOT, "tests", "fixtures", "TEST-01", "artifacts", "TEST-01-DOC", "fixture-agreement.md");
const REFERENCE_DOCX = join(REPO_ROOT, "datagen", "assets", "reference.docx");

function extractText(docxPath) {
  // unzip -p prints one archive member to stdout; used here only to assert
  // on document.xml content, not as part of the CLI's own build path.
  return execFileSync("unzip", ["-p", docxPath, "word/document.xml"], { encoding: "utf8" });
}

test("buildWithDocxFallback produces a valid docx with headings and a preserved signature block", async () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-docx-fallback-"));
  try {
    const outPath = join(dir, "out.docx");
    await buildWithDocxFallback(FIXTURE_MD, outPath);
    const bytes = readFileSync(outPath);
    assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK");

    const xml = extractText(outPath);
    assert.match(xml, /Fixture Test Agreement/);
    assert.match(xml, /1\. Definitions/);
    // No injected numbering: the authored number is the only one.
    assert.doesNotMatch(xml, /1\s+1\. Definitions/);
    assert.match(xml, /Wrenna Ashgrove/);
    assert.match(xml, /Cassian Bellcrest/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reference.docx exists and is a valid docx template", () => {
  const bytes = readFileSync(REFERENCE_DOCX);
  assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK");
});

test("pandoc path (skipped if pandoc is not installed on this machine): authored numbering preserved, serif theme, signature line breaks preserved", { skip: !pandocAvailable() }, () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-docx-pandoc-"));
  try {
    const outPath = join(dir, "out.docx");
    buildWithPandoc(FIXTURE_MD, outPath, REFERENCE_DOCX);
    const bytes = readFileSync(outPath);
    assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK");

    const xml = extractText(outPath);
    // Section numbers come from the authored source; pandoc must not add
    // its own (no standalone bare-number runs before headings).
    assert.match(xml, /1\. Definitions/);
    assert.match(xml, /1\.1 Sub Point/);
    assert.doesNotMatch(xml, /<w:t[^>]*>1<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>1\. Definitions/);
    // Signature block: two consecutive lines joined by a <w:br/> inside one
    // paragraph (pandoc's rendering of a trailing "\" hard line break).
    assert.match(xml, /Wrenna Ashgrove<\/w:t><\/w:r><w:r><w:br\s*\/><\/w:r>/);

    const theme = execFileSync("unzip", ["-p", outPath, "word/theme/theme1.xml"], { encoding: "utf8" });
    assert.match(theme, /Times New Roman/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
