// People and HR cluster 7: the salience sets the benefits census and the
// helpdesk queue both draw people against, built once here so the two
// generators cannot disagree about who already carries a finding.
//
// This module is a shared helper rather than a generator and is never
// registered, the hr-lifecycle.js precedent. It reads nothing it could build:
// the roster comes from lifecycleRoster(), the mixed sensitivity records from
// the HR-17 builder, the case queue from the HR-18 builder and the review cycle
// and the departing employee from buildLifecycleCoordination(), all in process.
// Two things are read off disk because they are frozen facts rather than
// builds: the compensation band dataset's committed bytes, for the one pay row
// above its own band maximum, and every artifact markdown and JSON file, for
// the active employees named by full name.
//
// The six clauses a C7 draw runs under, in the order the data plan steps them:
//
//   1. active, outside the People department, and not EMP-0001;
//   2. hired before 2025-11-01 (the census's qualifying life event pool only);
//   3. holding no mixed sensitivity record;
//   4. named by full name in no artifact file;
//   5. outside the review cycle population and not a case queue subject;
//   6. not the out of band pay row and not the departing employee.
//
// Every pool is published as a guarded figure rather than as "non-empty", and a
// roster, artifact or frozen dataset change that moves one breaks generation
// here instead of moving a draw silently.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildLifecycleCoordination, lifecycleRoster } from "./hr-lifecycle.js";
import { buildMixedSensitivityRecords } from "./hr-17-mixed-sensitivity.js";
import { buildCaseQueue } from "./hr-18-hris-export.js";

const E = "HR-C7";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The departing employee the offboarding set is built around, asserted against the coordination build. */
export const DEPARTING_EMPLOYEE_ID = "EMP-0047";

/** The chief executive, who carries salience of their own. */
export const CHIEF_EXECUTIVE_ID = "EMP-0001";

/** Clause 2's cut: hired before the month the prior open enrollment ran in. */
export const QLE_HIRED_BEFORE = "2025-11-01";

/** The guarded pool sizes (data plan 0.15). */
export const EXPECTED_ACTIVE_ROWS = 582;
export const EXPECTED_REQUESTER_POOL = 438;
export const EXPECTED_QLE_POOL = 419;

/** The guarded set sizes the pools step through (data plan 0.15). */
export const EXPECTED_SET_SIZES = {
  hr17Ids: 40,
  namedIds: 36,
  hr08Population: 57,
  hr18Subjects: 24,
};

/** Quote-aware split of one CSV line, the datagen/src/csv.js escaping read back. */
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
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

function readCsv(relativePath, requiredColumns) {
  let text;
  try {
    text = readFileSync(join(REPO_ROOT, relativePath), "utf8");
  } catch (cause) {
    throw new Error(`${E}: could not read ${relativePath}: ${cause.message}`);
  }
  const [header, ...lines] = text.trim().split("\n");
  const cols = splitCsvLine(header);
  for (const column of requiredColumns) {
    if (!cols.includes(column)) throw new Error(`${E}: ${relativePath} carries no ${column} column`);
  }
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

/**
 * The one pay row above its own band maximum, recomputed from the compensation
 * band dataset's committed bytes. Returned as an id so a caller can exclude it;
 * nothing downstream prints it.
 */
export function outOfBandPayEmployeeId() {
  const bands = readCsv("datasets/hr/compensation-band-dataset/compensation-bands.csv", ["band_id", "band_max"]);
  const pay = readCsv("datasets/hr/compensation-band-dataset/employee-compensation.csv", ["employee_id", "band_id", "base_pay_amount"]);
  const maxByBand = new Map(bands.map((b) => [b.band_id, Number(b.band_max)]));
  const above = pay.filter((row) => {
    const max = maxByBand.get(row.band_id);
    if (max === undefined) throw new Error(`${E}: a committed pay row names a band the band file does not carry`);
    return Number(row.base_pay_amount) > max;
  });
  if (above.length !== 1) {
    throw new Error(`${E}: the committed compensation bytes hold ${above.length} rows above their band maximum, expected 1`);
  }
  return above[0].employee_id;
}

/** Every active employee named by full name in an artifact markdown or JSON file. */
function namedInArtifacts(active) {
  const root = join(REPO_ROOT, "artifacts");
  const corpus = readdirSync(root, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(".md") || name.endsWith(".json"))
    .map((name) => readFileSync(join(root, name), "utf8"))
    .join("\n");
  return new Set(
    active.filter((row) => corpus.includes(`${row.first_name} ${row.last_name}`)).map((row) => row.employee_id)
  );
}

let cached = null;

/**
 * The salience sets and the two pools, built once per process.
 * @returns {{
 *   active: object[], hr17Ids: Set<string>, namedIds: Set<string>, hr08Population: Set<string>,
 *   hr18Subjects: Set<string>, outOfBandPayId: string, departingId: string,
 *   requesterPool: object[], qlePool: object[]
 * }}
 */
export function c7Salience() {
  if (cached) return cached;
  const roster = lifecycleRoster();
  const active = roster
    .filter((row) => row.employment_status === "active")
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  if (active.length !== EXPECTED_ACTIVE_ROWS) {
    throw new Error(`${E}: the roster holds ${active.length} active rows, expected ${EXPECTED_ACTIVE_ROWS}`);
  }

  const hr17Ids = new Set(buildMixedSensitivityRecords().map((row) => row.employee_id));
  const hr18Subjects = new Set(buildCaseQueue(roster).map((row) => row.subject_employee_id));
  const coordination = buildLifecycleCoordination();
  const hr08Population = new Set();
  for (const row of coordination.review.assignments) {
    hr08Population.add(row.reviewer_employee_id);
    hr08Population.add(row.reviewee_employee_id);
  }
  const departingId = coordination.people.departing.employee_id;
  if (departingId !== DEPARTING_EMPLOYEE_ID) {
    throw new Error(`${E}: the lifecycle build's departing employee is ${departingId}, expected ${DEPARTING_EMPLOYEE_ID}`);
  }
  const namedIds = namedInArtifacts(active);
  const outOfBandPayId = outOfBandPayEmployeeId();

  const sets = { hr17Ids, namedIds, hr08Population, hr18Subjects };
  for (const [name, expected] of Object.entries(EXPECTED_SET_SIZES)) {
    if (sets[name].size !== expected) {
      throw new Error(`${E}: the ${name} set holds ${sets[name].size} ids, expected ${expected}`);
    }
  }

  const requesterPool = active
    .filter((row) => row.department !== "People" && row.employee_id !== CHIEF_EXECUTIVE_ID)
    .filter((row) => !hr17Ids.has(row.employee_id))
    .filter((row) => !namedIds.has(row.employee_id))
    .filter((row) => !hr08Population.has(row.employee_id) && !hr18Subjects.has(row.employee_id))
    .filter((row) => row.employee_id !== outOfBandPayId && row.employee_id !== departingId);
  if (requesterPool.length !== EXPECTED_REQUESTER_POOL) {
    throw new Error(`${E}: clauses 1 and 3 to 6 leave ${requesterPool.length} rows, expected ${EXPECTED_REQUESTER_POOL}`);
  }
  const qlePool = requesterPool.filter((row) => row.start_date < QLE_HIRED_BEFORE);
  if (qlePool.length !== EXPECTED_QLE_POOL) {
    throw new Error(`${E}: all six clauses leave ${qlePool.length} rows, expected ${EXPECTED_QLE_POOL}`);
  }

  cached = {
    active, hr17Ids, namedIds, hr08Population, hr18Subjects, outOfBandPayId, departingId,
    requesterPool, qlePool,
  };
  return cached;
}
