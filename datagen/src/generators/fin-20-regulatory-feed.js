// FIN-20 regulatory-updates-feed: fourteen external updates a finance team has
// to triage, plus the register of the company's own controlled documents.
//
// Module 21's exercise is a join, not a reading comprehension test. Three
// findings are planted and none of them is labelled:
//
//   1. One update is materially relevant, which takes two independent legs: its
//      scope covers a private software company on a subscription revenue model,
//      AND at least one account it affects is an active FIN-22 code carrying a
//      non-zero FIN-05 balance. Several updates pass one leg. Exactly one passes
//      both, so neither leg can be skipped.
//   2. One update is irrelevant, and irrelevance is likewise two legs: its
//      affected accounts intersect the chart in nothing at all, and its
//      industries exclude software. Other updates touch no chart account; they
//      are still about this company's business.
//   3. One controlled document is behind a rule that names it: the update takes
//      effect on or after that document's own effective date and was published
//      after the document was last reviewed. Four updates name a controlled
//      document. Three of them name documents reviewed after the update landed.
//
// policy-index.csv is derived from the CORE-05 document-control blocks at build
// time rather than retyped, so it cannot drift: change a version or a review
// date in the shipped markdown and the index changes with it. That does mean
// this generator reads the repo, which no other generator does. A CORE-05
// formatting change therefore breaks generation rather than the test, which is
// the loud failure and the right one.
//
// Nothing here names a real organization and there are no URLs. Issuers are
// generic labels; the citations are the real codification topics the policy
// library already cites, so a reader can look the subject up without the feed
// pretending to be a filing.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";

export const id = "FIN-20";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const CORE_05_DIR = join(REPO_ROOT, "artifacts", "CORE-05");
const CORE_05_SOURCE_ARTIFACT = "CORE-05";
const EXPECTED_SOURCE_COUNT = 10;

/** The register columns, in the order the spec documents them. */
export const INDEX_COLUMNS = [
  "document_id", "title", "version", "status", "owner_title", "effective_date",
  "last_reviewed", "next_review_due", "supersedes", "superseded_by", "source_file",
];

/** The record keys, in the order the spec documents them. */
export const RECORD_KEYS = [
  "update_id", "published_date", "effective_date", "issuer", "issuer_type", "citation",
  "title", "summary", "scope", "affected_accounts", "affected_policy_document_ids",
  "comment_deadline", "source_reference", "status",
];

export const SCOPE_KEYS = ["entity_types", "industries", "revenue_models", "transaction_types"];

/** Document-control fields the index needs. Approver is deliberately not one of
 * them: it is a person, and no person outside the CORE-04 roster enters a
 * dataset. */
const REQUIRED_FIELDS = [
  "Document ID", "Version", "Status", "Owner", "Effective Date",
  "Last Reviewed", "Next Review Due", "Supersedes", "Superseded By",
];

/** Generic issuer labels, and the publication each one files an update under. */
const ISSUERS = {
  "accounting standards board": { type: "standard_setter", publication: "standards board bulletin" },
  "national tax authority": { type: "tax_authority", publication: "national tax bulletin" },
  "securities regulator": { type: "regulator", publication: "securities disclosure release" },
  "state revenue department": { type: "tax_authority", publication: "state revenue notice" },
};

// The feed, in publication order. update_id is assigned from this order, so the
// ids and the dates can never disagree.
const UPDATES = [
  {
    published: "2026-01-15", effective: "2027-01-01",
    issuer: "state revenue department", citation: "state property tax rule 2026-02",
    title: "Apportionment of property tax on production machinery and tooling",
    summary: "The department restates how production machinery, tooling and the fixtures attached to them are apportioned between locations, and sets a single valuation table for assets held under a finance arrangement.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["manufacturing", "wholesale_distribution"],
      revenue_models: ["product_sales", "wholesale"],
      transaction_types: ["property_tax", "fixed_assets"],
    },
    accounts: ["1450", "2250"], documents: [], status: "final",
  },
  {
    published: "2026-01-22", effective: "2026-04-01",
    issuer: "accounting standards board", citation: "ASC 842",
    title: "Lease remeasurement disclosures for public business entities",
    summary: "Public business entities disclose the judgments behind a lease remeasurement and the effect of each modification on the right of use asset and the lease liability. The amendment is effective for public business entities first and is not extended to other entities in this phase.",
    scope: {
      entity_types: ["public"],
      industries: ["software", "technology_services", "retail", "manufacturing"],
      revenue_models: ["subscription", "product_sales", "services"],
      transaction_types: ["lease_modifications", "lease_remeasurement"],
    },
    accounts: ["1600", "2500", "2510"], documents: [], status: "final",
  },
  {
    published: "2026-01-28", effective: "2026-09-01",
    issuer: "securities regulator", citation: "market disclosure rule 2026-01",
    title: "Presentation of measures that fall outside the accounting framework",
    summary: "Registrants presenting a measure that falls outside the accounting framework reconcile it to the nearest framework measure in the same document and give it no greater prominence. The rule reaches registrants only.",
    scope: {
      entity_types: ["public"],
      industries: ["software", "technology_services", "financial_services", "manufacturing"],
      revenue_models: ["subscription", "product_sales", "services"],
      transaction_types: ["external_reporting", "earnings_release"],
    },
    accounts: [], documents: [], status: "final",
  },
  {
    published: "2026-02-02", effective: "2026-04-15",
    issuer: "national tax authority", citation: "corporate income tax circular 2026-03",
    title: "Reporting thresholds for non-cash employee benefits",
    summary: "The circular lifts the annual threshold above which a non-cash benefit is reported on the employee return, and restates which wellbeing and commuting benefits are excluded from the count. Employers update the benefits their handbook describes.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["software", "technology_services", "professional_services", "manufacturing"],
      revenue_models: ["subscription", "product_sales", "services"],
      transaction_types: ["employee_benefits", "payroll_reporting"],
    },
    accounts: [], documents: ["ADI-HR-001"], status: "final",
  },
  {
    published: "2026-02-10", effective: "2026-07-01",
    issuer: "accounting standards board", citation: "ASC 606",
    title: "Targeted improvements to revenue recognition in term subscription arrangements",
    summary: "The amendment narrows when a change to a term subscription is a separate contract, and fixes how consideration is reallocated across the remaining performance obligations when a customer moves tier mid term. Entities recognizing revenue over a subscription term reassess their allocation and the deferred balance it produces.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["software", "technology_services"],
      revenue_models: ["subscription", "usage_based"],
      transaction_types: ["subscription_revenue", "contract_modifications"],
    },
    accounts: ["2300", "2310", "4000", "4010", "4020"], documents: [], status: "final",
  },
  {
    published: "2026-02-18", effective: "2026-10-01",
    issuer: "accounting standards board", citation: "ASC 350-40",
    title: "Implementation costs in a hosting arrangement presented in a separate caption",
    summary: "Costs capitalized during the application development stage of a hosting arrangement are presented in a caption of their own rather than inside prepaid expenses, with the related amortization presented in the same line as the hosting fee. Entities that capitalize these costs add the caption and restate the comparative period.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["software", "technology_services", "professional_services"],
      revenue_models: ["subscription", "license", "services"],
      transaction_types: ["cloud_implementation_costs", "internal_use_software"],
    },
    accounts: ["1510", "1595"], documents: ["ADI-FIN-002"], status: "final",
  },
  {
    published: "2026-02-24", effective: "2026-12-15",
    issuer: "accounting standards board", citation: "ASC 718",
    title: "Practical expedient for the current price input in private company awards",
    summary: "A company that is not a registrant may elect a stated valuation approach for the current price input in a share based award rather than commissioning a separate study each grant date. The election changes the measurement input and adds no caption.",
    scope: {
      entity_types: ["private"],
      industries: ["software", "technology_services", "professional_services"],
      revenue_models: ["subscription", "services"],
      transaction_types: ["share_based_payment"],
    },
    accounts: [], documents: [], status: "proposed", comment_deadline: "2026-05-22",
  },
  {
    published: "2026-03-05", effective: "2026-06-01",
    issuer: "state revenue department", citation: "state sales and use tax notice 2026-03",
    title: "Sales and use tax on prepared food and beverage service",
    summary: "The notice restates when a prepared food and beverage sale is taxed at the standard rate rather than the grocery rate, and sets the record a seller keeps for a tax exempt catering order.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["hospitality", "retail", "food_service"],
      revenue_models: ["product_sales", "services"],
      transaction_types: ["sales_and_use_tax"],
    },
    accounts: ["2200"], documents: [], status: "final",
  },
  {
    published: "2026-03-09", effective: "2026-11-01",
    issuer: "accounting standards board", citation: "ASC 985-20",
    title: "Technological feasibility threshold for software offered to customers",
    summary: "The proposal removes the detailed program design alternative and sets one threshold for the point at which development costs on software offered to customers begin to be capitalized. Comment is invited before the board sets an effective date for entities that are not registrants.",
    scope: {
      entity_types: ["public"],
      industries: ["software", "technology_services"],
      revenue_models: ["license", "subscription"],
      transaction_types: ["software_development_costs"],
    },
    accounts: ["1500", "1590"], documents: [], status: "proposed", comment_deadline: "2026-06-05",
  },
  {
    published: "2026-03-12", effective: "2026-08-03",
    issuer: "securities regulator", citation: "market disclosure rule 2026-02",
    title: "Evidence of the policy framework behind reported controls",
    summary: "Registrants describe the framework their reported controls rest on and evidence that each governing document is reviewed on its stated cycle. The rule reaches registrants only, and turns on the register rather than on any single policy.",
    scope: {
      entity_types: ["public"],
      industries: ["software", "technology_services", "financial_services"],
      revenue_models: ["subscription", "product_sales", "services"],
      transaction_types: ["internal_control", "policy_governance"],
    },
    accounts: [], documents: ["ADI-POL-000"], status: "final",
  },
  {
    published: "2026-03-16", effective: "2026-05-01",
    issuer: "accounting standards board", citation: "ASC 326",
    title: "Credit loss measurement for lending institutions",
    summary: "The amendment sets how a lending institution measures expected credit losses on a purchased portfolio and what it discloses about the vintage of the underlying exposures.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["banking", "insurance", "financial_services"],
      revenue_models: ["interest_income", "premiums"],
      transaction_types: ["credit_losses", "loan_portfolios"],
    },
    accounts: ["1110"], documents: [], status: "final",
  },
  {
    published: "2026-03-20", effective: "2026-07-01",
    issuer: "national tax authority", citation: "corporate income tax circular 2026-05",
    title: "Retention period for accounting records held in electronic form",
    summary: "The circular extends the period an accounting record held in electronic form is kept and available for inspection, and states what an audit trail has to show for a record that is migrated between systems. Entities align the retention schedule their own policy publishes.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["software", "technology_services", "professional_services", "manufacturing"],
      revenue_models: ["subscription", "product_sales", "services"],
      transaction_types: ["records_retention", "audit_trail"],
    },
    accounts: [], documents: ["ADI-POL-001"], status: "final",
  },
  {
    published: "2026-03-25", effective: "2026-09-30",
    issuer: "national tax authority", citation: "corporate income tax circular 2026-06",
    title: "Documentation for intragroup services charged across borders",
    summary: "The proposal sets the file a group prepares for services charged between its own entities, including the basis of the charge and the benefit the receiving entity obtains. Comment is invited before the documentation date is fixed.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["software", "technology_services", "professional_services"],
      revenue_models: ["subscription", "services"],
      transaction_types: ["transfer_pricing", "intragroup_services"],
    },
    accounts: [], documents: [], status: "proposed", comment_deadline: "2026-06-20",
  },
  {
    published: "2026-03-30", effective: "2026-06-30",
    issuer: "accounting standards board", citation: "ASC 835-20",
    title: "Interest capitalized during the construction of a qualifying asset",
    summary: "The amendment fixes the rate applied to expenditure on a qualifying asset while it is being prepared for its intended use, and ends capitalization when the asset is substantially complete rather than when it is placed in service.",
    scope: {
      entity_types: ["private", "public"],
      industries: ["real_estate", "construction", "utilities"],
      revenue_models: ["product_sales", "services"],
      transaction_types: ["interest_capitalization", "constructed_assets"],
    },
    accounts: ["1420", "6800"], documents: [], status: "final",
  },
];

// ------------------------------------------------------------- the policy index

/**
 * The owner as a title rather than a person. The Owner field is "Name, Title"
 * in the shipped library, and the title is what a register carries: a person
 * outside the CORE-04 roster must never reach a dataset. One document is owned
 * by a function with the post unfilled and carries no person at all, which the
 * "(vacant)" marker states; anything else without a comma is unparseable and
 * stops the build rather than guessing.
 */
function ownerTitle(owner, source) {
  const vacant = owner.indexOf("(vacant)");
  if (vacant >= 0) {
    const fn = owner.slice(0, vacant).trim();
    if (fn === "") throw new Error(`${id}: ${source} marks its owner vacant and names no function`);
    return fn;
  }
  const comma = owner.indexOf(",");
  if (comma <= 0) {
    throw new Error(
      `${id}: ${source} has Owner "${owner}", which carries no comma and no vacancy marker, so the title `
      + `cannot be separated from the person. Fix the ${CORE_05_SOURCE_ARTIFACT} document control block.`
    );
  }
  return owner.slice(comma + 1).trim();
}

function parseDocumentControl(source) {
  const raw = readFileSync(join(CORE_05_DIR, source), "utf8");
  const lines = raw.split("\n");
  const heading = lines.find((l) => l.startsWith("# "));
  if (!heading) throw new Error(`${id}: ${source} has no title heading`);
  const start = lines.findIndex((l) => l.trim() === "## Document Control");
  if (start < 0) throw new Error(`${id}: ${source} has no "## Document Control" block`);

  const fields = new Map();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 2) continue;
    fields.set(cells[0], cells[1]);
  }
  for (const field of REQUIRED_FIELDS) {
    const value = fields.get(field);
    if (typeof value !== "string" || value === "") {
      throw new Error(`${id}: ${source} document control has no "${field}" value`);
    }
  }
  return {
    document_id: fields.get("Document ID"),
    title: heading.slice(2).trim(),
    version: fields.get("Version"),
    status: fields.get("Status"),
    owner_title: ownerTitle(fields.get("Owner"), source),
    effective_date: fields.get("Effective Date"),
    last_reviewed: fields.get("Last Reviewed"),
    next_review_due: fields.get("Next Review Due"),
    supersedes: fields.get("Supersedes"),
    superseded_by: fields.get("Superseded By"),
    source_file: `artifacts/${CORE_05_SOURCE_ARTIFACT}/${source}`,
  };
}

/**
 * The register of controlled documents, read out of the shipped CORE-05
 * markdown at build time. One row per source file, ordered by document id.
 * @returns {object[]}
 */
export function buildPolicyIndex() {
  const sources = readdirSync(CORE_05_DIR).filter((f) => f.endsWith(".md")).sort();
  if (sources.length !== EXPECTED_SOURCE_COUNT) {
    throw new Error(
      `${id}: expected ${EXPECTED_SOURCE_COUNT} markdown sources under artifacts/${CORE_05_SOURCE_ARTIFACT}/, `
      + `found ${sources.length}. A document was added or removed, so the register and its consumers need a look.`
    );
  }
  const rows = sources.map(parseDocumentControl).sort((a, b) => a.document_id.localeCompare(b.document_id));
  const seen = new Set();
  for (const row of rows) {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const field of ["effective_date", "last_reviewed", "next_review_due"]) {
      if (!iso.test(row[field])) throw new Error(`${id}: ${row.document_id} has ${field} "${row[field]}"`);
    }
    if (seen.has(row.document_id)) throw new Error(`${id}: ${row.document_id} appears twice in the library`);
    seen.add(row.document_id);
  }
  return rows;
}

// -------------------------------------------------------------------- the feed

/**
 * The feed as record objects with the documented keys in the documented order.
 * @returns {object[]}
 */
export function buildRegulatoryFeed() {
  const records = UPDATES.map((update, i) => {
    const issuer = ISSUERS[update.issuer];
    if (!issuer) throw new Error(`${id}: "${update.issuer}" is not a generic issuer label`);
    return {
      update_id: `RU-2026-0${101 + i}`,
      published_date: update.published,
      effective_date: update.effective,
      issuer: update.issuer,
      issuer_type: issuer.type,
      citation: update.citation,
      title: update.title,
      summary: update.summary,
      scope: Object.fromEntries(SCOPE_KEYS.map((key) => [key, update.scope[key]])),
      affected_accounts: update.accounts,
      affected_policy_document_ids: update.documents,
      comment_deadline: update.comment_deadline ?? "",
      source_reference: `${issuer.publication} ${update.published.slice(0, 7)}`,
      status: update.status,
    };
  });
  assertFeed(records, buildPolicyIndex());
  return records;
}

/** The company the feed is triaged for: private, software, subscription. */
export const SUBJECT_PROFILE = { entity_type: "private", industry: "software", revenue_model: "subscription" };

function assertFeed(records, index) {
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  const balances = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r.ending_balance]));
  const byDocument = new Map(index.map((row) => [row.document_id, row]));

  let previous = null;
  for (const record of records) {
    const where = record.update_id;
    if (Object.keys(record).join(",") !== RECORD_KEYS.join(",")) {
      throw new Error(`${id}: ${where} does not carry the documented key list in order`);
    }
    if (Object.keys(record.scope).join(",") !== SCOPE_KEYS.join(",")) {
      throw new Error(`${id}: ${where} scope does not carry the documented sub-keys in order`);
    }
    if (record.effective_date <= record.published_date) {
      throw new Error(`${id}: ${where} takes effect before it is published`);
    }
    if ((record.comment_deadline !== "") !== (record.status === "proposed")) {
      throw new Error(`${id}: ${where} pairs status "${record.status}" with comment deadline "${record.comment_deadline}"`);
    }
    if (record.comment_deadline !== ""
      && !(record.comment_deadline > record.published_date && record.comment_deadline < record.effective_date)) {
      throw new Error(`${id}: ${where} invites comment outside its own window`);
    }
    for (const key of SCOPE_KEYS) {
      if (!Array.isArray(record.scope[key]) || record.scope[key].length === 0) {
        throw new Error(`${id}: ${where} has an empty scope.${key}`);
      }
      for (const token of record.scope[key]) {
        if (!/^[a-z][a-z_]*[a-z]$/.test(token)) throw new Error(`${id}: ${where} scope carries "${token}"`);
      }
    }
    for (const code of record.affected_accounts) {
      if (!/^\d{4}$/.test(code)) throw new Error(`${id}: ${where} names account "${code}"`);
    }
    for (const docId of record.affected_policy_document_ids) {
      if (!byDocument.has(docId)) throw new Error(`${id}: ${where} names ${docId}, which is not a controlled document`);
    }
    if (/https?:\/\//.test(JSON.stringify(record))) throw new Error(`${id}: ${where} carries a URL`);
    if (previous && !(record.published_date >= previous.published_date && record.update_id > previous.update_id)) {
      throw new Error(`${id}: ${where} breaks publication order`);
    }
    previous = record;
  }

  const inScope = (r) => r.scope.entity_types.includes(SUBJECT_PROFILE.entity_type)
    && r.scope.industries.includes(SUBJECT_PROFILE.industry)
    && r.scope.revenue_models.includes(SUBJECT_PROFILE.revenue_model);
  const liveAccount = (r) => r.affected_accounts.some((code) => {
    const account = chart.get(code);
    return account?.active === "true" && Math.round(Number(balances.get(code)) * 100) !== 0;
  });
  const offChart = (r) => r.affected_accounts.every((code) => !chart.has(code));

  const only = (label, matches, expected = 1) => {
    if (matches.length !== expected) {
      throw new Error(`${id}: ${label} resolves to ${matches.length} records, expected ${expected}`);
    }
    return matches;
  };
  const atLeast = (label, matches, floor) => {
    if (matches.length < floor) {
      throw new Error(`${id}: ${label} resolves to ${matches.length} records, expected at least ${floor}`);
    }
    return matches;
  };

  const relevant = only("the materially relevant update", records.filter((r) => inScope(r) && liveAccount(r)));
  atLeast("updates in the company's scope", records.filter(inScope), 2);
  atLeast("updates touching a live account", records.filter(liveAccount), 2);

  const distractor = only("the irrelevant update",
    records.filter((r) => offChart(r) && !r.scope.industries.includes(SUBJECT_PROFILE.industry)));
  atLeast("updates touching no account on the chart", records.filter(offChart), 2);

  const gap = only("the policy gap", records.filter((r) => r.affected_policy_document_ids.some((docId) => {
    const doc = byDocument.get(docId);
    return r.effective_date >= doc.effective_date && r.published_date > doc.last_reviewed;
  })));
  atLeast("updates naming a controlled document",
    records.filter((r) => r.affected_policy_document_ids.length > 0), 3);

  if (new Set([relevant[0].update_id, distractor[0].update_id, gap[0].update_id]).size !== 3) {
    throw new Error(`${id}: the three findings are not three different records`);
  }

  // Every codification topic the shipped library cites turns up in the feed, so
  // "the citations CORE-05 already uses" is a fact rather than an intention.
  const library = readdirSync(CORE_05_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readFileSync(join(CORE_05_DIR, f), "utf8"))
    .join("\n");
  const cited = new Set(library.match(/ASC \d+(-\d+)?/g) ?? []);
  const inFeed = new Set(records.map((r) => r.citation));
  for (const citation of cited) {
    if (!inFeed.has(citation)) throw new Error(`${id}: ${CORE_05_SOURCE_ARTIFACT} cites ${citation} and the feed does not`);
  }
}

export function generate() {
  const records = buildRegulatoryFeed();
  return [
    { path: "regulatory-updates-feed.jsonl", content: records.map((r) => JSON.stringify(r)).join("\n") + "\n" },
    { path: "policy-index.csv", content: toCsv(INDEX_COLUMNS, buildPolicyIndex()) },
  ];
}
