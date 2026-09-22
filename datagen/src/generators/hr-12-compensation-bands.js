// HR-12 compensation-band-dataset: what co-002 pays, published as a band
// library any part of the pack can read, and one pay row per active employee,
// with the pay equity question left as a computation over the two.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. The scale is not a choice. The general ledger already fixes it: the
//      March movement on the two salary accounts, read off the committed
//      twenty-four-month actuals at build time, annualises to what this company
//      pays. band_unit_amount is solved once, after every compa ratio is fixed,
//      so that the emitted annual base pay total lands at the published
//      coverage ratio of twelve times that movement, and the generator throws
//      unless the recomputed ratio holds. A band table drawn upward from a
//      market salary survey would put this artifact at roughly twice a shipped,
//      published, guard-checkable finance figure, so the bands are derived
//      downward instead. Every mid is the unit times three published
//      multipliers, and the minimum and the maximum are the mid less and plus
//      the published spread, so the whole table recomputes from the grammar row
//      and the roster alone.
//   2. The category is synthetic and the artifact says so itself.
//      synthetic_equity_cohort is a synthetic-only header over a synthetic-only
//      two-value vocabulary. It is a seeded shuffle inside each band group,
//      splitting every group as evenly as its size allows so that a group's
//      evaluability is a function of size and never of the draw, and it is
//      derived from no first name, surname, email, role, department, location
//      or tenure in the pack. That is the R10 argument in one line: a pay
//      equity exercise needs a category to group on, and the honest way to give
//      it one is to invent a category that names nothing, state in the file
//      that it is invented, and never join a named individual to a protected
//      characteristic. No row here carries a name at all.
//   3. Nothing is flagged. There is no gap flag, no outlier flag, no risk
//      column, no compa_ratio column and no recommendation of any kind. The one
//      employee paid above their own band maximum is found by joining two files
//      and comparing two numbers, and the one group whose two cohort means sit
//      more than the published threshold apart is found by grouping, averaging
//      and subtracting. Every band carries last_pay_review_date, so the second
//      limb of the trigger is a column every row has rather than a mark on one.
//
// No statute is named, no citation and no article number appears, and no
// directive text is quoted: the parameters are published with the plan section
// they came from, and the module that teaches the law owns the wording. No
// percentage is stored, no time of day exists, no date of birth, home city,
// health note or performance rating appears, and every date is ISO and on or
// before the as-of.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addDays, isWeekend, monthEnds } from "../dates.js";
import { cents, toCents } from "../money.js";
import { createRng } from "../seed.js";
import { buildLifecycleCoordination, lifecycleRoster, readHr09Pair } from "./hr-lifecycle.js";

export const id = "HR-12";

/** Prefix on every loud throw, so a failure says which artifact stopped. */
const E = "HR-12";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The universe as-of, printed once per file and never contradicted. */
export const AS_OF = "2026-04-03";

/** The first business day of the plan year the current bands took effect on. */
export const BAND_EFFECTIVE_DATE = "2026-01-05";

/** The earliest a last_adjustment_date may sit: the pay review horizon's own start. */
const ADJUSTMENT_HORIZON_START = "2024-04-01";

export const GRAMMAR_ID = "COMPENSATION-GRAMMAR-2026-04-03";
export const CURRENCY = "USD";
export const PAY_BASIS = "annual";

/** The population pins, recomputed at build time and never typed into a row. */
export const EXPECTED_ACTIVE_ROWS = 582;
export const EXPECTED_BAND_ROWS = 63;

/** Both cohorts must hold at least this many members for a group to be evaluable. */
export const MINIMUM_GROUP_SIZE = 5;

/** The band is the mid less and plus a fifth, published so min and max recompute from mid alone. */
export const BAND_SPREAD_BELOW_PCT = 20;
export const BAND_SPREAD_ABOVE_PCT = 20;

/** Level, department and tier multipliers. Design constants, published in the grammar row. */
export const LEVEL_MULTIPLIERS = {
  IC: 1.00,
  Manager: 1.55,
  Director: 2.15,
  VP: 3.10,
  Executive: 4.60,
};

export const DEPARTMENT_INDEX = {
  Engineering: 1.22,
  Product: 1.16,
  "IT & Security": 1.12,
  Legal: 1.10,
  Finance: 1.04,
  Sales: 1.02,
  Marketing: 0.98,
  People: 0.96,
  Operations: 0.94,
  "Customer Success": 0.90,
  Executive: 1.00,
};

export const TIER_MULTIPLIERS = {
  entry: 0.82,
  core: 1.00,
  senior: 1.18,
  principal: 1.38,
};

/** The closed tier vocabulary, in ascending order. */
export const BAND_TIERS_VOCABULARY = ["entry", "core", "senior", "principal"];

/**
 * band_tier per band, a hand-written design map rather than a rule over the
 * title string, and the reason is one pair of titles on this roster: Staff
 * Engineer is the top individual-contributor rung of the engineering family
 * and Staff Accountant is a junior grade of the finance one, so any rule keyed
 * on the word "Staff" would pay them the same. The rule the map follows is the
 * one the data plan states: senior where a title names a higher grade of a job
 * family that also appears at the same level in the same department, principal
 * where it names that family's top individual-contributor rung, entry where it
 * names a junior or clerical grade of one, and core otherwise.
 *
 * Exported so the test can restate it literally and assert the shipped column
 * against it, the HR-18 discipline.
 */
export const BAND_TIERS = [
  { role_title: "AP Clerk", level: "IC", band_tier: "entry" },
  { role_title: "AR Clerk", level: "IC", band_tier: "entry" },
  { role_title: "Account Executive", level: "IC", band_tier: "core" },
  { role_title: "Chief Executive Officer", level: "Executive", band_tier: "core" },
  { role_title: "Content Marketer", level: "IC", band_tier: "core" },
  { role_title: "Contracts Manager", level: "IC", band_tier: "core" },
  { role_title: "Controller", level: "IC", band_tier: "senior" },
  { role_title: "Corporate Counsel", level: "IC", band_tier: "core" },
  { role_title: "Customer Success Manager", level: "IC", band_tier: "core" },
  { role_title: "Customer Success Manager", level: "Manager", band_tier: "core" },
  { role_title: "Demand Generation Specialist", level: "IC", band_tier: "core" },
  { role_title: "Director, Customer Success", level: "Director", band_tier: "core" },
  { role_title: "Director, Engineering", level: "Director", band_tier: "core" },
  { role_title: "Director, Finance", level: "Director", band_tier: "core" },
  { role_title: "Director, IT & Security", level: "Director", band_tier: "core" },
  { role_title: "Director, Legal", level: "Director", band_tier: "core" },
  { role_title: "Director, Marketing", level: "Director", band_tier: "core" },
  { role_title: "Director, Operations", level: "Director", band_tier: "core" },
  { role_title: "Director, People", level: "Director", band_tier: "core" },
  { role_title: "Director, Product", level: "Director", band_tier: "core" },
  { role_title: "Director, Sales", level: "Director", band_tier: "core" },
  { role_title: "Engineering Manager", level: "Manager", band_tier: "core" },
  { role_title: "Enterprise Account Executive", level: "IC", band_tier: "senior" },
  { role_title: "FP&A Analyst", level: "IC", band_tier: "core" },
  { role_title: "Finance Manager", level: "Manager", band_tier: "core" },
  { role_title: "HR Business Partner", level: "IC", band_tier: "core" },
  { role_title: "IT & Security Manager", level: "Manager", band_tier: "core" },
  { role_title: "IT Administrator", level: "IC", band_tier: "core" },
  { role_title: "Legal Manager", level: "Manager", band_tier: "core" },
  { role_title: "Marketing Manager", level: "IC", band_tier: "core" },
  { role_title: "Marketing Manager", level: "Manager", band_tier: "core" },
  { role_title: "Onboarding Specialist", level: "IC", band_tier: "entry" },
  { role_title: "Operations Analyst", level: "IC", band_tier: "entry" },
  { role_title: "Operations Manager", level: "Manager", band_tier: "core" },
  { role_title: "People Manager", level: "Manager", band_tier: "core" },
  { role_title: "People Operations Specialist", level: "IC", band_tier: "core" },
  { role_title: "Product Analyst", level: "IC", band_tier: "entry" },
  { role_title: "Product Manager", level: "IC", band_tier: "core" },
  { role_title: "Product Manager", level: "Manager", band_tier: "core" },
  { role_title: "Program Manager", level: "IC", band_tier: "core" },
  { role_title: "QA Engineer", level: "IC", band_tier: "core" },
  { role_title: "Recruiter", level: "IC", band_tier: "core" },
  { role_title: "Sales Development Rep", level: "IC", band_tier: "entry" },
  { role_title: "Sales Engineer", level: "IC", band_tier: "core" },
  { role_title: "Sales Manager", level: "Manager", band_tier: "core" },
  { role_title: "Security Engineer", level: "IC", band_tier: "core" },
  { role_title: "Senior Product Manager", level: "IC", band_tier: "senior" },
  { role_title: "Senior Software Engineer", level: "IC", band_tier: "senior" },
  { role_title: "Site Reliability Engineer", level: "IC", band_tier: "core" },
  { role_title: "Software Engineer", level: "IC", band_tier: "core" },
  { role_title: "Staff Accountant", level: "IC", band_tier: "entry" },
  { role_title: "Staff Engineer", level: "IC", band_tier: "principal" },
  { role_title: "Support Engineer", level: "IC", band_tier: "core" },
  { role_title: "VP, Customer Success", level: "VP", band_tier: "core" },
  { role_title: "VP, Engineering", level: "VP", band_tier: "core" },
  { role_title: "VP, Finance", level: "VP", band_tier: "core" },
  { role_title: "VP, IT & Security", level: "VP", band_tier: "core" },
  { role_title: "VP, Legal", level: "VP", band_tier: "core" },
  { role_title: "VP, Marketing", level: "VP", band_tier: "core" },
  { role_title: "VP, Operations", level: "VP", band_tier: "core" },
  { role_title: "VP, People", level: "VP", band_tier: "core" },
  { role_title: "VP, Product", level: "VP", band_tier: "core" },
  { role_title: "VP, Sales", level: "VP", band_tier: "core" },
];

/** The tier census across the 63 bands, a design target the generator recomputes. */
export const TIER_CENSUS = { entry: 7, core: 51, senior: 4, principal: 1 };

/** Work location: a closed list carrying no place name, so it collides with nothing. */
export const WORK_LOCATIONS = ["remote", "headquarters", "satellite_office"];

/** The share each location takes of the 582 rows, drawn rather than dealt. */
const WORK_LOCATION_WEIGHTS = { remote: 0.45, headquarters: 0.35, satellite_office: 0.20 };

/** Where a location puts a person inside their own band, before tenure and before any correction. */
export const LOCATION_COMPA_RANGES = {
  remote: { low: 0.815, high: 0.955 },
  satellite_office: { low: 0.865, high: 1.005 },
  headquarters: { low: 0.915, high: 1.055 },
};

export const TENURE_INCREMENT_PER_YEAR = 0.012;
export const TENURE_INCREMENT_CAP = 0.120;

/** The synthetic category. Two values, neither of them a characteristic. */
export const COHORTS = ["cohort_a", "cohort_b"];

/**
 * The two published control tolerances, enforced on every evaluable group.
 *
 * The tenure tolerance is 18 months rather than the nine the data plan's
 * U-C6-5 recommends, and the roster is what moved it: an exhaustive search over
 * balanced splits of the twenty-four evaluable groups puts the smallest
 * achievable median-tenure difference at fifteen months, in a group of ten
 * whose completed tenure is bimodal, so nine months is not a tolerance this
 * population can meet under any split. Eighteen is the smallest round figure
 * that clears that floor with slack, and it is still a real control: the
 * tenure spread inside a group runs to six years, so the two cohorts' medians
 * are held inside a quarter of it.
 */
export const MEDIAN_TENURE_TOLERANCE_MONTHS = 18;
export const LOCATION_MIX_TOLERANCE_PCT = 25.0;

/** The two trigger parameters and where they came from. No statute is named anywhere. */
export const UNADJUSTED_GAP_THRESHOLD_PCT = 5.00;
export const REMEDIATION_WINDOW_MONTHS = 6;
export const GAP_PARAMETER_SOURCE = "people-hr implementation plan v2 section 3.6";

/** The ledger join: the accounts, the period and the coverage the unit is solved against. */
export const FINANCE_SOURCE_ACCOUNTS = ["6000", "5020"];
export const FINANCE_SOURCE_PERIOD = "2026-03";
export const FINANCE_COVERAGE_TARGET = 0.9400;
export const FINANCE_COVERAGE_FLOOR = 0.9390;
export const FINANCE_COVERAGE_CEILING = 0.9410;

/** Every compa ratio other than the single out-of-band row's sits inside the band, and the two ends are what "inside" means. */
export const COMPA_FLOOR = 0.800;
export const COMPA_CEILING = 1.200;

/** Working margin: no ratio a correction moves may come within this of an end. */
const COMPA_WORKING_FLOOR = 0.8020;
const COMPA_WORKING_CEILING = 1.1980;

/**
 * The rows the out-of-band draw may reach before the breaching group is taken
 * out of it. Recomputed from the roster, the review cycle, the mixed
 * sensitivity set, the offboarding set and a full-name sweep of artifacts/, and
 * asserted against this figure so the clause set is guarded rather than left as
 * "non-empty".
 */
export const CANDIDATE_SET_SIZE = 371;

/** Rows held at exactly a band end, so reading the band as an open interval returns five rather than one. */
export const BOUNDARY_EXACT_COUNT = 4;

/** The breaching group's gap lands here, and every other evaluable group is inside the limit below. */
export const PLANT_GAP_BAND = { low: 6.50, high: 8.50 };
export const NON_PLANT_GAP_LIMIT = 1.80;

/** Bands satisfying both limbs of the trigger across the evaluable groups. */
export const BOTH_LIMBS_CENSUS = 1;

/** The same trigger, both limbs, over every group that holds both cohorts rather than only the evaluable ones. */
export const ALL_GROUPS_BOTH_LIMBS_CENSUS = 9;

/** The two dashes this pack never writes, held as code points so this file carries neither. */
const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

/** Ids are not this artifact's business beyond the band library's own block. */
export const BAND_ID_PREFIX = "BND-";

export const SYNTHETIC_CATEGORY_STATEMENT =
  "synthetic_equity_cohort is a category invented for this dataset and nothing else: it names no real "
  + "characteristic, it is assigned by a seeded shuffle inside each band group and derived from no name, email, "
  + "role, department, location or tenure in this pack, and it stands in for whatever protected characteristic a "
  + "real pay report would analyse, so that the computation can be taught without any row joining a named "
  + "individual to a protected characteristic.";

export const NOT_A_PAY_RECOMMENDATION =
  "This dataset is not a pay recommendation and cannot be read as one: no row carries a proposed amount, a target "
  + "amount, an adjustment, a remedy, a ranking or a flag of any kind, the only amounts here are a band's three "
  + "points and a person's current pay, and the band file carries no person while the person file carries no band "
  + "figure, so no single row states what anybody ought to be paid.";

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "currency", "band_effective_date", "pay_basis", "band_count",
    "employee_count", "evaluable_group_count", "minimum_group_size",
    "band_spread_below_pct", "band_spread_above_pct", "band_unit_amount",
    "level_multipliers", "department_index", "tier_multipliers",
    "work_location_vocabulary", "location_compa_ranges", "tenure_increment_per_year",
    "tenure_increment_cap", "synthetic_equity_cohort_vocabulary",
    "unadjusted_gap_threshold_pct", "remediation_window_months", "gap_parameter_source",
    "median_tenure_tolerance_months", "location_mix_tolerance_pct",
    "annual_base_pay_total", "finance_source_accounts", "finance_source_period",
    "finance_coverage_ratio", "synthetic_category_statement",
    "not_a_pay_recommendation",
  ],
  bands: [
    "band_id", "role_title", "level", "department", "band_tier", "headcount_in_band",
    "band_min", "band_mid", "band_max", "currency", "band_effective_date",
    "last_pay_review_date",
  ],
  employees: [
    "employee_id", "band_id", "base_pay_amount", "currency", "pay_basis",
    "compensation_effective_date", "last_adjustment_date", "work_location",
    "synthetic_equity_cohort",
  ],
};

// ------------------------------------------------------------------ helpers

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

/** Whole months from `fromIso` to `toIso`, the way a remediation window is counted. */
export function monthsBetween(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

/** Completed whole years between two ISO dates. */
function completedYears(fromIso, toIso) {
  return Math.floor(monthsBetween(fromIso, toIso) / 12);
}

/** Every Monday-to-Friday date in an inclusive ISO range, oldest first. */
function businessDaysBetween(startIso, endIso) {
  const out = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) {
    if (!isWeekend(d)) out.push(d);
  }
  return out;
}

const later = (a, b) => (a > b ? a : b);

/** `name=value` pairs joined with a semicolon, the one place a table becomes a cell. */
function serializeTable(table, format = (v) => String(v)) {
  return Object.entries(table).map(([name, value]) => `${name}=${format(value)}`).join(";");
}

/** The three multiplier tables print at two decimals so the grammar reads as a table. */
const twoPlaces = (v) => v.toFixed(2);

function serializeRanges(ranges) {
  return Object.entries(ranges)
    .map(([name, range]) => `${name}=${range.low.toFixed(3)} to ${range.high.toFixed(3)}`)
    .join(";");
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

// ------------------------------------------------------- the frozen reads

/**
 * The roster, in process from the shared lifecycle builder rather than read
 * back off CORE-04's committed CSV, with the four pins the data plan states.
 * A roster regeneration therefore breaks generation rather than shipping a pay
 * file that quietly disagrees with the people file.
 */
function readActiveRoster() {
  const active = lifecycleRoster().filter((row) => row.employment_status === "active");
  if (active.length !== EXPECTED_ACTIVE_ROWS) {
    throw new Error(`${E}: the roster holds ${active.length} active rows against the ${EXPECTED_ACTIVE_ROWS} this artifact is built over`);
  }
  const byPair = new Map();
  for (const row of active) {
    const key = `${row.role_title}\u0000${row.level}`;
    if (!byPair.has(key)) {
      byPair.set(key, { role_title: row.role_title, level: row.level, departments: new Set(), members: [] });
    }
    const group = byPair.get(key);
    group.departments.add(row.department);
    group.members.push(row);
  }
  if (byPair.size !== EXPECTED_BAND_ROWS) {
    throw new Error(`${E}: the roster forms ${byPair.size} distinct active role title and level pairs against the ${EXPECTED_BAND_ROWS} this band table is built over`);
  }
  for (const group of byPair.values()) {
    if (group.departments.size !== 1) {
      throw new Error(`${E}: the pair ${group.role_title} at ${group.level} spans ${group.departments.size} departments, so a band row cannot carry the department as a derived key`);
    }
  }
  const latestStart = active.map((row) => row.start_date).sort().at(-1);
  if (latestStart > AS_OF) {
    throw new Error(`${E}: the roster's latest start date ${latestStart} is after the ${AS_OF} as-of`);
  }
  return { active, byPair };
}

/**
 * The two March salary accounts, read off the committed twenty-four-month
 * actuals at build time the way HR-11 reads the frozen competency library.
 * The general ledger fixes this company's pay scale before a band exists.
 */
export function readMarchSalaryCents() {
  const path = join(REPO_ROOT, "datasets", "finance", "actuals-24mo", "actuals-24mo.csv");
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const header = lines[0].split(",");
  const col = (name) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`${E}: the committed actuals carry no ${name} column`);
    return index;
  };
  const periodAt = col("period");
  const accountAt = col("account_code");
  const amountAt = col("actual_amount");
  const found = new Map();
  for (const line of lines.slice(1)) {
    const cellsOf = line.split(",");
    if (cellsOf[periodAt] !== FINANCE_SOURCE_PERIOD) continue;
    const account = cellsOf[accountAt];
    if (!FINANCE_SOURCE_ACCOUNTS.includes(account)) continue;
    if (found.has(account)) {
      throw new Error(`${E}: the committed actuals carry more than one ${FINANCE_SOURCE_PERIOD} row on account ${account}`);
    }
    found.set(account, toCents(cellsOf[amountAt]));
  }
  for (const account of FINANCE_SOURCE_ACCOUNTS) {
    if (!found.has(account)) {
      throw new Error(`${E}: the committed actuals carry no ${FINANCE_SOURCE_PERIOD} row on account ${account}`);
    }
  }
  const total = FINANCE_SOURCE_ACCOUNTS.reduce((sum, account) => sum + found.get(account), 0);
  if (total <= 0) {
    throw new Error(`${E}: the ${FINANCE_SOURCE_PERIOD} salary accounts sum to ${total} cents, which cannot anchor a band table`);
  }
  return total;
}

/** Every active employee named by full name somewhere under artifacts/. */
function namedInArtifacts(active) {
  const root = join(REPO_ROOT, "artifacts");
  const files = readdirSync(root, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(".md") || name.endsWith(".json"));
  const corpus = files.map((name) => readFileSync(join(root, name), "utf8")).join("\n");
  const named = new Set();
  for (const row of active) {
    if (corpus.includes(`${row.first_name} ${row.last_name}`)) named.add(row.employee_id);
  }
  return named;
}

/** Every employee id holding a row of the mixed sensitivity record set. */
function mixedSensitivitySubjects() {
  const dir = join(REPO_ROOT, "datasets", "hr", "mixed-sensitivity-employee-dataset");
  const subjects = new Set();
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".csv"))) {
    const lines = readFileSync(join(dir, name), "utf8").trim().split("\n");
    const at = lines[0].split(",").indexOf("employee_id");
    if (at < 0) continue;
    for (const line of lines.slice(1)) subjects.add(line.split(",")[at]);
  }
  return subjects;
}

/** The employee the offboarding set has in notice, read off its own exit record. */
function departingEmployeeId() {
  const path = join(REPO_ROOT, "datasets", "hr", "offboarding-checklist-access-inventory", "exit-record.csv");
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const at = lines[0].split(",").indexOf("employee_id");
  if (at < 0 || lines.length < 2) throw new Error(`${E}: the committed exit record carries no employee_id row`);
  return lines[1].split(",")[at];
}

// ----------------------------------------------------------------- the build

export function generate() {
  const { active, byPair } = readActiveRoster();
  const marchSalaryCents = readMarchSalaryCents();

  // ---- the band library, one row per pair, in pair-ascending order
  const bands = [...byPair.values()].sort((a, b) => {
    if (a.role_title !== b.role_title) return a.role_title < b.role_title ? -1 : 1;
    return a.level < b.level ? -1 : a.level > b.level ? 1 : 0;
  });
  const tierByPair = new Map(BAND_TIERS.map((entry) => [`${entry.role_title}\u0000${entry.level}`, entry.band_tier]));
  if (tierByPair.size !== BAND_TIERS.length) {
    throw new Error(`${E}: the band tier map carries a repeated role title and level pair`);
  }
  const tierCensus = { entry: 0, core: 0, senior: 0, principal: 0 };
  bands.forEach((band, index) => {
    band.band_id = `${BAND_ID_PREFIX}${String(index + 1).padStart(2, "0")}`;
    band.department = [...band.departments][0];
    const key = `${band.role_title}\u0000${band.level}`;
    const tier = tierByPair.get(key);
    if (!tier) throw new Error(`${E}: the band tier map carries no entry for ${band.role_title} at ${band.level}`);
    if (!BAND_TIERS_VOCABULARY.includes(tier)) {
      throw new Error(`${E}: ${tier} is not one of the four published band tiers`);
    }
    band.band_tier = tier;
    tierCensus[tier] += 1;
    if (!(band.level in LEVEL_MULTIPLIERS)) {
      throw new Error(`${E}: the roster carries the level ${band.level}, which the level multiplier table has no key for`);
    }
    if (!(band.department in DEPARTMENT_INDEX)) {
      throw new Error(`${E}: the roster carries the department ${band.department}, which the department index has no key for`);
    }
    band.weight = LEVEL_MULTIPLIERS[band.level] * DEPARTMENT_INDEX[band.department] * TIER_MULTIPLIERS[tier];
  });
  for (const [tier, expected] of Object.entries(TIER_CENSUS)) {
    if (tierCensus[tier] !== expected) {
      throw new Error(`${E}: the band tier census holds ${tierCensus[tier]} ${tier} bands against the ${expected} the design fixes`);
    }
  }
  const bandByPair = new Map(bands.map((band) => [`${band.role_title}\u0000${band.level}`, band]));

  // ---- where a person works and where that puts them in their own band
  const people = active.slice().sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  const locationRng = createRng(id, "work-location");
  const locationBaseRng = createRng(id, "location-base");
  for (const person of people) {
    const draw = locationRng.float();
    person.work_location = draw < WORK_LOCATION_WEIGHTS.remote
      ? "remote"
      : draw < WORK_LOCATION_WEIGHTS.remote + WORK_LOCATION_WEIGHTS.headquarters
        ? "headquarters"
        : "satellite_office";
    const range = LOCATION_COMPA_RANGES[person.work_location];
    const tenureYears = completedYears(person.start_date, AS_OF);
    person.tenure_months = monthsBetween(person.start_date, AS_OF);
    person.tenure_increment = Math.min(round4(TENURE_INCREMENT_PER_YEAR * tenureYears), TENURE_INCREMENT_CAP);
    person.compa = round4(locationBaseRng.amount(range.low, range.high, 4) + person.tenure_increment);
    person.band = bandByPair.get(`${person.role_title}\u0000${person.level}`);
    if (!person.band) throw new Error(`${E}: an active roster row resolves to no band`);
    person.fixed = false;
  }

  // ---- the synthetic category: a balanced shuffle inside each band group
  const groups = bands.map((band) => ({
    band,
    members: people.filter((person) => person.band === band),
  }));
  for (const group of groups) {
    if (group.members.length !== group.band.members.length) {
      throw new Error(`${E}: a band group's membership does not agree with the roster`);
    }
  }
  const cohortRng = createRng(id, "equity-cohort");
  const REDRAW_BOUND = 400;
  for (const group of groups) {
    const size = group.members.length;
    const evaluableSize = Math.floor(size / 2) >= MINIMUM_GROUP_SIZE;
    let accepted = false;
    for (let attempt = 0; attempt < REDRAW_BOUND && !accepted; attempt += 1) {
      const shuffled = cohortRng.shuffle(group.members);
      const cut = Math.ceil(size / 2);
      // Which cohort takes the extra member of an odd group is drawn too. If it
      // always went to the first one, every group of one would put its single
      // member in the same cohort and a reader could read the cohort straight
      // off the group size, which is the whole executive and vice president
      // population in one step.
      const takesTheExtra = cohortRng.chance(0.5);
      const larger = shuffled.slice(0, cut);
      const smaller = shuffled.slice(cut);
      const a = takesTheExtra ? larger : smaller;
      const b = takesTheExtra ? smaller : larger;
      if (!evaluableSize) {
        group.a = a;
        group.b = b;
        accepted = true;
        break;
      }
      const tenureGap = Math.abs(median(a.map((p) => p.tenure_months)) - median(b.map((p) => p.tenure_months)));
      if (tenureGap > MEDIAN_TENURE_TOLERANCE_MONTHS) continue;
      const shareGap = WORK_LOCATIONS.some((location) => {
        const shareA = (100 * a.filter((p) => p.work_location === location).length) / a.length;
        const shareB = (100 * b.filter((p) => p.work_location === location).length) / b.length;
        return Math.abs(shareA - shareB) > LOCATION_MIX_TOLERANCE_PCT;
      });
      if (shareGap) continue;
      group.a = a;
      group.b = b;
      accepted = true;
    }
    if (!accepted) {
      throw new Error(`${E}: a band group of ${size} could not be split into two cohorts meeting both published control tolerances inside ${REDRAW_BOUND} draws`);
    }
    for (const person of group.a) person.cohort = COHORTS[0];
    for (const person of group.b) person.cohort = COHORTS[1];
    group.evaluable = group.a.length >= MINIMUM_GROUP_SIZE && group.b.length >= MINIMUM_GROUP_SIZE;
  }
  const evaluableGroups = groups.filter((group) => group.evaluable);

  // ---- the breaching group is chosen first, so the out-of-band draw can exclude it
  const gapGroupRng = createRng(id, "gap-group");
  const plantGroup = gapGroupRng.pick(evaluableGroups);
  const plantMembers = new Set(plantGroup.members.map((person) => person.employee_id));

  // ---- the out-of-band carrier, drawn over the rows every clause leaves standing
  const named = namedInArtifacts(active);
  const sensitivitySubjects = mixedSensitivitySubjects();
  const departing = departingEmployeeId();
  const { review } = buildLifecycleCoordination();
  const overdue = review.assignments.filter((row) => !row.submitted_date && row.due_date < AS_OF);
  if (overdue.length !== 1) {
    throw new Error(`${E}: the committed review cycle holds ${overdue.length} assignments that are outstanding and past their due date, against the one the clause set is written over`);
  }
  const overdueEnds = new Set([overdue[0].reviewer_employee_id, overdue[0].reviewee_employee_id]);
  const reviewPopulation = new Set();
  for (const row of review.assignments) {
    reviewPopulation.add(row.reviewer_employee_id);
    reviewPopulation.add(row.reviewee_employee_id);
  }
  // The frozen pair is resolved off its own two documents rather than typed,
  // so a later edit to them moves this clause instead of silently leaving a
  // person who now carries a second finding inside the draw.
  const hr09 = readHr09Pair(lifecycleRoster());
  const frozenPair = [hr09.manager.employee_id, hr09.report.employee_id];
  const OUT_OF_ROSTER = "EMP-0601";
  const candidates = people.filter((person) => person.level === "IC")
    .filter((person) => !frozenPair.includes(person.employee_id))
    .filter((person) => !overdueEnds.has(person.employee_id))
    .filter((person) => person.employee_id !== departing && person.employee_id !== OUT_OF_ROSTER)
    .filter((person) => !named.has(person.employee_id))
    .filter((person) => !sensitivitySubjects.has(person.employee_id))
    .filter((person) => !reviewPopulation.has(person.employee_id));
  if (candidates.length !== CANDIDATE_SET_SIZE) {
    throw new Error(`${E}: the clause set leaves ${candidates.length} rows standing against the ${CANDIDATE_SET_SIZE} it is guarded at`);
  }
  const drawable = candidates.filter((person) => !plantMembers.has(person.employee_id));
  if (drawable.length === 0) {
    throw new Error(`${E}: every row the clause set leaves standing sits inside the breaching group`);
  }
  const outlierRng = createRng(id, "band-outlier");
  const carrier = outlierRng.pick(drawable);
  carrier.compa = round4(COMPA_CEILING + outlierRng.amount(0.03, 0.08, 4));
  carrier.fixed = true;

  // ---- four rows held at exactly a band end, so an open interval returns five
  const boundaryRng = createRng(id, "band-boundary");
  const boundaryPool = drawable.filter((person) => person !== carrier);
  if (boundaryPool.length < BOUNDARY_EXACT_COUNT) {
    throw new Error(`${E}: fewer than ${BOUNDARY_EXACT_COUNT} rows remain for the boundary-exact holds`);
  }
  const boundaryRows = boundaryRng.shuffle(boundaryPool).slice(0, BOUNDARY_EXACT_COUNT)
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  boundaryRows.forEach((person, index) => {
    person.compa = index < BOUNDARY_EXACT_COUNT / 2 ? COMPA_FLOOR : COMPA_CEILING;
    person.fixed = true;
  });

  // ---- the gap, constructed rather than drawn
  const gapRng = createRng(id, "gap-target");
  for (const group of evaluableGroups) {
    const target = group === plantGroup
      ? gapRng.amount(PLANT_GAP_BAND.low / 100, PLANT_GAP_BAND.high / 100, 6)
      : gapRng.amount(-0.0170, 0.0170, 6);
    applyGapTarget(group, target);
  }

  // ---- every ratio is now final, so the ledger unit is solved once
  let weightSum = 0;
  for (const person of people) weightSum += person.band.weight * person.compa;
  const coverageDollars = (FINANCE_COVERAGE_TARGET * 12 * marchSalaryCents) / 100;
  const unitCents = Math.round((coverageDollars / weightSum) * 100);
  for (const band of bands) {
    band.midCents = Math.round(unitCents * band.weight);
    band.minCents = Math.round(band.midCents * (1 - BAND_SPREAD_BELOW_PCT / 100));
    band.maxCents = Math.round(band.midCents * (1 + BAND_SPREAD_ABOVE_PCT / 100));
  }
  for (const person of people) person.payCents = Math.round(person.band.midCents * person.compa);
  const totalCents = people.reduce((sum, person) => sum + person.payCents, 0);
  const coverageRatio = round4(totalCents / (12 * marchSalaryCents));
  if (coverageRatio < FINANCE_COVERAGE_FLOOR || coverageRatio > FINANCE_COVERAGE_CEILING) {
    throw new Error(`${E}: the emitted annual base pay total covers ${coverageRatio} of twelve times the ${FINANCE_SOURCE_PERIOD} salary accounts, outside the ${FINANCE_COVERAGE_FLOOR} to ${FINANCE_COVERAGE_CEILING} the solve is guarded at`);
  }

  // ---- the band positions, asserted rather than assumed
  let aboveBand = 0;
  let belowBand = 0;
  let onBoundary = 0;
  for (const person of people) {
    if (person.payCents > person.band.maxCents) aboveBand += 1;
    else if (person.payCents < person.band.minCents) belowBand += 1;
    else if (person.payCents === person.band.maxCents || person.payCents === person.band.minCents) onBoundary += 1;
  }
  if (aboveBand !== 1) throw new Error(`${E}: ${aboveBand} rows sit above their own band maximum against the one this artifact plants`);
  if (belowBand !== 0) throw new Error(`${E}: ${belowBand} rows sit below their own band minimum, and this artifact plants none`);
  if (onBoundary !== BOUNDARY_EXACT_COUNT) {
    throw new Error(`${E}: ${onBoundary} rows sit exactly on a band end against the ${BOUNDARY_EXACT_COUNT} the design holds there`);
  }

  // ---- the gaps, recomputed from the amounts the file will carry
  let breaching = 0;
  for (const group of evaluableGroups) {
    group.gapPct = round2(gapFromPay(group));
    if (Math.abs(group.gapPct) >= UNADJUSTED_GAP_THRESHOLD_PCT) breaching += 1;
    if (group === plantGroup) {
      if (group.gapPct < PLANT_GAP_BAND.low || group.gapPct > PLANT_GAP_BAND.high) {
        throw new Error(`${E}: the constructed group of ${group.members.length} lands at ${group.gapPct} against the ${PLANT_GAP_BAND.low} to ${PLANT_GAP_BAND.high} band the design fixes`);
      }
    } else if (Math.abs(group.gapPct) > NON_PLANT_GAP_LIMIT) {
      throw new Error(`${E}: an evaluable group of ${group.members.length} lands at ${group.gapPct}, outside the ${NON_PLANT_GAP_LIMIT} every other evaluable group is constructed inside`);
    }
  }
  if (breaching !== 1) {
    throw new Error(`${E}: ${breaching} evaluable groups carry a gap at or above the published threshold against the one this artifact plants`);
  }

  // ---- last_pay_review_date on every band, and the trigger's second limb
  const reviewMonthEnds = monthEnds(24, "2026-03-31");
  const payReviewRng = createRng(id, "pay-review");
  for (const band of bands) band.last_pay_review_date = payReviewRng.pick(reviewMonthEnds);
  const isStale = (band) => monthsBetween(band.last_pay_review_date, AS_OF) >= REMEDIATION_WINDOW_MONTHS;
  for (let attempt = 0; attempt < REDRAW_BOUND && !isStale(plantGroup.band); attempt += 1) {
    plantGroup.band.last_pay_review_date = payReviewRng.pick(reviewMonthEnds);
  }
  if (!isStale(plantGroup.band)) {
    throw new Error(`${E}: the breaching group's band could not be drawn a pay review date at least ${REMEDIATION_WINDOW_MONTHS} months before the as-of inside ${REDRAW_BOUND} draws`);
  }
  const staleBands = bands.filter(isStale).length;
  if (staleBands <= 1) {
    throw new Error(`${E}: ${staleBands} bands carry a pay review at least ${REMEDIATION_WINDOW_MONTHS} months before the as-of, which would make that column a flag rather than a limb`);
  }
  const bothLimbs = evaluableGroups
    .filter((group) => Math.abs(group.gapPct) >= UNADJUSTED_GAP_THRESHOLD_PCT && isStale(group.band)).length;
  if (bothLimbs !== BOTH_LIMBS_CENSUS) {
    throw new Error(`${E}: ${bothLimbs} evaluable groups satisfy both limbs of the trigger against the ${BOTH_LIMBS_CENSUS} this artifact plants`);
  }

  // ---- the same trigger, both limbs, over every group holding both cohorts
  // rather than only the evaluable ones, which is what the minimum group size
  // is holding back
  const allGroupsBothCohorts = groups.filter((group) => group.a.length > 0 && group.b.length > 0);
  const allGroupsBothLimbs = allGroupsBothCohorts
    .filter((group) => Math.abs(round2(gapFromPay(group))) >= UNADJUSTED_GAP_THRESHOLD_PCT && isStale(group.band)).length;
  if (allGroupsBothLimbs !== ALL_GROUPS_BOTH_LIMBS_CENSUS) {
    throw new Error(`${E}: ${allGroupsBothLimbs} groups holding both cohorts satisfy both limbs of the trigger against the ${ALL_GROUPS_BOTH_LIMBS_CENSUS} this artifact plants`);
  }

  // ---- the two dates every pay row carries
  const effectiveRng = createRng(id, "compensation-effective-date");
  const adjustmentRng = createRng(id, "last-adjustment-date");
  for (const person of people) {
    const effectiveWindow = businessDaysBetween(later(person.start_date, BAND_EFFECTIVE_DATE), AS_OF);
    if (effectiveWindow.length === 0) {
      throw new Error(`${E}: an active row leaves no business day between its start date and the as-of`);
    }
    person.compensation_effective_date = effectiveRng.pick(effectiveWindow);
    const adjustmentWindow = businessDaysBetween(
      later(person.start_date, ADJUSTMENT_HORIZON_START),
      person.compensation_effective_date
    );
    person.last_adjustment_date = adjustmentWindow.length === 0
      ? person.compensation_effective_date
      : adjustmentRng.pick(adjustmentWindow);
  }

  // ---- the rows
  const bandRows = bands.map((band) => ({
    band_id: band.band_id,
    role_title: band.role_title,
    level: band.level,
    department: band.department,
    band_tier: band.band_tier,
    headcount_in_band: band.members.length,
    band_min: cents(band.minCents),
    band_mid: cents(band.midCents),
    band_max: cents(band.maxCents),
    currency: CURRENCY,
    band_effective_date: BAND_EFFECTIVE_DATE,
    last_pay_review_date: band.last_pay_review_date,
  }));
  const employeeRows = people.map((person) => ({
    employee_id: person.employee_id,
    band_id: person.band.band_id,
    base_pay_amount: cents(person.payCents),
    currency: CURRENCY,
    pay_basis: PAY_BASIS,
    compensation_effective_date: person.compensation_effective_date,
    last_adjustment_date: person.last_adjustment_date,
    work_location: person.work_location,
    synthetic_equity_cohort: person.cohort,
  }));
  const grammarRow = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    currency: CURRENCY,
    band_effective_date: BAND_EFFECTIVE_DATE,
    pay_basis: PAY_BASIS,
    band_count: bands.length,
    employee_count: people.length,
    evaluable_group_count: evaluableGroups.length,
    minimum_group_size: MINIMUM_GROUP_SIZE,
    band_spread_below_pct: BAND_SPREAD_BELOW_PCT,
    band_spread_above_pct: BAND_SPREAD_ABOVE_PCT,
    band_unit_amount: cents(unitCents),
    level_multipliers: serializeTable(LEVEL_MULTIPLIERS, twoPlaces),
    department_index: serializeTable(DEPARTMENT_INDEX, twoPlaces),
    tier_multipliers: serializeTable(TIER_MULTIPLIERS, twoPlaces),
    work_location_vocabulary: WORK_LOCATIONS.join(";"),
    location_compa_ranges: serializeRanges(LOCATION_COMPA_RANGES),
    tenure_increment_per_year: TENURE_INCREMENT_PER_YEAR.toFixed(3),
    tenure_increment_cap: TENURE_INCREMENT_CAP.toFixed(3),
    synthetic_equity_cohort_vocabulary: COHORTS.join(";"),
    unadjusted_gap_threshold_pct: UNADJUSTED_GAP_THRESHOLD_PCT.toFixed(2),
    remediation_window_months: REMEDIATION_WINDOW_MONTHS,
    gap_parameter_source: GAP_PARAMETER_SOURCE,
    median_tenure_tolerance_months: MEDIAN_TENURE_TOLERANCE_MONTHS,
    location_mix_tolerance_pct: LOCATION_MIX_TOLERANCE_PCT.toFixed(1),
    annual_base_pay_total: cents(totalCents),
    finance_source_accounts: FINANCE_SOURCE_ACCOUNTS.join(";"),
    finance_source_period: FINANCE_SOURCE_PERIOD,
    finance_coverage_ratio: coverageRatio.toFixed(4),
    synthetic_category_statement: SYNTHETIC_CATEGORY_STATEMENT,
    not_a_pay_recommendation: NOT_A_PAY_RECOMMENDATION,
  };

  const files = [
    { path: "compensation-grammar.csv", content: toCsv(COLUMNS.grammar, [grammarRow]) },
    { path: "compensation-bands.csv", content: toCsv(COLUMNS.bands, bandRows) },
    { path: "employee-compensation.csv", content: toCsv(COLUMNS.employees, employeeRows) },
  ];
  assertEmittedBytes(files, bands, [
    ["compensation-grammar.csv", [grammarRow]],
    ["compensation-bands.csv", bandRows],
    ["employee-compensation.csv", employeeRows],
  ]);
  return files;
}

/**
 * Hit a group's target gap exactly, by shifting the two cohort means around the
 * group's own mean and distributing each shift over the members whose amounts
 * are not held constant, in proportion to the headroom each of them has left
 * inside the band. The group total does not move, which is what keeps the
 * solved unit a single division rather than an iteration, and a group that
 * cannot absorb its own shift stops the build with its size and the shift
 * rather than clamping a ratio onto the band's edge.
 */
function applyGapTarget(group, target) {
  const groupMean = mean(group.members.map((person) => person.compa));
  const nA = group.a.length;
  const nB = group.b.length;
  const deviationA = target / (1 - target + nA / nB);
  const deviationB = (-nA * deviationA) / nB;
  shiftCohort(group, group.a, groupMean * (1 + deviationA), target);
  shiftCohort(group, group.b, groupMean * (1 + deviationB), target);
}

function shiftCohort(group, cohort, targetMean, target) {
  const free = cohort.filter((person) => !person.fixed);
  if (free.length === 0) {
    throw new Error(`HR-12: a cohort of a group of ${group.members.length} holds no member whose amount is free to move`);
  }
  const held = cohort.filter((person) => person.fixed).reduce((sum, person) => sum + person.compa, 0);
  const wanted = cohort.length * targetMean - held;
  const current = free.reduce((sum, person) => sum + person.compa, 0);
  const shift = wanted - current;
  const capacity = free.map((person) => (shift >= 0
    ? COMPA_WORKING_CEILING - person.compa
    : person.compa - COMPA_WORKING_FLOOR));
  const room = capacity.reduce((sum, value) => sum + value, 0);
  if (room <= 0 || Math.abs(shift) > room) {
    throw new Error(`HR-12: a group of ${group.members.length} cannot absorb a cohort shift of ${round4(shift)} inside the band, against ${round4(room)} of headroom, for a target gap of ${round4(target)}`);
  }
  free.forEach((person, index) => {
    person.compa = round4(person.compa + (shift * capacity[index]) / room);
  });
}

/** The gap a reader recomputes: two cohort means of the amounts the file carries. */
function gapFromPay(group) {
  const midCents = group.band.midCents ?? 1;
  const payOf = (person) => (person.payCents ?? Math.round(midCents * person.compa));
  const meanA = mean(group.a.map(payOf));
  const meanB = mean(group.b.map(payOf));
  return (100 * (meanA - meanB)) / meanA;
}

/**
 * The last screen before the bytes leave: the id block is dense, unique and
 * used nowhere else in the run, and nothing that should not be in a pay file is
 * in one.
 */
function assertEmittedBytes(files, bands, rowSets) {
  const expected = bands.map((band) => band.band_id);
  if (new Set(expected).size !== expected.length) {
    throw new Error(`${E}: the band id block repeats an id`);
  }
  expected.forEach((bandId, index) => {
    const dense = `${BAND_ID_PREFIX}${String(index + 1).padStart(2, "0")}`;
    if (bandId !== dense) throw new Error(`${E}: the band id block is not dense at ${bandId}`);
  });
  const known = new Set(expected);
  for (const file of files) {
    for (const match of file.content.matchAll(/BND-[0-9]+/g)) {
      if (!known.has(match[0])) {
        throw new Error(`${E}: ${file.path} carries ${match[0]}, which is not one of this artifact's band ids`);
      }
    }
    if (file.content.includes(EN_DASH) || file.content.includes(EM_DASH)) {
      throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    }
  }
  // The symbol and separator screens run cell by cell rather than over the file
  // text, because a comma between two numeric cells is the CSV's own delimiter
  // and reads as a thousands separator to a screen that cannot see where a cell
  // ends.
  for (const [path, rows] of rowSets) {
    for (const row of rows) {
      for (const [column, value] of Object.entries(row)) {
        const cell = String(value);
        if (cell.includes("%") || cell.includes("$")) {
          throw new Error(`${E}: ${path} carries a percentage or a currency symbol in ${column}, and this pack writes neither in a cell`);
        }
        if (/\d,\d{3}/.test(cell)) {
          throw new Error(`${E}: ${path} carries a thousands separator in ${column}`);
        }
      }
    }
  }
}
