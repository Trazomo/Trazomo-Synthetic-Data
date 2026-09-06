# Changelog

## 1.11.0

**Allocated in merge order (expected `v1.11.0`); renumber at tag time if the
order changes.**

People and HR cluster 2, recruiting intake and screening: two drafted-frozen
artifact sets, one freeze review, with no generator, no registry entry and no
byte changed under `datasets/`. HR-01, HR-03 and CORE-04 are read and never
edited. The plan is
`docs/plans/2026-08-29-path-programs/people-hr/data-plans/cluster-2.md`. The
plan's section 9 defaults (U1 to U10) ride to Salvador's freeze review, HR-04b
first as the one item that extends the written plant list.

- **HR-02 resume-corpus**: eighteen resumes on the one open engineering
  requisition the frozen interview corpus already names, plus
  `application-log.md`. Applications arrive 2026-02-18 to 2026-03-20, on or
  after the frozen requisition's own opened date; two were screened as they
  arrived and are the two the frozen transcripts carry, sixteen were held for a
  single batch screen, and the shortlist decision falls due 2026-04-02 and is
  recorded nowhere. The log is the only file with funnel state: four columns, a
  two-value vocabulary in which no value means shortlisted, rejected or
  declined, and no score, rank or comment on any candidate. Each resume runs 250
  to 400 words in one fixed order, states experience as `N years M months`
  rather than as a date range, and describes every employer and every
  institution by sector and scale rather than by name, so the protagonist stays
  the only company the corpus names. Exactly one four-digit year token exists
  across the eighteen bodies, inside its own education section, against eighteen
  once the metadata exclusion is dropped; exactly one resume is missing a
  required rubric field, against six missing a section the corpus otherwise
  carries; the two sit on different resumes and both are in the pending pool.
  The published `age_route_lexemes` list returns zero hits, and summed
  experience on every resume sits inside a four to twelve year band. The two
  already-interviewed resumes are drafted against their own frozen transcripts
  and contradict none of the claims those candidates made.
- **HR-04 interview-scorecards-question-banks**: `interview-question-bank.json`
  with 37 questions running `QST-0001` upward, three on each of the frozen
  library's twelve competencies and one more on a single competency; a
  six-phrase protected-characteristic probe list across two classes, disjoint
  from HR-01's exclusion list; and a panel-role map whose three competency sets
  are byte-equal to the ones the frozen transcripts publish. Exactly one
  question carries a full listed phrase, against four that carry a phrase's head
  word and no phrase, and it maps to a competency like the other thirty-six, so
  a schema check cannot find it without reading it. `screening-rubric.json`
  carries the closed six-item required-field list, five criteria running
  `RUB-01` upward at the distinct weights 6, 5, 4, 3 and 2, a 0 to 4 scale with
  a label at every point, and a total possible score of 80 that recomputes from
  the weight sum. Six scorecards pair one to one with the six frozen transcripts
  and carry the panelist `employee_id` the frozen corpus does not, which is the
  join the debrief cluster needs. Exactly one is outstanding, its rows present
  and its cells empty, against four carrying an empty cell somewhere. No
  scorecard states a recommendation, a verdict or a total.
- **The screen**: `tests/drafted/hr-c2-drafted-screen.test.js`, HR-C2-T1 to T12
  plus the freeze gate. Every closed list is read out of the spec rather than
  restated, CORE-04 is generated in process, and the frozen register and
  transcripts are read from committed bytes. Neither C2 set is deterministic, so
  `validate` has no regeneration diff and this file is the only guard on a
  committed-byte edit: 24 one-clause mutations were applied by rule and all 24
  were caught, each by the arm the plan names.
- **Spec pins** (HR block only): HR-02 and HR-04 move from their coarse two-line
  form to the enriched one, publishing every closed list the screen applies and
  stating each plant beside the number its rule returns with the qualifier
  dropped. HR-02's `format` is corrected from `markdown + pdf` to `markdown`
  with the realized-as note on the line itself, because this pack has no pdf
  pipeline. No cluster 1 entry is touched and no `consuming_modules` list
  changes. Eleven validate-allowlist entries, each confirmed to WARN on its own
  run first, after ten more were cleared by rewording the spec.
- **Canon**: one `canon/timeline.md` Dated-events row for the application window
  and the decision that falls due at the end of it, and the two `ca-` ID
  conventions rows in `canon/people.md`. The two curated candidate seats are
  proposed in the pull request body rather than written, because writing those
  names into canon breaks the cluster 1 screen's canon-name assertion and
  falsifies a frozen HR-03 spec sentence, neither of which this cluster may
  change.

## 1.10.0

Revenue cluster 2, consent, claims and controls: two deterministic artifacts,
one drafted-frozen document with its freeze review, and no shared-tier edit
(CORE-03 is read in memory and never touched; this PR changes no byte under
`datasets/core/` or `canon/`). The plan is
`docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-2.md` on
trazomo (lane branch `data/revenue-cluster-2`), executing
`implementation-plan-v2.md` section 3.2 under the resolved ruling R6 (the
REV-11 id). The plan's section 9 defaults (U-T4 first, then U1 to U10) ride
to Salvador's freeze review; U-T4 corrects plan-v2's REV-C2-T4 against the
bytes (three population accounts are already wholly suppressed through
individual opt-outs, so the plant is scoped to the account-level
do-not-contact state as T4-prime).

- **REV-01 consent-suppression-master**: a 67-row master CSV bijective with
  CORE-03's contacts (join columns derived by invoking the CORE-03 generator,
  never retyped), refining the CRM's coarse consent trio into seven
  legal-basis states over per-account jurisdiction and subscriber type;
  `consent-policy.json` carrying the state table, the send permissions and
  the 10-business-day honor window; exactly one opt-out honored past that
  window; two downstream tool exports with exactly one contact carrying
  conflicting suppressed values (the stale export shows false); the
  account-level do-not-contact state on every contact of the closed-lost
  account and no other. Spec entry enriched and its two pre-merge play slugs
  renamed to `revenue-signal-plays`.
- **REV-06 product-security-fact-sheet**: drafted-frozen pair for co-002, a
  19-row claims register (five categories, four certification rows, role-only
  maintained-by line, last reviewed inside March 2026, no financial figure)
  and four AI-drafted outbound claim snippets, exactly one asserting a
  certification with no register row. Resolution is mechanical: substring
  membership in the pinned `tests/helpers/rev-c2-cert-vocabulary.js` against
  the register's certification rows. Structural screen in `tests/drafted/`.
- **REV-11 policy-as-code-scenarios**: the R6-approved new id; a seven-rule
  pre-send policy (claim, discount and consent families, discount threshold
  15 percent) and five ground-truth scenarios spanning the three outcomes
  and three subjects, targets selected by rule from REV-01's rows; the
  blocked claim is a vocabulary certification absent from both REV-06 files
  and distinct from the snippet's unregistered one, recomputed from the
  committed bytes by the test rather than hardcoded.

## 1.9.0

Operations cluster 2, planning and intake: the path's first two deterministic
generators, which birth `datasets/operations/`, plus one drafted-frozen project
brief that joins the already-frozen CORE-01 master services agreement. CORE-01,
CORE-03 and CORE-04 are read and never edited. The plan is
`docs/plans/2026-08-29-path-programs/operations/data-plans/cluster-2.md`.

- **OPS-03 project-brief-with-missing-dependency**: the 2026-03-18 internal
  brief for the contract operations platform rollout (a different program from
  cluster 1's customer onboarding revamp), six milestones with stated
  predecessors, six named people including the vendor engagement director
  CORE-01 Exhibit B.2 names. Exactly one milestone's true predecessor lives
  only in the frozen contract's milestone-gating clause, and exactly one
  passage instructs the planner to treat an unsigned change order as executed;
  which milestone and which passage are certified by review and freeze, never
  marked in-file. No money figure anywhere in the brief.
- **OPS-04 intake-request-batch** (`datasets/operations/intake-request-batch/`):
  18 untriaged requests received 2026-03-16 to 2026-03-31 across four channels,
  12 internal (active CORE-04 rows), 5 customer (CORE-03 contact and account
  bytes), 1 vendor (the Exhibit B.2 engagement director via vendor_portal).
  Ships its own published rubric, `intake-rubric.yaml`, and six eml message
  files whose From headers are roster email bytes. Planted by rule at exact
  cardinality: one duplicate pair across two channels, one anonymous
  submission, one missing priority, one stated-urgent row the rubric classes
  normal while every other row agrees with the rubric, and one eml body
  instructing the router to classify it at the highest priority on an honestly
  normal row.
- **OPS-05 backlog-export-with-quality-gaps**
  (`datasets/operations/backlog-export-with-quality-gaps/`): a 28-task work
  tracker export as of 2026-03-25 for the reporting migration program, owners
  all active CORE-04 rows, statuses tool-native. Gap censuses fixed by rule:
  three tasks with no owner, four with no definition of done, three with no due
  date, two naming a dependency in prose while declaring none, exactly one row
  in exactly two classes, and one gap-free task whose description instructs the
  checker to mark it complete.
- **The screen and the generator tests**:
  `tests/drafted/ops-c2-drafted-screen.test.js` (metadata and milestone-table
  parse, roster joins, the four absence pins and three presence pins that keep
  the contract gate out of the brief's bytes, the name screen, no em dash, no
  money) and `tests/generators/ops-04-intake-batch.test.js` /
  `ops-05-backlog-export.test.js`, which re-derive every plant from the emitted
  bytes with their own rubric implementation. Both generators registered in the
  determinism sweep.
- **Spec pins** (OPS block only): OPS-04 gains `columns`, `period`, the rubric
  file and exact-cardinality planted lines including its injection; OPS-05
  gains `columns` and exact-cardinality planted lines including its injection;
  OPS-03 gains its unsigned-change-order line. Two validate-allowlist entries
  for OPS-03 features the brief cannot announce about itself.

## 1.8.0

**Allocated in merge order (expected `v1.8.0`); renumber at tag time if the
order changes.**

People and HR cluster 1, in two stacked halves: three drafted-frozen artifact
sets with the structural screen over them, two canon timeline rows and the
HR-block spec pins, then the two deterministic generators that read them.
`datasets/hr/` is born here. The deterministic half could not land first,
because its export reads the frozen HR-01 register at build time. CORE-04 is
read and never edited. The plan is
`docs/plans/2026-08-29-path-programs/people-hr/data-plans/cluster-1.md`.

- **HR-01 role-requisition-library**: `role-requisition-register.json` plus
  eight intake briefs. Eight requisitions stated at 2026-04-03, six open, one
  on hold and one filled, running `RQN-2026-0101` upward, raised across
  2026-01-12 to 2026-03-20 with no two on the same day. The register carries
  the exclusion-phrase list as twelve `{phrase, class}` objects across the four
  classes and a twelve-entry competency library running `CMP-01` upward; each
  brief is 350 to 550 words in six fixed sections and prints its panel by role
  title only. Owners, hiring managers and recruiters resolve to CORE-04 by
  published field rules, and the briefs print no owner, because a document that
  named a departed owner beside a live requisition would be doing the
  validation exercise for the learner. No compensation figure anywhere.
- **HR-03 interview-transcript-corpus**: two candidates on one open
  requisition, three panel conversations each. Six transcripts of 43 to 53 cues
  under one cue grammar with monotonic timestamps, dated inside 2026-03-09 to
  2026-03-20, and six paired draft-feedback files of six or seven numbered
  claim sentences apiece. The anchor rule reads a closed technology vocabulary
  the spec ships, so the screen and a later module apply the same predicate to
  the same bytes. The two candidate ids and names are reserved in the PR body
  for `canon/people.md` to seat at cluster 2.
- **HR-09 manager-notes-and-review-draft-pair**: one People-department manager
  and one of that manager's own active reports, selected by rule rather than by
  id. Twelve dated entries of 95 to 106 words across 2025-10-01 to 2026-03-31,
  and a seventeen-sentence review draft in four sections. Four closed lists
  ship in the spec entry, which is what moves both review selections out of
  review-certified and into machine-recomputed.
- **The screen**, `tests/drafted/hr-c1-drafted-screen.test.js`: sixteen tests
  covering HR-C1-T7 to T10. Every selection is recomputed from the spec's own
  closed lists against the committed bytes, in the screen's own code, at both
  its qualified and its qualifier-free cardinality; the CORE-04 roster is
  generated in-test; every printed name and role title is joined to a live
  roster row with a byte-equal `role_title`; and the register is parsed here
  because `validate` reads only markdown and a JSON-side drift would otherwise
  ship unseen.
- **Spec pins** (HR block only): HR-01, HR-03 and HR-09 move from their coarse
  form to the FIN-style one, gaining `period`, selection rules with both
  cardinalities, document inventories, id blocks and the four closed lists
  verbatim. HR-03's frozen example named a real programming language; the
  enriched entry states the rule over a closed vocabulary of generic technology
  terms instead, because no C1 artifact names a vendor or a product. The HR-09
  entry's frozen exemplar phrase was replaced by a different phrase from the
  same published closed list.
- **Canon**: two dated events on `canon/timeline.md`, in date order with the
  rest of the table. No new canon entity and no `canon/companies.md` edit;
  co-002 is the only company any of the three sets names.
- **Allowlist**: nineteen planted features warned on the first `validate` run.
  Twelve were vocabulary drift between spec narration and the documents' own
  words and were fixed by rewording the spec rather than by silencing it. The
  seven that survive are recorded in `datagen/validate-allowlist.yaml` with
  LGL-02-class reasons: three of them describe a plant a document cannot
  announce about itself, three describe an absence a keyword count cannot see,
  and one would mean the corpus had failed if it were ever confirmed, because
  ten of the exclusion list's twelve phrases must appear nowhere in the briefs.
- **HR-17 mixed-sensitivity-employee-dataset**, the first `datasets/hr/` entry:
  forty records drawn from the active roster and stratified by department, so
  every department carrying at least twenty active rows contributes at least
  two and none contributes more than eight. The seven identifying columns are
  carried through from CORE-04 in process rather than retyped. Sensitivity is
  computed rather than declared: two published field classes, a total
  first-match tier rule, and a lawful basis that follows the tier the row
  declares, so a tier that disagrees with its own fields carries a basis that
  disagrees with them as well. Twelve records carry a special category value,
  nine carry a restricted field and nothing above it, nineteen carry neither,
  and twenty read ordinary. The criminal record check and the immigration
  status sit in `restricted` and not in `special_category`, which is the
  distinction the record set exists to carry; no statutory citation appears in
  the file.
- **HR-18 hris-export**: five files, and nothing in them typed twice. The 582
  roster rows are the active CORE-04 rows in `employee_id` order under the
  system's own `PER-` surrogate key, with `employment_status` reading active on
  every one because the export carries only live records. The eight requisition
  rows are read out of the frozen `artifacts/HR-01/role-requisition-register.json`
  at build time, the FIN-20 idiom, and the read throws unless the register still
  holds exactly eight requisitions each carrying the documented key set, naming
  the count or the missing and unexpected keys. Permissions are a two-table
  computation over `role_title` and `case_type` rather than a flag, both tables
  ship in the spec, and the twenty-four case queue routes each case to the tier
  that owns it. Six cases sit at tier 3 or 4. No money, pay band or work
  location column exists anywhere in the bundle.
- **The generator guards**, `tests/generators/hr-17-mixed-sensitivity.test.js`
  and `tests/generators/hr-18-hris-export.test.js`: twenty-two tests covering
  HR-C1-T1 to T6. Headers are pinned to the spec's own column lists, the tier
  rule is reimplemented in the test rather than imported, both generators'
  published tables and lists are carried as the tests' own literal copies and
  asserted equal to the generators' exports, and the requisition tuples are
  compared against the
  committed register bytes read off disk rather than against the generator's
  reader. Both plants are asserted at their qualified and their qualifier-free
  cardinality.
- **Spec pins**, second half (HR block only): HR-17 and HR-18 move to the
  FIN-style form, gaining the column lists (per file, for the four-table
  bundle), the field classes, the tier rule and the lawful-basis map, the two
  permission tables, both plants as selection rules with both cardinality
  numbers, and the derivation statements. HR-17 loses two lines of its frozen
  entry under the plan's U1: the companion disclosure clause, which a
  deterministic dataset directory cannot hold and which is module content
  rather than data, and the gloss that classed immigration status as a special
  category.

Gates at this branch head: `npm test` 604 tests, 604 pass, 0 fail, up from the
564 at `v1.7.0` and the 580 at the drafted half. `validate --manifest` 69
checked, 0 failed, 14 allowlisted, up from 64 checked and 7 allowlisted.
`validate --all` 137 checked, 19 failed, down from 22, which is the three
directories that are no longer missing; the two deterministic HR ids move from
`SKIP NOT_IMPLEMENTED` to `PASS` and so change no count. `MANIFEST.json`
regenerated to 47 datasets and 22 drafted artifact sets, with
`universe_version` deliberately left at 1.5.0. No existing dataset file moved:
the only bytes added under `datasets/` are the two new HR directories.

What is verified where. Structure, every cardinality and every roster join are
tested in this PR. The drafting quality of the transcripts and the "every other
evaluative sentence paraphrases a cue that exists" leg are certified by the
adversarial review and the freeze review, because paraphrase is not mechanical.
Which requisition, which claim sentence and which review sentence satisfies
which rule stays in private training content keyed to the data-pack version.

**HR-01, HR-03 and HR-09 freeze at merge.** Any later wording change is an
amendment with its own review, and the stacked deterministic PR reads the
frozen register at build time, so an amendment breaks generation rather than
shipping a silently different export.

## 1.7.0

**Allocated in merge order after #18 (expected `v1.6.0`); renumber at tag time
if the order changes.**

Operations cluster 1, the path's capture spine: three drafted-frozen artifacts,
the structural screen over them, three canon timeline rows and the OPS-block
spec pins. No generator, and no `datasets/operations/` (that directory is born
at cluster 2, with the path's first deterministic artifact). CORE-04 is read and
never edited. The plan is
`docs/plans/2026-08-29-path-programs/operations/data-plans/cluster-1.md`.

- **OPS-01 meeting-transcript-with-commitments**: an 84-cue delivery sync of
  2026-03-10 on the customer onboarding revamp, seven active CORE-04 speakers
  across Operations, Product and Engineering, each printed role title byte-equal
  to the roster's `role_title` (comma included, `VP, Operations`). This file
  defines the normative consent banner for the universe: recording,
  transcription and biometric identification named as three separate acts,
  biometric identification disabled, and the standing right to have a remark
  struck. Cluster F's OPS-16 invite template must carry the same bytes, and the
  cross-artifact identity test lands there; the byte-pin lands here.
- **OPS-02 retro-transcript-with-recurring-finding**: the 2026-03-27 team retro
  with the 2026-03-13 summary quoted inside it, both inside the operations
  anchor month. Five prior findings with exactly one still unresolved; a
  facilitator read-back of exactly six findings, each with its own owner line
  and exactly one of them blank. The recurrence is mechanical rather than
  marked, so the screen recomputes it: one read-back row equals one prior row
  once both are lowercased and stripped of punctuation, that prior row is the
  unresolved one, and it is not the row with no owner. No consent banner here;
  the facilitator captured the notes by hand.
- **OPS-03B follow-up-email-thread**: six messages 2026-03-11 to 2026-03-13,
  four active participants, three of them speakers at the sync, addresses
  byte-equal to the roster's own `email` column. The bodies revisit three of the
  transcript's decision topics; two name the same decider the transcript does
  and one does not, and the thread never notices.
- **The screen**, `tests/drafted/ops-c1-drafted-screen.test.js`: cue grammar
  full-parse, monotonic timestamps, roster joins on every name, role title,
  owner and address, the banner byte-pin, the date windows, the read-back
  cardinalities and the recurrence pair. It follows the finance D5 screen except
  in one respect: the D5 documents passed the real-name screen by naming nobody,
  which a transcript cannot do, so names here are allowed exactly when they
  resolve to an active roster row and the screen becomes a parse-and-join.
- **Spec pins** (OPS block only): OPS-01 gains the consent-banner line and two
  injection-aside lines, OPS-02's "findings with no owner" is pinned to exactly
  one and gains its aside line, OPS-03B gains the unsupported-decision-passage
  line. The asides are in the spec because four of the path's failure evals are
  Given a line inside a C1 source; without them stage A would have to invent
  unvendored input for graded work.
- **Canon**: three dated events on `canon/timeline.md`, in date order with the
  rest of the table. No new canon entity and no `canon/companies.md` edit;
  co-002 is the only company any of the three names.

What is verified where. Structure is tested in this PR. The linguistic
cardinalities (exactly four commitments, the one with no stated owner, the
attribution trap, the impersonal follow-up, the three shared topics and the
single conflict) are certified by the adversarial review and the freeze review,
because a data-repo test that recomputed them would publish the answer key as
code. Which row satisfies which rule stays in private training content keyed to
the tag, as it does everywhere else in this pack.

Four allowlist entries were added, and only after the run produced them: the
OPS-01 attribution-trap and implied-follow-up lines and both OPS-03B lines. All
four are the LGL-02 class, a feature the document could not state without
destroying the exercise, and two of them describe an absence (nothing captures
the follow-up, nothing replies to the passage) that a keyword count cannot see.

**These three documents freeze at merge.** Any later wording change is an
amendment with its own review.

## 1.6.0

**Expected tag at merge of the revenue cluster 1 PR (`data/revenue-cluster-1`);
the integrator allocates the tag in merge order after Salvador's freeze review,
never on this branch.** Consumers pinned to `v1.5.0` or earlier are unaffected
until they move the pin; trazomo's revenue cluster 1 modules (8, 11, 12, 15,
29) will pin this tag. The plan is
`docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-1.md` on
trazomo (lane branch `data/revenue-cluster-1`), executing
`implementation-plan-v2.md` section 3.1 under the resolved ruling R-CORE03
(2026-08-31); R6 gates later clusters and no new artifact id ships here.
The plan's section 9 defaults (U-T5, U1 to U6) ride to Salvador's freeze
review.

- **CORE-03 crm-seed-dataset (additive edit under R-CORE03)**: new
  `lead_form_submissions.csv`, the inbound lead-form submission view (12 rows,
  March 2026, dated inside the 2026-03-16 seed clock; mixed ICP fit under the
  published firmographic rule with clear-fit, clear-non-fit and ambiguous all
  non-empty; one local-part-only email match with zero byte-equal emails; one
  `marketing_consent` false row; one company resolving byte-equal to a target
  account). `crm-seed.json` gains the array and a sixth counts entry. **The
  five existing CSVs are byte-identical to `v1.5.0`** (all draws come from new
  `lead_form*` rng streams; receipt in the PR body). Spec `consuming_modules`:
  the two pre-merge play slugs collapse to `revenue-signal-plays`;
  `revenue-deck-and-proposal-builder` and `revenue-campaign-briefing-system`
  added.
- **REV-07 crm-object-model-seed (new)**: `salesforce-objects.json` and
  `hubspot-objects.json`, Salesforce-shaped and HubSpot-shaped object samples
  for co-102, co-103 and co-122, derived at build time from CORE-03's own rows
  so names, canon ids and amounts join byte-consistently (nothing retyped).
  Teaching scale, not eval-critical; the join contract is the only assertable
  fact.
- Tests: `tests/generators/core-03-lead-form.test.js` (header pin, the T1 to
  T10 tie-outs of the plan with the ICP rule re-implemented independently of
  the generator, and regression asserts on the frozen plants) and
  `tests/generators/rev-07-object-model.test.js` (join contract against
  CORE-03's committed bytes). REV-07 joins the determinism sweep. Suite: 547
  tests, up from 528. Five mutation receipts recorded in the PR body, each
  failing its named guard before revert.

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
  `AP-/AR-/PAYREG-/JV-202603-NNNN` source-document blocks, which are
  self-contained by ruling (2026-08-22): they do not join FIN-13's March bills,
  FIN-07 or FIN-09, and module 23's trace stops at the cited id. **FIN-25 is a
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
  `distinct_accounts` says so. **FIN-27 is the only cluster 3/4 artifact whose
  ROWS derive from FIN-09's bytes** (and from FIN-22 `active` and CORE-04).
  Three others read the batch without carrying a row of it: FIN-29 reads it for
  one `basis` string and throws if FIN-09 stops debiting account 6020, and
  FIN-24 and FIN-33 read it only to assert the disjointness their plants rest
  on. A FIN-09 regeneration therefore reaches four cluster 3/4 generators.
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

Gates at the D5a head: `npm test` 520 tests, 512 pass, 0 fail, 8 todo (the
eight are the D5b markers); `npm run validate` 57 checked, 0 failed;
`validate --all` 137 checked, 28 failed, every failure a `MISSING` drafted
artifact and zero structured FAIL (the plan's U9 predicted 21; the prediction
assumed SKIP counted as a failure, and it never did); `generate` for all ten
run twice, byte identical; `MANIFEST.json` 44 datasets and 13 drafted
artifact sets; real-name screen over every name-like column of the new
datasets finds nothing outside the v1.4.1 universe; em-dash grep over every
changed file empty.

D5b adds the three drafted documents and no dataset. All three are Salvador's
freeze-gate items, reviewed in ascending order of surface: FIN-30, then FIN-21,
then FIN-28.

- **FIN-21 close-runbook**: the one procedure document in the finance pack, and
  the corpus module 22 retrieves over beside CORE-05. Document control in the
  CORE-05 shape (`ADI-FIN-003`), the close-day rule as `datagen/README.md`
  states it, the 24 close tasks by `task_id` with owner role, reviewer role,
  dependency and evidence expectation, the escalation path by role title, and a
  section on what a close task's evidence must show. The task tables are
  rendered from `buildCloseChecklistTemplate()` rather than retyped, so the
  runbook and FIN-36 cannot drift (T-Q5). No money amount appears anywhere in
  it, and no date other than the close-day rule and the document-control block.
- **FIN-28 prior-period-footnotes**: the February 2026 disclosure footnote set
  module 24 drafts the March set from. Exactly five footnotes, three of which
  declare in their own heading the FIN-17 `category` whose balance they report
  (`revenue`, `accruals`, `accruals`), and no trade-payables footnote, which is
  what holds the roll-forward pairing at one instance. Every money amount it
  states is a FIN-33 `2026-02` `actual_amount` to the cent: all thirteen were
  substituted into the draft from the generated column rather than typed
  (T-U1). Balance-sheet balances are described and never restated, because
  FIN-05 is a March trial balance and this is a February set.
- **FIN-30 prior-board-deck-outline**: the standing Q4 2025 agenda as an
  outline and nothing else. Section headings in the order the meeting takes
  them, the figure slots named and left empty, the distribution list by role
  title, and a pointer at the classification convention rather than a
  restatement of FIN-40's banner. No money amount, no percentage, and no date
  inside the current reporting period (T-R5).

Gates at the D5b head: `npm test` 528 tests, 528 pass, 0 fail, 0 todo (the
eight D5b todo markers are deleted in the same commit as the prose that
satisfies them, which the screen itself enforces in both directions);
`npm run validate` 60 checked, 0 failed, exit 0; `validate --all` 137 checked,
25 failed, 3 allowlisted, every remaining failure a `MISSING` drafted artifact
and zero structured FAIL; `MANIFEST.json` 44 datasets and 16 drafted artifact
sets, `universe_version` still 1.5.0; the real-name screen over all three
documents finds no person name and no unaccounted capitalized phrase; em-dash
grep over the three documents and this file empty.

The third allowlist entry is FIN-28's pairing with FIN-17's open checklist
item. The document cannot state it without becoming an answer key, so the
keyword heuristic can never confirm it from the prose;
`datagen/validate-allowlist.yaml` records that with its reason, and
`tests/artifacts/fin-28-footnotes.test.js` derives the pairing by execution
from FIN-17's category and status bytes instead. Two screens hold the drafted
documents to the pack rather than to a list: FIN-21's 24 task rows are compared
field by field against `buildCloseChecklistTemplate()`, and every capitalized
phrase in the three documents has to be the protagonist, an active CORE-04 role
title, a FIN-22 account name read out of the generated chart of accounts, or
listed document furniture. Both screens carry a positive control, so a
regression that returned nothing could not green the documents silently, and
the money shape the two screens share treats the currency symbol as optional:
a bare `2,130,335.46` is compared to FIN-33 like any other figure.

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
