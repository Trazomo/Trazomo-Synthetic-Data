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

### `validate <ID> [<ID> ...]` / `validate --all`

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
| FIN-22 | chart-of-accounts | dataset | 65-account chart CSV (cash account 1010) |
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
5. **Add a test.** For a generator, add it to
   `tests/generators/determinism.test.js`'s coverage (add its id to
   `PROGRAM_GENERATOR_IDS` in `datagen/src/generators/index.js`) and a
   planted-feature spot check in `tests/generators/planted-features.test.js`.

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
        rule: 'every parent row with channel == "ach", type == "credit" and posted_date in {2026-03-05, 2026-03-06}, in parent file order, with the parent header'
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
  (exact totals, record counts, threshold behavior).
- `tests/drafted/` -- structural screens over drafted-frozen documents: what
  must be *absent*. The real-name screen asserts that every capitalised phrase
  in the document is the canon protagonist, a role title an active CORE-04
  employee holds, or listed document furniture, since a drafted artifact is
  where a new person or company name slips into the universe unnoticed.
- `tests/helpers/` -- shared test utilities (the quote-aware CSV reader). Not
  test files; the older generator tests keep their own local copies.
- `tests/cli/test01-fixture-e2e.test.js` -- spawns the real CLI against a
  throwaway copy of `tests/fixtures/TEST-01` (never the real repo root):
  `generate` → `validate` → `manifest` for a fixture `deterministic` spec,
  and `build-docx` → `validate` for a fixture `drafted-frozen` spec.
- `tests/docx/docx-build.test.js` -- both `build-docx` code paths (pandoc
  and the `docx` fallback) against the TEST-01-DOC fixture; the pandoc test
  is skipped (not failed) on a machine without pandoc installed.

`tests/fixtures/TEST-01/` is a self-contained fixture universe (its own
tiny `specs/artifact-specs.yaml`, `canon/companies.md`, and one drafted
markdown file). It is the *only* thing under `artifacts/` or `datasets/`-shaped
paths that this repo's own test suite is allowed to touch, and only inside
`tests/fixtures/` -- never the real `artifacts/` or `datasets/` trees.
"TEST-01" and "TEST-01-DOC" are never real Trazomo-Synthetic-Data ids.
