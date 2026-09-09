// REV-10 deck-and-proposal-source-pack: the deterministic half of the deck
// pack. Three files, one generator, one source of truth for each fact.
//
// `qbr-numbers-view.json` is COMPUTED, never retyped. This generator invokes
// CORE-03's own generator with a CORE-03-seeded stream factory (the REV-07 /
// REV-08 / REV-11 pattern) and derives all twenty-one figures from the
// opportunity rows it emits, so a CORE-03 reroll moves the deck's numbers with
// it instead of leaving a hand-typed figure quietly disagreeing with the export
// it claims to summarize. No count, sum or weighted total appears as a literal
// anywhere below, and nothing under datasets/ is read from disk.
//
// Money is computed in integer cents and formatted once, at the edge. A
// weighted pipeline is the only place floats could creep in (0.10 / 0.25 / 0.50
// / 0.75 are not representable in binary), so the weights are carried as whole
// percents and the arithmetic never leaves the integers. The declared weights
// are published in the view's own header block, with the policy line saying
// they are declared rather than measured, so a module that recomputes a
// weighted figure reads the weight out of the same file that states the figure.
//
// `deck-template.pptx` and `template-manifest.yaml` come out of ONE layout
// definition (`LAYOUTS` below), which is what makes C5-P5/T6 checkable rather
// than aspirational: the fourteen placeholder names in the package and the
// fourteen slot names in the manifest are the same fourteen strings, read from
// the same array. Renaming a slot renames it in both files or in neither.
//
// The package is a ZIP written by hand with STORED (uncompressed) entries,
// fixed DOS timestamps and sorted entry paths, standard library only. No zlib
// in the write path at all: a deflate stream's bytes are an implementation
// detail of whatever zlib the machine happens to link, and byte-identical
// regeneration is a hard requirement here. CRC32 is the standard table, below.
//
// The claims sheet the manifest binds `claims_sheet` slots to is drafted rather
// than generated and lives under artifacts/REV-10/. It is outside `validate`'s
// deterministic branch by design and is screened by the cluster's drafted
// screen; nothing here reads it. The CL universe is spec-pinned CL-01 to CL-08
// and the manifest binds CL-01 to CL-07: CL-08 is the unapproved row, and no
// slot may resolve it (T5's manifest clause).
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";

export const id = "REV-10";

// ------------------------------------------------------------ the QBR header

/** The seed clock. The deck's figures are the export as of this date. */
const AS_OF = "2026-03-16";
/** The same date in the long form the deck prints. */
const AS_OF_LONG = "16 March 2026";
const PERIOD_START = "2026-01-01";
const PERIOD_END = "2026-03-31";
const PERIOD_LONG = "Quarter ending 31 March 2026";

const SOURCE_LINE = "CORE-03 crm-seed-dataset opportunities.csv";

/**
 * The stage-column convention, stated rather than assumed. The export carries
 * both a current stage cell and a stage-history table, and those two can
 * disagree at a row; this view reads the stage column and says so.
 */
const STAGE_CONVENTION =
  `every stage in this view is read from the opportunities.csv stage column as of ${AS_OF}, not reconstructed from stage_history.csv`;

/** Open means neither won nor lost. The two closed stage bytes, named once. */
const CLOSED_WON_STAGE = "Closed Won";
const CLOSED_LOST_STAGE = "Closed Lost";
const OPEN_RULE = "an opportunity is open when its stage is neither Closed Won nor Closed Lost";

const WEIGHTS_VERSION = "v1";
const WEIGHTS_POLICY = "declared, not measured";

/**
 * The declared weights, as whole percents so the cent arithmetic stays in the
 * integers. `declared` is the decimal the header block publishes, and it is
 * derived from the percent rather than typed beside it.
 */
const OPEN_STAGES = [
  { stage: "Prospecting", percent: 10 },
  { stage: "Qualification", percent: 25 },
  { stage: "Proposal", percent: 50 },
  { stage: "Negotiation", percent: 75 },
];

/** The QBR's account section subject: co-102, canon Amberfield Logistics. */
const ACCOUNT_ID = "co-102";
const ACCOUNT_NAME = "Amberfield Logistics";

/** co-002's canon name, the presenting team on the title slide. */
const PRESENTING_TEAM = "Atticus Dundee Inc.";
const DECK_TITLE = "Quarterly Business Review";

/** The spec-pinned claim universe. CL-08 is the unapproved row (C5-P4). */
const CLAIM_IDS = ["CL-01", "CL-02", "CL-03", "CL-04", "CL-05", "CL-06", "CL-07", "CL-08"];
const UNAPPROVED_CLAIM_ID = "CL-08";
const BINDABLE_CLAIM_IDS = CLAIM_IDS.filter((claimId) => claimId !== UNAPPROVED_CLAIM_ID);

const NUMBERS_VIEW_FILE = "qbr-numbers-view.json";
const TEMPLATE_FILE = "deck-template.pptx";
const MANIFEST_FILE = "template-manifest.yaml";
const CLAIMS_SHEET_FILE = "approved-claims-and-proposal-language.md";

// --------------------------------------------------------- the figure catalog

/**
 * The twenty-one figures, in emission order. `key` is the stable handle the
 * layout definition binds to, so a slot never carries a typed QF id: the id is
 * assigned here, from position, and the manifest reads it back out by key.
 *
 * Each entry states which rows it is computed from (`rows`), what the figure is
 * (`value`), and the sentence that says how (`derivation`). Nothing states what
 * a figure IS: every number comes back out of the export.
 */
function buildFigures(opportunities) {
  const open = opportunities.filter(isOpen);
  const figures = [];

  // pipeline_by_stage: count, open sum, weighted, per declared stage.
  for (const { stage, percent } of OPEN_STAGES) {
    const rows = open.filter((row) => row.stage === stage);
    const slug = stage.toLowerCase();
    figures.push({
      key: `stage_${slug}_count`,
      section: "pipeline_by_stage",
      label: `${stage} open opportunities`,
      kind: "count",
      rows,
      value: rows.length,
      derivation: `count of ${SOURCE_LINE} rows whose stage column reads ${stage} as of ${AS_OF}; ${OPEN_RULE}`,
    });
    figures.push({
      key: `stage_${slug}_open_sum`,
      section: "pipeline_by_stage",
      label: `${stage} open pipeline`,
      kind: "money",
      rows,
      cents: sumCents(rows),
      derivation: `sum of the amount column over the ${stage} rows named in opportunity_ids`,
    });
    figures.push({
      key: `stage_${slug}_weighted`,
      section: "pipeline_by_stage",
      label: `${stage} weighted pipeline`,
      kind: "money",
      rows,
      cents: weightCents(sumCents(rows), percent),
      derivation: `the ${stage} open pipeline multiplied by the declared ${WEIGHTS_VERSION} weight ${decimalWeight(percent)}`,
    });
  }

  // pipeline_totals: the open book, all four declared stages together.
  figures.push({
    key: "totals_open_count",
    section: "pipeline_totals",
    label: "Open opportunities",
    kind: "count",
    rows: open,
    value: open.length,
    derivation: `count of ${SOURCE_LINE} rows open as of ${AS_OF}; ${OPEN_RULE}`,
  });
  figures.push({
    key: "totals_open_sum",
    section: "pipeline_totals",
    label: "Open pipeline",
    kind: "money",
    rows: open,
    cents: sumCents(open),
    derivation: "sum of the amount column over every open row named in opportunity_ids",
  });
  figures.push({
    key: "totals_weighted",
    section: "pipeline_totals",
    label: "Weighted pipeline",
    kind: "money",
    rows: open,
    cents: weightedCentsByStage(open),
    derivation: `each open row's amount multiplied by the declared ${WEIGHTS_VERSION} weight of its own stage, summed`,
  });

  // period_outcomes: what actually closed inside the quarter.
  const closedLost = closedInPeriod(opportunities, CLOSED_LOST_STAGE);
  const closedWon = closedInPeriod(opportunities, CLOSED_WON_STAGE);
  figures.push({
    key: "outcome_closed_lost_count",
    section: "period_outcomes",
    label: "Closed Lost opportunities in period",
    kind: "count",
    rows: closedLost,
    value: closedLost.length,
    derivation: `count of rows whose stage column reads ${CLOSED_LOST_STAGE} and whose close_date falls inside ${PERIOD_START} to ${PERIOD_END}`,
  });
  figures.push({
    key: "outcome_closed_lost_amount",
    section: "period_outcomes",
    label: "Closed Lost amount in period",
    kind: "money",
    rows: closedLost,
    cents: sumCents(closedLost),
    derivation: "sum of the amount column over the rows named in opportunity_ids",
  });
  figures.push({
    key: "outcome_closed_won_count",
    section: "period_outcomes",
    label: "Closed Won opportunities in period",
    kind: "count",
    rows: closedWon,
    value: closedWon.length,
    derivation: `no ${SOURCE_LINE} row reads ${CLOSED_WON_STAGE} with a close_date inside ${PERIOD_START} to ${PERIOD_END}, so this figure is zero and its opportunity_ids list is empty; the zero is stated rather than omitted`,
  });

  // account_review: the QBR subject's own open position.
  const accountOpen = open.filter((row) => row.account_id === ACCOUNT_ID);
  figures.push({
    key: "account_open_count",
    section: "account_review",
    label: `${ACCOUNT_NAME} open opportunities`,
    kind: "count",
    rows: accountOpen,
    value: accountOpen.length,
    derivation: `count of open rows whose account_id is ${ACCOUNT_ID}; ${OPEN_RULE}`,
  });
  figures.push({
    key: "account_open_amount",
    section: "account_review",
    label: `${ACCOUNT_NAME} open pipeline`,
    kind: "money",
    rows: accountOpen,
    cents: sumCents(accountOpen),
    derivation: "sum of the amount column over the rows named in opportunity_ids",
  });
  figures.push({
    key: "account_weighted",
    section: "account_review",
    label: `${ACCOUNT_NAME} weighted pipeline`,
    kind: "money",
    rows: accountOpen,
    cents: weightedCentsByStage(accountOpen),
    derivation: `each open ${ACCOUNT_ID} row's amount multiplied by the declared ${WEIGHTS_VERSION} weight of its own stage, summed`,
  });

  return figures.map((figure, index) => ({
    ...figure,
    figure_id: `QF-${String(index + 1).padStart(2, "0")}`,
  }));
}

const isOpen = (row) => row.stage !== CLOSED_WON_STAGE && row.stage !== CLOSED_LOST_STAGE;

const closedInPeriod = (rows, stage) => rows.filter(
  (row) => row.stage === stage && row.close_date >= PERIOD_START && row.close_date <= PERIOD_END
);

/** Whole dollars in, cents out. Never a float. */
function sumCents(rows) {
  let cents = 0;
  for (const row of rows) {
    if (!Number.isInteger(row.amount)) {
      throw new Error(`${id}: ${row.opportunity_id} carries a non-integer amount, so cent arithmetic is unsafe`);
    }
    cents += row.amount * 100;
  }
  return cents;
}

/**
 * `cents` weighted by a whole-percent weight, exactly. The divisibility guard is
 * the point: a silent round is how a weighted total drifts a cent away from the
 * figure a learner recomputes by hand.
 */
function weightCents(cents, percent) {
  const scaled = cents * percent;
  if (scaled % 100 !== 0) {
    throw new Error(`${id}: ${cents} cents at ${percent} percent is not a whole number of cents`);
  }
  return scaled / 100;
}

/** Each row weighted by its own stage's declared weight, summed. */
function weightedCentsByStage(rows) {
  const percentByStage = new Map(OPEN_STAGES.map((entry) => [entry.stage, entry.percent]));
  let cents = 0;
  for (const row of rows) {
    const percent = percentByStage.get(row.stage);
    if (percent === undefined) {
      throw new Error(`${id}: ${row.opportunity_id} is open at stage ${row.stage}, which carries no declared weight`);
    }
    cents += weightCents(row.amount * 100, percent);
  }
  return cents;
}

/** Cents to the view's money form: a string with exactly two decimals. */
function money(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`${id}: ${cents} is not a whole non-negative number of cents`);
  }
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** A whole percent as the decimal weight the header block publishes. */
const decimalWeight = (percent) => `${Math.trunc(percent / 100)}.${String(percent % 100).padStart(2, "0")}`;

/** The opportunity ids a figure was computed from, sorted, as the view prints them. */
const idsOf = (figure) => figure.rows.map((row) => row.opportunity_id).slice().sort();

// -------------------------------------------------------- the layout definition

/**
 * The one definition behind both the template and the manifest. `ph` is the
 * ECMA-376 placeholder the slot becomes in the layout XML; `binding` is the row
 * the manifest publishes for it.
 *
 * A `numbers_view` binding names figure KEYS, not QF ids, so the manifest's
 * allowed_ids are looked up out of the emitted figure list and a figure that
 * moved position moves in the manifest too.
 */
const LAYOUTS = [
  {
    layout: "title_slide",
    type: "title",
    slots: [
      {
        slot: "slot_deck_title",
        ph: { type: "ctrTitle" },
        binding: { source: "static", text: DECK_TITLE },
      },
      {
        slot: "slot_period_line",
        ph: { type: "subTitle", idx: 1 },
        binding: { source: "static", text: PERIOD_LONG },
      },
      {
        slot: "slot_presenting_team",
        ph: { type: "body", idx: 2 },
        binding: { source: "static", text: PRESENTING_TEAM },
      },
    ],
  },
  {
    layout: "pipeline_overview",
    type: "cust",
    slots: [
      {
        slot: "slot_pipeline_by_stage_table",
        ph: { type: "tbl", idx: 1 },
        prompt: "Stage table. Numbers view figures resolve here.",
        binding: { source: "numbers_view", keys: OPEN_STAGES.flatMap(({ stage }) => [
          `stage_${stage.toLowerCase()}_count`,
          `stage_${stage.toLowerCase()}_open_sum`,
          `stage_${stage.toLowerCase()}_weighted`,
        ]) },
      },
      {
        slot: "slot_open_total",
        ph: { type: "body", idx: 2 },
        prompt: "Open book total. Numbers view figures resolve here.",
        binding: { source: "numbers_view", keys: ["totals_open_count", "totals_open_sum"] },
      },
      {
        slot: "slot_weighted_total",
        ph: { type: "body", idx: 3 },
        prompt: "Weighted total. A numbers view figure resolves here.",
        binding: { source: "numbers_view", keys: ["totals_weighted"] },
      },
      {
        slot: "slot_asof_note",
        ph: { type: "body", idx: 4 },
        binding: { source: "static", text: `As of ${AS_OF_LONG}` },
      },
    ],
  },
  {
    layout: "quarter_outcomes",
    type: "cust",
    slots: [
      {
        slot: "slot_closed_summary",
        ph: { type: "body", idx: 1 },
        prompt: "Closed position for the quarter. Numbers view figures resolve here.",
        binding: { source: "numbers_view", keys: [
          "outcome_closed_lost_count",
          "outcome_closed_lost_amount",
          "outcome_closed_won_count",
        ] },
      },
      {
        slot: "slot_closed_ids_note",
        ph: { type: "body", idx: 2 },
        binding: {
          source: "static",
          text: "Every figure on this slide prints the opportunity ids it was computed from.",
        },
      },
    ],
  },
  {
    layout: "account_review",
    type: "cust",
    slots: [
      {
        slot: "slot_account_heading",
        ph: { type: "title" },
        binding: { source: "static", text: `${ACCOUNT_NAME}, quarterly business review` },
      },
      {
        slot: "slot_account_open_position",
        ph: { type: "body", idx: 1 },
        prompt: "Account open position. Numbers view figures resolve here.",
        binding: { source: "numbers_view", keys: [
          "account_open_count",
          "account_open_amount",
          "account_weighted",
        ] },
      },
    ],
  },
  {
    layout: "voice_of_customer",
    type: "cust",
    slots: [
      {
        slot: "slot_customer_language_quotes",
        ph: { type: "body", idx: 1 },
        prompt: "Buyer language. Approved claim rows resolve here.",
        binding: { source: "claims_sheet", ids: BINDABLE_CLAIM_IDS },
      },
    ],
  },
  {
    layout: "proposal_language",
    type: "cust",
    slots: [
      {
        slot: "slot_approved_claims",
        ph: { type: "body", idx: 1 },
        prompt: "Proposal language. Approved claim rows resolve here.",
        binding: { source: "claims_sheet", ids: BINDABLE_CLAIM_IDS },
      },
      {
        slot: "slot_language_citation_note",
        ph: { type: "body", idx: 2 },
        binding: {
          source: "static",
          text: "Every quote cites the WL id of the win loss record it was taken from.",
        },
      },
    ],
  },
];

/**
 * How a reader gets from the package bytes back to this slot set, published in
 * the manifest so the resolver check has no hidden input.
 */
const PLACEHOLDER_RULE =
  "a slot is the name attribute of the p:cNvPr of a shape that carries a p:ph element; the slots below are the whole placeholder-name set of deck-template.pptx";

// ------------------------------------------------------------------ generate

export function generate() {
  const opportunities = readCore03Opportunities();
  const figures = buildFigures(opportunities);
  const view = numbersView(figures);
  const idByKey = new Map(figures.map((figure) => [figure.key, figure.figure_id]));
  const slots = resolveSlots(idByKey);
  const pptx = zipStored(packageParts());

  assertFixture({ view, figures, slots, pptx });

  return [
    { path: NUMBERS_VIEW_FILE, content: JSON.stringify(view, null, 2) + "\n" },
    // The one binary file in the pack. `content` stays a string so the engine's
    // {path, content} contract holds unchanged; `encoding` tells the writer to
    // decode it before writing. Base64 of the same bytes is the same string, so
    // the determinism check compares byte identity either way.
    { path: TEMPLATE_FILE, content: pptx.toString("base64"), encoding: "base64" },
    { path: MANIFEST_FILE, content: manifestYaml(slots) },
  ];
}

/** CORE-03's own emitted opportunity rows. Never a second copy of its facts. */
function readCore03Opportunities() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((file) => file.path === "crm-seed.json");
  if (!bundle) throw new Error(`${id}: CORE-03 no longer emits crm-seed.json`);
  const opportunities = JSON.parse(bundle.content).opportunities;
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    throw new Error(`${id}: CORE-03's bundle no longer carries opportunity rows`);
  }
  for (const row of opportunities) {
    for (const cell of ["opportunity_id", "account_id", "stage", "close_date"]) {
      if (typeof row[cell] !== "string") {
        throw new Error(`${id}: CORE-03 opportunities no longer carry a ${cell} cell`);
      }
    }
  }
  return opportunities;
}

/** The emitted view object: header block, declared weights, then the figures. */
function numbersView(figures) {
  return {
    generated_from_spec: id,
    as_of: AS_OF,
    period: { start: PERIOD_START, end: PERIOD_END },
    source: SOURCE_LINE,
    stage_column_convention: STAGE_CONVENTION,
    open_rule: OPEN_RULE,
    declared_weights: {
      version: WEIGHTS_VERSION,
      policy: WEIGHTS_POLICY,
      weights: Object.fromEntries(OPEN_STAGES.map(({ stage, percent }) => [stage, decimalWeight(percent)])),
    },
    figures: figures.map((figure) => ({
      figure_id: figure.figure_id,
      section: figure.section,
      label: figure.label,
      value: figure.kind === "money" ? money(figure.cents) : figure.value,
      unit: figure.kind === "money" ? "USD" : "count",
      opportunity_ids: idsOf(figure),
      derivation: figure.derivation,
    })),
  };
}

/** The layout definition flattened into the manifest's slot rows. */
function resolveSlots(idByKey) {
  return LAYOUTS.flatMap((layout) => layout.slots.map((slot) => {
    const row = { slot: slot.slot, layout: layout.layout, source: slot.binding.source };
    if (slot.binding.source === "numbers_view") {
      row.allowed_ids = slot.binding.keys.map((key) => {
        const figureId = idByKey.get(key);
        if (!figureId) throw new Error(`${id}: ${slot.slot} binds figure key ${key}, which no figure carries`);
        return figureId;
      });
    } else if (slot.binding.source === "claims_sheet") {
      row.allowed_ids = slot.binding.ids.slice();
    } else {
      row.text = slot.binding.text;
    }
    return row;
  }));
}

// ----------------------------------------------------------------- manifest

function manifestYaml(slots) {
  const lines = [
    "# REV-10 deck template manifest. Emitted by the generator that writes",
    `# ${TEMPLATE_FILE}, out of one layout definition, so the two cannot drift.`,
    "# Every slot below is a placeholder name in the template package, and every",
    "# bound id resolves in the file its source names.",
    `generated_from_spec: ${id}`,
    `as_of: "${AS_OF}"`,
    `template: ${TEMPLATE_FILE}`,
    `numbers_view: ${NUMBERS_VIEW_FILE}`,
    `claims_sheet: ${CLAIMS_SHEET_FILE}`,
    `placeholder_rule: ${quote(PLACEHOLDER_RULE)}`,
    "sources:",
    `  numbers_view: ${quote(`allowed_ids are figure_id values of ${NUMBERS_VIEW_FILE}`)}`,
    `  claims_sheet: ${quote(`allowed_ids are claim_id values of ${CLAIMS_SHEET_FILE}`)}`,
    `  static: ${quote("text is pinned in the template and resolves no id")}`,
    "slots:",
  ];
  for (const slot of slots) {
    lines.push(`  - slot: ${slot.slot}`);
    lines.push(`    layout: ${slot.layout}`);
    lines.push(`    source: ${slot.source}`);
    if (slot.allowed_ids) lines.push(`    allowed_ids: [${slot.allowed_ids.join(", ")}]`);
    if (slot.text !== undefined) lines.push(`    text: ${quote(slot.text)}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** A double-quoted YAML scalar. Nothing emitted here carries a quote or backslash. */
function quote(text) {
  if (/["\\\n]/.test(text)) throw new Error(`${id}: ${text.slice(0, 40)} needs YAML escaping the emitter does not do`);
  return `"${text}"`;
}

// --------------------------------------------------------- the pptx package

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL_TYPE = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_PRESENTATION = "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";
const CT_SLIDE_MASTER = "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml";
const CT_SLIDE_LAYOUT = "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml";
const CT_SLIDE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const CT_THEME = "application/vnd.openxmlformats-officedocument.theme+xml";

const PRESENTATION_NS = `xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"`;

/** A 16:9 slide, in EMU. Every placeholder is laid out inside it. */
const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

/** Every part of the package, as {path, text}. Sorted at zip time. */
function packageParts() {
  const layoutNumbers = LAYOUTS.map((_, index) => index + 1);
  const parts = [
    { path: "[Content_Types].xml", text: contentTypesXml(layoutNumbers) },
    { path: "_rels/.rels", text: packageRelsXml() },
    { path: "docProps/app.xml", text: appXml() },
    { path: "docProps/core.xml", text: coreXml() },
    { path: "ppt/presentation.xml", text: presentationXml() },
    { path: "ppt/_rels/presentation.xml.rels", text: presentationRelsXml() },
    { path: "ppt/slideMasters/slideMaster1.xml", text: slideMasterXml(layoutNumbers) },
    { path: "ppt/slideMasters/_rels/slideMaster1.xml.rels", text: slideMasterRelsXml(layoutNumbers) },
    { path: "ppt/slides/slide1.xml", text: slideXml() },
    { path: "ppt/slides/_rels/slide1.xml.rels", text: slideRelsXml() },
    { path: "ppt/theme/theme1.xml", text: themeXml() },
  ];
  LAYOUTS.forEach((layout, index) => {
    const n = index + 1;
    parts.push({ path: `ppt/slideLayouts/slideLayout${n}.xml`, text: slideLayoutXml(layout) });
    parts.push({ path: `ppt/slideLayouts/_rels/slideLayout${n}.xml.rels`, text: slideLayoutRelsXml() });
  });
  return parts;
}

function contentTypesXml(layoutNumbers) {
  const overrides = [
    `<Override PartName="/ppt/presentation.xml" ContentType="${CT_PRESENTATION}"/>`,
    `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT_SLIDE_MASTER}"/>`,
    ...layoutNumbers.map((n) => `<Override PartName="/ppt/slideLayouts/slideLayout${n}.xml" ContentType="${CT_SLIDE_LAYOUT}"/>`),
    `<Override PartName="/ppt/slides/slide1.xml" ContentType="${CT_SLIDE}"/>`,
    `<Override PartName="/ppt/theme/theme1.xml" ContentType="${CT_THEME}"/>`,
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
  ].join("");
  return `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + `${overrides}</Types>`;
}

const relationships = (entries) => `${XML_DECL}<Relationships xmlns="${PKG_REL_TYPE}">`
  + entries.map(({ rid, type, target }) => `<Relationship Id="${rid}" Type="${type}" Target="${target}"/>`).join("")
  + "</Relationships>";

const packageRelsXml = () => relationships([
  { rid: "rId1", type: `${REL_TYPE}/officeDocument`, target: "ppt/presentation.xml" },
  { rid: "rId2", type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", target: "docProps/core.xml" },
  { rid: "rId3", type: `${REL_TYPE}/extended-properties`, target: "docProps/app.xml" },
]);

const presentationRelsXml = () => relationships([
  { rid: "rId1", type: `${REL_TYPE}/slideMaster`, target: "slideMasters/slideMaster1.xml" },
  { rid: "rId2", type: `${REL_TYPE}/slide`, target: "slides/slide1.xml" },
  { rid: "rId3", type: `${REL_TYPE}/theme`, target: "theme/theme1.xml" },
]);

const slideMasterRelsXml = (layoutNumbers) => relationships([
  ...layoutNumbers.map((n) => ({
    rid: `rId${n}`,
    type: `${REL_TYPE}/slideLayout`,
    target: `../slideLayouts/slideLayout${n}.xml`,
  })),
  { rid: `rId${layoutNumbers.length + 1}`, type: `${REL_TYPE}/theme`, target: "../theme/theme1.xml" },
]);

const slideLayoutRelsXml = () => relationships([
  { rid: "rId1", type: `${REL_TYPE}/slideMaster`, target: "../slideMasters/slideMaster1.xml" },
]);

const slideRelsXml = () => relationships([
  { rid: "rId1", type: `${REL_TYPE}/slideLayout`, target: "../slideLayouts/slideLayout1.xml" },
]);

function presentationXml() {
  return `${XML_DECL}<p:presentation ${PRESENTATION_NS}>`
    + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
    + '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>'
    + `<p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/><p:notesSz cx="6858000" cy="9144000"/>`
    + "</p:presentation>";
}

/**
 * The master carries no placeholder of its own on purpose: the fourteen slot
 * names are the whole placeholder-name set of the package, and a master
 * placeholder would be a fifteenth name nothing in the manifest binds.
 */
function slideMasterXml(layoutNumbers) {
  const layoutIds = layoutNumbers
    .map((n) => `<p:sldLayoutId id="${2147483648 + n}" r:id="rId${n}"/>`)
    .join("");
  return `${XML_DECL}<p:sldMaster ${PRESENTATION_NS}>`
    + `<p:cSld><p:spTree>${emptyGroupShapeXml()}</p:spTree></p:cSld>`
    + '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
    + `<p:sldLayoutIdLst>${layoutIds}</p:sldLayoutIdLst>`
    + "</p:sldMaster>";
}

function slideLayoutXml(layout) {
  const shapes = layout.slots.map((slot, index) => placeholderShapeXml(slot, index)).join("");
  return `${XML_DECL}<p:sldLayout ${PRESENTATION_NS} type="${layout.type}" preserve="1">`
    + `<p:cSld name="${escapeXml(layout.layout)}"><p:spTree>${emptyGroupShapeXml()}${shapes}</p:spTree></p:cSld>`
    + "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
    + "</p:sldLayout>";
}

/**
 * One named placeholder. The `name` attribute is the slot, and it is the only
 * place the slot name appears in the package, which is what makes the extracted
 * set and the manifest's set the same set or a failing test.
 */
function placeholderShapeXml(slot, index) {
  const idxAttr = slot.ph.idx === undefined ? "" : ` idx="${slot.ph.idx}"`;
  const text = slot.binding.source === "static" ? slot.binding.text : slot.prompt;
  const y = 685800 + index * 1143000;
  return "<p:sp><p:nvSpPr>"
    + `<p:cNvPr id="${index + 2}" name="${escapeXml(slot.slot)}"/>`
    + '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>'
    + `<p:nvPr><p:ph type="${slot.ph.type}"${idxAttr}/></p:nvPr>`
    + "</p:nvSpPr>"
    + `<p:spPr><a:xfrm><a:off x="838200" y="${y}"/><a:ext cx="10515600" cy="914400"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
    + `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(text)}</a:t></a:r></a:p></p:txBody>`
    + "</p:sp>";
}

/**
 * The one slide, on the title layout so the deck opens non-empty. Its text sits
 * in a plain text box rather than a placeholder: a slide placeholder would put
 * a fifteenth name into the package's placeholder set.
 */
function slideXml() {
  return `${XML_DECL}<p:sld ${PRESENTATION_NS}>`
    + "<p:cSld><p:spTree>"
    + emptyGroupShapeXml()
    + "<p:sp><p:nvSpPr>"
    + '<p:cNvPr id="2" name="deck_title_text_box"/>'
    + '<p:cNvSpPr txBox="1"/><p:nvPr/>'
    + "</p:nvSpPr>"
    + '<p:spPr><a:xfrm><a:off x="838200" y="2743200"/><a:ext cx="10515600" cy="1143000"/></a:xfrm>'
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
    + '<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>'
    + `<a:p><a:r><a:rPr lang="en-US" sz="4000" dirty="0"/><a:t>${escapeXml(DECK_TITLE)}</a:t></a:r></a:p>`
    + `<a:p><a:r><a:rPr lang="en-US" sz="1800" dirty="0"/><a:t>${escapeXml(PERIOD_LONG)}</a:t></a:r></a:p>`
    + "</p:txBody></p:sp>"
    + "</p:spTree></p:cSld>"
    + "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
    + "</p:sld>";
}

const emptyGroupShapeXml = () => '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
  + '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

function coreXml() {
  return `${XML_DECL}<cp:coreProperties `
    + 'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
    + 'xmlns:dc="http://purl.org/dc/elements/1.1/" '
    + 'xmlns:dcterms="http://purl.org/dc/terms/" '
    + 'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
    + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + `<dc:title>${escapeXml(DECK_TITLE)}</dc:title>`
    // A role, never a person: every drafted surface, the manifest and this XML
    // are screened for canon and CORE-03 names.
    + "<dc:creator>Revenue Operations</dc:creator>"
    + "<cp:lastModifiedBy>Revenue Operations</cp:lastModifiedBy>"
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${AS_OF}T00:00:00Z</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${AS_OF}T00:00:00Z</dcterms:modified>`
    + "<cp:revision>1</cp:revision>"
    + "</cp:coreProperties>";
}

function appXml() {
  return `${XML_DECL}<Properties `
    + 'xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
    + 'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
    + "<Application>Trazomo datagen</Application>"
    + "<Slides>1</Slides>"
    + "<PresentationFormat>Widescreen</PresentationFormat>"
    + `<Company>${escapeXml(PRESENTING_TEAM)}</Company>`
    + "<AppVersion>1.0000</AppVersion>"
    + "</Properties>";
}

function themeXml() {
  const solidPhClr = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const line = (w) => `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr">${solidPhClr}<a:prstDash val="solid"/></a:ln>`;
  return `${XML_DECL}<a:theme xmlns:a="${NS_A}" name="Office Theme"><a:themeElements>`
    + '<a:clrScheme name="Office">'
    + '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>'
    + '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'
    + '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>'
    + '<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>'
    + '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>'
    + '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>'
    + '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>'
    + "</a:clrScheme>"
    + '<a:fontScheme name="Office">'
    + '<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>'
    + '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>'
    + "</a:fontScheme>"
    + '<a:fmtScheme name="Office">'
    + `<a:fillStyleLst>${solidPhClr}${solidPhClr}${solidPhClr}</a:fillStyleLst>`
    + `<a:lnStyleLst>${line(6350)}${line(12700)}${line(19050)}</a:lnStyleLst>`
    + "<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>"
    + "<a:effectStyle><a:effectLst/></a:effectStyle>"
    + "<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>"
    + `<a:bgFillStyleLst>${solidPhClr}${solidPhClr}${solidPhClr}</a:bgFillStyleLst>`
    + "</a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>";
}

const XML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXml = (text) => String(text).replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);

// ----------------------------------------------------------- the zip writer

/**
 * The pinned modification instant, as DOS date and time. A clock read here is
 * what would make two runs of the same generator differ, so there is none: the
 * package is stamped with the universe's own as-of date at midnight.
 */
const DOS_DATE = ((2026 - 1980) << 9) | (3 << 5) | 16; // 2026-03-16
const DOS_TIME = 0; // 00:00:00

/**
 * A ZIP with STORED entries only, entry paths sorted, no data descriptors, no
 * extra fields and no comments, so the bytes are a pure function of the parts.
 */
function zipStored(parts) {
  const entries = parts
    .map((part) => ({ path: part.path, data: Buffer.from(part.text, "utf8") }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.path)) throw new Error(`${id}: the package carries ${entry.path} twice`);
    seen.add(entry.path);
    // A non-ASCII entry path would need the UTF-8 general-purpose bit, and
    // nothing in an OOXML package needs one; refuse rather than mis-flag it.
    if (/[^\x20-\x7e]/.test(entry.path)) throw new Error(`${id}: ${entry.path} is not an ASCII entry path`);
  }

  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path, "ascii");
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0, 6); // general purpose flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // compressed size
    local.writeUInt32LE(size, 22); // uncompressed size
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    locals.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); // method: stored
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + size;
  }

  const localBytes = Buffer.concat(locals);
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with the central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localBytes.length, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localBytes, centralBytes, end]);
}

/** The standard CRC32 (reflected, polynomial 0xEDB88320) table, built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------- assertions

/**
 * The build-time guard, over the objects about to be serialized. Nothing below
 * states what a figure is: the guard checks shape, traceability and the two
 * cardinalities the tie-outs turn on, and the export supplies every number.
 */
function assertFixture({ view, figures, slots, pptx }) {
  const fail = (message) => {
    throw new Error(`${id}: ${message}`);
  };

  // --- the view --------------------------------------------------------
  if (view.figures.length !== 21) fail(`${view.figures.length} figures, not twenty-one`);
  const sections = ["pipeline_by_stage", "pipeline_totals", "period_outcomes", "account_review"];
  const perSection = { pipeline_by_stage: 12, pipeline_totals: 3, period_outcomes: 3, account_review: 3 };
  for (const section of sections) {
    const n = view.figures.filter((figure) => figure.section === section).length;
    if (n !== perSection[section]) fail(`section ${section} carries ${n} figures, not ${perSection[section]}`);
  }
  view.figures.forEach((figure, index) => {
    const expected = `QF-${String(index + 1).padStart(2, "0")}`;
    if (figure.figure_id !== expected) fail(`figure ${index + 1} is ${figure.figure_id}, not ${expected}`);
    if (!sections.includes(figure.section)) fail(`${figure.figure_id} sits in unpublished section ${figure.section}`);
    if (!figure.label) fail(`${figure.figure_id} carries no label`);
    if (!figure.derivation) fail(`${figure.figure_id} carries no derivation`);
    if (!Array.isArray(figure.opportunity_ids)) fail(`${figure.figure_id} carries no opportunity_ids array`);
    if (new Set(figure.opportunity_ids).size !== figure.opportunity_ids.length) {
      fail(`${figure.figure_id} names an opportunity twice`);
    }
    if (figure.unit === "USD") {
      if (typeof figure.value !== "string" || !/^\d+\.\d{2}$/.test(figure.value)) {
        fail(`${figure.figure_id} is money but its value is not a two-decimal string`);
      }
    } else if (figure.unit === "count") {
      if (!Number.isInteger(figure.value) || figure.value < 0) fail(`${figure.figure_id} is a count but not a whole number`);
      if (figure.value !== figure.opportunity_ids.length) {
        fail(`${figure.figure_id} counts ${figure.value} rows but names ${figure.opportunity_ids.length}`);
      }
    } else {
      fail(`${figure.figure_id} carries unpublished unit ${figure.unit}`);
    }
  });

  // C5-P3: the honest zero is stated with an empty list, not omitted.
  const zeros = view.figures.filter((figure) => figure.unit === "count" && figure.value === 0);
  if (zeros.length !== 1) fail(`${zeros.length} count figures are zero, not one (the Closed Won honest zero)`);
  if (zeros[0].opportunity_ids.length !== 0) fail("the honest zero names opportunities");
  const wonFigure = figures.find((figure) => figure.key === "outcome_closed_won_count");
  if (zeros[0].figure_id !== wonFigure.figure_id) fail("the honest zero is not the Closed Won figure");
  const untraced = view.figures.filter(
    (figure) => figure.opportunity_ids.length === 0 && figure.figure_id !== wonFigure.figure_id
  );
  if (untraced.length !== 0) fail(`${untraced.length} figures beyond the honest zero name no opportunity`);

  // Every id a figure names is a row the export actually carries.
  const known = new Set(figures.flatMap((figure) => figure.rows.map((row) => row.opportunity_id)));
  for (const figure of view.figures) {
    for (const oppId of figure.opportunity_ids) {
      if (!known.has(oppId)) fail(`${figure.figure_id} names ${oppId}, which is in no figure's row set`);
    }
  }

  // --- the manifest ----------------------------------------------------
  const names = slots.map((slot) => slot.slot);
  if (names.length !== 14) fail(`${names.length} slots, not fourteen`);
  if (new Set(names).size !== names.length) fail("a slot name repeats");
  const figureIds = new Set(view.figures.map((figure) => figure.figure_id));
  for (const slot of slots) {
    if (!["numbers_view", "claims_sheet", "static"].includes(slot.source)) {
      fail(`${slot.slot} binds unpublished source ${slot.source}`);
    }
    if (slot.source === "static") {
      if (!slot.text) fail(`${slot.slot} is static and carries no pinned text`);
      if (slot.allowed_ids) fail(`${slot.slot} is static and still carries allowed_ids`);
      continue;
    }
    if (!Array.isArray(slot.allowed_ids) || slot.allowed_ids.length === 0) {
      fail(`${slot.slot} binds ${slot.source} and allows no id`);
    }
    for (const allowed of slot.allowed_ids) {
      if (slot.source === "numbers_view" && !figureIds.has(allowed)) {
        fail(`${slot.slot} allows ${allowed}, which is not a figure of the view`);
      }
      if (slot.source === "claims_sheet" && !CLAIM_IDS.includes(allowed)) {
        fail(`${slot.slot} allows ${allowed}, which is outside the pinned claim universe`);
      }
      // T5's manifest clause: the unapproved row resolves nowhere.
      if (allowed === UNAPPROVED_CLAIM_ID) fail(`${slot.slot} allows ${UNAPPROVED_CLAIM_ID}, the unapproved claim`);
    }
  }

  // --- the package -----------------------------------------------------
  const bytes = pptx.toString("latin1");
  for (const name of names) {
    const occurrences = bytes.split(`name="${name}"`).length - 1;
    if (occurrences !== 1) fail(`${name} appears as a placeholder name ${occurrences} times in the package, not once`);
  }
  const placeholderNames = bytes.match(/name="slot_[a-z_]+"/g) ?? [];
  if (placeholderNames.length !== names.length) {
    fail(`the package carries ${placeholderNames.length} slot-shaped placeholder names, not ${names.length}`);
  }
  if (pptx.readUInt32LE(0) !== 0x04034b50) fail("the package does not begin with a local file header");
}
