# Changelog

## 1.3.0 - 2026-08-18

**Tags at merge of the D3-lite PR (`feat/fin-track-b-artifacts-d3lite`), which is
stacked on `feat/fin-cluster1-d2a-datasets`.** The tag is cut by the release
controller after merge, not on the branch. Consumers pinned to `v1.2.0` are
unaffected until they move the pin; trazomo's Track B finance modules pin
`v1.3.0`.

**Do not cut this tag before the FIN-40 freeze review.** Everything else here is
deterministic and reproducible; FIN-40 is drafted prose, frozen in bytes but not
yet approved.

The six data gates on the Track B finance modules
(`docs/plans/2026-08-17-shared-foundational-skeleton.md` Section 6.1): four small
`generation: deterministic` artifacts, one drafted-frozen document, and the
dataset-variant convention.

- **FIN-36 close-checklist-template**: 24 close tasks over five relative close
  days, for `finance-spreadsheet-ops` and reused by `finance-google-workspace`
  and `finance-microsoft-365`. No defects, because three modules deploy it as
  their starting schema. What it does carry is checkable structure: `close_day`
  is `D+1` to `D+5` rather than a date, so the template survives the period; no
  task depends on a task later in the close; owner and reviewer are never the
  same role, so segregation of duties lives in the schema rather than in a
  policy paragraph; and `status`, `completed_date` and `notes` ship empty.
  FIN-17 `close-checklist`, the populated in-flight checklist, keeps its own spec
  and is untouched.
- **FIN-37 budget-vs-actual-template**: 27 lines, one per active FIN-22
  profit-and-loss account, **read off the chart rather than retyped**, so the
  tracker cannot drift from the chart the rest of the finance pack posts
  against. **Each line's budget is that account's own prior run rate, read off
  FIN-05**: the trial balance's beginning column is year to date at 2026-02-28,
  so half of it is the January and February monthly average, and a seeded
  planning adjustment of at most 5 percent moves the plan off that average the
  way a real plan does. March is deliberately not an input, because a plan set
  before the period cannot know the period, and that is what leaves **four** of
  the twenty-seven lines breaching their own explanation threshold in March
  rather than none or most. `normal_balance` is read off the chart too, so the
  contra-revenue line is legible as a revenue-section row that subtracts.
  `actual_amount`, `variance_amount`, `variance_pct` and `variance_explanation`
  ship empty, because the module's hard rule is that a person enters the figure
  and AI never commits a cell. `explanation_threshold_usd` recomputes from budget
  by a stated rule (5 percent, floored at 10,000, rounded up to the nearest
  1,000).
- **FIN-38 reliability-drill-transactions**: 15 AI-proposed readings of rows that
  already ship in the pack, each citing its source the way
  `finance-ai-reliability` teaches (`txn_id` in FIN-01, `je_id` in FIN-02,
  `check_number` in FIN-03, `account_code` in FIN-22), so every claim is
  checkable against the tagged data. Planted: exactly one proposed amount is a
  digit transposition of its source row's amount, exactly one proposed account is
  not on the chart, and exactly three claims are reported at high confidence, of
  which exactly one is wrong. **The two plants sit at different confidence
  levels on purpose**: the transposition is confident and the fabricated account
  code is not. Had both plants been the confident rows and every quieter row been
  clean, confidence would have been a perfect defect locator and the file would
  have taught the opposite of its lesson, since a learner could score full marks
  by reading one column and never verifying anything. As shipped, neither stratum
  is safe to skip: triaging by confidence misses a plant, and rejecting
  everything fails on the two confident claims that are right. Source rows are drawn
  from a clean pool computed by rule (unique amount and reference in the feed,
  matched once in the ledger at the same amount), so FIN-01's own duplicated
  deposit, unrecorded fee and transposed payment can never double as a drill
  answer.
- **FIN-39 decision-authority-matrix-template**: 20 decisions across four data
  classes and four autonomy levels, for `finance-operational-controls`. The
  finance-only hard control is data rather than prose: **every decision that
  moves money or posts an entry is `prohibited` for AI, whatever the amount**.
  Restricted data is never autonomous. Approver seniority never falls as the
  amount band rises, and the 50,000 step is director level, which is FIN-06's
  shipped purchase-order rule, so the matrix and the orders agree. Every role is
  the title of an active CORE-04 employee, in Finance except the single Chief
  Executive Officer escalation on the board-material row, and escalation is
  always strictly more senior.
- **FIN-40 mnpi-flagged-draft** (drafted-frozen): a one-and-a-half page
  pre-announcement board pack excerpt carrying the classification at the head and
  the foot, handling instructions that forbid pasting any part of it into an
  external or consumer AI assistant, a quiet period with dates, distribution by
  role title only, and two rounded figures marked draft and unreleased. **Each
  figure names the subtotal it reads**, total revenue and net loss, and both are
  recomputed from the FIN-05 trial balance by a test, so the board pack cannot
  quote a number the ledger does not report.
  No individual is named, there is no signature line, and the pending strategic
  matter is described without a counterparty. **This document needs Salvador's
  freeze review.**
- **Dataset variants, a new repo-wide convention**
  (`datagen/README.md`, "Dataset variants"): a trimmed slice of a dataset, under
  `datasets/<track>/<name>/variants/<variant>.csv`, emitted by the parent's own
  generator and derived from a sibling file by a predicate over that file's
  columns. The parent's spec declares it (`name`, `file`, `derived_from`, `rule`,
  `consuming_modules`), `specLoader` validates the shape, and `MANIFEST.json`
  records it with the derivation rule so a consumer can tell a slice from an
  independent dataset. The rule is the contract: a variant nobody can re-derive
  is a second dataset that will drift the first time its parent is regenerated.
- **FIN-01 gains its first variant**, `variants/ach-receipts-mar-05-06.csv`, 8
  rows, for `finance-local-ai`'s offline comparison: every parent row with
  `channel == "ach"`, `type == "credit"` and `posted_date` in {2026-03-05,
  2026-03-06}. The predicate names no defect, and the parent's duplicated deposit
  falls inside the window, so the small slice still has something in it to find.
  The generator refuses to build a window that loses the repeated receipt or
  leaves the 6-to-10-row size band. **No byte of `bank-transactions.csv` or
  `bank-statement-summary.json` changed**; the variant is an added file.
- Spec catalog: FIN-36 through FIN-39 gain `columns`, FIN-37 and FIN-38 a
  `period`, and all five gain exact planted-feature wording. FIN-36 and FIN-37
  gain `finance-google-workspace` and `finance-microsoft-365` as consumers, which
  is what the skeleton's B2 and B3 gates are. FIN-40's single planted feature,
  which described what the learner must do, is rewritten as six that describe the
  document, so `validate` confirms them instead of warning forever. No id changed
  and no id was added.
- `canon/timeline.md`: three dated events added (the quiet period, the board
  meeting, the results announcement). No existing row changed.
- **No new counterparty name enters the universe in this release.** FIN-38 draws
  its counterparties from the shipped FIN-01 population, and FIN-40 names only
  co-002 and role titles that active CORE-04 employees hold. The collision screen
  is unchanged, and a structural test enforces both.
- Universe version 1.3.0: 25 datasets, 12 drafted artifact sets. Suite: 223
  tests, 182 before this release.

## 1.2.0 - 2026-08-18

**Tags at merge of the D2 PRs (`feat/fin-cluster1-d2a-datasets`, then
`feat/fin-cluster1-d2b-fin12`).** The tag is cut by the release controller after
both merge, not on either branch. Consumers pinned to `v1.1.0` are unaffected
until they move the pin; trazomo's cluster 1 finance modules pin `v1.2.0`.

The March 2026 reconciliation cluster: AR aging and the GL tie-out, the
three-way match, the close journal batch, accruals and prepaids. Eight
`generation: deterministic` datasets. The cluster's one drafted-frozen contract,
FIN-12, ships in the second PR and is not on disk until it does.

- **FIN-04 ar-aging-export**: 150 open documents across 19 CORE-03 customers as of 2026-03-31, plus `ar-aging-summary.json`. Planted: one invoice the subledger carries and the ledger does not, and one unapplied customer credit memo on the customer canon assigns the collections problem. Both are found by a rule over the data, never by a column. Row ids and amounts stay out of this repo (answer-key rule).
- **FIN-05 gl-trial-balance**: 65 rows, one per FIN-22 account, pre-close at 2026-03-31. It is the cluster's assembler, and **all four columns of its six control accounts come from the subledgers, not from a model**: the opening balance, the period debit and the period credit as well as the closing balance. Account 1010 opens on `3,482,915.22`, the balance `canon/timeline.md` fixes for March where book and bank agree, and moves by FIN-02's own debit and credit columns. Receivables move by the cash FIN-02 collected and the credit memos FIN-04 raised; payables by the bills posted in March and the cash paid to vendors; the accrued-liabilities row is the accrual roll-forward line for line; the two prepaid rows are the two bills. Everything with no subledger behind it is modelled inside bands, and account 3200 takes the residual.
- **FIN-06 purchase-orders, FIN-07 vendor-invoices, FIN-08 payment-run**: one procure-to-pay world. 90 purchase-order lines across 48 orders raised since January, 72 invoices received into the AP queue during March, and a 42-payment run proposed for 2026-04-02. Four matching exceptions are planted in the invoices: a price mismatch against the order, a duplicate vendor invoice number, an invoice citing an order that does not exist, and a changed remit-to account on the canon vendor that owns the bank-detail-change story. **All four sit inside the proposed run, so the run as written overpays by exactly the duplicated invoice.** That is the lesson, not a defect: the run is `pending_approval` and unreleased, and catching it before money moves is the point.
- **FIN-09 journal-entries-batch**: 78 lines across 31 entries in the close window, every entry balanced and the batch balanced. Planted: three miscodings that each need a different detection rule (one to the account the chart carries as inactive, one against its own counterparty's modal account, one against the payroll accrual mode), one duplicate entry, and one entry with no supporting document. The batch cites vendor invoices, vendor bills and the two contracts, and deliberately no purchase order: a purchase order is not support for a journal entry, and citing none is what lets FIN-06 place its missing accrual anywhere without either generator constraining the other.
- **FIN-10 open-pos, FIN-11 vendor-bills**: 34 order lines still open at the cut-off with `accrual-rollforward.json`, and 55 bills posted for March. Planted: one line received but never invoiced and never accrued, cited by no bill and by no close entry; one multi-month prepaid whose schedule is already correct (the CORE-01 subscription, $450,000 over 2026-02-01 to 2027-01-31, two months elapsed) and one that still needs a schedule (an insurance premium posted in March against a policy year that opens 2026-04-01). Every other bill sits inside a single calendar month, so the multi-month predicate resolves to exactly those two rows. A bill's `payment_status` is derived rather than drawn: settled only if it fell due inside the period or the vendor is on direct debit, so a March bill on thirty day terms is still open at the cut-off.
- **Cross-artifact ties, all recomputed rather than written down**: FIN-05 account 1010 equals FIN-02's ending cash of `2,740,359.09`, the first assertion in this repo that two data packs describe the same company; account 1100 equals the FIN-04 subledger total less the unposted invoice; account 2000 equals the FIN-11 bills still open; account 2010 equals the accrual roll-forward's closing balance; accounts 1200 and 1210 carry the two prepaid balances.
- **The quarter is a loss.** The frozen March cash ledger collects about `4.17m` of receivables and pays out about `5.16m`, and payroll and vendor spend price above billings, so account 3200 Current Year Earnings carries a **debit** of `5,404,489.32` and the build refuses a credit. This changes the D2 plan's U12 default, which assumed a profit; the shipped subledgers do not support one. Annualised revenue is about `48.8m`, days sales outstanding 25.6 and days payables outstanding 26.8, and the build fails if any of the three leaves its band.
- `canon/timeline.md`: seven dated events added (AR aging window and as-of date, the purchase-order and goods-receipt window, both prepaid service periods, the insurance invoice date, the open-PO cut-off, the proposed run). No existing row changed.
- Spec catalog: FIN-04 through FIN-11 gain `columns` and `period`, and exact planted-feature wording. FIN-04 and FIN-10 move to `format: csv + json`. No ids and no `consuming_modules` changed.
- **No new counterparty name enters the universe in this release.** The vendor population is the sixteen names already screened and shipped at v1.1.0, with the ten neutral names taking stable ids in the `co-140` and up generator range that `canon/companies.md` reserves for generated population. The collision screen is unchanged.
- Universe version 1.2.0: 21 datasets, 11 drafted artifact sets (12 once FIN-12 lands). Suite: 182 tests, 116 before this release.

## 1.1.0 - 2026-08-15

**Tags at merge of the D1 PR (`feat/fin-cash-reconciliation-slice`).** The tag
is cut by the release controller after merge, not on the branch. Consumers
pinned to `v1.0.2` are unaffected until they move the pin; trazomo's
`finance-cash-bank-reconciliation` module pins `v1.1.0`.

First finance datasets, all `generation: deterministic` (no drafted text, so no
freeze review):

- **FIN-01 bank-transactions**: co-002's March 2026 operating account at co-104 Anchor Point Bank, 196 rows plus `bank-statement-summary.json`. Planted: one duplicated deposit, two unmatched payments (an unrecorded bank fee, a transposed vendor ACH amount), one deposit in transit. Row ids and amounts stay out of this repo (answer-key rule).
- **FIN-02 gl-cash-ledger**: 207 rows on cash account 1010, prepared by a CORE-04 Staff Accountant; **FIN-03 outstanding-checks**: 12 March checks not cleared by 2026-03-31. Both come from FIN-01's seeded builder, so the three files tie out to the cent (asserted in the generator and in `tests/generators/fin-cash-recon.test.js`).
- **FIN-22 chart-of-accounts**: 65 accounts; fixes operating cash 1010 for FIN-05, FIN-09, FIN-24.
- Customers are CORE-03 CRM accounts (co-102 first), vendors are canon co-105/106/107/109/119 plus ten screened neutral names; cross-track joins resolve.
- `canon/timeline.md` added (proposal): universe "now" first week of April 2026, co-002 fiscal year = calendar year, finance anchor period March 2026, March close roles.
- Spec catalog: optional `columns` and `period` fields, validated by `specLoader`; FIN-01/02/03/22 carry exact planted-feature wording. No ids or consuming modules changed.
- Universe version 1.1.0. Suite: 116 tests (91 before this release).

## 1.0.2 - 2026-08-09

**Tags at merge of PR #4.** The tag is cut by the release controller after
merge, not on the branch. Consumers pinned to `v1.0.1` are unaffected until
they move the pin.

**This release deliberately amends frozen v1.0.1 text**, by operator decision on
2026-08-09. Person canon (`canon/people.md`) was written under the rule that
canon declares and does not retro-edit shipped artifacts; the two HIGH
real-person collisions were the exception, because the repository is public and
both invented names matched verifiable living lawyers. Four strings moved. Every
other byte of the frozen corpus is unchanged, no dataset was regenerated, and
byte-determinism holds.

Renames in frozen text (`canon/people.md` "Renames applied 2026-08-09"):

- **pe-001 Jonathan K. Sterling to Jonathan K. Sedgemoor.** 3 occurrences in `artifacts/LGL-05/engagement-letter.md` (:56, :63, :173), plus its DOCX rebuild. The JKS monogram is preserved, so CORE-02's initials distractor (pe-021 Jordan K. Sable, a different partner on a different matter) still works and no committed dataset moved.
- **Sasha Vukovic to pe-208 Nikhil Ravensworth.** 1 occurrence in `artifacts/LGL-17/nda-negotiation-scenarios.md:118`, plus its DOCX rebuild. This is the substitution follow-up F-3 already planned, executed early because it also cleared a HIGH flag.

Spec text (`specs/artifact-specs.yaml`), 3 `planted_features` descriptions
reworded to the vocabulary the drafted documents actually use. Documents
unchanged; these close 3 of the 5 residual `validate` WARNs, taking the run from
12 feature WARNs across 4 specs to 9 across 3:

- **CORE-01** auto-renewal wording now names the 90/60/30-day non-renewal mechanics drafted at MSA 1.3 to 1.5, instead of the "windows / warning / block / thresholds" vocabulary of a downstream renewal tracker.
- **LGL-02** `DTSA` spelled out as `Defend Trade Secrets Act`, matching the 18 U.S.C. 1833(b) notice heading in `mutual-nda.md`.
- **LGL-17** `varying` patentability strength replaced with the documents' own `STRONG / MODERATE / WEAK` grades. LGL-17 now validates PASS.

Also in this release:

- `canon/people.md` added: the person canon reconciling 82 invented names into 73 `pe-` entries, with precedence rules, an errata table, and the real-person collision screen (85 names; 78 clear, 2 HIGH now cleared, 5 MEDIUM recorded and undecided).
- Follow-up F-5 is closed for the HIGH tier. F-3 stands at 1 of 7. The 5 MEDIUM collision flags remain an open human decision.

## 1.0.1 - 2026-08-08

- Collision-check renames applied across canon, specs, artifacts, generators, and datasets (15 entities; e.g. Amberfield Logistics, Aphelion Systems, Palisade Labs, Thornfield Health, CarePeak Technologies). People names untouched.
- Atticus Dundee Inc. product defined: B2B workflow and collaboration SaaS with a small-team tier.
- Canon roster promoted from draft: names confirmed and collision-checked.

## 1.0.0 - 2026-08-08

- Legal slice complete and frozen after review: 11 drafted artifact sets (~151k words) with canonical DOCX builds, 9 deterministic datasets, spec-driven datagen CLI.
- Authored section numbering is canonical in all DOCX output (double-numbering defect fixed and pinned by tests).
- Intake reference handshake closed: LGL-07 records carry INT-2026-NNNN references; INT-2026-0433 joins the LGL-12 litigation matter.
- Lessons, exemplar repos, and demo videos pin to this tag.

## 0.2.0 - 2026-08-08

- Full canon roster from the program consolidation: Atticus Dundee ecosystem (co-101 to co-125), Larkspur Design & Build cast (co-131 to co-135). Proposed names pending collision check.
- Unified artifact spec catalog: 137 artifacts (CORE 5, LGL 18, FIN 40, HR 18, REV 7, OPS 17, SMB 32) in specs/artifact-specs.yaml.

## 0.1.0 - 2026-08-08

- Skeleton: canon anchors (Atticus Dundee LLP, Atticus Dundee Inc.), agent orientation in `AGENTS.md`, empty `MANIFEST.json`.
