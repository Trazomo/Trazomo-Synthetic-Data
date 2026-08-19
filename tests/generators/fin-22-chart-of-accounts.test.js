// FIN-22 chart-of-accounts: structural checks. Never names which row is the
// merged account beyond what the spec itself says (answer-key rule).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import {
  OPERATING_CASH_ACCOUNT, AR_CONTROL_ACCOUNT, AP_CONTROL_ACCOUNT, ACCRUED_LIABILITIES_ACCOUNT,
  PREPAID_SOFTWARE_ACCOUNT, PREPAID_INSURANCE_ACCOUNT, RETAINED_EARNINGS_PLUG_ACCOUNT,
} from "../../datagen/src/generators/fin-22-chart-of-accounts.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

// Quote-aware CSV line splitter (mirrors datagen/src/csv.js's escaping).
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvTable(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return { cols, rows: lines.map((line) => Object.fromEntries(cols.map((c, i) => [c, splitCsvLine(line)[i]]))) };
}

test("FIN-22: header equals spec columns, about 60 accounts, unique codes, valid enums", () => {
  const spec = specs.byId.get("FIN-22");
  const files = generateArtifact(spec, canon);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "chart-of-accounts.csv");
  const { cols, rows } = csvTable(files[0].content);
  assert.deepEqual(cols, spec.columns);
  assert.ok(rows.length >= 55 && rows.length <= 70, `expected about 60 accounts, got ${rows.length}`);
  assert.equal(new Set(rows.map((r) => r.account_code)).size, rows.length, "account codes must be unique");
  const types = new Set(["asset", "liability", "equity", "revenue", "expense"]);
  for (const r of rows) {
    assert.match(r.account_code, /^\d{4}$/, `${r.account_code} is not a 4-digit code`);
    assert.ok(types.has(r.type), `${r.account_code} has type ${r.type}`);
    assert.ok(r.normal_balance === "debit" || r.normal_balance === "credit", `${r.account_code} normal_balance`);
    assert.ok(r.active === "true" || r.active === "false", `${r.account_code} active`);
    assert.ok(r.subtype.length > 0, `${r.account_code} has no subtype`);
  }
  for (const t of types) assert.ok(rows.some((r) => r.type === t), `no ${t} accounts`);
});

// The chart's contra-account convention as a checked invariant, so later
// generators can pattern-match on subtype instead of reading account names.
test("FIN-22: contra assets are labelled by subtype, not just by name", () => {
  const files = generateArtifact(specs.byId.get("FIN-22"), canon);
  const { rows } = csvTable(files[0].content);
  assert.ok(rows.some((r) => r.subtype === "contra_asset"), "expected at least one contra_asset row");
  for (const r of rows) {
    if (r.type === "asset" && r.normal_balance === "credit") {
      assert.equal(r.subtype, "contra_asset", `${r.account_code} offsets an asset but its subtype is ${r.subtype}`);
    }
    if (r.subtype === "contra_asset") {
      assert.equal(r.type, "asset", `${r.account_code} is contra_asset but type is ${r.type}`);
      assert.equal(r.normal_balance, "credit", `${r.account_code} is contra_asset but normal_balance is ${r.normal_balance}`);
    }
  }
});

test("FIN-22: the operating cash account is fixed at 1010 and active", () => {
  const files = generateArtifact(specs.byId.get("FIN-22"), canon);
  const { rows } = csvTable(files[0].content);
  const cash = rows.find((r) => r.account_code === OPERATING_CASH_ACCOUNT.code);
  assert.ok(cash, "operating cash account missing");
  assert.equal(OPERATING_CASH_ACCOUNT.code, "1010");
  assert.equal(cash.account_name, OPERATING_CASH_ACCOUNT.name);
  assert.equal(cash.type, "asset");
  assert.equal(cash.subtype, "cash");
  assert.equal(cash.normal_balance, "debit");
  assert.equal(cash.active, "true");
});

test("FIN-22: exactly one inactive merged account whose name points at an active surviving account", () => {
  const files = generateArtifact(specs.byId.get("FIN-22"), canon);
  const { rows } = csvTable(files[0].content);
  const inactive = rows.filter((r) => r.active === "false");
  assert.equal(inactive.length, 1);
  const match = /merged into (\d{4})/.exec(inactive[0].account_name);
  assert.ok(match, "inactive account name must say which account it merged into");
  const survivor = rows.find((r) => r.account_code === match[1]);
  assert.ok(survivor && survivor.active === "true", "merge target must be an active account on the chart");
});

test("FIN-22: the control accounts every later FIN generator posts against are exported and on the chart", () => {
  const { rows } = csvTable(generateArtifact(specs.byId.get("FIN-22"), canon)[0].content);
  const byCode = new Map(rows.map((r) => [r.account_code, r]));
  const cases = [
    [AR_CONTROL_ACCOUNT, "1100", "asset", "receivable", "debit"],
    [AP_CONTROL_ACCOUNT, "2000", "liability", "payable", "credit"],
    [ACCRUED_LIABILITIES_ACCOUNT, "2010", "liability", "accrued", "credit"],
    [PREPAID_SOFTWARE_ACCOUNT, "1200", "asset", "prepaid", "debit"],
    [PREPAID_INSURANCE_ACCOUNT, "1210", "asset", "prepaid", "debit"],
    [RETAINED_EARNINGS_PLUG_ACCOUNT, "3200", "equity", "retained_earnings", "credit"],
  ];
  for (const [exported, code, type, subtype, normal] of cases) {
    assert.equal(exported.code, code);
    const row = byCode.get(code);
    assert.ok(row, `${code} missing from the chart`);
    assert.equal(row.account_name, exported.name);
    assert.equal(row.type, type);
    assert.equal(row.subtype, subtype);
    assert.equal(row.normal_balance, normal);
    assert.equal(row.active, "true");
  }
});
