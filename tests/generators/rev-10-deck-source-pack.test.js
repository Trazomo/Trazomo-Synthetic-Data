// REV-10: the QBR numbers view, the deck template package and the manifest that
// binds one to the other, checked against the cluster-5 data plan
// (docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-5.md,
// sections 0.3, 2.2 and 4).
//
// The figure side is re-derived here rather than imported. Open ("neither won
// nor lost"), count by stage, sum of amount by stage and the weighted pipeline
// under the declared v1 weights are implemented a second time in this file,
// from the plan's own words, in integer cents, and none of the generator's
// helpers is used on the assertion side: a test that imports the arithmetic it
// is checking agrees with the generator by construction and can never disagree
// with it. Section 0.3's receipt table is pinned below as a second opinion on
// that re-derivation, so a CORE-03 reroll fails by name instead of quietly
// moving the deck's numbers.
//
// The template side is checked through the bytes, not through the generator's
// intentions: the package is parsed back out of the emitted archive by
// tests/helpers/zip.js and the placeholder-name set is read off the XML the
// parse returns. The fourteen slot names are pinned here as well, so renaming a
// slot in the one layout definition (which would move the template and the
// manifest together, and so would satisfy T6 on its own) still fails.
//
// The generator is imported directly. REV-10 is deliberately not in the CLI
// registry yet, so there is no spec-driven path to it and nothing here writes
// under datasets/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { generate, id as REV_10_ID } from "../../datagen/src/generators/rev-10-deck-source-pack.js";
import { generate as generateCore03 } from "../../datagen/src/generators/core-03-crm-seed.js";
import { createRng } from "../../datagen/src/seed.js";
import { readStoredZip, dosStamp } from "../helpers/zip.js";
import { fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

const NUMBERS_VIEW_FILE = "qbr-numbers-view.json";
const TEMPLATE_FILE = "deck-template.pptx";
const MANIFEST_FILE = "template-manifest.yaml";

const AS_OF = "2026-03-16";
const PERIOD_START = "2026-01-01";
const PERIOD_END = "2026-03-31";

/** The declared v1 policy, as whole percents so nothing here touches a float. */
const WEIGHT_PERCENT = { Prospecting: 10, Qualification: 25, Proposal: 50, Negotiation: 75 };
const STAGE_ORDER = ["Prospecting", "Qualification", "Proposal", "Negotiation"];
const CLOSED_WON = "Closed Won";
const CLOSED_LOST = "Closed Lost";
const ACCOUNT_ID = "co-102";

/**
 * Section 0.3's receipt table, at the v1.15.0 export. A second opinion on the
 * re-derivation below, not its source: if the population moves, the derivation
 * and the emitted bytes still have to agree with each other and this table is
 * what says the universe moved.
 */
const RECEIPTS = {
  Prospecting: { count: 11, open: "1548047.00", weighted: "154804.70" },
  Qualification: { count: 7, open: "775672.00", weighted: "193918.00" },
  Proposal: { count: 8, open: "1092098.00", weighted: "546049.00" },
  Negotiation: { count: 9, open: "1496814.00", weighted: "1122610.50" },
};
const TOTAL_RECEIPT = { count: 35, open: "4912631.00", weighted: "2017382.20" };
const CLOSED_LOST_RECEIPT = { count: 1, ids: ["opp-co-124-01"], amount: "27161.00" };
const ACCOUNT_RECEIPT = { count: 1, ids: ["opp-co-102-01"], amount: "480000.00", weighted: "360000.00" };

/** The fourteen slots, pinned by layout (data plan 2.2's table). */
const EXPECTED_SLOTS = [
  ["title_slide", "slot_deck_title"],
  ["title_slide", "slot_period_line"],
  ["title_slide", "slot_presenting_team"],
  ["pipeline_overview", "slot_pipeline_by_stage_table"],
  ["pipeline_overview", "slot_open_total"],
  ["pipeline_overview", "slot_weighted_total"],
  ["pipeline_overview", "slot_asof_note"],
  ["quarter_outcomes", "slot_closed_summary"],
  ["quarter_outcomes", "slot_closed_ids_note"],
  ["account_review", "slot_account_heading"],
  ["account_review", "slot_account_open_position"],
  ["voice_of_customer", "slot_customer_language_quotes"],
  ["proposal_language", "slot_approved_claims"],
  ["proposal_language", "slot_language_citation_note"],
];

/** The claim universe REV-10's spec pins, and the one row nothing may bind. */
const CLAIM_IDS = ["CL-01", "CL-02", "CL-03", "CL-04", "CL-05", "CL-06", "CL-07", "CL-08"];
const UNAPPROVED_CLAIM_ID = "CL-08";

/** The parts an ECMA-376 presentation package cannot open without. */
const REQUIRED_PARTS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "docProps/app.xml",
  "docProps/core.xml",
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels",
  "ppt/slideMasters/slideMaster1.xml",
  "ppt/slideMasters/_rels/slideMaster1.xml.rels",
  "ppt/slides/slide1.xml",
  "ppt/slides/_rels/slide1.xml.rels",
  "ppt/theme/theme1.xml",
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    `ppt/slideLayouts/slideLayout${n}.xml`,
    `ppt/slideLayouts/_rels/slideLayout${n}.xml.rels`,
  ]),
];

// ------------------------------------------------------------------- sources

/**
 * The generator's output, produced lazily inside whichever test asks first. A
 * build-time guard that throws then fails the named test that needed the file,
 * rather than taking the whole file down before any test is registered.
 */
let cached = null;
const pack = () => (cached ??= generate());

const view = () => JSON.parse(fileByPath(pack(), NUMBERS_VIEW_FILE).content);
const manifest = () => yaml.load(fileByPath(pack(), MANIFEST_FILE).content);
const templateBytes = () => {
  const file = fileByPath(pack(), TEMPLATE_FILE);
  assert.equal(file.encoding, "base64", `${TEMPLATE_FILE} is binary and must declare its encoding`);
  return Buffer.from(file.content, "base64");
};

/** CORE-03's own emitted opportunity rows, the file every figure is read out of. */
function core03Opportunities() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((file) => file.path === "crm-seed.json");
  assert.ok(bundle, "CORE-03 no longer emits crm-seed.json");
  return JSON.parse(bundle.content).opportunities;
}

// --------------------------------------------------- the independent derivation

/** Whole dollars to cents. Every figure below is summed in the integers. */
const cents = (rows) => rows.reduce((total, row) => {
  assert.ok(Number.isInteger(row.amount), `${row.opportunity_id} carries a non-integer amount`);
  return total + row.amount * 100;
}, 0);

/** `cents` at a whole-percent weight, exactly, with no rounding anywhere. */
function weighted(centsValue, percent) {
  const scaled = centsValue * percent;
  assert.equal(scaled % 100, 0, `${centsValue} cents at ${percent} percent is not a whole number of cents`);
  return scaled / 100;
}

/** Each row at its own stage's declared weight, summed. */
const weightedByStage = (rows) => rows.reduce((total, row) => {
  const percent = WEIGHT_PERCENT[row.stage];
  assert.ok(percent !== undefined, `${row.opportunity_id} is open at ${row.stage}, which carries no declared weight`);
  return total + weighted(row.amount * 100, percent);
}, 0);

const money = (centsValue) => `${Math.trunc(centsValue / 100)}.${String(centsValue % 100).padStart(2, "0")}`;
const idsOf = (rows) => rows.map((row) => row.opportunity_id).slice().sort();

/**
 * The twenty-one figures the plan specifies, in the order it specifies them,
 * re-derived from the export. Each entry is {section, unit, value,
 * opportunity_ids}: the label and the derivation sentence are the generator's
 * prose and are checked for presence rather than restated here.
 */
function expectedFigures(opportunities) {
  const open = opportunities.filter((row) => row.stage !== CLOSED_WON && row.stage !== CLOSED_LOST);
  const count = (section, rows) => ({ section, unit: "count", value: rows.length, opportunity_ids: idsOf(rows) });
  const usd = (section, rows, centsValue) => ({ section, unit: "USD", value: money(centsValue), opportunity_ids: idsOf(rows) });

  const figures = [];
  for (const stage of STAGE_ORDER) {
    const rows = open.filter((row) => row.stage === stage);
    figures.push(count("pipeline_by_stage", rows));
    figures.push(usd("pipeline_by_stage", rows, cents(rows)));
    figures.push(usd("pipeline_by_stage", rows, weighted(cents(rows), WEIGHT_PERCENT[stage])));
  }
  figures.push(count("pipeline_totals", open));
  figures.push(usd("pipeline_totals", open, cents(open)));
  figures.push(usd("pipeline_totals", open, weightedByStage(open)));

  const inPeriod = (stage) => opportunities.filter(
    (row) => row.stage === stage && row.close_date >= PERIOD_START && row.close_date <= PERIOD_END
  );
  const closedLost = inPeriod(CLOSED_LOST);
  const closedWon = inPeriod(CLOSED_WON);
  figures.push(count("period_outcomes", closedLost));
  figures.push(usd("period_outcomes", closedLost, cents(closedLost)));
  figures.push(count("period_outcomes", closedWon));

  const account = open.filter((row) => row.account_id === ACCOUNT_ID);
  figures.push(count("account_review", account));
  figures.push(usd("account_review", account, cents(account)));
  figures.push(usd("account_review", account, weightedByStage(account)));

  return figures;
}

// ------------------------------------------------------------------ REV-C5-T4

test("REV-C5-T4: every one of the twenty-one figures recomputes from the CORE-03 export to the cent", () => {
  const emitted = view().figures;
  const expected = expectedFigures(core03Opportunities());

  assert.equal(emitted.length, 21, `the view carries ${emitted.length} figures, not twenty-one`);
  assert.equal(expected.length, 21, "the re-derivation produced the wrong number of figures");

  emitted.forEach((figure, index) => {
    const want = expected[index];
    const figureId = `QF-${String(index + 1).padStart(2, "0")}`;
    assert.equal(figure.figure_id, figureId, `figure ${index + 1} is ${figure.figure_id}, not ${figureId}`);
    assert.equal(figure.section, want.section, `${figureId} sits in section ${figure.section}, not ${want.section}`);
    assert.equal(figure.unit, want.unit, `${figureId} is a ${figure.unit} figure, not a ${want.unit} one`);
    assert.deepEqual(
      figure.value,
      want.value,
      `${figureId} states ${figure.value} where the export recomputes ${want.value}`
    );
    assert.deepEqual(
      figure.opportunity_ids.slice().sort(),
      want.opportunity_ids,
      `${figureId} names the wrong opportunity rows`
    );
    assert.ok(typeof figure.label === "string" && figure.label.length > 0, `${figureId} carries no label`);
  });
});

test("REV-C5-T4: money is a two-decimal string and a count is an integer, on every figure", () => {
  for (const figure of view().figures) {
    if (figure.unit === "USD") {
      assert.equal(typeof figure.value, "string", `${figure.figure_id} states money as a ${typeof figure.value}`);
      assert.match(figure.value, /^\d+\.\d{2}$/, `${figure.figure_id} states ${figure.value}, not a two-decimal string`);
    } else {
      assert.equal(figure.unit, "count", `${figure.figure_id} carries unpublished unit ${figure.unit}`);
      assert.ok(Number.isInteger(figure.value), `${figure.figure_id} states a count of ${figure.value}`);
    }
  }
});

test("REV-C5-T4: the emitted figures match the data plan's receipt table row for row", () => {
  const bySection = (section) => view().figures.filter((figure) => figure.section === section);

  const stageFigures = bySection("pipeline_by_stage");
  assert.equal(stageFigures.length, 12, `${stageFigures.length} per-stage figures, not twelve`);
  STAGE_ORDER.forEach((stage, index) => {
    const [countFigure, openFigure, weightedFigure] = stageFigures.slice(index * 3, index * 3 + 3);
    const receipt = RECEIPTS[stage];
    assert.equal(countFigure.value, receipt.count, `${stage} carries ${countFigure.value} open rows, not ${receipt.count}`);
    assert.equal(openFigure.value, receipt.open, `${stage} open pipeline is ${openFigure.value}, not ${receipt.open}`);
    assert.equal(weightedFigure.value, receipt.weighted, `${stage} weighted pipeline is ${weightedFigure.value}, not ${receipt.weighted}`);
  });

  const [openCount, openSum, weightedTotal] = bySection("pipeline_totals");
  assert.equal(openCount.value, TOTAL_RECEIPT.count);
  assert.equal(openSum.value, TOTAL_RECEIPT.open);
  assert.equal(weightedTotal.value, TOTAL_RECEIPT.weighted);

  const [lostCount, lostAmount, wonCount] = bySection("period_outcomes");
  assert.equal(lostCount.value, CLOSED_LOST_RECEIPT.count);
  assert.deepEqual(lostCount.opportunity_ids, CLOSED_LOST_RECEIPT.ids);
  assert.equal(lostAmount.value, CLOSED_LOST_RECEIPT.amount);
  assert.equal(wonCount.value, 0, "the period closed won something, which the honest zero denies");

  const [accountCount, accountAmount, accountWeighted] = bySection("account_review");
  assert.equal(accountCount.value, ACCOUNT_RECEIPT.count);
  assert.deepEqual(accountCount.opportunity_ids, ACCOUNT_RECEIPT.ids);
  assert.equal(accountAmount.value, ACCOUNT_RECEIPT.amount);
  assert.equal(accountWeighted.value, ACCOUNT_RECEIPT.weighted);
});

test("REV-C5-T4: the header block publishes the as-of date, the period, the source and the declared v1 weights", () => {
  const emitted = view();
  assert.equal(emitted.generated_from_spec, REV_10_ID);
  assert.equal(emitted.as_of, AS_OF);
  assert.deepEqual(emitted.period, { start: PERIOD_START, end: PERIOD_END });
  assert.match(emitted.source, /opportunities\.csv/, "the source line does not name CORE-03's opportunities export");
  assert.match(emitted.source, /CORE-03/, "the source line does not name CORE-03");
  assert.match(
    emitted.stage_column_convention,
    /stage column/,
    "the view does not state which column its stages are read from"
  );
  assert.match(emitted.stage_column_convention, new RegExp(AS_OF), "the stage convention line does not name the as-of date");
  assert.equal(emitted.declared_weights.version, "v1");
  assert.match(emitted.declared_weights.policy, /declared/, "the weights policy line does not say the weights are declared");
  assert.match(emitted.declared_weights.policy, /not measured/, "the weights policy line does not say the weights are unmeasured");
  assert.deepEqual(emitted.declared_weights.weights, {
    Prospecting: "0.10",
    Qualification: "0.25",
    Proposal: "0.50",
    Negotiation: "0.75",
  });
});

// ------------------------------------------------------------------- C5-P3

test("C5-P3: every figure carries the opportunity ids it was computed from, and the honest zero carries an empty list", () => {
  const figures = view().figures;
  const untraced = figures.filter((figure) => !Array.isArray(figure.opportunity_ids));
  assert.equal(untraced.length, 0, `${untraced.length} figures carry no opportunity_ids array`);

  const noDerivation = figures.filter((figure) => typeof figure.derivation !== "string" || figure.derivation.length === 0);
  assert.equal(noDerivation.length, 0, `${noDerivation.length} figures carry no derivation`);

  for (const figure of figures) {
    assert.equal(
      new Set(figure.opportunity_ids).size,
      figure.opportunity_ids.length,
      `${figure.figure_id} names an opportunity twice`
    );
    if (figure.unit === "count") {
      assert.equal(
        figure.value,
        figure.opportunity_ids.length,
        `${figure.figure_id} counts ${figure.value} rows but names ${figure.opportunity_ids.length}`
      );
    }
  }

  const empty = figures.filter((figure) => figure.opportunity_ids.length === 0);
  assert.equal(empty.length, 1, `${empty.length} figures name no opportunity, not one (the Closed Won honest zero)`);
  const zero = empty[0];
  assert.equal(zero.section, "period_outcomes", "the empty-id figure is not the period outcome");
  assert.equal(zero.value, 0, "the empty-id figure is not zero");
  assert.match(
    zero.derivation,
    /zero/,
    "the honest zero's derivation does not say the figure is zero"
  );
  assert.match(
    zero.derivation,
    /empty/,
    "the honest zero's derivation does not say its opportunity_ids list is empty"
  );

  // Every id any figure names is a row the export actually carries.
  const known = new Set(core03Opportunities().map((row) => row.opportunity_id));
  for (const figure of figures) {
    for (const oppId of figure.opportunity_ids) {
      assert.ok(known.has(oppId), `${figure.figure_id} names ${oppId}, which is in no opportunities.csv row`);
    }
  }
});

// -------------------------------------------------------- the template package

/** Every placeholder name in one XML part: a p:sp carrying a p:ph, by p:cNvPr name. */
function placeholderNames(xml) {
  const names = [];
  for (const chunk of xml.split("<p:sp>").slice(1)) {
    const shape = chunk.split("</p:sp>")[0];
    if (!/<p:ph[ /]/.test(shape)) continue;
    const match = shape.match(/<p:cNvPr [^>]*name="([^"]*)"/);
    assert.ok(match, "a placeholder shape carries no p:cNvPr name attribute");
    names.push(match[1]);
  }
  return names;
}

/** Every placeholder name in the whole package, part by part. */
function packagePlaceholderNames(zip) {
  return zip.entries
    .filter((entry) => entry.path.endsWith(".xml"))
    .flatMap((entry) => placeholderNames(entry.text));
}

test("REV-C5-T6: the manifest's slot set equals the placeholder-name set of the emitted template bytes", () => {
  const zip = readStoredZip(templateBytes());
  const fromBytes = packagePlaceholderNames(zip);
  const fromManifest = manifest().slots.map((slot) => slot.slot);

  assert.equal(new Set(fromBytes).size, fromBytes.length, "a placeholder name repeats inside the template package");
  assert.equal(new Set(fromManifest).size, fromManifest.length, "a slot name repeats in the manifest");
  assert.equal(fromBytes.length, 14, `the package carries ${fromBytes.length} placeholders, not fourteen`);
  assert.equal(fromManifest.length, 14, `the manifest lists ${fromManifest.length} slots, not fourteen`);
  assert.deepEqual(
    fromManifest.slice().sort(),
    fromBytes.slice().sort(),
    "the manifest's slot set and the template's placeholder set are not the same set"
  );
});

test("REV-C5-T6: the fourteen pinned slots sit on the layouts the data plan assigns them", () => {
  const slots = manifest().slots;
  assert.deepEqual(
    slots.map((slot) => [slot.layout, slot.slot]),
    EXPECTED_SLOTS,
    "the slot-to-layout map has moved away from the data plan's table"
  );

  // And the same fourteen names, on the same six layouts, inside the bytes.
  const zip = readStoredZip(templateBytes());
  const byLayout = new Map();
  for (const entry of zip.entries) {
    if (!/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(entry.path)) continue;
    const name = entry.text.match(/<p:cSld name="([^"]*)"/);
    assert.ok(name, `${entry.path} carries no p:cSld name`);
    byLayout.set(entry.path, { layout: name[1], slots: placeholderNames(entry.text) });
  }
  assert.equal(byLayout.size, 6, `the package carries ${byLayout.size} slide layouts, not six`);

  const pinned = new Map();
  for (const [layout, slot] of EXPECTED_SLOTS) {
    if (!pinned.has(layout)) pinned.set(layout, []);
    pinned.get(layout).push(slot);
  }
  const emitted = new Map([...byLayout.values()].map((entry) => [entry.layout, entry.slots]));
  assert.deepEqual([...emitted.keys()].sort(), [...pinned.keys()].sort(), "the six layout names have moved");
  for (const [layout, slots_] of pinned) {
    assert.deepEqual(emitted.get(layout), slots_, `layout ${layout} does not carry its pinned slots in order`);
  }
});

test("REV-C5-T5: no slot's allowed_ids resolves the unapproved claim CL-08", () => {
  const slots = manifest().slots;
  const claimSlots = slots.filter((slot) => slot.source === "claims_sheet");
  assert.ok(claimSlots.length > 0, "no slot binds the claims sheet at all, so the exclusion proves nothing");

  for (const slot of slots) {
    for (const allowed of slot.allowed_ids ?? []) {
      assert.notEqual(
        allowed,
        UNAPPROVED_CLAIM_ID,
        `${slot.slot} allows ${UNAPPROVED_CLAIM_ID}, the unapproved claim no slide may print`
      );
    }
  }

  // Stated the other way round, over the raw bytes, so a slot that smuggled the
  // id in as free text rather than as an allowed id fails here too.
  const text = fileByPath(pack(), MANIFEST_FILE).content;
  assert.ok(!text.includes(UNAPPROVED_CLAIM_ID), `the manifest names ${UNAPPROVED_CLAIM_ID}`);

  // And the seven that are bindable are all there, so the exclusion is not just
  // an empty claims binding.
  const bindable = CLAIM_IDS.filter((claimId) => claimId !== UNAPPROVED_CLAIM_ID);
  for (const slot of claimSlots) {
    assert.deepEqual(slot.allowed_ids, bindable, `${slot.slot} does not bind the seven bindable claim rows`);
  }
});

test("REV-C5-T6: every bound id resolves, and every static slot carries pinned text instead", () => {
  const emitted = manifest();
  const figureIds = new Set(view().figures.map((figure) => figure.figure_id));
  assert.equal(figureIds.size, 21);

  const seenNumbersViewIds = new Set();
  for (const slot of emitted.slots) {
    assert.ok(
      ["numbers_view", "claims_sheet", "static"].includes(slot.source),
      `${slot.slot} binds unpublished source ${slot.source}`
    );
    if (slot.source === "static") {
      assert.ok(typeof slot.text === "string" && slot.text.length > 0, `${slot.slot} is static and carries no pinned text`);
      assert.equal(slot.allowed_ids, undefined, `${slot.slot} is static and still carries allowed_ids`);
      continue;
    }
    assert.ok(Array.isArray(slot.allowed_ids) && slot.allowed_ids.length > 0, `${slot.slot} allows no id`);
    assert.equal(slot.text, undefined, `${slot.slot} is bound and still carries pinned text`);
    for (const allowed of slot.allowed_ids) {
      if (slot.source === "numbers_view") {
        assert.ok(figureIds.has(allowed), `${slot.slot} allows ${allowed}, which is not a figure of the view`);
        seenNumbersViewIds.add(allowed);
      } else {
        assert.ok(CLAIM_IDS.includes(allowed), `${slot.slot} allows ${allowed}, which is outside the pinned claim universe`);
      }
    }
  }

  // The three sections a deck actually renders are all reachable: the twelve
  // stage figures, the three totals and the three account figures, plus the
  // three period outcomes. Nothing computed is left with no slide to land on.
  assert.equal(seenNumbersViewIds.size, 21, `${seenNumbersViewIds.size} of the twenty-one figures are bound to a slot`);

  assert.equal(emitted.generated_from_spec, REV_10_ID);
  assert.equal(emitted.as_of, AS_OF);
  assert.equal(emitted.template, TEMPLATE_FILE);
  assert.equal(emitted.numbers_view, NUMBERS_VIEW_FILE);
  assert.ok(typeof emitted.claims_sheet === "string" && emitted.claims_sheet.length > 0, "the manifest names no claims sheet");
  assert.match(emitted.placeholder_rule, /p:cNvPr/, "the manifest does not publish how a slot is read out of the bytes");
});

test("REV-C5-T6: the pinned static text is what the template prints, verbatim", () => {
  const zip = readStoredZip(templateBytes());
  const xml = zip.entries.filter((entry) => entry.path.startsWith("ppt/slideLayouts/slideLayout")).map((entry) => entry.text).join("");
  const statics = manifest().slots.filter((slot) => slot.source === "static");
  assert.equal(statics.length, 7, `${statics.length} static slots, not seven`);
  for (const slot of statics) {
    assert.ok(
      xml.includes(`<a:t>${slot.text}</a:t>`),
      `the template does not print ${slot.slot}'s pinned text "${slot.text}"`
    );
  }
  const byName = new Map(statics.map((slot) => [slot.slot, slot.text]));
  assert.equal(byName.get("slot_deck_title"), "Quarterly Business Review");
  assert.equal(byName.get("slot_period_line"), "Quarter ending 31 March 2026");
  assert.equal(byName.get("slot_presenting_team"), "Atticus Dundee Inc.");
  assert.equal(byName.get("slot_asof_note"), "As of 16 March 2026");
  assert.equal(byName.get("slot_account_heading"), "Amberfield Logistics, quarterly business review");
  assert.match(byName.get("slot_closed_ids_note"), /opportunity ids/);
  assert.match(byName.get("slot_language_citation_note"), /WL id/);
});

// ---------------------------------------------------------------- zip integrity

test("REV-10: deck-template.pptx is a stored zip with fixed timestamps and sorted entry paths", () => {
  const bytes = templateBytes();
  const zip = readStoredZip(bytes);

  assert.ok(zip.entries.length > 0, "the package carries no entries");
  assert.equal(zip.comment.length, 0, "the archive carries a trailing comment");
  for (const entry of zip.entries) {
    assert.equal(entry.method, 0, `${entry.path} is not stored`);
    assert.equal(entry.compressedSize, entry.size, `${entry.path} is stored but its two sizes differ`);
    assert.equal(
      dosStamp(entry.dosDate, entry.dosTime),
      "2026-03-16T00:00:00",
      `${entry.path} carries a timestamp that is not the pinned instant`
    );
  }

  const paths = zip.entries.map((entry) => entry.path);
  assert.deepEqual(paths, paths.slice().sort(), "the entry paths are not sorted");
  assert.equal(paths[0], "[Content_Types].xml", "the package does not open with [Content_Types].xml");
});

test("REV-10: deck-template.pptx carries every required OOXML part, declared in [Content_Types].xml", () => {
  const zip = readStoredZip(templateBytes());
  const paths = zip.entries.map((entry) => entry.path);
  for (const part of REQUIRED_PARTS) {
    assert.ok(paths.includes(part), `the package is missing ${part}`);
  }
  assert.deepEqual(paths.slice().sort(), REQUIRED_PARTS.slice().sort(), "the package carries a part outside the pinned set");

  const types = zip.byPath.get("[Content_Types].xml").text;
  assert.match(types, /Extension="rels"/, "[Content_Types].xml does not default the rels extension");
  assert.match(types, /Extension="xml"/, "[Content_Types].xml does not default the xml extension");
  for (const part of paths) {
    if (part === "[Content_Types].xml" || part.endsWith(".rels")) continue;
    assert.ok(types.includes(`PartName="/${part}"`), `[Content_Types].xml does not declare /${part}`);
  }
  assert.match(
    types,
    /ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation\.main\+xml"/,
    "[Content_Types].xml does not type ppt/presentation.xml as a presentation"
  );

  // The presentation actually points at the master and the one slide, and the
  // master enumerates all six layouts, so the deck opens non-empty.
  const presentation = zip.byPath.get("ppt/presentation.xml").text;
  assert.match(presentation, /<p:sldMasterIdLst><p:sldMasterId /, "the presentation lists no slide master");
  assert.equal((presentation.match(/<p:sldId /g) ?? []).length, 1, "the presentation does not carry exactly one slide");
  const master = zip.byPath.get("ppt/slideMasters/slideMaster1.xml").text;
  assert.equal((master.match(/<p:sldLayoutId /g) ?? []).length, 6, "the master does not enumerate six layouts");
  assert.match(master, /<p:clrMap /, "the master carries no colour map");
  const slideRels = zip.byPath.get("ppt/slides/_rels/slide1.xml.rels").text;
  assert.match(slideRels, /slideLayout1\.xml/, "the slide does not sit on the title layout");
  const slide = zip.byPath.get("ppt/slides/slide1.xml").text;
  assert.match(slide, /<a:t>Quarterly Business Review<\/a:t>/, "the one slide opens empty");
});

test("REV-10: every XML part of deck-template.pptx is well formed", () => {
  const zip = readStoredZip(templateBytes());
  const xmlParts = zip.entries.filter((entry) => entry.path.endsWith(".xml") || entry.path.endsWith(".rels"));
  assert.equal(xmlParts.length, zip.entries.length, "the package carries a part that is not XML");
  for (const entry of xmlParts) {
    assertWellFormed(entry.path, entry.text);
  }
});

/**
 * A cheap well-formedness check: every start tag is closed, in order, by its own
 * end tag, and the part carries exactly one root element under the declaration.
 * Not a validating parse, and not meant to be: what it catches is the class of
 * mistake a hand-written template string actually makes.
 */
function assertWellFormed(path, xml) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), `${path} carries no XML declaration`);
  const stack = [];
  let roots = 0;
  for (const match of xml.matchAll(/<(\/?)([A-Za-z_][\w.:-]*)([^>]*)>/g)) {
    const [, closing, name, rest] = match;
    if (closing) {
      const open = stack.pop();
      assert.equal(open, name, `${path} closes </${name}> where <${open}> was open`);
      if (stack.length === 0) roots += 1;
    } else if (rest.endsWith("/")) {
      if (stack.length === 0) roots += 1;
    } else {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], `${path} leaves ${stack.join(", ")} unclosed`);
  assert.equal(roots, 1, `${path} carries ${roots} root elements`);
  assert.ok(!/<[A-Za-z_][\w.:-]*[^>]*$/.test(xml), `${path} ends inside an unterminated tag`);
}

test("REV-10: the pack regenerates byte identically", () => {
  const runA = generate();
  const runB = generate();
  assert.equal(runA.length, runB.length, "different number of output files between runs");
  for (let i = 0; i < runA.length; i++) {
    assert.equal(runA[i].path, runB[i].path, "file path order differs between runs");
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} content differs between runs`);
    assert.equal(runA[i].encoding, runB[i].encoding, `${runA[i].path} encoding differs between runs`);
  }
  const bytesA = Buffer.from(fileByPath(runA, TEMPLATE_FILE).content, "base64");
  const bytesB = Buffer.from(fileByPath(runB, TEMPLATE_FILE).content, "base64");
  assert.ok(bytesA.equals(bytesB), `${TEMPLATE_FILE} bytes differ between runs`);
  assert.ok(bytesA.length > 0, `${TEMPLATE_FILE} is empty`);
});

test("REV-10: the pack emits exactly the three deterministic files", () => {
  assert.deepEqual(
    pack().map((file) => file.path),
    [NUMBERS_VIEW_FILE, TEMPLATE_FILE, MANIFEST_FILE]
  );
  assert.equal(pack().filter((file) => file.encoding === "base64").length, 1, "more than one file claims to be binary");
});

// ------------------------------------------------------------- identity screens

/**
 * Every person canon/people.md seats, records as an erratum alias, reserves, or
 * flags in the real-person collision screen. The parse is the REV-C2 screen's,
 * and its size is asserted below: a denylist that silently empties proves
 * nothing.
 */
function canonPeople() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const shape = /^[A-Z][\p{L}'’-]+(?: (?:[A-Z]\.|[A-Z][\p{L}'’-]+)){1,3}$/u;
  const names = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const candidate = /^pe-\d{3}$/.test(cells[0]) ? cells[1] : cells[0];
    const bare = candidate
      .replace(/^Hon\.\s+/, "")
      .replace(/,\s*(?:M\.D\.|EnCE)$/, "")
      .replace(/\s*\(Ret\.\)$/, "")
      .trim();
    if (!bare || /\d/.test(bare)) continue;
    if (shape.test(bare)) names.add(bare);
  }
  return names;
}

test("REV-10: no emitted byte names a canon person or a CORE-03 contact", () => {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = JSON.parse(files.find((file) => file.path === "crm-seed.json").content);
  const crmNames = new Set([
    ...bundle.contacts.map((contact) => `${contact.first_name} ${contact.last_name}`),
    ...bundle.opportunities.map((opportunity) => opportunity.owner_name),
    ...bundle.accounts.map((account) => account.owner_name),
  ]);
  assert.ok(crmNames.size >= 20, `only ${crmNames.size} CORE-03 names were parsed; the screen would prove nothing`);

  const people = canonPeople();
  assert.ok(people.size >= 60, `only ${people.size} canon people were parsed out of canon/people.md; the parse has broken`);
  assert.ok(people.has("Kestrel Ashgrove"), "the canon-people parse missed a seated person; the table shape has moved");

  const surfaces = [
    [NUMBERS_VIEW_FILE, fileByPath(pack(), NUMBERS_VIEW_FILE).content],
    [MANIFEST_FILE, fileByPath(pack(), MANIFEST_FILE).content],
    [TEMPLATE_FILE, templateBytes().toString("latin1")],
  ];
  for (const [surface, text] of surfaces) {
    for (const name of [...people, ...crmNames]) {
      assert.ok(!text.includes(name), `${surface} names ${name}; this pack names roles and accounts only`);
    }
  }
});

test("REV-10: the pack names the canon accounts it is about and no owner or contact column", () => {
  const emitted = view();
  const serialized = JSON.stringify(emitted);
  for (const column of ["owner_name", "owner_employee_id", "next_step", "competitor", "contact_id"]) {
    assert.ok(!serialized.includes(column), `the numbers view carries the ${column} column, which a QBR figure has no use for`);
  }
  assert.ok(
    emitted.figures.some((figure) => figure.label.includes("Amberfield Logistics")),
    "the account section does not name its subject"
  );
  assert.ok(
    fileByPath(pack(), MANIFEST_FILE).content.includes("Atticus Dundee Inc."),
    "the title slot does not name the presenting team"
  );
});
