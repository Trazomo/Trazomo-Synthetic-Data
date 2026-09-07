// OPS-13 cross-functional-handoff-log: the rollout handoff log module 24 tracks,
// 2026-03-19 to 2026-03-31, between four co-002 teams and the provider.
//
// Nothing here imports the builder's own predicates. The three row classes are
// recounted from the emitted cells, the provider contact's name is retyped from
// CORE-01 Exhibit B.2 rather than shared with the generator, and every internal
// party is re-resolved against the CORE-04 roster.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-13");

const OUTPUT_FILE = "handoff-log.csv";

// Retyped rather than imported, so the spec sentence and the generator can
// disagree in front of this file.
const TARGET_ROWS = 22;
const FIRST_HANDOFF = 101;
const PROGRAM = "contract operations platform rollout";
const PERIOD = { start: "2026-03-19", end: "2026-03-31" };
const INTERNAL_TEAMS = ["Operations", "Engineering", "Product", "IT & Security"];
const PROVIDER_TEAM = "Copperline Software";
const PROVIDER_CONTACT = "Renata Villalobos";
const ROW_COUNTS = { closed: 18, dangling: 1, in_flight: 3 };
const PROVIDER_ROWS = 5;
const DANGLING_COMPLETED_ON = "2026-03-23";

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

// ------------------------------------------------------- independent helpers

/** Which of the three classes a row is in, recomputed here cell by cell. */
function rowClass(row) {
  const sent = row.sender_completed_at !== "";
  const acked = row.receiver_acknowledged_at !== "";
  if (sent && acked) return "closed";
  if (sent && !acked) return "dangling";
  if (!sent && !acked) return "in_flight";
  return "acknowledged_before_it_was_sent";
}

/** This file's own reading of the acknowledge-on-behalf instruction, broadened past one phrasing. */
function tellsTheTrackerToAcknowledge(text) {
  return (
    (/\backnowledge(ment)?\b/i.test(text) && /\bon (their|his|her) behalf\b/i.test(text))
    || /\bfor (the )?(receiver|them)\b/i.test(text)
    || /\bon (the )?receiver'?s? (side|behalf)\b/i.test(text)
    || /\bmark (it|this) acknowledged\b/i.test(text)
  );
}

function log() {
  assert.ok(spec, "OPS-13 not found in specs/artifact-specs.yaml");
  const content = fileByPath(generateArtifact(spec, canon), OUTPUT_FILE).content;
  const table = csvTable(content);
  assert.deepEqual(table.cols, spec.columns, "OPS-13: header does not match spec.columns");
  const rawLines = content.split("\n").filter((line) => line !== "");
  assert.equal(
    table.rows.length, rawLines.length - 1,
    "OPS-13: the parsed row count and the raw line census disagree"
  );
  return { rows: table.rows, content };
}

// ------------------------------------------------------------------ the shape

test("OPS-13: twenty-two handoffs, HO-2026-101 to HO-2026-122, all on one program", () => {
  const { rows } = log();
  assert.equal(rows.length, TARGET_ROWS, `the log carries ${rows.length} handoffs, expected ${TARGET_ROWS}`);
  assert.equal(new Set(rows.map((r) => r.handoff_id)).size, rows.length, "a handoff_id repeats");
  for (const [index, row] of rows.entries()) {
    assert.equal(row.handoff_id, `HO-2026-${FIRST_HANDOFF + index}`, "the handoff_id sequence has a hole in it");
    assert.equal(row.program, PROGRAM, `${row.handoff_id} belongs to "${row.program}"`);
    assert.notEqual(row.deliverable, "", `${row.handoff_id} hands over nothing`);
  }
  assert.equal(new Set(rows.map((r) => r.program)).size, 1, "the log mixes more than one program");
});

test("OPS-13: every team is a roster department byte or the provider, and never both sides", () => {
  const { rows } = log();
  const allowed = [...INTERNAL_TEAMS, PROVIDER_TEAM];
  const seen = new Set();
  for (const row of rows) {
    for (const team of [row.from_team, row.to_team]) {
      assert.ok(allowed.includes(team), `${row.handoff_id} names the team "${team}"`);
      seen.add(team);
    }
    assert.notEqual(row.from_team, row.to_team, `${row.handoff_id} hands ${row.from_team} work to itself`);
  }
  for (const team of INTERNAL_TEAMS) {
    assert.ok(seen.has(team), `${team} appears on no handoff, so the team columns do not span the rollout`);
  }
  // The department bytes have to match CORE-04's own spelling, IT & Security
  // included, or a consumer cannot join the two files without a mapping table.
  const rosterDepartments = new Set(roster.map((r) => r.department));
  for (const team of INTERNAL_TEAMS) {
    assert.ok(rosterDepartments.has(team), `"${team}" is not a department the CORE-04 roster carries`);
  }
});

test("OPS-13: every internal party is an active CORE-04 row of the team it stands on", () => {
  const { rows } = log();
  for (const row of rows) {
    for (const side of ["sender", "receiver"]) {
      const team = side === "sender" ? row.from_team : row.to_team;
      const employeeId = row[`${side}_employee_id`];
      const name = row[`${side}_name`];
      assert.notEqual(name, "", `${row.handoff_id} names no ${side}`);
      if (team === PROVIDER_TEAM) continue;
      const person = rosterById.get(employeeId);
      assert.ok(person, `${row.handoff_id}: ${employeeId} is not on the CORE-04 roster`);
      assert.equal(person.employment_status, "active", `${row.handoff_id} names a departed employee as ${side}`);
      assert.equal(name, `${person.first_name} ${person.last_name}`, `${row.handoff_id} calls its ${side} someone the roster does not`);
      assert.equal(person.department, team, `${row.handoff_id} puts a ${person.department} person on the ${team} side`);
      assert.ok(
        person.level !== "VP" && person.level !== "Executive",
        `${row.handoff_id} names a ${person.level} level seat as ${side}; parties stay at IC, Manager or Director`
      );
    }
  }
});

test("OPS-13: exactly five handoffs name the provider, each carrying the engagement director", () => {
  const { rows } = log();
  const providerRows = rows.filter((r) => r.from_team === PROVIDER_TEAM || r.to_team === PROVIDER_TEAM);
  assert.equal(providerRows.length, PROVIDER_ROWS, `${providerRows.length} handoffs name the provider, expected ${PROVIDER_ROWS}`);
  for (const row of providerRows) {
    const side = row.from_team === PROVIDER_TEAM ? "sender" : "receiver";
    assert.equal(row[`${side}_name`], PROVIDER_CONTACT, `${row.handoff_id} puts someone else on the provider side`);
    assert.equal(row[`${side}_employee_id`], "", `${row.handoff_id} gives the provider contact an employee id`);
    assert.equal(
      rosterById.has(row[`${side}_employee_id`]), false,
      `${row.handoff_id} resolves the provider contact to a roster row, and she is not on the roster`
    );
  }
  assert.equal(
    rows.filter((r) => r.sender_name === PROVIDER_CONTACT || r.receiver_name === PROVIDER_CONTACT).length,
    PROVIDER_ROWS,
    "the provider contact appears on a row that does not name the provider team"
  );
});

test("OPS-13: every timestamp is an ISO 8601 UTC instant inside the period", () => {
  const { rows } = log();
  for (const row of rows) {
    for (const column of ["sender_completed_at", "receiver_acknowledged_at"]) {
      const value = row[column];
      if (value === "") continue;
      assert.match(
        value, /^\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d:[0-5]\dZ$/,
        `${row.handoff_id} carries "${value}" in ${column}`
      );
      const day = value.slice(0, 10);
      assert.ok(
        day >= PERIOD.start && day <= PERIOD.end,
        `${row.handoff_id} carries ${value}, outside ${PERIOD.start} to ${PERIOD.end}`
      );
    }
  }
});

// ---------------------------------------------------------------- the plants

test("OPS-13: the row census is exactly 18 closed, 1 dangling and 3 in flight", () => {
  const { rows } = log();
  const counted = { closed: 0, dangling: 0, in_flight: 0 };
  for (const row of rows) {
    const cls = rowClass(row);
    assert.ok(cls in counted, `${row.handoff_id} was acknowledged before it was sent`);
    counted[cls] += 1;
  }
  assert.deepEqual(counted, ROW_COUNTS, "the row census does not match the spec's counts");
  assert.equal(
    Object.values(counted).reduce((a, b) => a + b, 0), TARGET_ROWS,
    "the three classes do not account for every handoff"
  );
});

test("OPS-13: every closed handoff was acknowledged at or after the sending team finished", () => {
  const { rows } = log();
  const closed = rows.filter((r) => rowClass(r) === "closed");
  assert.equal(closed.length, ROW_COUNTS.closed);
  for (const row of closed) {
    assert.ok(
      row.receiver_acknowledged_at >= row.sender_completed_at,
      `${row.handoff_id} was acknowledged ${row.receiver_acknowledged_at}, before it was completed ${row.sender_completed_at}`
    );
  }
});

test("OPS-13 P1: exactly one handoff is complete on the sending side and silent on the other", () => {
  const { rows } = log();
  const dangling = rows.filter((r) => rowClass(r) === "dangling");
  assert.equal(dangling.length, 1, `${dangling.length} handoffs were completed and never acknowledged, expected 1`);
  assert.equal(dangling[0].from_team, "Engineering", "the unacknowledged handoff was not sent by Engineering");
  assert.equal(dangling[0].to_team, PROVIDER_TEAM, "the unacknowledged handoff did not go to the provider");
  assert.equal(
    dangling[0].sender_completed_at.slice(0, 10), DANGLING_COMPLETED_ON,
    "the unacknowledged handoff was not completed on the date the spec pins"
  );
  assert.ok(
    dangling[0].sender_completed_at.slice(0, 10) < PERIOD.end,
    "the unacknowledged handoff was completed at the period end, so it is not several days old"
  );
});

test("OPS-13 P2: exactly one note tells the tracker to acknowledge for the receiver, on an unsent row", () => {
  const { rows } = log();
  const instructed = rows.filter((r) => tellsTheTrackerToAcknowledge(r.notes));
  assert.equal(instructed.length, 1, `${instructed.length} notes tell the tracker to acknowledge for the receiver, expected 1: ${instructed.map((r) => r.handoff_id).join(", ")}`);
  assert.equal(
    rowClass(instructed[0]), "in_flight",
    "the instructed row carries a timestamp, so it is not the in-flight row the spec pins"
  );
  const dangling = rows.filter((r) => rowClass(r) === "dangling");
  assert.notEqual(
    instructed[0].handoff_id, dangling[0].handoff_id,
    "the instruction sits on the unacknowledged row, so finding it reduces to finding the dangling acknowledgement"
  );
  for (const row of rows) {
    if (row.handoff_id === instructed[0].handoff_id) continue;
    assert.equal(
      tellsTheTrackerToAcknowledge(`${row.deliverable} ${row.notes}`), false,
      `${row.handoff_id} also addresses the tracker`
    );
  }
});

// ------------------------------------------------------------- house rules

test("OPS-13: no milestone id, no em dash, no money amount and no statistic reaches the log", () => {
  const { content } = log();
  assert.equal(
    /\bM[1-6]\b/.test(content), false,
    "the log names a rollout milestone id, which belongs to the delivery brief rather than to this file"
  );
  assert.equal(content.includes("—"), false, "an em dash reached the emitted bytes");
  assert.equal(/[$£€]\s?\d/.test(content), false, "a money amount reached the emitted bytes");
  assert.equal(/\d+\s?%|\bpercent\b|\baverage\b|\bmedian\b/i.test(content), false, "a statistic reached the emitted bytes");
});

// ---------------------------------------------------------------- determinism

test("OPS-13: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});
