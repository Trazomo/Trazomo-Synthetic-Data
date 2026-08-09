// build-docx: markdown -> DOCX.
//
// Primary path: pandoc, if `pandoc --version` succeeds on this machine, using
// datagen/assets/reference.docx (a patched copy of pandoc's own default
// reference document: serif theme fonts, justified body text, left-aligned
// numbered headings). Section numbers are canonical in the markdown source
// (legal cross-references depend on them), so pandoc must NOT renumber:
// hierarchy, and pandoc's native "\<newline>" hard-break handling for
// signature-block preservation.
//
// Fallback path: the `docx` npm package, driving a small hand-rolled
// Markdown subset parser (headings, paragraphs, bullet/numbered lists, and
// pandoc-style "\<newline>" hard breaks within a paragraph). This is *not*
// a full CommonMark implementation -- it covers what legal-document source
// markdown in this repo actually uses. Anything unrecognized is emitted as
// a plain paragraph rather than dropped.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const HEADING_STYLE_BY_LEVEL = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

export function pandocAvailable() {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert one markdown file to docx using pandoc + the repo's reference.docx.
 * @param {string} mdPath
 * @param {string} outPath
 * @param {string} referenceDocxPath
 */
export function buildWithPandoc(mdPath, outPath, referenceDocxPath) {
  execFileSync("pandoc", [
    "-s",
    mdPath,
    "-o",
    outPath,
    `--reference-doc=${referenceDocxPath}`,
  ]);
}

/**
 * Convert one markdown file to docx using the `docx` npm package fallback
 * (no pandoc available). Applies the same legal-document intent: headings
 * rendered exactly as authored (section numbers are canonical in the source;
 * legal cross-references depend on them, so nothing renumbers), serif
 * justified body text, and signature-block line-break preservation.
 * @param {string} mdPath
 * @param {string} outPath
 */
export async function buildWithDocxFallback(mdPath, outPath) {
  const source = readFileSync(mdPath, "utf8");
  const { title, body } = stripFrontmatter(source);
  const children = markdownToParagraphs(body, title);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 22 },
          paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 } },
        },
      },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outPath, buffer);
}

function stripFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return { title: null, body: source };
  const titleMatch = /^title:\s*(.+)$/m.exec(match[1]);
  return {
    title: titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : null,
    body: source.slice(match[0].length),
  };
}

function markdownToParagraphs(body, title) {
  const children = [];
  if (title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: title, bold: true, size: 32 })],
      })
    );
  }

  const lines = body.split("\n");
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    children.push(linesToParagraph(paragraphBuffer));
    paragraphBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    const numberedMatch = /^\d+\.\s+(.*)$/.exec(line);

    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      children.push(
        new Paragraph({
          heading: HEADING_STYLE_BY_LEVEL[level - 1] ?? HeadingLevel.HEADING_6,
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: headingMatch[2], bold: true })],
        })
      );
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      children.push(new Paragraph({ text: bulletMatch[1], bullet: { level: 0 } }));
      continue;
    }

    if (numberedMatch) {
      // Not wired to a docx numbering definition (no `numbering` config on
      // the Document) -- kept as a plain paragraph with its original "N. "
      // prefix intact rather than risking an invalid numbering reference.
      flushParagraph();
      children.push(new Paragraph({ text: line }));
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }
  flushParagraph();

  return children;
}

/**
 * Build one Paragraph from a run of source lines, honoring pandoc-style
 * "\<newline>" hard breaks (a trailing backslash keeps the next line in the
 * same paragraph as a manual line break -- this is how signature blocks
 * survive conversion instead of collapsing into one run-on line).
 */
function linesToParagraph(sourceLines) {
  const children = [];
  sourceLines.forEach((line, idx) => {
    const text = line.replace(/\\\s*$/, "");
    if (idx > 0) children.push(new TextRun({ text: "", break: 1 }));
    children.push(new TextRun({ text }));
  });
  return new Paragraph({ children });
}
