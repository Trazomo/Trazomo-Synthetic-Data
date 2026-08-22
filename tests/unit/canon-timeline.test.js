// canon/timeline.md is append-only in practice: downstream repos parse it.
// Trazomo's finance guard regex-parses the "March close roles" row by line
// number, and every finance generator reads a date off this table, so a row
// that quietly changes wording breaks a consumer that never sees this repo.
//
// These tests hold the file at tag v1.3.0 (tests/fixtures/canon-timeline-v1.3.0.md,
// a byte copy of canon/timeline.md at commit 5b3acb7) and assert that every one
// of its lines is still present, byte for byte, in the same relative order.
// Adding rows passes. Editing or removing one fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

const readLines = (path) => readFileSync(path, "utf8").split("\n");

const current = () => readLines(join(REPO_ROOT, "canon", "timeline.md"));
const baseline = () => readLines(join(REPO_ROOT, "tests", "fixtures", "canon-timeline-v1.3.0.md"));

test("canon/timeline.md still carries every v1.3.0 line, byte for byte and in order", () => {
  const now = current();
  let cursor = 0;
  for (const [i, line] of baseline().entries()) {
    const found = now.indexOf(line, cursor);
    assert.notEqual(
      found,
      -1,
      `v1.3.0 line ${i + 1} is gone or was edited: ${JSON.stringify(line)}. `
      + "canon/timeline.md is append-only; add a row instead of changing one."
    );
    cursor = found + 1;
  }
});

test("canon/timeline.md keeps the March close roles row at line 16, where a Trazomo guard reads it", () => {
  const now = current();
  const frozen = baseline()[15];
  assert.match(frozen, /^\| March close roles \|/, "the fixture's line 16 is not the row this test guards");
  assert.equal(now[15], frozen, "the March close roles row moved off line 16 or changed");
});

test("canon/timeline.md carries the cluster 2 dated events, each citing a dataset", () => {
  const now = current();
  const rows = now.filter((l) => l.startsWith("| 2026-"));
  const expected = [
    "2026-01-07",
    "2026-01-15 to 2026-03-30",
    "2026-02-02 to 2026-04-03",
    "2026-03-02 to 2026-03-31",
    "2026-03-23 to 2026-04-06",
    "2026-04-01, 04-02, 04-03, 04-06, 04-07",
    "2026-04-06",
    "2026-04-07",
  ];
  for (const date of expected) {
    const row = rows.find((l) => l.startsWith(`| ${date} |`));
    assert.ok(row, `no dated event row starting "| ${date} |"`);
    assert.match(row, /`datasets\/(finance|core)/, `${date} row cites no dataset source`);
  }
});

// The v1.3.0 table is not globally sorted (the FIN-40 quiet-period row opens
// 2026-04-01 and sits below a 2026-04-02 row), and those rows may not be moved,
// so the check that matters is local: each row this release adds sits between
// two rows it does not sort before or after.
test("each cluster 2 row was inserted in date order against the rows either side of it", () => {
  const firstDate = (line) => /^\| (\d{4}-\d{2}-\d{2})/.exec(line)?.[1];
  const dated = current().filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l));
  const added = [
    "2026-01-07",
    "2026-01-15 to 2026-03-30",
    "2026-02-02 to 2026-04-03",
    "2026-03-02 to 2026-03-31",
    "2026-03-23 to 2026-04-06",
    "2026-04-01, 04-02, 04-03, 04-06, 04-07",
    "2026-04-06",
    "2026-04-07",
  ];
  for (const label of added) {
    const at = dated.findIndex((l) => l.startsWith(`| ${label} |`));
    assert.notEqual(at, -1, `no dated event row starting "| ${label} |"`);
    const self = firstDate(dated[at]);
    if (at > 0) {
      assert.ok(firstDate(dated[at - 1]) <= self, `${label} sorts above the row before it`);
    }
    if (at < dated.length - 1) {
      assert.ok(self <= firstDate(dated[at + 1]), `${label} sorts below the row after it`);
    }
  }
});

// Cluster 3 and 4 (D5). Seven rows, appended in date order into the same table.
// Two of them sit on dates an existing row already carries (2026-04-06 and
// 2026-04-07), which is why the check below is over the whole matching set
// rather than over the first row that starts with the date.
const D5_ROWS = [
  { date: "2024-04-30 to 2026-03-31", cites: "datasets/finance/actuals-24mo" },
  { date: "2025-10-01 to 2025-12-31", cites: "artifacts/FIN-30" },
  { date: "2026-02-01 to 2026-02-28", cites: "artifacts/FIN-28" },
  { date: "2026-03-31", cites: "datasets/finance/materiality-thresholds" },
  { date: "2026-04-06", cites: "datasets/finance/actuals-vs-budget" },
  { date: "2026-04-06", cites: "datasets/finance/approved-metrics-pack" },
  { date: "2026-04-07", cites: "datasets/finance/audit-evidence-index" },
];

test("canon/timeline.md carries the cluster 3 and 4 dated events, each citing its source", () => {
  const now = current();
  for (const { date, cites } of D5_ROWS) {
    const matching = now.filter((l) => l.startsWith(`| ${date} |`));
    assert.ok(matching.length > 0, `no dated event row starting "| ${date} |"`);
    assert.ok(
      matching.some((l) => l.includes(cites)),
      `no "| ${date} |" row cites ${cites}`
    );
  }
});

test("each cluster 3 and 4 row was inserted in date order against the rows either side of it", () => {
  const firstDate = (line) => /^\| (\d{4}-\d{2}-\d{2})/.exec(line)?.[1];
  const dated = current().filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l));
  for (const { date, cites } of D5_ROWS) {
    const at = dated.findIndex((l) => l.startsWith(`| ${date} |`) && l.includes(cites));
    assert.notEqual(at, -1, `no "| ${date} |" row citing ${cites}`);
    const self = firstDate(dated[at]);
    if (at > 0) assert.ok(firstDate(dated[at - 1]) <= self, `${cites} sorts above the row before it`);
    if (at < dated.length - 1) assert.ok(self <= firstDate(dated[at + 1]), `${cites} sorts below the row after it`);
  }
});

test("the 2026-04-06 variance row states a file fact and never adjudicates whether CLS-17 ran", () => {
  // Rule R-CLS17. Merged trazomo content (finance-google-workspace lesson 02)
  // already tells a reader CLS-17 ran at this same as-of, so a canon row that
  // said the variance work had not been done would write a contradiction into
  // the file six module briefs copy from.
  const row = current().find((l) => l.startsWith("| 2026-04-06 |") && l.includes("actuals-vs-budget"));
  assert.ok(row, "the variance pack row is gone");
  assert.match(row, /carries CLS-17 as not started/, "the row no longer states the checklist file fact");
  assert.ok(!/has not (run|started)/.test(row), "the row asserts a world state rather than a file fact");
  assert.ok(!/unposted/.test(row), 'the row says "unposted", which FIN-17 refutes in one grep');
});

test("datagen/README.md states the close_day rule the cluster 2 datasets date against", () => {
  const readme = readFileSync(join(REPO_ROOT, "datagen", "README.md"), "utf8");
  assert.match(readme, /`close_day` is the business day of the close/);
  for (const date of ["2026-04-01", "2026-04-07", "2026-04-06"]) {
    assert.ok(readme.includes(date), `the close_day line does not name ${date}`);
  }
});

test("datagen/README.md states the two cluster 3 and 4 conventions the D5 generators share", () => {
  const readme = readFileSync(join(REPO_ROOT, "datagen", "README.md"), "utf8");
  assert.match(
    readme,
    /The 24-month reporting window ends at 2026-03-31[\s\S]{0,200}`monthEnds\(\)` in `datagen\/src\/dates\.js` is the only\nplace it is computed/,
    "the README does not name monthEnds() as the single home of the 24-month series"
  );
  for (const id of ["FIN-31", "FIN-32", "FIN-33"]) {
    assert.ok(readme.includes(id), `the 24-month window line does not name ${id}`);
  }
  assert.match(
    readme,
    /FIN-05 is the pre-close trial balance at 2026-03-31 and does not reflect the\nFIN-09 batch\. A variance artifact reconciles to FIN-05's period columns, never\nto FIN-09\./,
    "the README does not state which file a variance artifact reconciles to"
  );
  // The wording matters as much as the rule: "unposted" is refutable from
  // FIN-17's own CLS-15 row, and a README line is what six module briefs copy.
  assert.match(readme, /Do not write that the batch is "unposted"/);
  assert.match(readme, /not reflected in\nFIN-05/);
});
