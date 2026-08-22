// FIN-25 supporting-je-detail: the wave's red tests.
//
// Built by D5a wave 1. Every plant is re-derived here by its own stated rule,
// from the emitted bytes, with the qualifier-free cardinality asserted beside
// the qualified one. Nothing is imported from the builder that placed a plant:
// the favorability rule, the split-counterparty rule and the modal-account rule
// are all written out in this file.
//
// The mutation this file has to catch: a line added to one account without a
// matching move in another, which breaks the FIN-05 tie in a way only the
// per-account sum sees. Every row can look plausible and the file still be
// wrong.
//
// The reconciliation target is FIN-05's period columns, never FIN-09. FIN-05 is
// the pre-close trial balance and does not reflect the close batch; FIN-09
// credits account 2010 beyond FIN-05's whole period credit to it, and posts to
// an account with zero period activity there. Do not write "unposted": FIN-17
// carries CLS-15 as complete at 2026-04-03.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import yaml from "js-yaml";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { ACCOUNT_HOLDER, CANON_VENDORS, NEUTRAL_VENDORS } from "../../datagen/src/generators/fin-01-cash-recon.js";
import { CANON_VENDORS_EXTENDED } from "../../datagen/src/generators/fin-06-procure-to-pay.js";
import {
  DETAIL_ENTRY_PREFIX, ENTRY_SOURCES, SUPPORTING_DETAIL_COLUMNS,
} from "../../datagen/src/generators/fin-24-actuals-vs-budget.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { readFileSync } from "node:fs";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "supporting-je-detail.csv";

/** The row-count band the plan sets: 128 rows, 118 to 138 (plan U10). */
const ROW_COUNT_BAND = [118, 138];

function detail() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-25"), canon), OUTPUT_FILE).content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-25").columns, "FIN-25: header does not match spec.columns");
  return table.rows;
}

/** A shipped dataset's own committed bytes, read off disk rather than rebuilt. */
const shipped = (name, file) =>
  csvTable(readFileSync(join(REPO_ROOT, "datasets", ...name.split("/"), file), "utf8")).rows;

const tracker = () =>
  csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-24"), canon), "actuals-vs-budget.csv").content).rows;

/**
 * The two thresholds, recomputed here from the numbers FIN-26's own emitted
 * bytes publish. The budget threshold is FIN-37's shipped column; the flux
 * threshold is the rule the config states, parsed back out of the YAML.
 */
function fluxThresholdFromConfig() {
  const rule = yaml.load(
    fileByPath(generateArtifact(specs.byId.get("FIN-26"), canon), "materiality-thresholds.yaml").content
  ).flux_rule;
  const unit = Math.round(Number(/nearest (\d+)/.exec(rule.rounding)[1]) * 100);
  const floor = toCents(rule.floor_usd);
  return (priorCents) =>
    Math.max(floor, Math.ceil((Math.abs(priorCents) * rule.pct_of_prior_period) / unit) * unit);
}

/** The account set under investigation, derived from FIN-24 and FIN-26. */
function investigated() {
  const fluxThreshold = fluxThresholdFromConfig();
  const rows = tracker();
  const material = rows.filter(
    (r) => Math.abs(toCents(r.variance_amount)) >= toCents(r.explanation_threshold_usd)
  );
  const fluxOnly = rows.filter(
    (r) => Math.abs(toCents(r.flux_amount)) >= fluxThreshold(toCents(r.prior_period_actual))
      && !material.includes(r)
  );
  return { material, fluxOnly, rows };
}

/**
 * Favorable means more revenue or less cost, which is the variance running
 * toward profit. Written out here rather than imported: the contra line runs
 * against its own section, so section_sign is part of the rule.
 */
function isFavorable(row) {
  const towardProfit = row.statement_section === "revenue" ? 1 : -1;
  return toCents(row.variance_amount) * Number(row.section_sign) * towardProfit > 0;
}

/** counterparty_canon_id -> gl_account -> line count, over the emitted bytes. */
function accountsByCounterparty(rows) {
  const out = new Map();
  for (const row of rows) {
    const seen = out.get(row.counterparty_canon_id) ?? new Map();
    seen.set(row.gl_account, (seen.get(row.gl_account) ?? 0) + 1);
    out.set(row.counterparty_canon_id, seen);
  }
  return out;
}

// --------------------------------------------------------- green before bytes

test("FIN-25: the generator's column list and the spec agree, and the entry-id block collides with nothing shipped", () => {
  assert.deepEqual(SUPPORTING_DETAIL_COLUMNS, specs.byId.get("FIN-25").columns);
  assert.equal(DETAIL_ENTRY_PREFIX, "GL-202603-");
  // FIN-09 hands out JE-202603-CNNN and FIN-02 its own je_id block. A shared
  // prefix would make a join resolve to the wrong file.
  const batch = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content
  ).rows;
  for (const row of batch) {
    assert.ok(!row.entry_id.startsWith(DETAIL_ENTRY_PREFIX), `${row.entry_id} already uses the FIN-25 block`);
  }
});

test("FIN-25 V5: two of the four determinable accounts carry FIN-09 lines, not three", () => {
  // The qualifier-free count of the timing plant, from frozen bytes. The plan's
  // earlier draft said three, which is not derivable under any reading, and the
  // module block that quotes the number has to quote this one.
  const batch = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content
  ).rows;
  const touched = ["4100", "5020", "6020", "6200"].filter((code) => batch.some((r) => r.gl_account === code));
  assert.deepEqual(touched, ["6020", "6200"]);
  const debits = (code) => batch.filter((r) => r.gl_account === code && r.debit !== "")
    .reduce((sum, r) => sum + toCents(r.debit), 0);
  assert.equal(cents(debits("6020")), "94279.18", "the benefits accrual moved, and the timing plant reads off it");
  assert.equal(cents(debits("6200")), "126516.66");
});

test("FIN-25 V8: the checklist qualifier is explanatory rather than selective", () => {
  // BVA-04 is the only material revenue line either way, so dropping the
  // close-task qualifier still returns 1. Dropping materiality as well returns
  // 6, every revenue line on the tracker. A module block that states the count
  // has to say the qualifier does no narrowing, or a reader assumes it does.
  const template = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-37"), canon), "budget-vs-actual-template.csv").content
  ).rows.filter((r) => r.statement_section === "revenue");
  assert.equal(template.length, 6);
  const checklist = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-17"), canon), "close-checklist.csv").content
  ).rows;
  const cls14 = checklist.find((r) => r.task_id === "CLS-14");
  assert.equal(cls14.status, "not_started", "the deferred revenue roll-forward is no longer the open revenue task");
  assert.equal(cls14.account_code, "", "CLS-14 gained an account_code, so a category-keyed rule is no longer forced");
});

// ------------------------------------------------------- the emitted bytes

test("FIN-25: rows land inside the stated band, across the six accounts FIN-24 and FIN-26 select", () => {
  const rows = detail();
  assert.ok(rows.length >= ROW_COUNT_BAND[0] && rows.length <= ROW_COUNT_BAND[1], `${rows.length} rows is outside the band`);
  const accounts = new Set(rows.map((r) => r.gl_account));
  assert.equal(accounts.size, 6, "the four material budget lines plus the two flux-only lines");

  // The account set is not a list this file keeps. It is re-derived from the
  // emitted FIN-24 bytes and the emitted FIN-26 rule, so a threshold edit that
  // moves which lines are material fails here rather than leaving FIN-25
  // describing an investigation nobody would open.
  const { material, fluxOnly } = investigated();
  assert.equal(material.length, 4);
  assert.equal(fluxOnly.length, 2);
  assert.deepEqual(
    [...accounts].sort(),
    [...material, ...fluxOnly].map((r) => r.account_code).sort()
  );

  for (const row of rows) {
    assert.ok(row.entry_id.startsWith(DETAIL_ENTRY_PREFIX), `${row.entry_id} is outside the FIN-25 block`);
    assert.ok(ENTRY_SOURCES.includes(row.entry_source), `${row.entry_id} has entry_source "${row.entry_source}"`);
    assert.equal(row.currency, "USD");
    assert.equal(row.line_id, `${row.entry_id}-${row.line_id.split("-").pop()}`);
    assert.notEqual(row.debit === "", row.credit === "", `${row.line_id} carries both sides or neither`);
    assert.ok(row.posting_date >= "2026-03-01" && row.posting_date <= "2026-03-31", `${row.line_id} posted outside March`);
  }
});

test("FIN-25 T-N1: per account, the debit and credit sums equal FIN-05's period columns to the cent", () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const sums = new Map();
  for (const row of detail()) {
    const seen = sums.get(row.gl_account) ?? { debit: 0, credit: 0 };
    if (row.debit !== "") seen.debit += toCents(row.debit);
    if (row.credit !== "") seen.credit += toCents(row.credit);
    sums.set(row.gl_account, seen);
  }
  for (const [account, seen] of sums) {
    assert.equal(cents(seen.debit), tb.get(account).period_debit, `${account} debits do not tie to FIN-05`);
    assert.equal(cents(seen.credit), tb.get(account).period_credit, `${account} credits do not tie to FIN-05`);
  }

  // The target is FIN-05, never the FIN-09 batch FIN-05 does not reflect. The
  // proof is arithmetic rather than a comment: on the two covered accounts the
  // batch touches, adding its lines would break the tie the assertions above
  // just made.
  const batch = shipped("finance/journal-entries-batch", "journal-entries-batch.csv");
  for (const code of ["6020", "6200"]) {
    const batchDebit = batch
      .filter((r) => r.gl_account === code && r.debit !== "")
      .reduce((sum, r) => sum + toCents(r.debit), 0);
    assert.ok(batchDebit > 0);
    assert.notEqual(cents(sums.get(code).debit + batchDebit), tb.get(code).period_debit);
  }
});

test("FIN-25 T-N2 and T-N3: every account is on the chart and every counterparty is screened", () => {
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  const customers = new Map(
    shipped("core/crm-seed-dataset", "accounts.csv").map((a) => [a.account_id, a.name])
  );
  const allowed = new Map([
    [ACCOUNT_HOLDER.canon_id, ACCOUNT_HOLDER.name],
    ...CANON_VENDORS_EXTENDED.map((v) => [v.canon_id, v.name]),
    ...CANON_VENDORS.map((v) => [v.canon_id, v.name]),
    ...NEUTRAL_VENDORS.map((name, i) => [`co-${181 + i}`, name]),
    ...customers,
  ]);

  for (const row of detail()) {
    const account = chart.get(row.gl_account);
    assert.ok(account, `${row.gl_account} is not on the FIN-22 chart`);
    assert.equal(account.active, "true", `${row.gl_account} is inactive`);
    assert.equal(row.account_name, account.account_name, `${row.line_id} renames account ${row.gl_account}`);

    assert.match(row.counterparty_canon_id, /^co-\d{3}$/, `${row.line_id} has a malformed canon id`);
    assert.equal(
      allowed.get(row.counterparty_canon_id), row.counterparty,
      `${row.line_id}: "${row.counterparty}" is not the screened name ${row.counterparty_canon_id} carries`
    );
    // The id resolves in canon/companies.md, or sits in the co-140-and-up range
    // canon/companies.md reserves for the generator-produced population. The
    // screened neutral vendors take co-181 and up and are not listed by id, so
    // a flat "resolves in the file" check would reject a name the pack ships.
    assert.ok(
      canon.has(row.counterparty_canon_id) || Number(row.counterparty_canon_id.slice(3)) >= 140,
      `${row.counterparty_canon_id} is neither canon nor inside the generator range`
    );
  }
});

test("FIN-25 T-N4: the entry-id and source-document blocks collide with nothing shipped", () => {
  const rows = detail();
  const batch = new Set(shipped("finance/journal-entries-batch", "journal-entries-batch.csv").map((r) => r.entry_id));
  const ledger = new Set(shipped("finance/gl-cash-ledger", "gl-cash-ledger.csv").map((r) => r.je_id));
  for (const row of rows) {
    assert.ok(!batch.has(row.entry_id), `${row.entry_id} collides with the FIN-09 batch`);
    assert.ok(!ledger.has(row.entry_id), `${row.entry_id} collides with the FIN-02 ledger`);
  }
  // An entry is one counterparty on one account on one side, so a reader who
  // groups by entry_id never gets a mixed row set.
  const byEntry = new Map();
  for (const row of rows) {
    const seen = byEntry.get(row.entry_id) ?? [];
    seen.push(row);
    byEntry.set(row.entry_id, seen);
  }
  for (const [entryId, lines] of byEntry) {
    assert.equal(new Set(lines.map((l) => l.counterparty_canon_id)).size, 1, `${entryId} mixes counterparties`);
    assert.equal(new Set(lines.map((l) => l.gl_account)).size, 1, `${entryId} mixes accounts`);
    assert.equal(new Set(lines.map((l) => l.source_document)).size, 1, `${entryId} mixes source documents`);
    assert.ok(lines.length <= 3, `${entryId} carries ${lines.length} lines`);
  }
});

test("FIN-25 V5: one timing account, and 2 of the covered accounts carry a FIN-09 line at all", () => {
  const rows = detail();
  const { material, fluxOnly } = investigated();
  const covered = [...material, ...fluxOnly];
  const batchAccounts = new Set(shipped("finance/journal-entries-batch", "journal-entries-batch.csv").map((r) => r.gl_account));

  // The qualifier the rule names is favorability. Dropping it leaves the
  // accounts that carry a FIN-09 line at all, which is 2 of the 6.
  const withBatch = covered.filter((line) => batchAccounts.has(line.account_code));
  assert.equal(withBatch.length, 2, `covered accounts carrying a FIN-09 line: ${withBatch.map((l) => l.account_code).join(", ")}`);
  const timing = withBatch.filter((line) => material.includes(line) && isFavorable(line));
  assert.equal(timing.length, 1, `accounts fitting the timing rule: ${timing.map((l) => l.account_code).join(", ")}`);

  // The account is favorable now and the batch would reverse that: the accrual
  // lines are debits to an account whose variance is currently under budget.
  const account = timing[0].account_code;
  const accrual = shipped("finance/journal-entries-batch", "journal-entries-batch.csv")
    .filter((r) => r.gl_account === account && r.entry_type === "accrual" && r.debit !== "");
  assert.ok(accrual.length > 0, `${account} carries no FIN-09 accrual line`);
  const wouldBe = toCents(timing[0].variance_amount) + accrual.reduce((sum, r) => sum + toCents(r.debit), 0);
  assert.ok(wouldBe > 0, "the batch no longer reverses the sign, so the timing plant has stopped teaching");
  assert.ok(rows.some((r) => r.gl_account === account), "the timing account is not in the file");
});

test("FIN-25 V6: one true overspend, and 2 material unfavorable accounts without the service-period qualifier", () => {
  const rows = detail();
  const { material } = investigated();
  const splits = accountsByCounterparty(rows);
  const splitAccounts = new Set(
    [...splits.values()].filter((counts) => counts.size > 1).flatMap((counts) => [...counts.keys()])
  );

  const unfavorable = material.filter((line) => !isFavorable(line)).map((l) => l.account_code);
  assert.equal(unfavorable.length, 2, `material unfavorable accounts: ${unfavorable.join(", ")}`);

  // Dropping the ONE qualifier the rule names (the service period) keeps the
  // split-counterparty clause and returns 2. That is the construction: both
  // material unfavorable accounts are free of a split counterparty, so the
  // service period is what does the narrowing.
  const withoutServicePeriod = unfavorable.filter((code) => !splitAccounts.has(code));
  assert.equal(withoutServicePeriod.length, 2, `free of a split counterparty: ${withoutServicePeriod.join(", ")}`);

  const overspend = withoutServicePeriod.filter(
    (code) => !rows.some((r) => r.gl_account === code && r.service_period_start > "2026-03-31")
  );
  assert.equal(overspend.length, 1, `accounts fitting the overspend rule: ${overspend.join(", ")}`);

  // Exactly one account in the file carries coverage that starts after the
  // cut-off, and it is the other material unfavorable one.
  const postCutoff = [...new Set(rows.filter((r) => r.service_period_start > "2026-03-31").map((r) => r.gl_account))];
  assert.deepEqual(postCutoff, unfavorable.filter((code) => !overspend.includes(code)));
  for (const row of rows) {
    assert.ok(row.service_period_start <= row.service_period_end, `${row.line_id} has a service period that ends before it starts`);
  }
});

test("FIN-25 V7: one reclass, and 4 counterparties appear on more than one account", () => {
  const rows = detail();
  const byParty = accountsByCounterparty(rows);

  // Dropping the modal qualifier leaves every counterparty that appears on more
  // than one account at all, which is 4. Three of those are split evenly: an
  // even split has no modal account, so it reads as a vendor two departments
  // legitimately share rather than as a misclassification.
  const split = [...byParty].filter(([, counts]) => counts.size > 1);
  assert.equal(split.length, 4, `counterparties on more than one account: ${split.map(([id]) => id).join(", ")}`);

  const reclass = split.filter(([, counts]) => {
    const sorted = [...counts.values()].sort((a, b) => b - a);
    return sorted[0] > sorted[1];
  });
  assert.equal(reclass.length, 1, `counterparties with a strict modal account: ${reclass.map(([id]) => id).join(", ")}`);
  const even = split.filter(([id]) => !reclass.some(([r]) => r === id));
  assert.equal(even.length, 3);
  for (const [id, counts] of even) {
    assert.equal(new Set(counts.values()).size, 1, `${id} is not split evenly, so it has a modal account`);
  }

  // The lines sitting away from the modal account are the finding, and they are
  // a minority of that counterparty's lines rather than the bulk of them.
  const [reclassId, reclassCounts] = reclass[0];
  const modal = [...reclassCounts].sort((a, b) => b[1] - a[1])[0];
  const strays = [...reclassCounts].filter(([account]) => account !== modal[0]);
  assert.equal(strays.length, 1);
  assert.ok(strays[0][1] < modal[1], `${reclassId} has as many lines away from ${modal[0]} as on it`);
  // None of the four splits touches an account V6 has to judge, which is what
  // keeps V6's qualifier-free count at 2 rather than collapsing it to 1.
  assert.ok(rows.some((r) => r.counterparty_canon_id === reclassId));
});

test("FIN-25 V8: one line the policy does not decide, and the checklist qualifier does no narrowing", () => {
  const { material } = investigated();
  const checklist = shipped("finance/close-checklist", "close-checklist.csv");

  // The join is the account's own statement_section against the checklist's own
  // category column. No label, no answer key, and no account_code on the task.
  const blocked = material.filter((line) => {
    const supporting = checklist.filter((t) => t.category === line.statement_section);
    return supporting.length > 0 && supporting.some((t) => t.status !== "complete");
  });
  assert.equal(blocked.length, 1, `material lines whose supporting close task is open: ${blocked.map((l) => l.line_id).join(", ")}`);
  assert.equal(blocked[0].statement_section, "revenue");

  // Both cardinalities. Dropping the checklist qualifier still returns 1,
  // because there is only one material revenue line either way: the qualifier
  // says WHY the call is held for a person, it does not select the line. A
  // module block that states the count has to say so, or a reader assumes
  // dropping it widens the set.
  const materialRevenue = material.filter((l) => l.statement_section === "revenue");
  assert.equal(materialRevenue.length, 1);
  assert.deepEqual(blocked, materialRevenue);
  // The account is in the file, so the file answers the question by joining.
  assert.ok(detail().some((r) => r.gl_account === blocked[0].account_code));
});

test("FIN-25: the committed bytes are the generated bytes, row for row", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed detail fails the suite naming the line_id it landed on.
  const generated = detail();
  const committed = shipped("finance/supporting-je-detail", OUTPUT_FILE);
  assert.equal(committed.length, generated.length);
  for (const [i, row] of generated.entries()) {
    assert.deepEqual(committed[i], row, `supporting-je-detail.csv row ${row.line_id} was edited by hand`);
  }
});
