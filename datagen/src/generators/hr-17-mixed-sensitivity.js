// HR-17 mixed-sensitivity-employee-dataset: forty employee records in which
// sensitivity is a computed property of the fields that are actually populated,
// rather than a label somebody typed.
//
// Three things make this dataset an exercise instead of a table:
//
//   1. The seven identifying columns are carried through from CORE-04 and are
//      never retyped. The roster is built in process, the FIN-19 idiom, so a
//      roster change lands here rather than being outvoted by a stale copy.
//   2. The tier rule is total and reads only the two published field classes.
//      `special_category_fields` is the health note, the occupational health
//      status and the trade union field. `restricted_fields` is the date of
//      birth, the criminal record check and the immigration status. Everything
//      else is ordinary. A record's tier is the first clause that matches, so
//      every record lands in exactly one tier and the tier is recomputable by
//      anyone holding the two lists.
//   3. The criminal record check and the immigration status sit in
//      `restricted` and not in `special_category`. That is deliberate: a field
//      can be sensitive without being a special category, and the distinction
//      is the argument the record set exists to carry. No statutory citation
//      appears anywhere in the file.
//
// `lawful_basis` follows the tier the row declares, through a published
// one-to-one map, so a wrong tier propagates into a wrong basis. That is the
// second leg of the one mislabeled record: the tier disagrees with the fields,
// and the basis then disagrees with the fields as well.
//
// Nothing here says which record that is. It is found by recomputing the rule.
import { toCsv } from "../csv.js";
import { addDays, diffDays } from "../dates.js";
import { createRng } from "../seed.js";
import { drawUniqueNames } from "../namePool.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "HR-17";

export const COLUMNS = [
  "record_id", "employee_id", "full_name", "work_email", "department", "role_title",
  "manager_employee_id", "hire_date", "date_of_birth", "home_city",
  "emergency_contact_name", "emergency_contact_phone", "health_accommodation_note",
  "occupational_health_status", "trade_union_membership",
  "criminal_record_check_status", "immigration_status", "sensitivity_tier",
  "lawful_basis", "extracted_on",
];

/** The extract stamp every row carries. The people-hr universe "now" week. */
export const EXTRACTED_ON = "2026-04-03";

/** Row count, a fixed constant rather than a function of the roster. */
export const RECORD_COUNT = 40;

/**
 * The two published field classes, and the only inputs to the tier rule. A
 * field is populated when its cell is non-empty; everything outside these two
 * lists is ordinary.
 *
 * HR-17's test carries its own literal copies of both lists and of the map
 * below, and asserts they still equal these, so a silent reclassification here
 * is a red test rather than a quietly different dataset.
 */
export const SPECIAL_CATEGORY_FIELDS = [
  "health_accommodation_note", "occupational_health_status", "trade_union_membership",
];

export const RESTRICTED_FIELDS = [
  "date_of_birth", "criminal_record_check_status", "immigration_status",
];

/** Tier to lawful basis, one to one. A wrong tier therefore carries a wrong basis. */
export const LAWFUL_BASIS_BY_TIER = {
  special_category: "explicit_consent",
  restricted: "legal_obligation",
  ordinary: "contract",
};

/** The two roster rows no HR cluster 1 artifact draws on. */
const EXCLUDED_EMPLOYEE_IDS = new Set(["EMP-0001", "EMP-0002"]);

/**
 * A department contributes at least two records once it carries this many
 * active roster rows, and no department contributes more than eight, so no
 * single department can stand in for the company.
 */
export const STRATUM_FLOOR = 20;
export const STRATUM_MIN = 2;
export const STRATUM_MAX = 8;

/** How many records each department contributes. Sums to RECORD_COUNT. */
export const DEPARTMENT_ALLOCATION = [
  ["Engineering", 8],
  ["Sales", 6],
  ["Customer Success", 5],
  ["Product", 4],
  ["Marketing", 4],
  ["Finance", 3],
  ["IT & Security", 3],
  ["People", 3],
  ["Operations", 2],
  ["Legal", 2],
];

/** Design counts: how the forty records split across the three populations. */
export const SPECIAL_CATEGORY_RECORDS = 12;
export const RESTRICTED_ONLY_RECORDS = 9;
export const ORDINARY_RECORDS = 19;

// ----------------------------------------------------------- drawn vocabularies
//
// Every value below is generic, neutral and free of any diagnosis, nationality
// or statute. A note records an adjustment that was made, not a condition.

const HEALTH_ACCOMMODATION_NOTES = [
  "adjusted start time agreed after an occupational health referral",
  "ergonomic chair and sit stand desk provided at the desk",
  "phased return to full hours after an extended period of leave",
  "screen reading software installed on the issued laptop",
  "quiet room reserved for scheduled rest breaks",
  "reduced travel expectation agreed for the current period",
];

const OCCUPATIONAL_HEALTH_STATUSES = [
  "cleared", "cleared with adjustments", "assessment scheduled", "referral open", "review due",
];

const TRADE_UNION_MEMBERSHIPS = ["member", "workplace representative"];

const CRIMINAL_RECORD_CHECK_STATUSES = [
  "cleared", "pending", "renewal due", "not required for this role",
];

const IMMIGRATION_STATUSES = [
  "work authorization verified",
  "employer sponsored work permit",
  "work permit renewal due",
  "permanent work authorization",
];

/**
 * Invented town names in a plain American shape. None of them is a canon
 * company name and none is a name the roster pool carries; the generator
 * checks the first of those against canon at build time rather than trusting
 * this comment.
 */
export const HOME_CITIES = [
  "Ridgemont Falls", "Elkhorn Park", "New Haverbrook", "Stonebury",
  "Alder Creek", "Port Wexley", "Granite Bend", "Halstead Springs",
  "Mapleton Heights", "Silverbrook", "Coldwater Ridge", "Wilder Bend",
  "Quarry Hills", "Lakemont Park", "Braddock Hollow", "Tallgrass Junction",
];

/**
 * The non-empty field patterns a populated record can carry. A special
 * category record carries at least one special category field; a restricted
 * only record carries at least one restricted field and no special category
 * field at all.
 */
const SPECIAL_CATEGORY_PATTERNS = [
  ["health_accommodation_note"],
  ["occupational_health_status"],
  ["trade_union_membership"],
  ["health_accommodation_note", "occupational_health_status"],
  ["occupational_health_status", "trade_union_membership"],
];

const RESTRICTED_PATTERNS = [
  ["date_of_birth"],
  ["date_of_birth", "criminal_record_check_status"],
  ["date_of_birth", "immigration_status"],
  ["date_of_birth", "criminal_record_check_status", "immigration_status"],
  ["criminal_record_check_status"],
  ["immigration_status"],
];

/** The CORE-04 roster, built from its own seeded stream (the FIN-04 convention). */
export function coreRoster() {
  return buildRoster(createRng("CORE-04", "roster"));
}

/** The tier the published rule computes from a record's own populated fields. */
export function tierFromFields(row) {
  if (SPECIAL_CATEGORY_FIELDS.some((field) => row[field] !== "")) return "special_category";
  if (RESTRICTED_FIELDS.some((field) => row[field] !== "")) return "restricted";
  return "ordinary";
}

/**
 * The forty subjects, stratified by department and drawn from the active
 * roster. Sorted by employee_id, which is the order record_id runs in.
 * @returns {object[]} CORE-04 rows
 */
function selectSubjects(roster) {
  const rng = createRng(id, "subjects");
  const eligible = roster.filter(
    (r) => r.employment_status === "active" && !EXCLUDED_EMPLOYEE_IDS.has(r.employee_id)
  );

  const byDepartment = new Map();
  for (const person of eligible) {
    if (!byDepartment.has(person.department)) byDepartment.set(person.department, []);
    byDepartment.get(person.department).push(person);
  }

  const allocated = new Map(DEPARTMENT_ALLOCATION);
  const total = [...allocated.values()].reduce((a, b) => a + b, 0);
  if (total !== RECORD_COUNT) {
    throw new Error(`${id}: the department allocation sums to ${total}, expected ${RECORD_COUNT}`);
  }
  for (const [department, pool] of byDepartment) {
    const count = allocated.get(department) ?? 0;
    if (pool.length >= STRATUM_FLOOR && (count < STRATUM_MIN || count > STRATUM_MAX)) {
      throw new Error(
        `${id}: ${department} carries ${pool.length} active rows and contributes ${count} records; `
        + `a department at or above ${STRATUM_FLOOR} contributes ${STRATUM_MIN} to ${STRATUM_MAX}`
      );
    }
    if (count > STRATUM_MAX) {
      throw new Error(`${id}: ${department} contributes ${count} records, above the cap of ${STRATUM_MAX}`);
    }
  }

  const chosen = [];
  for (const [department, count] of DEPARTMENT_ALLOCATION) {
    const pool = (byDepartment.get(department) ?? [])
      .slice()
      .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    if (pool.length < count) {
      throw new Error(`${id}: ${department} holds ${pool.length} eligible rows, the allocation needs ${count}`);
    }
    chosen.push(...rng.shuffle(pool).slice(0, count));
  }
  return chosen.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
}

/**
 * A date of birth compatible with the hire date: an adult working age at hire,
 * and an age at the extract date that a working roster can carry.
 */
function drawBirthDate(rng, hireDate) {
  const ageAtHire = rng.int(23, 52);
  return addDays(hireDate, -(ageAtHire * 365 + rng.int(0, 364)));
}

/** Emergency contact names, unique and colliding with no roster name. */
function drawContactNames(roster, count) {
  const rng = createRng(id, "emergency-contacts");
  const rosterNames = new Set(roster.map((r) => `${r.first_name} ${r.last_name}`));
  const names = [];
  const seen = new Set();
  let guard = 0;
  while (names.length < count) {
    guard += 1;
    if (guard > count * 200) throw new Error(`${id}: could not draw ${count} contact names outside the roster`);
    const [drawn] = drawUniqueNames(rng, 1);
    const full = `${drawn.firstName} ${drawn.lastName}`;
    if (rosterNames.has(full) || seen.has(full)) continue;
    seen.add(full);
    names.push(full);
  }
  return names;
}

/** Obviously synthetic, well formed North American numbers in the 555 block. */
function drawContactPhones(count) {
  const rng = createRng(id, "emergency-phones");
  const pool = [];
  for (let n = 100; n < 200; n += 1) pool.push(`(555) 555-0${n}`);
  return rng.shuffle(pool).slice(0, count);
}

/**
 * The forty records as row objects keyed by COLUMNS. Pure: no I/O, no
 * Date.now, one seeded stream per logical column group.
 * @returns {object[]}
 */
export function buildMixedSensitivityRecords() {
  const roster = coreRoster();
  const subjects = selectSubjects(roster);

  const rows = subjects.map((person, index) => ({
    record_id: `MSD-2026-${String(index + 1).padStart(4, "0")}`,
    employee_id: person.employee_id,
    full_name: `${person.first_name} ${person.last_name}`,
    work_email: person.email,
    department: person.department,
    role_title: person.role_title,
    manager_employee_id: person.manager_employee_id,
    hire_date: person.start_date,
    date_of_birth: "",
    home_city: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_accommodation_note: "",
    occupational_health_status: "",
    trade_union_membership: "",
    criminal_record_check_status: "",
    immigration_status: "",
    sensitivity_tier: "",
    lawful_basis: "",
    extracted_on: EXTRACTED_ON,
  }));

  // Ordinary contact detail, carried on every record.
  const cityRng = createRng(id, "residence");
  const contactNames = drawContactNames(roster, rows.length);
  const contactPhones = drawContactPhones(rows.length);
  rows.forEach((row, i) => {
    row.home_city = cityRng.pick(HOME_CITIES);
    row.emergency_contact_name = contactNames[i];
    row.emergency_contact_phone = contactPhones[i];
  });

  // Which records carry which class of field. The three populations are drawn
  // once, from their own stream, so a change to a vocabulary above cannot move
  // a record between populations.
  const classRng = createRng(id, "field-classes");
  const order = classRng.shuffle(rows.map((_, i) => i));
  const specialIndexes = new Set(order.slice(0, SPECIAL_CATEGORY_RECORDS));
  const restrictedOnlyIndexes = new Set(
    order.slice(SPECIAL_CATEGORY_RECORDS, SPECIAL_CATEGORY_RECORDS + RESTRICTED_ONLY_RECORDS)
  );

  const specialRng = createRng(id, "special-category-values");
  const restrictedRng = createRng(id, "restricted-values");
  const birthRng = createRng(id, "birth-dates");

  const fillRestricted = (row, fields) => {
    for (const field of fields) {
      if (field === "date_of_birth") row.date_of_birth = drawBirthDate(birthRng, row.hire_date);
      if (field === "criminal_record_check_status") {
        row.criminal_record_check_status = restrictedRng.pick(CRIMINAL_RECORD_CHECK_STATUSES);
      }
      if (field === "immigration_status") row.immigration_status = restrictedRng.pick(IMMIGRATION_STATUSES);
    }
  };

  rows.forEach((row, i) => {
    if (specialIndexes.has(i)) {
      for (const field of specialRng.pick(SPECIAL_CATEGORY_PATTERNS)) {
        if (field === "health_accommodation_note") {
          row.health_accommodation_note = specialRng.pick(HEALTH_ACCOMMODATION_NOTES);
        }
        if (field === "occupational_health_status") {
          row.occupational_health_status = specialRng.pick(OCCUPATIONAL_HEALTH_STATUSES);
        }
        if (field === "trade_union_membership") {
          row.trade_union_membership = specialRng.pick(TRADE_UNION_MEMBERSHIPS);
        }
      }
      // A special category record may also carry restricted fields, which is
      // why "records carrying a restricted field" is not the same population as
      // "records carrying a restricted field and nothing above it".
      if (restrictedRng.chance(0.5)) fillRestricted(row, restrictedRng.pick(RESTRICTED_PATTERNS));
    } else if (restrictedOnlyIndexes.has(i)) {
      fillRestricted(row, restrictedRng.pick(RESTRICTED_PATTERNS));
    }
  });

  // The declared tier: the computed one everywhere except on the single
  // mislabeled record, whose tier is stated as ordinary. lawful_basis then
  // follows the declared tier, wrong record included.
  const plantRng = createRng(id, "declared-tier");
  const mislabeled = plantRng.pick([...specialIndexes].sort((a, b) => a - b));
  rows.forEach((row, i) => {
    row.sensitivity_tier = i === mislabeled ? "ordinary" : tierFromFields(row);
    row.lawful_basis = LAWFUL_BASIS_BY_TIER[row.sensitivity_tier];
  });

  return rows;
}

/**
 * Re-derive every claim the spec makes from the emitted rows, the way the
 * public test does, and throw if one has stopped holding. A plant that is no
 * longer derivable is a build failure, not a data quirk.
 */
function assertPostConditions(rows, roster, canon) {
  if (rows.length !== RECORD_COUNT) {
    throw new Error(`${id}: emitted ${rows.length} records, expected ${RECORD_COUNT}`);
  }

  const byId = new Map(roster.map((r) => [r.employee_id, r]));
  const seen = new Set();
  rows.forEach((row, i) => {
    if (row.record_id !== `MSD-2026-${String(i + 1).padStart(4, "0")}`) {
      throw new Error(`${id}: record ids do not run in file order at ${row.record_id}`);
    }
    if (EXCLUDED_EMPLOYEE_IDS.has(row.employee_id)) {
      throw new Error(`${id}: ${row.employee_id} is excluded from this dataset`);
    }
    if (seen.has(row.employee_id)) throw new Error(`${id}: ${row.employee_id} appears twice`);
    seen.add(row.employee_id);

    const person = byId.get(row.employee_id);
    if (!person) throw new Error(`${id}: ${row.employee_id} is not on the roster`);
    if (person.employment_status !== "active") throw new Error(`${id}: ${row.employee_id} has left`);
    if (row.full_name !== `${person.first_name} ${person.last_name}`) {
      throw new Error(`${id}: ${row.record_id} full_name does not match the roster`);
    }
    if (row.work_email !== person.email) throw new Error(`${id}: ${row.record_id} work_email`);
    if (row.department !== person.department) throw new Error(`${id}: ${row.record_id} department`);
    if (row.role_title !== person.role_title) throw new Error(`${id}: ${row.record_id} role_title`);
    if (row.manager_employee_id !== person.manager_employee_id) {
      throw new Error(`${id}: ${row.record_id} manager_employee_id`);
    }
    if (row.hire_date !== person.start_date) throw new Error(`${id}: ${row.record_id} hire_date`);
    if (row.extracted_on !== EXTRACTED_ON) throw new Error(`${id}: ${row.record_id} extracted_on`);

    if (!HOME_CITIES.includes(row.home_city)) throw new Error(`${id}: ${row.record_id} home_city`);
    if (!/^\(555\) 555-0\d{3}$/.test(row.emergency_contact_phone)) {
      throw new Error(`${id}: ${row.record_id} emergency_contact_phone "${row.emergency_contact_phone}"`);
    }
    if (row.date_of_birth !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
        throw new Error(`${id}: ${row.record_id} date_of_birth "${row.date_of_birth}"`);
      }
      const atHire = diffDays(row.date_of_birth, row.hire_date) / 365.25;
      const atExtract = diffDays(row.date_of_birth, EXTRACTED_ON) / 365.25;
      if (atHire < 22 || atExtract > 66) {
        throw new Error(`${id}: ${row.record_id} was ${atHire.toFixed(1)} at hire and ${atExtract.toFixed(1)} at the extract`);
      }
    }
    if (row.lawful_basis !== LAWFUL_BASIS_BY_TIER[row.sensitivity_tier]) {
      throw new Error(`${id}: ${row.record_id} lawful_basis does not follow its declared tier`);
    }
  });

  const uniquePhones = new Set(rows.map((r) => r.emergency_contact_phone));
  const uniqueContacts = new Set(rows.map((r) => r.emergency_contact_name));
  if (uniquePhones.size !== rows.length || uniqueContacts.size !== rows.length) {
    throw new Error(`${id}: emergency contact details repeat across records`);
  }

  const departments = new Map();
  for (const row of rows) departments.set(row.department, (departments.get(row.department) ?? 0) + 1);
  const activeByDepartment = new Map();
  for (const person of roster) {
    if (person.employment_status !== "active" || EXCLUDED_EMPLOYEE_IDS.has(person.employee_id)) continue;
    activeByDepartment.set(person.department, (activeByDepartment.get(person.department) ?? 0) + 1);
  }
  for (const [department, active] of activeByDepartment) {
    const contributed = departments.get(department) ?? 0;
    if (active >= STRATUM_FLOOR && contributed < STRATUM_MIN) {
      throw new Error(`${id}: ${department} carries ${active} active rows and contributes ${contributed}`);
    }
  }
  for (const [department, contributed] of departments) {
    if (contributed > STRATUM_MAX) {
      throw new Error(`${id}: ${department} contributes ${contributed} records, above the cap of ${STRATUM_MAX}`);
    }
  }

  const populated = (row, fields) => fields.some((field) => row[field] !== "");
  const special = rows.filter((r) => populated(r, SPECIAL_CATEGORY_FIELDS));
  const restrictedOnly = rows.filter(
    (r) => !populated(r, SPECIAL_CATEGORY_FIELDS) && populated(r, RESTRICTED_FIELDS)
  );
  const neither = rows.filter(
    (r) => !populated(r, SPECIAL_CATEGORY_FIELDS) && !populated(r, RESTRICTED_FIELDS)
  );
  if (special.length !== SPECIAL_CATEGORY_RECORDS) {
    throw new Error(`${id}: ${special.length} records carry a special category field, expected ${SPECIAL_CATEGORY_RECORDS}`);
  }
  if (restrictedOnly.length !== RESTRICTED_ONLY_RECORDS) {
    throw new Error(`${id}: ${restrictedOnly.length} records are restricted only, expected ${RESTRICTED_ONLY_RECORDS}`);
  }
  if (neither.length !== ORDINARY_RECORDS) {
    throw new Error(`${id}: ${neither.length} records carry neither class, expected ${ORDINARY_RECORDS}`);
  }

  const disagreeing = rows.filter((r) => r.sensitivity_tier !== tierFromFields(r));
  if (disagreeing.length !== 1) {
    throw new Error(`${id}: ${disagreeing.length} records declare a tier their fields do not compute, expected 1`);
  }
  if (tierFromFields(disagreeing[0]) !== "special_category" || disagreeing[0].sensitivity_tier !== "ordinary") {
    throw new Error(`${id}: the mislabeled record must compute special_category and read ordinary`);
  }
  const readingOrdinary = rows.filter((r) => r.sensitivity_tier === "ordinary").length;
  if (readingOrdinary !== ORDINARY_RECORDS + 1) {
    throw new Error(`${id}: ${readingOrdinary} records read ordinary, expected ${ORDINARY_RECORDS + 1}`);
  }

  // No town name may collide with a canon company: a home city that reads as an
  // entity of the universe would join to something it has nothing to do with.
  if (canon) {
    const companyNames = [...canon.values()].map((entry) => entry.name.toLowerCase());
    for (const city of HOME_CITIES) {
      const needle = city.toLowerCase();
      if (companyNames.some((name) => name.includes(needle) || needle.includes(name))) {
        throw new Error(`${id}: the town name "${city}" collides with a canon company name`);
      }
    }
  }
}

export function generate({ canon } = {}) {
  const rows = buildMixedSensitivityRecords();
  assertPostConditions(rows, coreRoster(), canon);
  return [{
    path: "mixed-sensitivity-employee-dataset.csv",
    content: toCsv(COLUMNS, rows),
  }];
}
