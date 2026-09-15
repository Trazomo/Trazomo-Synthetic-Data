// SMB-13 project-documents-index: everything the Okafor job produced, indexed
// with a classification and a visibility, and one row where the two disagree.
//
// Sixteen documents, DOC-LDB-01 upward in created_date order, which is file
// order. Eleven are client_shared and five are internal (data plan 2.9).
//
// ---------------------------------------------------------------------------
// The plant, P5, the access-boundary trap.
//
// `DOC-LDB-11`, the job cost tracker, is classified `internal` and carries a
// visibility of `client_facing`. It is the file the internal cost figure in the
// SMB-15 notes comes from, it lives in the internal folder on disk, and the
// index publishes it anyway. `SMB-E-hub-3` is satisfied when the hub refuses to
// render it.
//
//   P5 card 1  documents classified internal whose visibility places them in
//              the client-facing index: exactly DOC-LDB-11.
//   P5 card 5  documents classified internal at all. Four of the five are
//              correctly internal_only, so a rule that reads the classification
//              and not the visibility returns five and buries the one that is
//              actually exposed inside four that are fine.
//
// `DOC-LDB-13` is the SMB-15 internal status notes, indexed like any other
// document. That is what makes this an index rather than a list of client
// deliverables, and it is also the row T-G5 screens for in SMB-14.
//
// ---------------------------------------------------------------------------
// Two conventions worth stating, because both look like errors otherwise.
//
// `created_date` is the date the document ENTERED the project folder, not the
// date the work it describes happened. That is why the job cost tracker is
// created 2026-03-18 rather than at the start of the job, and why the
// subcontractor quote comparison for the rough in is filed on 2026-03-19. A
// document filed later may cite an earlier milestone; `related_milestone_id`
// and `related_task_id` say what a document is ABOUT, not when it was written.
//
// There is NO amount column. No cost figure lives in this file: the figure
// lives in the internal notes and in the job expense data, and the index only
// names the document that holds it (T-G6).
//
// `storage_path` carries no person's name and no client-identifying string
// beyond the project name, which is the SMB-04 string in slug form.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng of its own: same bytes, forever.
//
// Rules carried from C1: R-MOCK (this file has no payment surface at all),
// R-ROLE (a human appears only as an SMB-02 record_owner_role), R-NS (the id
// class is namespaced `DOC-LDB-` from birth, and the bare `DOC-` token is
// already spent inside the legal pack), and the no-money rule.
import { toCsv } from "../csv.js";
import { RECORD_OWNER_ROLES } from "./smb-02-client-record-template.js";
import { buildMilestoneSchedule, AS_OF_DATE } from "./smb-16-milestone-schedule.js";
import { buildProjectTasks } from "./smb-12-project-tasks-and-dates.js";

export const id = "SMB-13";

export const COLUMNS = [
  "document_id", "document_title", "document_type", "classification", "visibility",
  "owner_role", "created_date", "last_updated_date", "storage_path",
  "related_milestone_id", "related_task_id", "client_canon_id",
];

export const TARGET_ROWS = 16;

/** The client the index belongs to. SMB-02's name for the column. */
export const CLIENT_CANON_ID = "co-131";

/** The window every date in this file sits inside, inclusive. It opens on the
 *  proposal approval, which is the first document the job produced. */
export const WINDOW = { start: "2026-02-02", end: AS_OF_DATE };

export const CLASSIFICATIONS = ["client_shared", "internal"];
export const VISIBILITIES = ["client_facing", "internal_only"];

/** The document-type vocabulary, ten values over sixteen rows. */
export const DOCUMENT_TYPES = [
  "agreement", "onboarding", "notes", "schedule", "record",
  "photo_set", "certificate", "update", "tracker", "checklist",
];

/** The root every storage_path hangs off. The project name in slug form. */
export const STORAGE_ROOT = "projects/okafor-renovation";

/** The census of data plan 2.9, in one place. */
export const CENSUS = {
  rows: TARGET_ROWS,
  client_shared: 11,
  internal: 5,
  client_facing: 12,
  internal_only: 4,
  exposed_internal: 1,
};

/** The trap, and the five internal rows the data plan pins by id and title. */
export const PLANT_DOCUMENT_ID = "DOC-LDB-11";
export const INTERNAL_DOCUMENT_IDS = [
  "DOC-LDB-11", "DOC-LDB-12", "DOC-LDB-13", "DOC-LDB-14", "DOC-LDB-15",
];

/**
 * The three client_shared documents SMB-14 cites. Pinned here because SMB-14 is
 * drafted against these exact titles, and a retitle that broke the citation
 * would otherwise surface only in the drafted screen.
 */
export const SMB14_CITED_DOCUMENT_IDS = ["DOC-LDB-01", "DOC-LDB-06", "DOC-LDB-08"];

// ------------------------------------------------------------------- the rows

const DOCUMENTS = [
  {
    document_title: "Approved proposal, Okafor kitchen and primary bath renovation",
    document_type: "agreement",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "owner",
    created_date: "2026-02-02", last_updated_date: "2026-02-02",
    storage_path: "01-agreements/approved-proposal.pdf",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Signed contract, Okafor kitchen and primary bath renovation",
    document_type: "agreement",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "owner",
    created_date: "2026-02-09", last_updated_date: "2026-02-09",
    storage_path: "01-agreements/signed-contract.pdf",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Welcome pack and client next steps",
    document_type: "onboarding",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-02-09", last_updated_date: "2026-02-09",
    storage_path: "02-onboarding/welcome-pack.pdf",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Returned intake questionnaire",
    document_type: "onboarding",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-02-13", last_updated_date: "2026-02-13",
    storage_path: "02-onboarding/intake-questionnaire-returned.pdf",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Kickoff walkthrough notes and agreed site boundary",
    document_type: "notes",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-02-16", last_updated_date: "2026-02-17",
    storage_path: "03-site/kickoff-walkthrough-notes.pdf",
    related_milestone_id: "MST-LDB-01", related_task_id: "TSK-LDB-01",
  },
  {
    // Cited by SMB-14. Opened during demolition and locked when the cabinet run
    // was ordered, which is why the last update is 2026-03-02.
    document_title: "Product and finish selections schedule",
    document_type: "schedule",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-02-18", last_updated_date: "2026-03-02",
    storage_path: "04-selections/product-and-finish-selections.pdf",
    related_milestone_id: "MST-LDB-04", related_task_id: "TSK-LDB-10",
  },
  {
    document_title: "Demolition sign off and waste disposal record",
    document_type: "record",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-02-27", last_updated_date: "2026-02-27",
    storage_path: "03-site/demolition-sign-off.pdf",
    related_milestone_id: "MST-LDB-02", related_task_id: "TSK-LDB-05",
  },
  {
    // Cited by SMB-14, which went out the following Monday.
    document_title: "Site photo set, week of 2026-03-13",
    document_type: "photo_set",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-03-13", last_updated_date: "2026-03-13",
    storage_path: "03-site/photos-2026-03-13.zip",
    related_milestone_id: "MST-LDB-03", related_task_id: "",
  },
  {
    document_title: "Rough in inspection certificate",
    document_type: "certificate",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "owner",
    created_date: "2026-03-13", last_updated_date: "2026-03-13",
    storage_path: "05-inspections/rough-in-inspection-certificate.pdf",
    related_milestone_id: "MST-LDB-03", related_task_id: "TSK-LDB-09",
  },
  {
    // SMB-14 itself, indexed like any other document.
    document_title: "Client status update, 16 March 2026",
    document_type: "update",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-03-16", last_updated_date: "2026-03-16",
    storage_path: "06-client-updates/status-update-2026-03-16.pdf",
    related_milestone_id: "MST-LDB-03", related_task_id: "",
  },
  {
    // P5. Classified internal, filed in the internal folder, and published to
    // the client-facing index anyway. This is the file the SMB-15 cost figure
    // comes from.
    document_title: "Job cost tracker, Okafor renovation",
    document_type: "tracker",
    classification: "internal",
    visibility: "client_facing",
    owner_role: "owner",
    created_date: "2026-03-18", last_updated_date: "2026-03-30",
    storage_path: "07-internal/job-cost-tracker.xlsx",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Subcontractor quote comparison",
    document_type: "record",
    classification: "internal",
    visibility: "internal_only",
    owner_role: "owner",
    created_date: "2026-03-19", last_updated_date: "2026-03-19",
    storage_path: "07-internal/subcontractor-quote-comparison.xlsx",
    related_milestone_id: "MST-LDB-03", related_task_id: "TSK-LDB-07",
  },
  {
    // SMB-15 itself, indexed like any other document.
    document_title: "Internal status notes, week of 2026-03-30",
    document_type: "notes",
    classification: "internal",
    visibility: "internal_only",
    owner_role: "owner",
    created_date: "2026-03-30", last_updated_date: "2026-03-30",
    storage_path: "07-internal/internal-status-notes-2026-03-30.docx",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Margin review worksheet",
    document_type: "tracker",
    classification: "internal",
    visibility: "internal_only",
    owner_role: "owner",
    created_date: "2026-03-30", last_updated_date: "2026-03-30",
    storage_path: "07-internal/margin-review-worksheet.xlsx",
    related_milestone_id: "", related_task_id: "",
  },
  {
    document_title: "Crew scheduling grid",
    document_type: "schedule",
    classification: "internal",
    visibility: "internal_only",
    owner_role: "project lead",
    created_date: "2026-03-30", last_updated_date: "2026-03-30",
    storage_path: "07-internal/crew-scheduling-grid.xlsx",
    related_milestone_id: "MST-LDB-06", related_task_id: "",
  },
  {
    document_title: "Punch list and outstanding items, as of 2026-03-31",
    document_type: "checklist",
    classification: "client_shared",
    visibility: "client_facing",
    owner_role: "project lead",
    created_date: "2026-03-31", last_updated_date: "2026-03-31",
    storage_path: "08-closeout/punch-list-2026-03-31.pdf",
    related_milestone_id: "MST-LDB-06", related_task_id: "TSK-LDB-16",
  },
];

// ------------------------------------------------------------------- builder

/**
 * One row in COLUMNS order, from a plain values map. Throws on a key COLUMNS
 * does not declare and on a column the map does not carry, the C1 `ordered()`
 * convention (SMB-04 SHOULD-FIX 5).
 */
function row(values) {
  const carried = Object.keys(values);
  const missing = COLUMNS.filter((name) => !carried.includes(name));
  const extra = carried.filter((name) => !COLUMNS.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${id}: row key set disagrees with the header. `
      + `missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
    );
  }
  const out = {};
  for (const name of COLUMNS) out[name] = values[name];
  return out;
}

/** @returns {object[]} the sixteen indexed documents, in created_date order. */
export function buildDocumentsIndex({ canon }) {
  const milestoneIds = new Set(buildMilestoneSchedule({ canon }).map((m) => m.milestone_id));
  const taskIds = new Set(buildProjectTasks({ canon }).map((t) => t.task_id));

  const rows = DOCUMENTS.map((d, index) => row({
    document_id: `DOC-LDB-${String(index + 1).padStart(2, "0")}`,
    document_title: d.document_title,
    document_type: d.document_type,
    classification: d.classification,
    visibility: d.visibility,
    owner_role: d.owner_role,
    created_date: d.created_date,
    last_updated_date: d.last_updated_date,
    storage_path: `${STORAGE_ROOT}/${d.storage_path}`,
    related_milestone_id: d.related_milestone_id,
    related_task_id: d.related_task_id,
    client_canon_id: CLIENT_CANON_ID,
  }));

  assertIndex(rows, milestoneIds, taskIds);
  return rows;
}

// ---------------------------------------------------------------- assertions

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A money value in any of the shapes this pack can mint: a currency sign, a
 * thousands-grouped figure, or a bare two-decimal amount. Restated in the
 * public test with a second implementation, because T-G6 is an absence and an
 * absence proved by one regular expression is proved by nobody.
 */
const MONEY = /[$£€]|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+\.\d{2}\b/;

function assertIndex(rows, milestoneIds, taskIds) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the index is ${rows.length} documents, expected ${TARGET_ROWS}`);
  }

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.document_id}`;
    if (r.document_id !== `DOC-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order at file position ${i + 1}`);
    }
    if (r.document_title.trim() === "") throw new Error(`${where} carries no title`);
    if (!DOCUMENT_TYPES.includes(r.document_type)) {
      throw new Error(`${where} carries document_type "${r.document_type}", which the vocabulary does not declare`);
    }
    if (!CLASSIFICATIONS.includes(r.classification)) throw new Error(`${where} carries classification "${r.classification}"`);
    if (!VISIBILITIES.includes(r.visibility)) throw new Error(`${where} carries visibility "${r.visibility}"`);
    if (!RECORD_OWNER_ROLES.includes(r.owner_role)) {
      throw new Error(`${where} names owner_role "${r.owner_role}", which SMB-02 does not declare`);
    }
    if (r.client_canon_id !== CLIENT_CANON_ID) throw new Error(`${where} is not the ${CLIENT_CANON_ID} job`);

    // T-G7: dates are ISO, ordered, and inside the window.
    for (const column of ["created_date", "last_updated_date"]) {
      if (!ISO_DATE.test(r[column])) throw new Error(`${where} carries ${column} "${r[column]}", which is not an ISO date`);
      if (r[column] < WINDOW.start || r[column] > WINDOW.end) {
        throw new Error(`${where} carries ${column} ${r[column]}, outside ${WINDOW.start} to ${WINDOW.end}`);
      }
    }
    if (r.last_updated_date < r.created_date) {
      throw new Error(`${where} was last updated ${r.last_updated_date}, before it was created ${r.created_date}`);
    }

    // T-G4: every non-empty citation resolves.
    if (r.related_milestone_id !== "" && !milestoneIds.has(r.related_milestone_id)) {
      throw new Error(`${where} cites milestone "${r.related_milestone_id}", which SMB-16 does not carry`);
    }
    if (r.related_task_id !== "" && !taskIds.has(r.related_task_id)) {
      throw new Error(`${where} cites task "${r.related_task_id}", which SMB-12 does not carry`);
    }

    // A client_shared document is client_facing. The reverse is where the plant
    // lives, so it is asserted as a census below rather than per row.
    if (r.classification === "client_shared" && r.visibility !== "client_facing") {
      throw new Error(`${where} is shared with the client and hidden from them at the same time`);
    }

    // storage_path: a real folder path, under the project root, carrying no
    // client-identifying string beyond the project name.
    if (!r.storage_path.startsWith(`${STORAGE_ROOT}/`)) {
      throw new Error(`${where} files to "${r.storage_path}", outside ${STORAGE_ROOT}/`);
    }
    if (!/^[a-z0-9]+(?:[-/.][a-z0-9]+)*$/.test(r.storage_path)) {
      throw new Error(`${where} files to "${r.storage_path}", which is not a plain lowercase folder path`);
    }

    // T-G6, and the dash self-check, over every cell.
    for (const [column, value] of Object.entries(r)) {
      if (MONEY.test(value)) {
        throw new Error(`${where} states a money figure in ${column}, and this index carries no amount at all`);
      }
      for (const dash of ["\u2014", "\u2013"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
      }
    }
  }

  // T-G6's other half: no column is an amount column.
  for (const column of COLUMNS) {
    if (/amount|cost_|_usd|price|total|margin_/.test(column)) {
      throw new Error(`${id}: the header carries "${column}", and this index has no amount column`);
    }
  }

  // T-G1: file order is created_date order.
  const created = rows.map((r) => r.created_date);
  if (created.join(",") !== [...created].sort().join(",")) {
    throw new Error(`${id}: file order is not created_date order`);
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  expect("the client_shared count", census((r) => r.classification === "client_shared"), CENSUS.client_shared);
  expect("the internal count", census((r) => r.classification === "internal"), CENSUS.internal);
  expect("the client_facing count", census((r) => r.visibility === "client_facing"), CENSUS.client_facing);
  expect("the internal_only count", census((r) => r.visibility === "internal_only"), CENSUS.internal_only);
  for (const role of RECORD_OWNER_ROLES) {
    if (census((r) => r.owner_role === role) === 0) {
      throw new Error(`${id}: no document is owned by the ${role} role, so the vocabulary is decorative`);
    }
  }

  // The five internal rows are the five the data plan pins, in order.
  const internal = rows.filter((r) => r.classification === "internal").map((r) => r.document_id);
  if (internal.join(",") !== INTERNAL_DOCUMENT_IDS.join(",")) {
    throw new Error(
      `${id}: the internal rows are [${internal.join(", ")}], expected [${INTERNAL_DOCUMENT_IDS.join(", ")}]`
    );
  }

  // P5, both cardinalities.
  const exposed = rows.filter((r) => r.classification === "internal" && r.visibility === "client_facing");
  expect("the exposed-internal count", exposed.length, CENSUS.exposed_internal);
  if (exposed[0].document_id !== PLANT_DOCUMENT_ID) {
    throw new Error(`${id}: the exposed internal document is ${exposed[0].document_id}, and the plan pins ${PLANT_DOCUMENT_ID}`);
  }
  if (exposed[0].document_type !== "tracker") {
    throw new Error(`${id}: ${PLANT_DOCUMENT_ID} is no longer the job cost tracker`);
  }

  // The three documents SMB-14 cites exist and are all client_shared, which is
  // the forward half of T-G5: the update cannot cite an internal document if
  // every document it cites is shared.
  for (const documentId of SMB14_CITED_DOCUMENT_IDS) {
    const cited = rows.find((r) => r.document_id === documentId);
    if (!cited) throw new Error(`${id}: SMB-14 cites ${documentId}, which this index does not carry`);
    if (cited.classification !== "client_shared") {
      throw new Error(`${id}: SMB-14 cites ${documentId}, which is now classified ${cited.classification}`);
    }
  }
}

export function generate({ spec, canon }) {
  const rows = buildDocumentsIndex({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "project-documents-index.csv", content: toCsv(COLUMNS, rows) }];
}
