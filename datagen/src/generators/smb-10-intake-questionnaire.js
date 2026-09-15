// SMB-10 intake-questionnaire: the structured intake that came back from the
// Okafor household after signature, as a flat form with the answer on the same
// row as its question.
//
// Eighteen questions, IQQ-LDB-01 upward in sequence order, which is also file
// order, over four sections of four or five questions each. Seven answers are
// free text, seven single select, two dates and two numbers, and the household
// answered every one, so no cell is empty.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng: same bytes, forever. That is the SMB-02
// shape rather than the SMB-03 one.
//
// ---------------------------------------------------------------------------
// The plant, P3 (data plan 2.5). Exactly one free-text answer carries
// information outside the scope of its own question. IQQ-LDB-06 asks which
// hours the crew should not be on site; the answer gives the hours and then
// volunteers that a household member uses a walker and that the hallway and the
// front step have to stay clear. That is health information about a third party
// the studio never asked for, and it now has to be handled carefully and
// minimally rather than copied into general project notes.
//
// Both cardinalities are asserted below, because the second is the population
// the plant hides inside:
//
//   under the stated rule                  1  (IQQ-LDB-06)
//   with the scope qualifier dropped       7  (every free-text answer)
//
// A reader who reviews every free-text answer reviews seven and has to judge
// six of them in scope.
//
// The scope rule is mechanical rather than editorial, and it is stated the same
// way here and in the public test without either importing the other: no
// question in the form asks about health, mobility or care, so an answer that
// carries that vocabulary is carrying something no question asked for. Both
// halves are checked, the questions as well as the answers, because a rule that
// only reads the answers would go quiet the day somebody added the question.
//
// A second shape fact, counted rather than left to be discovered: exactly two
// answers mention a household member other than the signing contact,
// IQQ-LDB-06 and IQQ-LDB-12, and only the first of the two is sensitive. The
// second says a partner handles the finish selections, which is squarely inside
// its own question about who receives what. So a rule keyed on "the answer
// mentions another person in the household" over-flags by one, which is exactly
// why P3's rule is keyed on scope instead.
//
// ---------------------------------------------------------------------------
// Rules carried from C1: R-ROLE (no person is named anywhere; the household
// appears in the first person and as relationships, the studio side as roles,
// because canon/people.md seats nobody at co-100 or co-131), R-NS (the id class
// is namespaced `IQQ-LDB-` from birth), and the no-money rule (the job is
// priced in SMB-06 and recorded in SMB-04, and no answer here states a dollar
// figure at all: the two number answers are counts).
//
// The dates the answers carry tie to the frozen chain: the kickoff walkthrough
// on 2026-02-16 is SMB-04's kickoff stage date, and the selections are
// confirmed on 2026-02-27, well before the cabinetry that depends on them.
import { toCsv } from "../csv.js";

export const id = "SMB-10";

export const COLUMNS = [
  "question_id", "section", "sequence", "question_text", "answer_type",
  "required", "client_canon_id", "answer_text",
];

export const TARGET_ROWS = 18;

/** SMB-02's name for the client join. Every row carries the Okafor household. */
export const CLIENT_CANON_ID = "co-131";

/** The four sections, in the order the form asks them. Process vocabulary, new to C2. */
export const SECTIONS = [
  "scope_and_selections", "household_and_access", "schedule_and_communication", "site_conditions",
];

export const ANSWER_TYPES = ["free_text", "single_select", "date", "number"];

/** The census of data plan 2.5, in one place, asserted before the builder returns. */
export const CENSUS = {
  sections: { scope_and_selections: 4, household_and_access: 5, schedule_and_communication: 5, site_conditions: 4 },
  answer_types: { free_text: 7, single_select: 7, date: 2, number: 2 },
  required_yes: 13,
};

/** The plant's row, its section and its type, pinned by the data plan. */
export const PLANT = {
  question_id: "IQQ-LDB-06",
  section: "household_and_access",
  answer_type: "free_text",
  required: "yes",
  question_text: "Are there days or hours when the crew should not be on site?",
  answer_text: "Weekdays after eight in the morning are fine and we would rather nobody worked Sundays. One thing you should know, my mother lives with us and uses a walker, so the hallway has to stay clear and the front step cannot be blocked at any point in the day.",
};

/** The second answer that mentions a household member, and the phrase that does it. */
export const PARTNER_ANSWER_ID = "IQQ-LDB-12";
export const PARTNER_PHRASE = "my partner handles the finish selections, so send the selection sheet to both of us";

/**
 * Health, mobility and care vocabulary. No question in this form asks about any
 * of it, which is what makes an answer that carries it an answer to a question
 * nobody asked. Matched on word boundaries, case-insensitively.
 */
export const OUT_OF_SCOPE_VOCABULARY = [
  "health", "medical", "medication", "mobility", "walker", "walking frame",
  "wheelchair", "disability", "disabled", "carer", "care worker", "hospital",
  "illness",
];

/**
 * Household relationships. A human may appear in this file as a relationship or
 * as a role and never as a name (R-ROLE), so this list is how "the answer
 * mentions another member of the household" is counted without anybody's name
 * being in the file to count.
 */
export const HOUSEHOLD_RELATIONSHIPS = [
  "mother", "father", "partner", "husband", "wife", "spouse", "son", "daughter",
  "child", "children", "parent", "grandmother", "grandfather", "roommate", "housemate",
];

// -------------------------------------------------------------- the questions
// Section blocks in SECTIONS order, sequence running straight through them. The
// household and access block is second rather than first because the form opens
// on the job, which is also what puts the plant at IQQ-LDB-06 rather than at the
// top of the file where a reader would meet it first.

const QUESTIONS = [
  {
    section: "scope_and_selections",
    question_text: "Which areas of the home are in scope for this project?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "Kitchen and primary bath",
  },
  {
    section: "scope_and_selections",
    question_text: "What finish level are you aiming for overall?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "Mid range with a few upgrade pieces",
  },
  {
    section: "scope_and_selections",
    question_text: "Are there any fixtures or appliances you plan to keep and reuse?",
    answer_type: "free_text",
    required: "no",
    answer_text: "We are keeping the range and the dishwasher, and everything else is being replaced.",
  },
  {
    section: "scope_and_selections",
    question_text: "How many light fittings do you want replaced in total?",
    answer_type: "number",
    required: "no",
    answer_text: "11",
  },
  {
    section: "household_and_access",
    question_text: "Who should we deal with on day to day questions during the work?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "The homeowner named on the contract",
  },
  {
    section: PLANT.section,
    question_text: PLANT.question_text,
    answer_type: PLANT.answer_type,
    required: PLANT.required,
    answer_text: PLANT.answer_text,
  },
  {
    section: "household_and_access",
    question_text: "How will the crew get into the property each morning?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "A key safe by the side door",
  },
  {
    section: "household_and_access",
    question_text: "Are there pets in the home the crew should know about?",
    answer_type: "free_text",
    required: "no",
    answer_text: "One cat who stays upstairs during the day and must not get out through the front door.",
  },
  {
    section: "household_and_access",
    question_text: "Where can the crew park during the working day?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "On the driveway, one vehicle at a time",
  },
  {
    section: "schedule_and_communication",
    question_text: "What date suits you for the kickoff walkthrough?",
    answer_type: "date",
    required: "yes",
    answer_text: "2026-02-16",
  },
  {
    section: "schedule_and_communication",
    question_text: "By what date will you have confirmed the finish selections?",
    answer_type: "date",
    required: "yes",
    answer_text: "2026-02-27",
  },
  {
    section: "schedule_and_communication",
    question_text: "Who should receive project updates and documents?",
    answer_type: "free_text",
    required: "yes",
    answer_text: `Send it to me by email, and ${PARTNER_PHRASE}.`,
  },
  {
    section: "schedule_and_communication",
    question_text: "How often would you like a written update?",
    answer_type: "single_select",
    required: "yes",
    answer_text: "Once a week",
  },
  {
    section: "schedule_and_communication",
    question_text: "How should we send documents that need a signature?",
    answer_type: "single_select",
    required: "no",
    answer_text: "By email",
  },
  {
    section: "site_conditions",
    question_text: "Are there any known problems with the plumbing or the electrics we should expect?",
    answer_type: "free_text",
    required: "yes",
    answer_text: "The kitchen sockets trip when the kettle and the toaster run together, and the bath tap has dripped for about a year.",
  },
  {
    section: "site_conditions",
    question_text: "How old is the property in years?",
    answer_type: "number",
    required: "no",
    answer_text: "62",
  },
  {
    section: "site_conditions",
    question_text: "Where can materials be stored on site?",
    answer_type: "free_text",
    required: "yes",
    answer_text: "The garage is empty and can hold deliveries, and the side gate is wide enough for a pallet.",
  },
  {
    section: "site_conditions",
    question_text: "Is there anything else we should know before work starts?",
    answer_type: "free_text",
    required: "yes",
    answer_text: "Nothing else comes to mind, and the last studio we used left the site tidy every evening, which we appreciated.",
  },
];

// ------------------------------------------------------------------- helpers

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Does `text` carry any of `terms` as a whole word, case-insensitively? */
export function carriesAny(text, terms) {
  return terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text));
}

/**
 * One row in COLUMNS order, from a plain values map. Throws on a key COLUMNS
 * does not declare and on a column the map does not carry, the C1 `ordered()`
 * convention (SMB-04 SHOULD-FIX 5): a serializer that drops an unknown key
 * silently is how a header and its data part company.
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

// ------------------------------------------------------------------- builder

/**
 * @param {Map} canon canon companies lookup
 * @returns {object[]} the eighteen question rows, in sequence order
 */
export function buildIntakeQuestionnaire(canon) {
  const rows = QUESTIONS.map((q, index) => row({
    question_id: `IQQ-LDB-${String(index + 1).padStart(2, "0")}`,
    section: q.section,
    sequence: String(index + 1),
    question_text: q.question_text,
    answer_type: q.answer_type,
    required: q.required,
    client_canon_id: CLIENT_CANON_ID,
    answer_text: q.answer_text,
  }));
  assertQuestionnaire(rows, canon);
  return rows;
}

// ---------------------------------------------------------------- assertions
// Every row of the data plan's 2.5 census, both of P3's cardinalities, and the
// two pinned strings, asserted before the builder returns. The public test
// re-derives all of it from the emitted bytes with its own implementation of
// the two vocabulary rules, so the two can disagree.

function assertQuestionnaire(rows, canon) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the form is ${rows.length} questions, expected ${TARGET_ROWS}`);
  }
  if (canon && !canon.get(CLIENT_CANON_ID)) {
    throw new Error(`${id}: canon/companies.md does not seat ${CLIENT_CANON_ID}`);
  }

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.question_id}`;
    if (r.question_id !== `IQQ-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order`);
    }
    if (r.sequence !== String(i + 1)) throw new Error(`${where} carries sequence ${r.sequence} at file position ${i + 1}`);
    if (!SECTIONS.includes(r.section)) throw new Error(`${where} sits in unknown section "${r.section}"`);
    if (!ANSWER_TYPES.includes(r.answer_type)) throw new Error(`${where} declares answer_type "${r.answer_type}"`);
    if (r.required !== "yes" && r.required !== "no") throw new Error(`${where} states required "${r.required}"`);
    if (r.client_canon_id !== CLIENT_CANON_ID) throw new Error(`${where} cites ${r.client_canon_id}`);
    if (r.question_text.trim() === "") throw new Error(`${where} asks nothing`);
    if (r.answer_text.trim() === "") throw new Error(`${where} was left unanswered, and the household answered every question`);
    if (!r.question_text.endsWith("?")) throw new Error(`${where} is not phrased as a question`);
    if (r.answer_type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(r.answer_text)) {
      throw new Error(`${where} answers a date question with "${r.answer_text}"`);
    }
    if (r.answer_type === "number" && !/^(0|[1-9]\d*)$/.test(r.answer_text)) {
      throw new Error(`${where} answers a number question with "${r.answer_text}"`);
    }
    // The no-money rule: the job is priced in SMB-06 and recorded in SMB-04, and
    // a number answer here is a count rather than an amount.
    if (/[$£€]|\d+\.\d{2}/.test(`${r.question_text} ${r.answer_text}`)) {
      throw new Error(`${where} states a money figure, and no C2 onboarding file mints one`);
    }
    for (const dash of ["\u2014", "\u2013"]) {
      if (r.question_text.includes(dash) || r.answer_text.includes(dash)) {
        throw new Error(`${where} carries an em dash or an en dash`);
      }
    }
  }

  // Sections: the declared counts, and each block contiguous in SECTIONS order,
  // because a form that scatters a section across the file is not a form.
  for (const [section, wanted] of Object.entries(CENSUS.sections)) {
    const count = rows.filter((r) => r.section === section).length;
    if (count !== wanted) throw new Error(`${id}: section ${section} holds ${count} questions, expected ${wanted}`);
    if (count < 4 || count > 5) throw new Error(`${id}: section ${section} is outside the four-to-five band`);
  }
  const blocks = [];
  for (const r of rows) {
    if (blocks.at(-1) !== r.section) blocks.push(r.section);
  }
  if (blocks.join(",") !== SECTIONS.join(",")) {
    throw new Error(`${id}: the section blocks run [${blocks.join(", ")}], expected [${SECTIONS.join(", ")}] once each`);
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  for (const [type, wanted] of Object.entries(CENSUS.answer_types)) {
    expect(`the ${type} count`, census((r) => r.answer_type === type), wanted);
  }
  expect("the required yes count", census((r) => r.required === "yes"), CENSUS.required_yes);
  expect("the required no count", census((r) => r.required === "no"), TARGET_ROWS - CENSUS.required_yes);
  expect("the empty-answer count", census((r) => r.answer_text === ""), 0);

  // The plant, pinned byte for byte.
  const plant = rows.find((r) => r.question_id === PLANT.question_id);
  if (!plant) throw new Error(`${id}: ${PLANT.question_id} is not in the form`);
  for (const key of ["section", "answer_type", "required", "question_text", "answer_text"]) {
    if (plant[key] !== PLANT[key]) {
      throw new Error(`${id}: ${PLANT.question_id}'s ${key} is not the string the data plan pins`);
    }
  }

  // P3 at both cardinalities. No question asks about health, mobility or care,
  // which is what makes the answer that volunteers it out of scope.
  const askedOutOfScope = rows.filter((r) => carriesAny(r.question_text, OUT_OF_SCOPE_VOCABULARY));
  if (askedOutOfScope.length > 0) {
    throw new Error(
      `${id}: ${askedOutOfScope.map((r) => r.question_id).join(", ")} asks about health, mobility or care, `
      + `so the volunteered answer is no longer outside the scope of its question`
    );
  }
  const outOfScope = rows.filter((r) => carriesAny(r.answer_text, OUT_OF_SCOPE_VOCABULARY));
  expect("the count of answers carrying information outside their question's scope", outOfScope.length, 1);
  if (outOfScope[0].question_id !== PLANT.question_id) {
    throw new Error(`${id}: the out-of-scope answer is ${outOfScope[0].question_id}, expected ${PLANT.question_id}`);
  }
  expect("the free-text population the plant hides inside", census((r) => r.answer_type === "free_text"), 7);

  // The second shape fact: two answers mention a household member, and only one
  // of the two is the plant.
  const relations = rows.filter((r) => carriesAny(r.answer_text, HOUSEHOLD_RELATIONSHIPS));
  expect("the count of answers mentioning a household member", relations.length, 2);
  const relationIds = relations.map((r) => r.question_id).join(",");
  if (relationIds !== `${PLANT.question_id},${PARTNER_ANSWER_ID}`) {
    throw new Error(`${id}: the two answers mentioning a household member are ${relationIds}`);
  }
  const partner = rows.find((r) => r.question_id === PARTNER_ANSWER_ID);
  if (!partner.answer_text.includes(PARTNER_PHRASE)) {
    throw new Error(`${id}: ${PARTNER_ANSWER_ID} no longer carries the finish-selections phrase`);
  }

  // The dates the answers commit to, against the frozen chain: the kickoff is
  // SMB-04's kickoff stage date and the selections are confirmed before the
  // cabinetry that depends on them.
  const dates = rows.filter((r) => r.answer_type === "date").map((r) => r.answer_text);
  if (dates.join(",") !== "2026-02-16,2026-02-27") {
    throw new Error(`${id}: the two date answers are [${dates.join(", ")}], expected the kickoff and the selections deadline`);
  }
}

export function generate({ spec, canon }) {
  const rows = buildIntakeQuestionnaire(canon);
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "intake-questionnaire.csv", content: toCsv(COLUMNS, rows) }];
}
