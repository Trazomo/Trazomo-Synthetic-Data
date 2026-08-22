# Changelog

## 1.5.0

**Tags at merge of the D5b PR (`feat/fin-clusters34-d5b-drafted`), stacked on
this D5a PR (`feat/fin-clusters34-d5a-datasets`).** The tag is cut by the
release controller after merge, not on a branch, and it covers both PRs.
Consumers pinned to `v1.4.0` or `v1.4.1` are unaffected until they move the
pin; trazomo's cluster 3 and 4 finance modules (22, 23, 24, 25, 29, 30) will
pin `v1.5.0`. Fallback, stated here so the content lanes do not have to
discover it: if the D5b freeze review slips, D5a merges alone and `v1.5.0` is
cut on the datasets; modules 23, 29 and 30 brief at `v1.5.0` and modules 22,
24 and 25 wait for `v1.6.0`.

D5a ships ten datasets and configs, no new drafted prose. Every prose artifact
it reads (CORE-05 through FIN-20's shipped index, FIN-40's excerpt) is read and
never edited, so no freeze review gates this PR. The plan is
`docs/plans/2026-08-22-finance-clusters34-d5-data-plan.md` on trazomo main
(#189), with Salvador's ten Section 9.1 rulings all approved as recommended
on 2026-08-22. Build order was the plan's DAG, one implementer at a time, each
artifact verified by execution (plants and tie-outs re-derived from committed
bytes, never from typed constants) and by a one-byte mutation receipt naming
the row, before the next started.

Two rules, stated once in the plan and now recorded in `datagen/README.md`:

- **R-SIGN.** Per-line `actual_amount` uses the normal-balance convention
  (`period_debit` less `period_credit` on a debit-normal line, the reverse on
  a credit-normal line); statement subtotals apply `section_sign`, which FIN-24
  ships as a column so a subtotal is one pass over the file with no external
  table. Summing revenue unsigned gives `4245474.82`, wrong by exactly twice
  BVA-06; the right figure is `4154683.80`.
- **R-CLS17.** A D5 artifact may state that the checklist file shows `CLS-17`
  as `not_started` and that FIN-24's explanation column is empty (byte facts).
  It may not state that the variance work has not been done; merged module 9
  already told a learner it has. FIN-24 is the input CLS-17 consumes, not the
  output it produces.

- **FIN-33 actuals-24mo**: 648-row 24-month profit-and-loss trend CSV, the 27
  FIN-37 lines by 24 month-ends from `2024-04-30` to `2026-03-31`. Two
  reconciliations hold by construction across all 27 lines and the generator
  asserts both: `2026-03` equals FIN-05's period movement under R-SIGN, and
  `2026-01` plus `2026-02` equals FIN-05's `beginning_balance` (balances are
  positive in the account's own direction; the direction lives in which of
  `ending_debit`/`ending_credit` is populated, so nothing "flips"). Three
  material flux lines (BVA-11/6000, BVA-19/6200, BVA-20/6300) against four
  material budget lines (BVA-04, BVA-09, BVA-13, BVA-19); the rules disagree on
  five lines and agree on exactly one, BVA-19. One seasonal line (BVA-21/6310,
  peaks in September both years). The flux rule lives here as `FLUX_RULE` and
  `fluxThresholdCents()` and FIN-26 imports it rather than retyping it.
- **FIN-34 drivers**: the driver set and its bands as YAML, emitted by FIN-33's
  builder so the two cannot disagree. One band crosses zero (`hiring`); one
  driver moves cash and no margin line (`collection_delay`, naming FIN-31's
  `ar_subledger_balance`); `applies_to` is a mixed list of FIN-33 line ids and
  FIN-31 metric ids. Cost per head `5818.32` recomputes from FIN-05 and
  CORE-04's 582 active heads.
- **FIN-26 materiality-thresholds**: the budget and flux materiality policy as
  YAML, writing down the rule FIN-37's 27 thresholds already obey (T-M1: zero
  mismatches against the shipped template) and the flux rule FIN-33 was built
  to (three breaches, 27 lines move). `related_decision_id` resolves to
  FIN-39's DA-01.
- **FIN-24 actuals-vs-budget**: the 27-line filled variance tracker on the
  FIN-37 spine with `section_sign` shipped as a column. Its four material
  variances and the derivation rule were already printed in merged trazomo
  content (`finance-google-workspace` lesson 02): BVA-04 `23710.01` / 5.44%,
  BVA-09 `17518.43` / 5.74%, BVA-13 `-17134.55` / -5.86%, BVA-19 `47043.50` /
  7.11% on `708443.50` against `661400.00`; the test recomputes each from
  FIN-05 in its own arithmetic and pins all four. `variance_explanation` is
  empty on every row (R-CLS17). **FIN-24 is a downstream consumer of FIN-05's
  period columns, FIN-33's February column and FIN-37.**
- **FIN-25 supporting-je-detail**: 128 posted lines across 96 entries and 29
  counterparties on six accounts (4100, 5020, 6000, 6020, 6200, 6300), each
  account's debits and credits reconciling to FIN-05's period columns to the
  cent, proven arithmetically not to be FIN-09's. Plants: one timing
  variance (6020, FIN-09 accrual lines), one true overspend (6200), one reclass
  (co-106, modal on 6020 with two stray lines on 6000; the plan's parenthetical
  placed it on 5020, which the bytes cannot satisfy alongside V6's
  qualifier-free count of 2), one blocked revenue line (4100, CLS-14 not
  complete). Owns the `GL-202603-NNNN` entry block and the
  `AP-/AR-/PAYREG-/JV-202603-NNNN` source-document blocks. **FIN-25 is a
  downstream consumer of FIN-05's period columns; a FIN-05 regeneration breaks
  its per-account sums, which is the correct failure.**
- **FIN-31 kpi-source-data**: 168 rows exactly, seven non-ledger inputs by 24
  month-ends (`ar_subledger_balance`, `deferred_revenue_current`,
  `deferred_revenue_noncurrent`, `ar_customer_count`, `new_arr`,
  `churned_arr`, `headcount`). Pinned at both ends of the close, not only at
  `2026-03-31`: 30 of 168 rows carry a `source_artifact` (24 headcount rows
  from CORE-04's rule, four deferred-revenue rows from FIN-05's beginning and
  ending balances on 2300 and 2310, two FIN-04 rows). The `2026-03-31`
  subledger row names the `17446.72` difference against control account 1100
  rather than hiding it (U17). No file emitted by FIN-29, FIN-31, FIN-32,
  FIN-33 or FIN-34 contains the string `runway`; the test auto-enrols every
  registered generator in that set.
- **FIN-32 bank-balances**: 96 rows, four cash accounts by 24 month-ends, book
  and bank side by side with `reconciling_difference == bank - book` on every
  row. Book ties to FIN-05 at both ends of the close; 1010's bank balance ties
  to FIN-01 at both ends (`3482915.22` opening, `2806284.46` closing, difference
  `65925.37` at `2026-03-31`, `0.00` at `2026-02-28`). 1050 Petty Cash carries
  no bank, no masked number and no `bank_canon_id`: FIN-05 names it plainly
  while the other three end in `- Anchor Point Bank`. Masked account numbers
  for 1020 and 1030 are parsed out of FIN-01's shipped feed (`XXXX-4425`,
  `XXXX-4433`), not invented.
- **FIN-27 approved-je-summary**: 31 rows, one per FIN-09 entry, totals
  `1319977.89`. Exactly one entry in the population a supporting document is
  expected for carries none (`JE-202603-C031`); the naive read returns three,
  because the two internal schedule blanks (`C025`, `C027`) are the v1.4.1 rule
  rather than a finding, and the test asserts both numbers. Eleven approvals
  fall on the weekend of `2026-04-04`/`05`; one preparer, one approver, never
  the same person; `JE-202603-C030` posts to inactive account 6125 and
  `distinct_accounts` says so. **FIN-27 is the only cluster 3/4 artifact
  downstream of FIN-09's bytes** (and of FIN-22 `active` and CORE-04).
- **FIN-23 audit-evidence-index**: 32 rows, 19 reusing FIN-18's binder
  references and 13 derived from FIN-17's complete tasks. One citation lands
  on a superseded CORE-05 document (`EV-2026Q1-030`, ADI-FIN-001, CLS-12); one
  identical-title pair `period` cannot separate (CLS-02 and CLS-03, both
  `2026-03`); one row indexed and not filed (`EV-2026Q1-032`); one passed
  control the index is silent about (`CTL-006`, among seven controls with no
  row). The contrast count for the empty-`source_reference` misread is **9**,
  not the 13 the plan and spec first said (three complete tasks carry an
  `account_code` and the constructed CLS-12 row carries a citation); the spec
  is corrected and the test asserts the decomposition. No row exists for
  CLS-17 because the checklist file does not report it complete (a file
  statement, per R-CLS17). **FIN-23 is downstream of FIN-18, FIN-17 and FIN-20,
  and through FIN-20 of the CORE-05 prose parsed at build time.**
- **FIN-29 approved-metrics-pack**: 12 metrics as JSON, every value recomputed
  from frozen bytes and every `basis` naming its sign convention; the two
  board-reported headlines round to FIN-40's 12.2 and 5.2 million and the
  classification banner is read out of the excerpt verbatim. Subtotals
  `revenue 4154683.80`, `cost_of_revenue 794782.15`, `operating_expense
  5127949.43` roll to account 3200's `1768047.78`; gross margin `80.87`
  (81.28 under a naive sum). One metric names a FIN-09 balance FIN-05 does not
  reflect (`operating_expense_march`, with its posting-timing explanation and
  CLS-16 `in_progress` read off FIN-17, U11). DA-20 is `prohibited` for
  `ai_autonomy_level`. Emits no `runway`. **FIN-29 is downstream of FIN-05,
  FIN-04, FIN-24 (so FIN-33 and FIN-37), FIN-09 and FIN-17, and reads
  `artifacts/FIN-40/mnpi-flagged-draft.md` at build time**, the second
  generator after FIN-20 to read the repository.

Foundations shipped with the datasets: `monthEnds()` in `datagen/src/dates.js`
as the only place the 24-month window is computed; seven canon timeline rows;
spec entries for all thirteen D5 ids (the ten above plus the three D5b drafted
documents FIN-21, FIN-28 and FIN-30, which stay `MISSING` until D5b).

Gates at the D5a head: `npm test` 517 tests, 509 pass, 0 fail, 8 todo (the
eight are the D5b markers); `npm run validate` 57 checked, 0 failed;
`validate --all` 137 checked, 28 failed, every failure a `MISSING` drafted
artifact and zero structured FAIL (the plan's U9 predicted 21; the prediction
assumed SKIP counted as a failure, and it never did); `generate` for all ten
run twice, byte identical; `MANIFEST.json` 44 datasets and 13 drafted
artifact sets; real-name screen over every name-like column of the new
datasets finds nothing outside the v1.4.1 universe; em-dash grep over every
changed file empty.

## 1.4.1

**Version `1.4.1`, ratified by Salvador 2026-08-20 (C024 keeps `BILL-2026-0118`).**
A data fix inside one
shipped dataset. No new artifact, no new column, no row added or removed, and no
other dataset regenerated, so the patch position is the one that moves.
`v1.4.0`'s bytes are frozen and unchanged; a consumer pinned to `v1.4.0` sees
nothing until it moves the pin.

- **FIN-09 journal-entries-batch, data-repo issue #14**: the three internal-type
  entries cited vendor invoices belonging to Wrenfallow Security Systems for
  goods unrelated to the balances they write down. `JE-202603-C024`
  (depreciation, computer equipment) cited `VINV-2026-0165`, `JE-202603-C025`
  (depreciation, furniture and fixtures) cited `VINV-2026-0152`, and
  `JE-202603-C027` (amortization, leasehold improvements) cited
  `VINV-2026-0114`. Every id resolved, which is why issue #12's fix and the
  join guard both passed over them: the join exempted an entry booked against
  the account holder from the vendor and amount checks **by counterparty**, so
  the only leg left to test was resolution, and resolution was never the
  problem.
- **The rule, now stated on the spec and asserted in the generator.** An
  internal schedule entry cites the source document when the universe carries
  it. Its support is the FIN-11 bill that capitalized the asset class the entry
  names, matched to that class through the FIN-22 chart and larger than the
  month's charge; where the universe never bought that class, the entry cites
  nothing at all. A month of depreciation is a fraction of the asset rather
  than its price, so amounts never match and the citation is the only leg that
  joins. A vendor invoice never supports one: it is the accounting for a
  vendor's charge, not for a balance the company already owns.
- **What that resolves to.** FIN-11 capitalizes exactly one class,
  `1400 Computer Equipment`, through four Wrenfallow bills. `JE-202603-C024`
  therefore cites `BILL-2026-0118`, the only computer-equipment bill its
  $110,907.33 charge is a fraction of. Nothing in the pack is ever billed to
  `1410 Furniture and Fixtures` or `1420 Leasehold Improvements`, so
  `JE-202603-C025` and `JE-202603-C027` cite nothing. `JE-202603-C026` keeps
  `CORE-01`, the contract behind the capitalized software, and is untouched.
- **P11 is restated, and this is the part to read before merging.** Its
  population is now the entries a supporting document is expected for, which
  excludes the internal depreciation and amortization schedule. Exactly one
  entry in that population carries an empty `source_document` on every line,
  and it is the same entry as before; the two internal blanks are the rule
  above rather than a finding. A naive "find the entry citing nothing" now
  returns three rows instead of one, so **trazomo's
  `finance-journal-entry-reclass` lesson 3 selection rule and its guard need
  the same restatement when it re-vendors**, tracked as the follow-up to this
  fix rather than done here.
- **Surgical by construction.** The regenerated file is 79 lines with the same
  header and the same trailing byte, and six cells differ from `v1.4.0`, all of
  them `source_document` on the six lines of those three entries. Row counts are
  unchanged, so `datagen manifest` is a no-op on the tree.
- **Tests.** The FIN-09 join gains an internal-schedule case (the cited document
  is the capitalization bill for the class the entry names, posted to that
  account and larger than the charge, or the citation is empty and the universe
  carries no such bill), and the vendor-invoice join loses its account-holder
  exemption outright. Both fail against `v1.4.0`'s generator and pass after the
  fix. 374 tests.

## 1.4.0 - 2026-08-19

**Tags at merge of the D4a PR (`feat/fin-cluster2-d4a-datasets`).** The tag is
cut by the release controller after merge, not on the branch. Consumers pinned
to `v1.2.0` or `v1.3.0` are unaffected until they move the pin; trazomo's
cluster 2 finance modules (11, 17, 18, 19, 20, 21) pin `v1.4.0`.

Nine datasets, no new drafted prose. Every prose artifact cluster 2 needs is
already frozen and shipped, so CORE-05 is read and derived from here, never
edited, and no freeze review gates this tag.

- **FIN-13 expense-reports**: 88 expense lines across 18 reports, every report
  `submitted` or `in_review`, so **FIN-05's trial balance is untouched and the
  review is a live decision** rather than a post mortem. Four findings, none of
  them labelled: a meal over its own city tier's daily cap, a receipt missing
  above the threshold with no declaration, a category on the non-reimbursable
  list, and one booking split across two reports that each land just under the
  first approval band. Two ship with an in-policy lookalike (the business meal
  section 7.5 exempts, the missing receipt section 9.3 allows), so the rule has
  to read three columns rather than one. **Per-diem meal lines carry no receipt
  and no merchant on purpose**: they sit below the receipt threshold, which is
  what a card feed actually looks like and what keeps the missing-receipt
  finding a finding rather than one of thirty.
- **FIN-14 spend-policy**: the Travel and Expense Policy ADI-POL-005 v4.3 as one
  YAML document. The receipt threshold, the meal and lodging caps by city tier,
  the approval bands, the submission windows, the non-reimbursable list, and the
  two rules no expense file can carry. Every figure is the figure the CORE-05
  prose states, and the test looks each one up in the shipped markdown rather
  than retyping it, so an edit the prose does not support fails the suite.
- **FIN-15 customer-credit-notes**: 16 notes behind the March receivable. The six
  credit memos FIN-04 already ships are the spine, read out of `buildArAging()`:
  same customer, same `applied_to_document`, amount equal to the absolute value
  of the FIN-04 `open_balance` to the cent. Eight more were issued and fully
  applied before period end, so they appear nowhere in the aging, and two are
  still requested. **Its `period` is 2026-01-01 to 2026-03-31, describing its own
  notes rather than the March anchor**, and the spine rows carry FIN-04's dates
  verbatim rather than redrawing them.
- **FIN-16 collections-contact-log**: 64 contacts across the twelve largest
  exposures in the aging, plus `collections-policy.json` for the inputs no
  contact log can derive (a four-stage dunning ladder, one credit limit per aged
  customer, the credit-hold and dispute rules, and the FIN-39 rows DA-12 and
  DA-13 that authorize a write off). Every `dunning_stage` recomputes from the
  ladder given that customer's oldest FIN-04 `days_past_due`. Exactly one
  promise to pay is broken and exactly one dispute is live, and **the live
  dispute sits on the healthiest payer**, so the distressed account is not the
  answer to every question the log asks.
- **FIN-17 close-checklist**: the March close in flight at D+4, 24 tasks, one per
  FIN-36 task id. The spine is imported from `buildCloseChecklistTemplate()` and
  carried through, never retyped, so the template and the populated checklist
  cannot drift. 13 complete, 4 in progress, 7 not started; one task overdue at
  the as-of, one account unreconciled past its deadline, one reviewer double
  booked across a posting and the control that tests it. `notes` ships empty on
  all 24 rows.
- **FIN-18 control-matrix**: 26 SOX controls across order to cash, procure to
  pay, close, access and treasury. One control is past its testing due date and
  one key control passed with an empty evidence binder, each carrier picked from
  a population defined by a rule rather than named in the file. Evidence
  artifacts are spec ids the pack ships, related decisions are `control_id`s in
  the shipped FIN-39 matrix, and the access review is dated off
  `closeDayDate("D+5")` and FIN-19's own last review date, so the control, close
  task CLS-21 and the access list cannot drift.
- **FIN-19 user-access-role-assignments**: 45 grants across the 29 active Finance
  employees who carry a `finance_system_role`, computed from that one CORE-04
  column by a published mapping rather than drawn. The mapping is in
  `datagen/README.md` and its authoritative copy is `ROLE_ENTITLEMENTS` in the
  generator. The roster's own comma-valued cell is what produces the single user
  who can both prepare and release, so the segregation-of-duties conflict comes
  out of CORE-04 instead of out of a draw made here.
- **FIN-20 regulatory-updates-feed**: a 14-record JSONL feed plus a 10-row
  `policy-index.csv`, one row per CORE-05 markdown source, **sorted by
  `document_id`**. One update is materially relevant on both legs (its scope
  covers this company and it touches an active FIN-22 account with a non-zero
  FIN-05 balance); six pass the scope leg and five the account leg, so neither
  leg can be skipped. Issuers are generic labels and the citations are the
  codification topics the policy library already cites: no real organization,
  agency or URL appears.
- **FIN-35 inbound-requests-queue**: 38 requests waiting at 2026-04-06, every one
  `pending_classification`, so routing is a live decision. Nothing in the queue
  is invented: sixteen rows resolve to FIN-07 invoice numbers and repeat that
  invoice's amount, purchase order and due date; twelve resolve to FIN-13 report
  ids and carry their `report_total`; eight amend screened vendor masters under
  FIN-39 DA-14; and one carries the invoice number, amount and matter reference
  the shipped CORE-02 `invoice.json` holds, read out of the CORE-02 generator
  rather than retyped.

**FIN-09 `source_document` now cites documents that exist (data-repo issue
#12).** The close batch minted its own `BILL-2026-01NN` and `VINV-2026-01NN`
citation ids "by shape", which landed every one of them inside the id blocks
FIN-11 and FIN-07 really mint. All thirteen bill references, and the fourteen
invoice references the issue did not reach, named a real document whose vendor,
account and amount contradicted the entry citing it: `BILL-2026-0101` was cited
as a benefits accrual while FIN-11 carries it as a $450,000.00 software
subscription. Salvador ruled option (b) on 2026-08-18: fix here, in v1.4.0, with
FIN-11 staying the authority for what a bill is. FIN-09 now reads the
procure-to-pay builder and cites real rows. An accrual cites the FIN-07 invoice
it accrues for and carries that invoice's vendor and total, split across the
expense lines it codes. An accrual reversal superseded by a posted bill, and the
allocation that capitalizes one, cite that FIN-11 bill and agree on vendor,
account and amount. The internal depreciation and amortization entries cite the
document behind the balance they move, the CORE-01 contract or the asset
vendor's own invoice, because a month of depreciation is a fraction of the asset
rather than its price. The insurance reversal still cites FIN-12 and the one
unsupported entry still cites nothing. The D2 plan's section 1.4 join is now
asserted in the builder and in three public tests that read FIN-11's and FIN-07's
emitted bytes, so it cannot recur. **Row count is unchanged at 78 lines over 31
entries, every planted feature still resolves to exactly one row, and no byte of
v1.2.0 or v1.3.0 changes**: those tags are sha-pinned in trazomo and a consumer
sees this only when it moves its pin. Trazomo re-vendors FIN-09 at v1.4.0,
restores the `source_document` column in `finance-journal-entry-reclass` lesson
3, and extends that module's guard to assert the join.

**The close-day rule, written down once.** `close_day` is the business day of the
close counted from the first business day after period end, weekends skipped: D+1
is 2026-04-01 and D+5 is 2026-04-07, so D+4 is Monday 2026-04-06. Counting
calendar days instead puts D+4 on a Saturday, which is a due date nobody can
meet. `addBusinessDays()` and `closeDayDate()` in `datagen/src/dates.js` are the
only implementation, `datagen/README.md` states the rule, and `ANCHOR_DATE` is
untouched. Eight dated rows are appended to `canon/timeline.md` for the events
cluster 2 introduces (the prior access review, the FIN-20 publication window, the
collections contacts, the March expenses, the intake window, the five close days,
the 2026-04-06 as-of and the 2026-04-07 access review due at D+5). No existing
row is touched, above all the "March close roles" row a trazomo guard parses, and
a test asserts every pre-existing line is still present byte for byte.

**MANIFEST.json counts JSONL records.** `describeDataset` counted rows only for
`.csv`, so a feed landed with no count at all and a consumer could not tell an
empty feed from an unread one. FIN-20 now reports both of its files:
`regulatory-updates-feed.jsonl` at 14 records (non-empty lines, no header to
subtract) and `policy-index.csv` at 10 rows. The manifest is at 34 datasets and
13 drafted artifact sets, and `universe_version` is `1.4.0`.

**Hygiene shipped in the same release** (was PR #8, folded in here):

- **`validate --manifest`**, and `npm run validate`. It checks exactly the ids
  `MANIFEST.json` lists and counts the unbuilt catalog specs in a header line.
  `validate --all` walks the whole 137-spec catalog and is red by design while
  specs remain unbuilt, so it could never gate anything; manifest mode is green
  today and goes red the moment a shipped dataset stops reproducing or stops
  existing. An absent manifest, a malformed section, a row with no `id`, or an id
  the catalog does not know are all hard errors. `MISSING` now counts as a
  failure for structured specs as it already did for drafted ones, so a deleted
  dataset can no longer exit 0. `validate --all` output is byte identical before
  and after.
- **CI** (`.github/workflows/ci.yml`): `npm ci`, `npm test` and `npm run validate`
  on Node 22 for every push and pull request, with `actions/checkout` and
  `actions/setup-node` pinned to v5.
- **Canon names are checked against the register.** `tests/generators/fin-cash-recon.test.js`
  compares `ACCOUNT_HOLDER`, `BANK` and all five `CANON_VENDORS` against
  `canon/companies.md` through the repo's canon loader, so a rename in the
  register cannot leave FIN-01, FIN-02 and FIN-03 shipping the old name.
- **Three `planted_features` were parsing as YAML mappings**, not strings,
  because they contain an unquoted colon and a space: two in CORE-05 and one in
  FIN-11. `validate`'s keyword check read the label and silently dropped the
  detail. Same wording, now double-quoted, with a spec-loader test that every
  planted feature is a string. `validate --all` output is byte identical before
  and after.
- **The stale FIN-40 freeze note is struck.** "Do not cut a tag that includes
  FIN-40 before the freeze review" was answered on 2026-08-18 and v1.3.0 shipped
  FIN-40. The half of the comment recording the 2026-08-18 planted-features
  rewrite stays.

**Two things worth a reader's attention.** FIN-20 is the first generator that
reads the repository at build time: it parses the ten CORE-05 document-control
blocks out of `artifacts/CORE-05/*.md`, so a version bump or a review date in the
shipped markdown moves the register with it, an Owner field is split at its first
comma into a person and a title with only the title published (`(vacant)` is the
one accepted alternative and any other unsplittable Owner stops the build), and a
CORE-05 formatting change breaks generation rather than a test. That path is
resolved from the module's own location rather than from `--root`, so
`generate FIN-20 --root <fixture>` reads this repo's CORE-05; threading the root
through the generator signature is a follow-up ticket. And FIN-09's fix covers the
citation classes FIN-07 and FIN-11 mint; nothing else in the pack asserts a
cross-artifact document reference yet.

**Also carried by this tag: the LGL-08 F-4 erratum**, merged to `main` on
2026-08-19 ahead of D4a and recorded as written.

**Merged to `main` on 2026-08-19 ahead of the next tag; written on 2026-08-11
against v1.0.2.** No tag is cut for this entry on its own: it ships in v1.4.0
together with D4a. Consumers pinned to `v1.3.0` or earlier still carry the
92.0 figure until they move the pin.

**This release corrects an internal arithmetic error in frozen v1.0.2 text.**
LGL-08 (`corporate-family-tree-conflicts-record`) Part 5.2, row F-4, stated a
fuzzy-match similarity of **92.0**. The record states its own method (pass two:
`(1 - edit_distance / length_of_longer_normalized_name) * 100`) and carries its
own normalized name pair for the row, `MERIDIAN CREST GP III LLC` vs
`MERIDIAN CREST GP II LLC`: edit distance 1 over a longer length of 25, which is
**96.0**. The stated 92.0 is unreachable from the record's own inputs (it implies
an edit distance of 2). Rows F-1, F-2, and F-3 each reproduce their stated
similarity exactly under the same method, so the error is isolated to F-4.

This is an erratum, not a planted feature. The LGL-08 spec's `planted_features`
declare an ownership/conflict structure and one fuzzy pair "~87.5 percent
similarity" (that is F-1); none of them concern a wrong similarity value, and no
consuming module (`client-intake-conflicts`) references F-4 or the 92.0 figure.
The correction keeps F-4 above the 85.0 human-review threshold, so every count in
the record (Parts 5.2, 5.3, and the Part 11 log: "4 results at or above 85.0, 11
below") is unchanged.

- `artifacts/LGL-08/corporate-family-tree-conflicts-record.md` (:111) and
  `...record.json` (F-4 `similarity`): `92.0` to `96.0`. One value in each file.
- `artifacts/LGL-08/build/corporate-family-tree-conflicts-record.docx` rebuilt
  from the corrected markdown; the only text change in `document.xml` is
  `92.0` to `96.0` (DOCX zip metadata is not byte-deterministic and also moves).
- Added `tests/artifacts/lgl-08-similarity.test.js`: recomputes every
  `fuzzy_matches` similarity from the row's own normalized names and asserts it
  matches the stated value, and checks any stored `edit_distance` /
  `length_of_longer` against the names. This guard fails on the old 92.0 and is
  what the drafted-frozen record lacked.

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
FIN-12, ships in the second PR, which is this one.

- **FIN-04 ar-aging-export**: 150 open documents across 19 CORE-03 customers as of 2026-03-31, plus `ar-aging-summary.json`. Planted: one invoice the subledger carries and the ledger does not, and one unapplied customer credit memo on the customer canon assigns the collections problem. Both are found by a rule over the data, never by a column. Row ids and amounts stay out of this repo (answer-key rule).
- **FIN-05 gl-trial-balance**: 65 rows, one per FIN-22 account, pre-close at 2026-03-31. It is the cluster's assembler, and **all four columns of its six control accounts come from the subledgers, not from a model**: the opening balance, the period debit and the period credit as well as the closing balance. Account 1010 opens on `3,482,915.22`, the balance `canon/timeline.md` fixes for March where book and bank agree, and moves by FIN-02's own debit and credit columns. Receivables move by the cash FIN-02 collected and the credit memos FIN-04 raised; payables by the bills posted in March and the cash paid to vendors; the accrued-liabilities row is the accrual roll-forward line for line; the two prepaid rows are the two bills. Everything with no subledger behind it is modelled inside bands, and account 3200 takes the residual.
- **FIN-06 purchase-orders, FIN-07 vendor-invoices, FIN-08 payment-run**: one procure-to-pay world. 90 purchase-order lines across 48 orders raised since January, 72 invoices received into the AP queue during March, and a 42-payment run proposed for 2026-04-02. Four matching exceptions are planted in the invoices: a price mismatch against the order, a duplicate vendor invoice number, an invoice citing an order that does not exist, and a changed remit-to account on the canon vendor that owns the bank-detail-change story. **All four sit inside the proposed run, so the run as written overpays by exactly the duplicated invoice.** That is the lesson, not a defect: the run is `pending_approval` and unreleased, and catching it before money moves is the point.
- **FIN-09 journal-entries-batch**: 78 lines across 31 entries in the close window, every entry balanced and the batch balanced. Planted: three miscodings that each need a different detection rule (one to the account the chart carries as inactive, one against its own counterparty's modal account, one against the payroll accrual mode), one duplicate entry, and one entry with no supporting document. The batch cites vendor invoices, vendor bills and the two contracts, and deliberately no purchase order: a purchase order is not support for a journal entry, and citing none is what lets FIN-06 place its missing accrual anywhere without either generator constraining the other.
- **FIN-10 open-pos, FIN-11 vendor-bills**: 34 order lines still open at the cut-off with `accrual-rollforward.json`, and 55 bills posted for March. Planted: one line received but never invoiced and never accrued, cited by no bill and by no close entry; one multi-month prepaid whose schedule is already correct (the CORE-01 subscription, $450,000 over 2026-02-01 to 2027-01-31, two months elapsed) and one that still needs a schedule (an insurance premium posted in March against a policy year that opens 2026-04-01). Every other bill sits inside a single calendar month, so the multi-month predicate resolves to exactly those two rows. A bill's `payment_status` is derived rather than drawn: settled only if it fell due inside the period or the vendor is on direct debit, so a March bill on thirty day terms is still open at the cut-off.
- **FIN-12 vendor-contract-insurance** (drafted-frozen, second PR): the annual commercial insurance and facilities services program placed by co-105 for co-002, policy period 2026-04-01 to 2027-03-31, annual premium `$312,000.00` payable in advance and invoiced 2026-03-24 on net-30 terms. It states that coverage does not attach before the policy period begins, that the premium is earned ratably in equal monthly proportions, and it carries renewal mechanics with a notice window and a short-rate cancellation clause, which is what makes amortizing over twelve months a defensible policy rather than an assumption. Its stated premium equals the FIN-11 prepaid bill to the cent, asserted by the one test in this repo that reads a drafted document from a structured test. The insured signs with a CORE-04 roster name; the counterparty executes by title only, so no new person name enters the universe.
- **Cross-artifact ties, all recomputed rather than written down**: FIN-05 account 1010 equals FIN-02's ending cash of `2,740,359.09`, the first assertion in this repo that two data packs describe the same company; account 1100 equals the FIN-04 subledger total less the unposted invoice; account 2000 equals the FIN-11 bills still open; account 2010 equals the accrual roll-forward's closing balance; accounts 1200 and 1210 carry the two prepaid balances.
- **The quarter is a loss.** The frozen March cash ledger collects about `4.17m` of receivables and pays out about `5.16m`, and payroll and vendor spend price above billings, so account 3200 Current Year Earnings carries a **debit** of `5,404,489.32` and the build refuses a credit. This changes the D2 plan's U12 default, which assumed a profit; the shipped subledgers do not support one. Annualised revenue is about `48.8m`, days sales outstanding 25.6 and days payables outstanding 26.8, and the build fails if any of the three leaves its band.
- `canon/timeline.md`: seven dated events added (AR aging window and as-of date, the purchase-order and goods-receipt window, both prepaid service periods, the insurance invoice date, the open-PO cut-off, the proposed run). No existing row changed.
- Spec catalog: FIN-04 through FIN-11 gain `columns` and `period`, and exact planted-feature wording. FIN-04 and FIN-10 move to `format: csv + json`. No ids and no `consuming_modules` changed.
- **No new counterparty name enters the universe in this release.** The vendor population is the sixteen names already screened and shipped at v1.1.0, with the ten neutral names taking stable ids in the `co-140` and up generator range that `canon/companies.md` reserves for generated population. The collision screen is unchanged.
- Universe version 1.2.0: 21 datasets, 12 drafted artifact sets. Suite: 182 tests after the first PR, 183 after the second, 116 before this release.

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
