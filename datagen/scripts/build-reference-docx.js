#!/usr/bin/env node
// Builds datagen/assets/reference.docx: pandoc's own default reference
// document (extracted via `pandoc --print-default-data-file reference.docx`,
// which already carries every named style pandoc's docx writer looks for --
// Title, Heading 1-9, Body Text, First Paragraph, Compact, Block Text,
// Section Number, etc. -- with its theme fonts swapped to a serif face and
// body paragraphs set to justified, for a "legal document" look.
//
// Why patch pandoc's own reference instead of building one from scratch
// with the `docx` npm package: pandoc's numbered-section machinery
// (--number-sections) is wired to style IDs and a "Section Number"
// character style already present in its default template. Rebuilding an
// equivalent from zero risks subtly breaking that wiring; patching two XML
// files inside the zip is a much smaller, more reliable change.
//
// Run manually when the desired styling changes: `node datagen/scripts/build-reference-docx.js`.
// The output is committed to the repo (datagen/assets/reference.docx) so
// `build-docx` never needs pandoc's data files or this script at run time.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "assets", "reference.docx");
const SERIF_FONT = "Times New Roman";

function main() {
  execFileSync("pandoc", ["--version"], { stdio: "ignore" });

  const workDir = mkdtempSync(join(tmpdir(), "trazomo-reference-docx-"));
  const baseDocx = join(workDir, "base.docx");
  const extractDir = join(workDir, "extracted");

  try {
    execFileSync("pandoc", ["-o", baseDocx, "--print-default-data-file", "reference.docx"]);
    mkdirSync(extractDir, { recursive: true });
    execFileSync("unzip", ["-o", baseDocx, "-d", extractDir]);

    patchTheme(join(extractDir, "word", "theme", "theme1.xml"));
    patchStyles(join(extractDir, "word", "styles.xml"));

    if (existsSync(OUT_PATH)) rmSync(OUT_PATH);
    if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true });
    // zip from inside extractDir so paths inside the archive are relative
    // (word/document.xml, not extracted/word/document.xml).
    execFileSync("zip", ["-r", OUT_PATH, "."], { cwd: extractDir });

    console.log(`Wrote ${OUT_PATH}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function patchTheme(themePath) {
  let xml = readFileSync(themePath, "utf8");
  xml = xml.replaceAll('typeface="Aptos Display"', `typeface="${SERIF_FONT}"`);
  xml = xml.replaceAll('typeface="Aptos"', `typeface="${SERIF_FONT}"`);
  writeFileSync(themePath, xml, "utf8");
}

function patchStyles(stylesPath) {
  let xml = readFileSync(stylesPath, "utf8");

  // Normal has no <w:pPr> today; give it one so BodyText/FirstParagraph/
  // Compact (all basedOn Normal, none overriding jc) inherit justified text.
  xml = xml.replace(
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">\n    <w:name w:val="Normal" />\n    <w:qFormat />\n  </w:style>',
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">\n    <w:name w:val="Normal" />\n    <w:qFormat />\n    <w:pPr>\n      <w:jc w:val="both" />\n    </w:pPr>\n  </w:style>'
  );

  // Headings should stay left-aligned (not justified) even though they
  // inherit from Normal -- insert an explicit jc="left" right after each
  // heading's <w:outlineLvl .../> so numbered headings read naturally.
  xml = xml.replace(
    /(<w:style w:type="paragraph" w:styleId="Heading[1-9]">[\s\S]*?<w:outlineLvl w:val="\d" \/>)/g,
    "$1\n      <w:jc w:val=\"left\" />"
  );

  writeFileSync(stylesPath, xml, "utf8");
}

main();
