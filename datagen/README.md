# datagen

Spec-driven CLI for the Trazomo-Synthetic-Data universe. It reads
`specs/artifact-specs.yaml` and `canon/companies.md`, and either:

- **generates** deterministic structured artifacts (CSV/JSON) into
  `datasets/<track>/<artifact-name>/`, or
- **builds** deterministic ↔ authored artifacts to DOCX
  (`artifacts/<ID>/*.md` → `artifacts/<ID>/build/*.docx`), or
- **validates** what's on disk against the spec, or
- **regenerates `MANIFEST.json`** from what's actually present.

This runs locally and in CI. It never runs inside the Cloudflare Workers
runtime the Trazomo product repos deploy to.

## Install

```bash
npm install
```

Requires Node >= 20. [pandoc](https://pandoc.org/) is optional but
recommended for `build-docx` (see below).

## Commands

All commands accept `--root <path>` (default: this repo's root) so the same
code path can run against a throwaway fixture directory in tests without
ever touching the real `datasets/`, `artifacts/`, or `MANIFEST.json`.

### `generate <ID> [<ID> ...]` / `generate --all-structured`

Runs the registered generator for one or more `generation: deterministic`
specs and writes its output under `datasets/<track>/<artifact-name>/`.
`--all-structured` runs every deterministic spec in the catalog; specs
without a registered generator are reported as `STUB` (not a failure) so a
partial run still exits 0.

```bash
node datagen/src/cli.js generate CORE-02
node datagen/src/cli.js generate --all-structured
```

Every generator is a pure function of the spec: seeding comes from the
artifact ID plus a fixed universe seed constant
(`datagen/src/seed.js#UNIVERSE_SEED`). No generator calls `Date.now()` or
`Math.random()`. Running `generate` twice, on any machine, produces
byte-identical files -- that's what `validate` checks (see below) and what
`tests/generators/determinism.test.js` asserts for every implemented
generator.

### `build-docx <ID> [<ID> ...]` / `build-docx --all`

Converts every `artifacts/<ID>/*.md` file to DOCX in `artifacts/<ID>/build/`.
`--all` builds every `drafted-frozen` spec that already has an
`artifacts/<ID>/` directory on disk (skips the rest -- most specs won't have
one until an authoring agent lands its branch).

```bash
node datagen/src/cli.js build-docx CORE-01
node datagen/src/cli.js build-docx --all
```

Two build paths, chosen automatically:

1. **pandoc** (if `pandoc --version` succeeds on this machine): converts
   with `--number-sections` (real numbered heading hierarchy) and
   `--reference-doc=datagen/assets/reference.docx`, a patched copy of
   pandoc's own default reference document -- serif theme fonts (Times New
   Roman), justified body paragraphs, left-aligned headings. Rebuild it
   with `node datagen/scripts/build-reference-docx.js` if the styling needs
   to change; the output is committed so `build-docx` never needs pandoc's
   data files at run time.
2. **`docx` npm package fallback** (no pandoc found): a small hand-rolled
   Markdown-subset parser (headings, paragraphs, bullet/numbered lists,
   `\`-terminated hard line breaks) drives the same serif/justified/numbered
   styling directly. It is *not* a full CommonMark implementation --
   anything it doesn't recognize is emitted as a plain paragraph rather than
   dropped.

**Signature-block preservation**: write each signature line with a trailing
backslash so it stays inside the same paragraph as a manual line break
instead of collapsing into one run-on line:

```markdown
**Signature:**

Jane Doe\
Chief Executive Officer\
Atticus Dundee Inc.
```

Both build paths honor this convention.

### `validate <ID> [<ID> ...]` / `validate --all` / `validate --manifest`

Three scopes, one checker. Pick by the question you are asking:

| Scope | Checks | Use it for |
|---|---|---|
| `validate --manifest` | exactly the ids `MANIFEST.json` lists, in both its `datasets` and `artifacts` sections; unbuilt catalog specs are skipped and counted in the header line | CI (`npm run validate`). Green today, and red the moment something that shipped stops reproducing or stops existing |
| `validate --all` | every spec in the catalog, built or not | reading how far the pack has got. Red by design while specs remain unbuilt, so it cannot gate anything |
| `validate <ID> ...` | the ids you name | working on one artifact |

Failure semantics are the same in every scope. `FAIL` and `MISSING` both count
as failures and set a non-zero exit code, for drafted and structured specs
alike: a spec whose directory is gone has not passed anything. `SKIP` (no
generator registered yet) and `WARN` (a keyword the heuristic could not
confirm) do not. `ALLOWED` is a `WARN` with a recorded reason and is counted
separately. Manifest mode fails hard, before checking anything, if
`MANIFEST.json` is absent, if a section is not a list, if a row has no `id`, or
if it lists an id the spec catalog does not know: a scope that quietly checks a
short list is how a deleted dataset ships green.

- **`generation: drafted-frozen`** specs: reads every `.md` file under
  `artifacts/<ID>/` and, for each `planted_features` entry, extracts its
  significant keywords/numbers and checks how many appear in the source
  text. This is a heuristic over free-text prose, not a parser -- it reports
  `PASS`, `WARN` or `ALLOWED` per feature, never a hard failure, and the overall
  spec status is `PASS` only if every feature passed or is allowlisted.
  `MISSING` if `artifacts/<ID>/` doesn't exist yet.
  Keywords a spec author wrote as a hyphenated compound (`consequential-damages`,
  `governing-law`) are treated as phrases: drafted prose reading "Waiver of
  Consequential Damages" confirms the feature even though it carries no hyphen.
  Only hyphens split a phrase. A possessive (`requester's`) and a number with a
  comma or decimal point (`50,000`, `0.5`) are matched literally instead, so
  they cannot degrade into "the word followed by any s-word" or be satisfied by
  a table row `| 0 | 5 |`.
  The phrase match is deliberately tight: the words must be adjacent, separated
  by nothing more than spaces, tabs or hyphens, and both ends must land on a
  word boundary. It therefore never becomes a bag-of-words check, never spans a
  sentence end, line break, table cell or the file join between two `.md`
  sources in the same artifact directory, and never matches a longer word's head
  or tail. One consequence worth knowing when writing specs: an abbreviation no
  longer matches the word it abbreviates -- write `confidential-information`
  rather than `confidential-info`.
  A `WARN` means "could not confirm," not "absent." The common cause of a
  residual `WARN` is vocabulary drift between the spec's description and the
  document's own words -- an acronym the document spells out (`DTSA` vs "Defend
  Trade Secrets Act"), or spec narration that no drafted document would ever
  contain ("tiering exercises," "broken QA-fail twin"). Read the cited feature
  against the source before treating a `WARN` as a content gap. The usual fix
  is a one-word spec edit, not a code change.
  A feature listed in the allowlist (below) reports `ALLOWED` instead, with its
  recorded reason, and is counted separately in the summary.
- **`generation: deterministic`** specs: regenerates the spec and diffs
  every output file byte-for-byte against what's committed under
  `datasets/<track>/<artifact-name>/`. `PASS`/`FAIL`, or `MISSING` if
  nothing has been generated yet, or `SKIP` if there's no generator
  registered for that id yet.

#### Permanent-WARN allowlist

A few planted features are real, correctly drafted, and permanently
unconfirmable by a keyword check -- not because content is missing, but because
the feature describes something the document could never say about itself.
LGL-02's QA-broken twin is the clearest case: finding its defects is the
exercise, so a document that announced them would be useless. Those features
would `WARN` forever, and a warning that never clears teaches people to skim
past the ones that matter.

`datagen/validate-allowlist.yaml` records them, and only them:

```yaml
allowed:
  - artifact: LGL-02
    feature: "broken QA-fail twin (unresolved governing_law_state placeholder, ...)"
    reason: >-
      Unconfirmable by construction. Finding these defects is the exercise...
```

- `artifact` and `feature` must match a spec id and one of its
  `planted_features` **verbatim**. `reason` is required: an entry without one is
  just a silencer, and later nobody can tell an accepted limitation from a bug
  somebody hid. A blank reason is rejected at load time.
- **Entries self-expire.** `validate` reports `FAIL` and exits non-zero if an
  entry names an unknown artifact, quotes a `planted_feature` that no longer
  exists (someone reworded the spec), or covers a feature that now passes on its
  own. Fixing the underlying problem is therefore always safe -- the next run
  tells you to delete the entry. Only specs included in the current run are
  judged, so `validate CORE-01` never fails over an untouched LGL-02 entry.
- **Not for vocabulary drift.** When a spec says `DTSA` and the document spells
  out "Defend Trade Secrets Act", edit the spec.
- Override the path with `--allowlist <path>`; an absent file is an empty
  allowlist, not an error, so fixture universes need none.

Summary line reports allowlisted features separately:

```
validate summary: 137 checked, 30 failed, 2 allowlisted.
```

```bash
node datagen/src/cli.js validate CORE-02
node datagen/src/cli.js validate --all
```

### `manifest`

Rebuilds `MANIFEST.json`'s `datasets` and `artifacts` sections from what's
actually on disk under `datasets/` and `artifacts/`, cross-referenced
against the spec catalog. Never invents an entry for a spec whose files
aren't present -- `MANIFEST.json` should always be trustworthy (see
`AGENTS.md`: "check MANIFEST.json for what is actually present before
assuming a dataset exists").

`row_counts` covers `.csv` data rows (header excluded) and `.jsonl` records
(one per non-empty line). Other formats carry no count.

```bash
node datagen/src/cli.js manifest
```

## Generator coverage

Per the task brief, generator work started with the artifact *types* that
appear in the CORE and LGL (legal) specs -- invoice, CSV/tabular datasets,
and intake records -- before touching FIN/HR/REV/OPS/SMB.

**Implemented today** (`generation: deterministic`, registered in
`datagen/src/generators/index.js`):

| Spec | Name | Type | Output |
|---|---|---|---|
| CORE-02 | outside-counsel-invoice | invoice | genuine LEDES 1998B pipe-delimited file + JSON summary |
| CORE-03 | crm-seed-dataset | dataset | accounts/contacts/opportunities/stage-history/leads CSVs + JSON bundle |
| CORE-04 | people-roster | dataset | 600-row employee CSV (shared by CORE-03's owners and LGL-07/LGL-22's attorneys) |
| FIN-01 | bank-transactions | dataset | March 2026 bank feed CSV + statement summary JSON (planted duplicate deposit, unrecorded fee, transposed amount, deposit in transit) |
| FIN-02 | gl-cash-ledger | dataset | cash GL ledger CSV, from FIN-01's builder |
| FIN-03 | outstanding-checks | dataset | outstanding checks CSV, from FIN-01's builder |
| FIN-04 | ar-aging-export | dataset | 150-row AR aging CSV as of 2026-03-31 + summary JSON (subledger-only invoice, unapplied credit memo) |
| FIN-05 | gl-trial-balance | dataset | 65-row pre-close trial balance CSV; the cluster's assembler, tying cash, receivables, payables, accruals and both prepaids to their subledgers |
| FIN-06 | purchase-orders | dataset | 90 purchase-order lines across 48 orders CSV, with the approval threshold |
| FIN-07 | vendor-invoices | dataset | 72-invoice AP queue CSV, from FIN-06's builder (price mismatch, duplicate, no matching PO, changed remit account) |
| FIN-08 | payment-run | dataset | 42-payment proposed run CSV, unreleased, from FIN-06's builder |
| FIN-09 | journal-entries-batch | dataset | 78-line close journal batch CSV (3 miscodings, 1 duplicate, 1 entry with no support) |
| FIN-10 | open-pos | dataset | 34 open order lines CSV + accrual roll-forward JSON, from FIN-06's builder |
| FIN-11 | vendor-bills | dataset | 55-bill CSV, from FIN-06's builder (one prepaid schedule already correct, one still to build) |
| FIN-13 | expense-reports | dataset | 88 expense lines across 18 reports CSV, every report submitted or in review (over-cap meal, missing receipt above the threshold, non-reimbursable category, one booking split under an approval band) |
| FIN-14 | spend-policy | config | the Travel and Expense Policy ADI-POL-005 v4.3 as YAML: receipt threshold, meal and lodging caps by city tier, approval bands, non-reimbursable list, every figure taken from the CORE-05 prose |
| FIN-15 | customer-credit-notes | dataset | 16 credit notes CSV on the FIN-04 aging spine (the 6 credit memos FIN-04 ships, 8 issued and applied before period end, 2 still requested) |
| FIN-16 | collections-contact-log | log | 64 contacts across the 12 largest exposures CSV + collections-policy.json (dunning ladder, credit limits, one broken promise to pay, one live dispute) |
| FIN-17 | close-checklist | dataset | 24-task March close in flight at D+4 CSV, spine imported from FIN-36 (one overdue task, one account unreconciled past its deadline, one double-booked reviewer) |
| FIN-18 | control-matrix | dataset | 26-control SOX matrix CSV (one control past its testing due date, one key control passed with an empty evidence binder) |
| FIN-19 | user-access-role-assignments | dataset | 45 entitlement grants across the 29 Finance employees who hold a finance_system_role CSV, derived from CORE-04 by the published mapping below (one user can both prepare and release) |
| FIN-20 | regulatory-updates-feed | dataset | 14-record regulatory feed JSONL + 10-row policy-index.csv parsed out of the CORE-05 document-control blocks at build time |
| FIN-22 | chart-of-accounts | dataset | 65-account chart CSV (cash account 1010) |
| FIN-23 | audit-evidence-index | dataset | 32-row evidence index CSV, 19 rows reusing FIN-18's binder references and 13 derived from FIN-17's complete tasks (one citation on a superseded CORE-05 document, one identical-title pair period cannot separate, one row indexed and not filed, one passed control the index is silent about) |
| FIN-24 | actuals-vs-budget | dataset | 27-line filled variance tracker CSV on the FIN-37 spine, `section_sign` shipped as a column (four material budget variances, three flux breaches, five lines where the two rules disagree) |
| FIN-25 | supporting-je-detail | dataset | 128-line posted detail CSV across six accounts, reconciled to FIN-05's period columns, from FIN-24's builder |
| FIN-26 | materiality-thresholds | config | the budget and flux materiality policy as YAML, writing down the rule FIN-37's 27 thresholds already obey, from FIN-24's builder |
| FIN-27 | approved-je-summary | dataset | 31-row entry roll-up of the FIN-09 close batch CSV (one entry with no support inside the population one is expected for, eleven approved on the weekend, one posting to the inactive account) |
| FIN-29 | approved-metrics-pack | dataset | 12-metric approved figure set JSON, every value recomputed from frozen bytes and every basis naming its sign convention (two figures FIN-40 already publishes, one metric with a documented posting-timing explanation); reads FIN-40's excerpt at build time |
| FIN-31 | kpi-source-data | dataset | 168-row non-ledger KPI inputs CSV, seven inputs by 24 month-ends, pinned to FIN-04, FIN-05 and CORE-04 at both ends of the close |
| FIN-32 | bank-balances | dataset | 96-row month-end cash CSV by account and by side, from FIN-31's builder, book tied to FIN-05 and 1010's bank tied to FIN-01 at both ends of the close |
| FIN-33 | actuals-24mo | dataset | 648-row 24-month profit-and-loss trend CSV, 27 FIN-37 lines by 24 months, reconciled to FIN-05 on both constraints |
| FIN-34 | drivers | config | the driver set and its bands as YAML, from FIN-33's builder |
| FIN-35 | inbound-requests-queue | dataset | 38 untriaged requests CSV at 2026-04-06, resolving to FIN-07 invoices, FIN-13 reports, screened vendor masters and the CORE-02 outside-counsel invoice |
| FIN-36 | close-checklist-template | template | 24-task month-end close checklist CSV, relative close days, learner columns empty |
| FIN-37 | budget-vs-actual-template | template | 27-line variance tracker CSV, one line per active FIN-22 profit-and-loss account, actuals empty |
| FIN-38 | reliability-drill-transactions | dataset | 15 AI-proposed readings of FIN-01/02/03 rows (one transposed amount, one off-chart account, one correct high-confidence control) |
| FIN-39 | decision-authority-matrix-template | template | 20-decision authority matrix CSV (four data classes, four autonomy levels, the money-moving hard block) |
| LGL-07 | client-matter-intake-form-set | form | intake records JSON + markdown summary |
| LGL-11 | litigation-matter-commercial-employment | record | deadline-chain + trial-continuance-cascade JSON + markdown |
| LGL-18 | outside-counsel-rfp-panel-benchmark | dataset | rubric/comparison/scorecard CSVs + markdown |
| LGL-20 | legal-ops-budget-roi-dataset | dataset | spend/allocation/ROI/dashboard CSVs |
| LGL-21 | self-service-portal-program-dataset | dataset | demand-log/SLA CSVs + JSON (FAQ + ROI) |
| LGL-22 | matter-portfolio-dashboard-dataset | dataset | matter-state + capacity-model CSVs |

**Not implemented yet**: every other `generation: deterministic` spec (the
remaining FIN, HR, REV, OPS, SMB, and the remaining LGL corpus/config
bundles LGL-13, LGL-14, LGL-16 -- these are multi-file bundles with folder
trees and hash-chain fixtures that are a meaningfully larger lift than the
CSV/JSON work above). Calling `generate <ID>` on any of these raises a
`NotImplementedError` naming the spec id; `generate --all-structured`
reports them as `STUB` and keeps going.

Adding a new generator does not require touching the CLI: see
"Spec-authoring guide" below.

## Finance conventions

`close_day` is the business day of the close counted from the first business
day after period end, weekends skipped: D+1 is 2026-04-01 and D+5 is
2026-04-07, so D+4 is Monday 2026-04-06. FIN-36 carries the relative `D+n`;
FIN-17 dates it. `closeDayDate()` in `datagen/src/dates.js` is the only place
that rule is implemented, over `addBusinessDays()`; nothing recomputes it by
adding calendar days, which would put D+4 on the Sunday.

The 24-month reporting window ends at 2026-03-31 and is the same series for
FIN-31, FIN-32 and FIN-33; `monthEnds()` in `datagen/src/dates.js` is the only
place it is computed. Nothing recomputes the series locally, and nothing
shortens it: a trend of a different length is a different trend, and three
files that disagree about which months they cover cannot be joined.

FIN-05 is the pre-close trial balance at 2026-03-31 and does not reflect the
FIN-09 batch. A variance artifact reconciles to FIN-05's period columns, never
to FIN-09. Do not write that the batch is "unposted": FIN-17 carries `CLS-15`
("Post the close journal batch") as `complete` at 2026-04-03, so "unposted" is
refutable from the pack in one grep. The accurate wording is "not reflected in
FIN-05".

Two rules from the D5 plan govern every cluster 3 and 4 artifact and every
consumer of them. **R-SIGN**: a per-line `actual_amount` uses the
normal-balance convention (`period_debit` less `period_credit` on a
debit-normal line, the reverse on a credit-normal line), and a statement
subtotal is `sum(actual_amount * section_sign)`, where `section_sign` is `1`
when the line's `normal_balance` matches its section's natural direction
(revenue credit, cost of revenue debit, operating expense debit) and `-1` when
it does not. FIN-24 ships `section_sign` as a column so no consumer needs the
table; BVA-06 is the only `-1` on the tracker. **R-CLS17**: an artifact or a
module may state that the checklist file shows `CLS-17` as `not_started` and
that FIN-24's `variance_explanation` is empty, both byte facts; it may not
state that the variance work has not been done, because merged module 9 says
it has. FIN-24 is the input CLS-17 consumes, not the output it produces.

FIN-20 is the first of two generators that read the repository at build time
(FIN-29 is the second, reading `artifacts/FIN-40/mnpi-flagged-draft.md` with
the same `REPO_ROOT` pattern, so the same `--root` caveat applies): it parses
the ten CORE-05 document-control blocks out of `artifacts/CORE-05/*.md` to build
`policy-index.csv`, sorted by `document_id`, so a version bump or a review date
in the shipped markdown moves the register instead of leaving it stale. Two
consequences. A CORE-05 formatting change breaks generation rather than a test,
which is the correct failure but a loud one. And the CORE-05 path is resolved
from the module's own location, not from `--root`, so `generate FIN-20 --root
<fixture>` reads this repo's CORE-05: threading the root through the generator
signature is a follow-up ticket, not something a fixture universe needs today.
An Owner field is split at its first comma into a person and a title and only
the title is published; `(vacant)` is the one accepted alternative, and any
other unsplittable Owner stops the build.

### FIN-19 `finance_system_role` to entitlements

FIN-19's spec calls this "a published mapping", so here it is. `ROLE_ENTITLEMENTS`
in `datagen/src/generators/fin-19-access-assignments.js` is the authoritative
copy; this table is for readers, and the FIN-19 test carries its own literal
copy and asserts the generator's exported table still equals it.

| `finance_system_role` | Grants (system, entitlement, class) |
|---|---|
| AP Clerk | AP `ap_invoice_entry` create; AP `vendor_master_maintain` modify |
| AR Clerk | AR `ar_invoice_entry` create; AR `ar_credit_memo_entry` create |
| AP Approver | AP `ap_invoice_approve` approve |
| Payment Approver | PAY `payment_run_release` release |
| GL Admin | GL `je_entry` create; GL `gl_account_maintain` modify |
| Read Only | GL `gl_inquiry` view |

`create` and `modify` are preparer classes, `approve` and `release` are releaser
classes. The mapping reads `finance_system_role` and never `role_title`, so the
one user who can both prepare and release comes out of the roster's own
comma-valued cell rather than out of a draw made in the generator.

## Spec-authoring guide

Adding a new artifact to the program:

1. **Add the spec.** Append an entry to `specs/artifact-specs.yaml` under
   `artifacts:` with `id`, `name`, `type`, `format`, `generation`
   (`deterministic` or `drafted-frozen`), `canon_entities`,
   `planted_features`, and `consuming_modules`. Follow the existing
   ID-namespace convention (`CORE-`, `LGL-`, `FIN-`, `HR-`, `REV-`, `OPS-`,
   `SMB-`) and check `canon/companies.md` for entity ids before inventing a
   new company -- reuse an existing one if the relationship already fits.
   Structured specs may also carry `columns` (the CSV header, in order;
   tests pin generator output to it) and `period` (`{ start, end }` as
   quoted ISO dates).
2a. **If `generation: deterministic`**: add
   `datagen/src/generators/<id-lowercase>-<short-name>.js` exporting
   `id` (must equal the spec's `id`) and
   `generate({ spec, canon, rng })`, returning
   `[{ path: "relative/file.csv", content: "..." }, ...]`. Use `rng(streamName)`
   for every random draw (never `Math.random()`/`Date.now()`) so output stays
   deterministic; use a distinct stream name per logical column/entity group
   so unrelated fields don't share a correlated sequence. Register the module
   in `datagen/src/generators/index.js`. If the artifact needs people or
   accounts, reuse `buildRoster()` (CORE-04) or the CRM accounts (CORE-03)
   rather than inventing a parallel population -- that's what keeps
   cross-track joins working (same canon id, same name, everywhere).
   Inject every `planted_features` entry from the spec literally where
   practical (exact numbers, exact quoted strings) so `validate` and
   downstream lesson content can rely on them.
   If the artifact also needs a trimmed slice of itself for a lesson, emit it
   as a **variant** rather than as a second spec: see "Dataset variants" below.
2b. **If `generation: drafted-frozen`**: author the markdown under
   `artifacts/<ID>/<name>.md` (variants as sibling files, e.g.
   `<name>-v1-draft.md`). Do not touch the generator registry -- `build-docx`
   and `validate` work off `artifacts/<ID>/*.md` directly, driven by the
   spec's `id` and `planted_features`.
3. **Generate/build, validate, regenerate the manifest**:
   ```bash
   node datagen/src/cli.js generate <ID>       # or build-docx <ID>
   node datagen/src/cli.js validate <ID>
   node datagen/src/cli.js manifest
   ```
4. **Commit the output** (`datasets/...` or `artifacts/<ID>/build/...`)
   alongside the spec change and the regenerated `MANIFEST.json`.
5. **Add tests**, in this order:
   - **The determinism sweep, for everything.** Add the id to
     `PROGRAM_GENERATOR_IDS` in `datagen/src/generators/index.js`.
     `tests/generators/determinism.test.js` then runs the generator twice and
     diffs the bytes, with no new file to write.
   - **A per-generator test file, preferred for anything with derived
     structure**: a tie-out, a cross-file join, a spine imported from another
     artifact, a shared builder that emits more than one id. Name it
     `tests/generators/<id>-<short-name>.test.js`, pin the header with
     `assert.deepEqual(header, spec.columns)`, and re-derive each planted
     feature from the generated bytes without importing the builder's own
     predicate, so the test can disagree with the generator. The files that
     exist today are listed under Testing below.
   - **A spot check in `tests/generators/planted-features.test.js`** where the
     feature is a simple presence or count and nothing derived hangs off it.
     Anything more than that belongs in a per-generator file.

   **Assert shapes, never instances.** "Exactly one line posts to the account
   the chart carries as inactive" is a test; "line 44 of entry C013 posts to
   6125" is an answer key (see below) and breaks on the next reroll for no
   reason. The same rule is why a cross-artifact test reads the other pack's
   emitted bytes rather than importing its builder.

### Dataset variants

A **variant** is a trimmed slice of a dataset, for a lesson that needs the same
data in a smaller shape (an excerpt that fits a prompt, a single channel, one
period). It lives at `datasets/<track>/<name>/variants/<variant>.csv`, the
parent's own generator emits it, and it is derived from a sibling file by a
predicate over that file's own columns.

Declare it on the parent's spec entry:

```yaml
    variants:
      - name: ach-receipts-mar-05-06
        file: variants/ach-receipts-mar-05-06.csv
        derived_from: bank-transactions.csv
        rule: 'every parent row with channel == "ach", type == "credit" and posted_date in {2026-03-05, 2026-03-06}, in parent file order, with the parent header. running_balance is carried through from the parent statement unchanged, so it does not run continuously inside the slice; recompute it from the parent if a lesson needs a running total'
        consuming_modules: [finance-local-ai]
```

`specLoader` validates the shape (all four fields non-empty, `file` under
`variants/`, `derived_from` a sibling file, names unique). `manifest` records the
variant on the dataset entry, rule included, and the file also appears in `files`
and `row_counts` like any other, so a consumer that has never heard of variants
still sees it.

Three rules make a variant a variant rather than a second dataset that happens to
share a folder:

1. **The rule is a predicate over the parent's columns**, and it is written down.
   A reader has to be able to re-derive the file with one filter.
2. **The test re-derives it from the parent**, in the test's own code, rather than
   importing the generator's predicate. If the spec sentence and the generator
   ever part company, the test says so (`tests/generators/fin-01-variants.test.js`).
3. **The generator asserts what the slice must still contain.** FIN-01's variant
   fails the build if the window loses the repeated receipt or leaves its size
   band, because a demo excerpt with nothing in it to find is worse than no
   excerpt.

A slice inherits every column of its parent, including ones that only make sense
in the parent: FIN-01's `running_balance` is the statement's balance after that
transaction, so it does not run continuously down an eight-row slice. Say so in
the rule rather than leaving a consumer to discover it.

State the rule without naming the defect. `channel == "ach" and type ==
"credit"` on two statement dates is a predicate; "the rows around the duplicate"
is an answer key.

### Answer keys

**Per-instance answer keys never live in this repo.** `planted_features` in
`specs/artifact-specs.yaml` documents *what* was planted and roughly *where*
(that's the generator's contract, and what `validate`'s keyword check runs
against), but the graded answer key for a specific generated instance --
which row is the SoD conflict, which date is the trap -- belongs in private
training content keyed to the data-pack version (`canon/companies.md`'s
ground rules: "Planted findings ship in the data; answer keys live only in
private training content keyed to the data-pack version"). If you find
yourself writing "the answer is row 42" anywhere under this repo, stop --
that content belongs somewhere else.

## Testing

```bash
npm test
```

Runs `node --test` over `tests/`:

- `tests/unit/` -- seeding, dates, spec loading/validation, canon parsing,
  CSV escaping, manifest regeneration, the validate keyword heuristic.
- `tests/generators/determinism.test.js` -- every implemented generator,
  run twice, byte-identical output.
- `tests/generators/planted-features.test.js` -- spot checks that each
  generator's committed `planted_features` actually show up in its output
  (exact totals, record counts, threshold behavior). Simple presence and count
  assertions only; anything derived lives in a per-generator file.
- **Per-generator test files** -- one per generator or builder with derived
  structure, each reading the generated bytes rather than the builder:
  `fin-cash-recon` (FIN-01/02/03, including the canon-name check against
  `canon/companies.md`), `fin-01-variants`, `fin-04-ar-aging`,
  `fin-05-trial-balance`, `fin-procure-to-pay` (FIN-06/07/08/10/11),
  `fin-09-je-batch` (including the FIN-09 to FIN-11 and FIN-07 citation join),
  `fin-13-expense-reports` (FIN-13 and FIN-14), `fin-14-spend-policy`,
  `fin-15-credit-notes`, `fin-16-collections-log`, `fin-17-close-checklist`,
  `fin-18-control-matrix`, `fin-19-user-access`, `fin-20-regulatory-feed`,
  `fin-22-chart-of-accounts`, `fin-35-inbound-requests`,
  `fin-38-reliability-drill`, `fin-track-b-templates` (FIN-36/37/39).
- `tests/artifacts/` -- checks over drafted-frozen artifacts that recompute a
  stated figure from the document's own inputs.
- `tests/drafted/` -- structural screens over drafted-frozen documents: what
  must be *absent*. The real-name screen asserts that every capitalized phrase
  in the document is the canon protagonist, a role title an active CORE-04
  employee holds, or listed document furniture, since a drafted artifact is
  where a new person or company name slips into the universe unnoticed.
- `tests/helpers/` -- shared test utilities (the quote-aware CSV reader). Not
  test files; the older generator tests keep their own local copies.
- `tests/cli/test01-fixture-e2e.test.js` -- spawns the real CLI against a
  throwaway copy of `tests/fixtures/TEST-01` (never the real repo root):
  `generate` → `validate` → `manifest` for a fixture `deterministic` spec,
  `build-docx` → `validate` for a fixture `drafted-frozen` spec, and both
  `validate --manifest` cases: green while the fixture catalog still carries an
  unbuilt spec, non-zero the moment a manifest-listed dataset directory is
  deleted.
- `tests/docx/docx-build.test.js` -- both `build-docx` code paths (pandoc
  and the `docx` fallback) against the TEST-01-DOC fixture; the pandoc test
  is skipped (not failed) on a machine without pandoc installed.

`tests/fixtures/TEST-01/` is a self-contained fixture universe (its own
tiny `specs/artifact-specs.yaml`, `canon/companies.md`, and one drafted
markdown file). It is the *only* thing under `artifacts/` or `datasets/`-shaped
paths that this repo's own test suite is allowed to touch, and only inside
`tests/fixtures/` -- never the real `artifacts/` or `datasets/` trees.
"TEST-01" and "TEST-01-DOC" are never real Trazomo-Synthetic-Data ids.
