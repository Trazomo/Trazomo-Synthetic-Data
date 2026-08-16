# Changelog

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
