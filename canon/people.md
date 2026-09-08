# Canon People

Universe bible for Trazomo-Synthetic-Data. Every person here is fictional. This file
is the counterpart to `canon/companies.md` and closes the dependency that file names:
curated named individuals now have a home, IDs, and a precedence rule.

**The v1.0.1 legal slice is frozen.** This file *declares* canon; it does not rewrite
artifacts. Where a frozen document names someone other than the person canon seats,
the divergence is recorded as an erratum against the exact frozen location and queued
for the next corpus version.

**Amended 2026-08-09 by operator decision.** That rule now has one deliberate
exception. The two HIGH real-person collisions found by the screen below were cleared
in frozen text on 2026-08-09 instead of being deferred to v1.1, because this repository
is public and both names matched verifiable living lawyers. Four strings moved, across
two markdown files and the two DOCX builds derived from them; the record is in
"Renames applied" below. Nothing else in `artifacts/`, `datasets/`, or the DOCX builds
was edited, no dataset was regenerated, and no generator input changed. The amendment
tags as v1.0.2 at merge.

Source: reconciliation of the 82 invented person rows in the merged PR #2
(`data/core-and-contracts`, 30 rows) and PR #3 (`data/legal-docs`, 52 rows), against
what actually shipped at tag `v1.0.1`. The two PRs were drafted by different agents in
parallel and each independently invented a leadership roster for co-002; a third
roster already existed on disk in `datasets/core/people-roster/people-roster.csv`.
Reconciling those three is the substance of this file.

## Precedence (how conflicts were decided)

Applied in order. Every entry below was verified by grep against the tracked tree
(`artifacts/`, `datasets/`, `specs/`, `canon/`, `datagen/`), not by trusting PR prose.

| Tier | Source | Why it wins |
|---|---|---|
| a | Committed dataset output (`datasets/**`) | Shipped data is what exemplar repos and downstream tracks consume, and its employee IDs are foreign keys in other committed datasets. Renaming a row breaks byte-determinism across the pack. |
| b | Drafted artifact text as merged (`artifacts/**/*.md`, `*.csv`, `*.json`) | The document is the deliverable a learner opens. Titles in canon follow the artifact, not the PR body. |
| c | PR-body prose | Descriptive only. A name that never landed in the tree is not canon. |

Within tier b, ties break on: (1) number of distinct artifact sets the name appears in;
then (2) total occurrences; then (3) role weight: an executing signatory on a binding
instrument outranks a contact line in a summary record; then (4) coherence of the
leadership block, preferring the option that keeps one consistent officer team rather
than splitting it across two documents that already disagree.

## ID conventions

| Range | Meaning |
|---|---|
| pe-001 to pe-099 | co-001 Atticus Dundee LLP named cast |
| pe-101 to pe-199 | co-002 Atticus Dundee Inc. named cast |
| pe-201 to pe-249 | Named officers and contacts at ecosystem entities (co-101 to co-139) |
| pe-251 to pe-299 | Non-party individuals: litigation parties, witnesses, experts, mediators, introducers, contractors |
| ca-001 to ca-049 | Curated named candidates and applicants to co-002 roles. Two seats are proposed at people-hr cluster 2 and held, for the reason recorded under the table. |
| EMP-NNNN | Generator-produced co-002 employee population, `datasets/core/people-roster/people-roster.csv` (CORE-04). Not curated here. Two rows are promoted into this file because they hold contested seats. |
| ct-co-NNN-NN | Generator-produced CRM contacts, `datasets/core/crm-seed-dataset/contacts.csv` (CORE-03). Not curated here. |
| ca-100 and up | Bulk co-002 candidate population, `artifacts/HR-02/` and later applicant fixtures. Not curated here. |

`pe-` rows are invisible to `datagen/src/canon.js#loadCanonCompanies`, which only
matches a first cell of `co-\d+`. Adding this file changes no generator behaviour.

Individuals who exist only inside one artifact and carry no cross-track weight still
get an ID here when they are named in frozen text, because a learner can see them and
a future artifact must not accidentally reuse the name.

**The two `ca-001` to `ca-049` seats are proposed and not yet written, deliberately.**
People-hr cluster 2 confirms the `ca-` block boundaries above and proposes seating the
two candidates who cross three artifact sets. Writing their names into this file would
break two frozen things this cluster is not allowed to change: the cluster 1 drafted
screen asserts that no part of a candidate name appears anywhere in this file, and the
HR-03 spec entry states that the two candidate names are the only names in that corpus
no roster row and no canon person carries. Both were true when they were written and
both stop being true the moment the seats land. The two rows and the one-line screen
amendment therefore belong to the same change, and that change is the integrator's to
make, not a path lane's. The proposed rows ride in the cluster 2 pull request body.
`ca-050` to `ca-099` stays reserved and names nothing, so it gets no row here.

## co-001 Atticus Dundee LLP (pe-001 to pe-099)

| ID | Name | Role / title (as the artifact states it) | Appears in (grep-verified) | Status |
|---|---|---|---|---|
| pe-001 | Jonathan K. Sedgemoor | Partner, Mergers and Acquisitions; engagement partner | LGL-05 | CANONICAL (renamed 2026-08-09, was Jonathan K. Sterling) |
| pe-002 | Amara Diallo-Reyes | Partner, Technology Transactions | LGL-04, LGL-05 | CANONICAL |
| pe-003 | Corinne Whitfield | Counsel, Benefits and Compensation | LGL-05 | CANONICAL |
| pe-004 | Lucian Petrosyan | Senior Associate, Corporate | LGL-05 | CANONICAL |
| pe-005 | Hana Ishibashi-Cole | Associate, Corporate | LGL-05 | CANONICAL |
| pe-006 | Bernadette Oyelaran | Senior Paralegal | LGL-05 | CANONICAL |
| pe-007 | Rosalind M. Achebe | General Counsel and Loss Prevention Partner; chairs the Financial Crime and Client Acceptance Committee | LGL-08, LGL-09 | CANONICAL |
| pe-008 | Douglas H. Wentz | Partner, Corporate and Transactions | LGL-08 | CANONICAL |
| pe-009 | Marguerite Oyelaran | Partner; relationship partner for co-115 | LGL-08 | CANONICAL |
| pe-010 | Simon T. Delacroix | Partner; relationship partner for co-002 | LGL-08 | CANONICAL |
| pe-011 | Hollis Nakamura-Reed | Chair, New Business Committee | LGL-08 | CANONICAL |
| pe-012 | Beatrice A. Lindqvist | Director of Client Risk and Financial Crime | LGL-09 | CANONICAL |
| pe-013 | Tomás E. Delgadillo | Client Due Diligence Analyst | LGL-09 | CANONICAL |
| pe-014 | Gerald P. Ravenscroft | Partner, Energy and Infrastructure; requesting partner, recused from the LGL-09 vote | LGL-09 | CANONICAL |
| pe-015 | Harold V. Amundsen | Partner; supervising attorney on both litigation matters | LGL-10, LGL-12 | CANONICAL |
| pe-016 | Delia R. Kwon | Associate; handling attorney | LGL-10 | CANONICAL |
| pe-017 | Simone A. Ratliffe | Associate; handling attorney and named researcher on the LGL-12 audit trail | LGL-12 | CANONICAL |
| pe-018 | Nadia S. Feldkamp | Partner, Intellectual Property; outside IP counsel to co-002 | LGL-17 | CANONICAL |
| pe-019 | Renata Villalobos | Docketing Specialist | LGL-10 | CANONICAL, HOMONYM of pe-202 |
| pe-020 | Priya Raghunathan | Senior Conflicts Analyst, New Business Intake | LGL-08 | HOMONYM of pe-103, ERRATUM-IN LGL-08 |
| pe-021 | Jordan K. Sable | Partner (billed at $725 on matter MAT-OC-0142) | CORE-02 (`invoice.ledes.csv`, `invoice.json`, TK-001) | CANONICAL (tier a) |
| pe-022 | Marlowe O. Duskwood | Associate (billed at $465 on matter MAT-OC-0142) | CORE-02 (`invoice.ledes.csv`, TK-002) | CANONICAL (tier a) |
| pe-023 | Reyna T. Pemberton | Paralegal (billed at $220 on matter MAT-OC-0142) | CORE-02 (`invoice.ledes.csv`, TK-003) | CANONICAL (tier a) |

**pe-020 is not a second canonical Priya Raghunathan.** `canon/people.md` seats
Priya Raghunathan as General Counsel of co-002 (pe-103). The LGL-08 conflicts record
independently assigned the same full name to a co-001 conflicts analyst. A law firm
analyst and her own flagship client's general counsel sharing an unusual full name is
an accident of parallel drafting, not a plot point. The frozen text stands; the
rename is queued as F-4.

**pe-021 to pe-023 come from committed data, not from either PR.** The CORE-02 outside
counsel invoice carries three named co-001 timekeepers in its LEDES `TIMEKEEPER_NAME`
field. They are tier (a) sources and belong in canon, but they were absent from the
first draft of this file because the reconciliation started from the PR name lists and
those three names appear in neither PR.

They are **not** the LGL-05 Core Team under different names. CORE-02 bills matter
`MAT-OC-0142` at $725 / $465 / $220; LGL-05 staffs matter `2026-0417` (Project Beacon)
at $985 through $265. Different matter, different rate card, no contested seat. Note
that pe-021 Jordan K. Sable initials to **JKS**, the same initials as pe-001 Jonathan K.
Sedgemoor, and that CORE-02's planted block-billed narrative line begins "JKS 03/12 2.4
hrs L510". That line refers to pe-021, who is the only JKS on that invoice. Do not
"reconcile" pe-001 and pe-021 into one person: they are two co-001 partners on two
unrelated matters. The 2026-08-09 rename preserved the JKS monogram on pe-001 for the
same reason it was noted here in the first place: the collision of initials is a
deliberate distractor, and losing it would quietly remove a planted feature.

## co-002 Atticus Dundee Inc. (pe-101 to pe-199)

| ID | Name | Role / title (as the artifact or dataset states it) | Appears in (grep-verified) | Status |
|---|---|---|---|---|
| pe-101 | Kestrel Ashgrove | Chief Executive Officer | CORE-04 (`people-roster.csv`, EMP-0001) | CANONICAL (tier a) |
| pe-102 | Daniel Osei-Bonsu | Chief Financial Officer | CORE-01, CORE-05, LGL-03 | CANONICAL (tier b) |
| pe-103 | Priya Raghunathan | General Counsel and Corporate Secretary | CORE-01, CORE-05, LGL-02, LGL-04, LGL-05 | CANONICAL (tier b) |
| pe-104 | Tobias Lindqvist | Chief Information Security Officer | CORE-05 | CANONICAL (tier b) |
| pe-105 | Constance Adeyemi | Chief People Officer | CORE-05 | CANONICAL |
| pe-106 | Marlowe Bellcrest | VP, Engineering | CORE-04 (`people-roster.csv`, EMP-0002) | CANONICAL (tier a) |
| pe-107 | Naomi Feuerbach | Corporate Controller | CORE-05 | CANONICAL |
| pe-108 | Elias Vantongeren | Manager, Technical Accounting | CORE-05 | CANONICAL |
| pe-109 | Ines Kowalczyk | Vice President, Brand and Communications | CORE-05 | CANONICAL |
| pe-110 | Marlene Sipowicz | Director, Workplace Services; departed November 2025, role vacant (the orphaned-owner fixture) | CORE-05 | CANONICAL |
| pe-111 | Serena B. Alcaraz | Associate General Counsel, Employment and Litigation | LGL-12, LGL-17 | CANONICAL |
| pe-112 | Devraj S. Iyer | Senior Counsel, IP | LGL-17 | CANONICAL |
| pe-113 | Lucia M. Ferrante | Senior Counsel, Commercial | LGL-17 | CANONICAL |
| pe-114 | Cordelia B. Nwosu | Legal Operations Manager | LGL-17 | CANONICAL |
| pe-115 | Aleksy Pietrzak | Contract Operations Manager | LGL-17 | CANONICAL |
| pe-116 | Yusuf A. Barmani | Data Protection Officer | LGL-17 | CANONICAL |
| pe-117 | Grady L. Thomsen | Director of Procurement | LGL-17 | CANONICAL |
| pe-118 | Amara O. Nkemdirim | Principal Engineer; named inventor | LGL-17 | CANONICAL |
| pe-119 | Wei-Lin Tsao | Staff Engineer; named inventor, gave the barring conference talk | LGL-17 | CANONICAL |
| pe-120 | Bartholomew Reiss | Senior Engineer; named inventor | LGL-17 | CANONICAL |

Note the shape of this roster: the committed employee dataset (600 rows plus a header) models co-002 as
one CEO over ten functional VPs and carries **no** CFO, General Counsel, CISO, or Chief
People Officer row at all. That gap is why two sets of drafting agents each invented a
C-suite. Not one of the twenty names above appears in `people-roster.csv`, so the
shipped roster and the shipped documents currently describe disjoint populations of the
same company. Closing that is follow-up F-1.

## Ecosystem entities (pe-201 to pe-249)

| ID | Name | Role / title | Affiliation | Appears in (grep-verified) | Status |
|---|---|---|---|---|---|
| pe-201 | Everett Nakashima | Chief Executive Officer | co-101 Copperline Software | CORE-01 (all six MSA variants) | CANONICAL |
| pe-202 | Renata Villalobos | Engagement Director | co-101 Copperline Software | CORE-01 (all six MSA variants) | CANONICAL, HOMONYM of pe-019 |
| pe-203 | Ingrid Solheim | Chief Operating Officer | co-108 Palisade Labs | LGL-02 | CANONICAL |
| pe-204 | Merrick Ashgrove-Pell | Manager | co-109 Birchcroft Properties | LGL-03 | CANONICAL |
| pe-205 | Marisol Etchegaray | Chief Executive Officer | co-110 CloudHost Inc. | LGL-04 | CANONICAL |
| pe-206 | Peter Hallowell-Boyd | General Counsel | co-110 CloudHost Inc. | LGL-04 | CANONICAL |
| pe-207 | Yolanda Pritchard-Naidoo | General Counsel | co-118 Brightquarry Analytics | LGL-02 | CANONICAL (tier b) |
| pe-208 | Nikhil Ravensworth | Chief Executive Officer and Co-Founder | co-123 Torchbird Labs | LGL-02, LGL-17 (from 2026-08-09) | CANONICAL (tier b) |
| pe-209 | Marcus D. Ferreira | Founder and Chief Executive Officer of co-114; sole managing member of Ferreira Family Holdings, LLC; non-employee director of co-002 | co-114 TechBridge Solutions | LGL-08 | CANONICAL |
| pe-210 | Teodor S. Kavaris | Ultimate beneficial owner; settlor and protector of The Kavaris Family Settlement; former PEP | co-116 Horizon Energy Holdings | LGL-09 | CANONICAL |
| pe-211 | Andrei Kavaris | Director of the prospective client; son of pe-210 | co-116 Horizon Energy Holdings | LGL-09 | CANONICAL |
| pe-212 | Roland Pham | VP Security and Trust | co-119 DataPulse Analytics | LGL-17 | CANONICAL |
| pe-213 | Kimberly Dressler | Director of Trust and Compliance | co-106 TalentForce HR Platform | LGL-17 | CANONICAL |
| pe-214 | Étienne Roussel | Account Director | co-120 GlobalComms Translation Service | LGL-17 | CANONICAL |
| pe-215 | Fiona McAllister-Grange | Deputy General Counsel | co-102 Amberfield Logistics | LGL-17 | CANONICAL |

`Ashgrove` in pe-204 is a **person** surname and does not point at a company. The
co-109 rename at v1.0.1 moved the landlord entity to Birchcroft Properties; the
manager who signs for it keeps her drafted name. See F-6 for the parts of that rename
that did not land.

## Non-party individuals (pe-251 to pe-299)

| ID | Name | Role | Appears in (grep-verified) | Status |
|---|---|---|---|---|
| pe-251 | Hon. Delia M. Ferrante (Ret.) | Private mediator, LGL-04 Recital J | LGL-04 | CANONICAL |
| pe-252 | Evelyn K. Brandt | Managing partner of the Meridian Crest sponsor; sits on the boards of both co-114 and co-115 | LGL-08 | CANONICAL |
| pe-253 | Marisol Kavaris-Elenko | Spouse of pe-210; PEP-associated person | LGL-09 | CANONICAL |
| pe-254 | Sébastien Marchal | Independent introducer, not a lawyer; removed from the approved introducer list | LGL-09 | CANONICAL |
| pe-255 | Yolanda P. Ferris | Client and plaintiff, personal injury matter | LGL-10 | CANONICAL |
| pe-256 | Curtis A. Nakashima | Adverse party, personal injury matter | LGL-10 | CANONICAL |
| pe-257 | Bernard Oduya | Independent witness | LGL-10 | CANONICAL |
| pe-258 | Ahmad N. Sethi, M.D. | Treating orthopedic surgeon | LGL-10 | CANONICAL |
| pe-259 | Priyanka Raval, M.D. | Physiatrist, independent evaluation | LGL-10 | CANONICAL |
| pe-260 | Officer M. Trelawney | Sheffield Falls Police Department, report SF-23-00817 | LGL-10 | CANONICAL |
| pe-261 | Denise Kowalczyk | Senior Claims Representative, Cross County Casualty Insurance Company | LGL-10 | CANONICAL |
| pe-262 | Anselm Pereira | Claims Examiner, Kettle Ridge Mutual Insurance Company | LGL-10 | CANONICAL |
| pe-263 | Jonah P. Verhoeven | Adverse party; departing 1099 independent contractor | LGL-12 | CANONICAL |
| pe-264 | Vivian Sørensen, EnCE | Forensic examiner retained by counsel | LGL-12 | CANONICAL |
| pe-265 | Ingrid Halvorsen | Independent contractor; unassigned joint contributor on IDF-2026-016 | LGL-17 | CANONICAL |

This table carries no affiliation column because most non-parties are institutionally
placed in the Role cell already (pe-260 Sheffield Falls Police Department, pe-261 Cross
County Casualty, pe-262 Kettle Ridge Mutual). The two physicians, **pe-258 Ahmad N.
Sethi, M.D. and pe-259 Priyanka Raval, M.D., are unattributed in LGL-10 by design.** The
treatment chronology lists them as treating and evaluating clinicians on their own rows
and lists Marbury Regional Medical Center and Sheffield Falls Physical Therapy as
separate facility rows, without tying either physician to either facility. Canon follows
the artifact and does not invent an employer for them.

## Renames applied 2026-08-09 (real-person collisions)

Two names were removed from frozen text on operator decision, closing both HIGH flags
from the collision screen. This is the one place where canon has rewritten an artifact
rather than recording an erratum against it. Both retired names are reserved here so a
future author does not re-invent them.

| Retired name | Replaced by | Seat | Exact locations changed | Reason | Commit |
|---|---|---|---|---|---|
| Jonathan K. Sterling | pe-001 Jonathan K. Sedgemoor | co-001 engagement partner, LGL-05 | `artifacts/LGL-05/engagement-letter.md:56` (Core Team rate table), `:63` (responsible-partner sentence), `:173` (signature block), plus `artifacts/LGL-05/build/engagement-letter.docx` | HIGH real-person collision (see the screen below) | `6c35840` |
| Sasha Vukovic | pe-208 Nikhil Ravensworth | co-123 CEO and co-founder, LGL-17 Scenario C | `artifacts/LGL-17/nda-negotiation-scenarios.md:118` (counterparty contact), plus `artifacts/LGL-17/build/nda-negotiation-scenarios.docx` | HIGH real-person collision; also the F-3 substitution, so one edit closed both | `6c35840` |

Neither rename touches `datasets/`. pe-001's occurrences are confined to one LGL-05
markdown file, and the only "JKS" strings in committed data belong to pe-021 Jordan K.
Sable on matter `MAT-OC-0142`, a different person on a different matter, so no
deterministic generator input moved and byte-determinism holds. The DOCX rebuild
changed `word/document.xml` in exactly those two files and nothing else.

**Sedgemoor was chosen over a middle-initial change on purpose.** The real-world match
was on the given-plus-surname pair, which an initial does not break, so the surname is
what had to move. Sedgemoor screens CLEAR, keeps the JKS monogram that CORE-02's
distractor depends on, and stays inside the place-derived surname register the pack
already uses (Ashgrove, Larkspur, Ravenscroft).

## Errata: names in frozen text that canon does not seat

Each row below is a real name in a real shipped document. The document is not being
changed, with the one exception noted immediately below. Canon records the name as an
alias of the seated person so that anyone joining across the corpus knows the two refer
to one seat.

**Two of the eight rows are not live errata.** Rosalind Achterberg never landed in the
tree at all and is here only because she is the third claimant to the co-002 CEO seat.
The Sasha Vukovic row was resolved on 2026-08-09 by editing the document, which is the
exception above (see "Renames applied"). The other six describe frozen text as it stands
today; both non-live rows are kept for the audit trail.

| Frozen name | Alias of | Seat | Erratum in (exact frozen location) | Why it lost |
|---|---|---|---|---|
| Julian A. Prewitt | pe-101 Kestrel Ashgrove | co-002 CEO | `artifacts/LGL-17/signing-authority-matrix.md:44` (D4 row) | 1 occurrence in 1 file. Tier a beats tier b: EMP-0001 is the manager-of-record for all ten co-002 VPs and the root of the 600-employee org tree. |
| Rosalind Achterberg | pe-101 Kestrel Ashgrove | co-002 CEO | *nowhere*, PR #2 body only | 0 occurrences repo-wide. Tier c. Never landed; not canon, not reserved. |
| Ophelia R. Sandoval | pe-102 Daniel Osei-Bonsu | co-002 CFO | `artifacts/LGL-17/signing-authority-matrix.md:44`; `nda-negotiation-scenarios.md:125`; `vendor-risk-register.csv:6,8` | 4 occurrences, 3 files, 1 artifact set. Osei-Bonsu: 11 occurrences, 9 files, 3 sets, and he is the executing signatory on the CORE-01 MSA and the LGL-03 lease. |
| Naomi F. Aitken | pe-103 Priya Raghunathan | co-002 General Counsel | `artifacts/LGL-17/signing-authority-matrix.md:9` (Owner) and 6 further LGL-17 files | 17 occurrences, 7 files, 1 artifact set. Raghunathan: 28 co-002 occurrences across 5 sets, signs all five LGL-02 NDA variants and all six CORE-01 MSA variants, is the LGL-05 engagement-letter addressee, and owns the CORE-05 policy library. |
| Hannah T. Ostrowski | pe-104 Tobias Lindqvist | co-002 CISO | `artifacts/LGL-17/ip-and-vendor-program-bundle.md:101` and 4 further LGL-17 files | Closest call in the set: 12 occurrences across 5 files versus Lindqvist's 17 across 3, both confined to one artifact set. Broken on tiebreak 4: seating Ostrowski would split the co-002 officer team across two documents that already disagree, whereas Lindqvist keeps CORE-05's officer block internally consistent. **Tiebreak 3 leans the other way and this call rests entirely on tiebreak 4.** Ostrowski renders dated binding decisions (`vendor-risk-assessment-talentforce.md:133` "Conditionally approved"; `vendor-risk-assessment-globalcomms.md:123` "Do not approve"), which is closer to executing authority than policy ownership, while 11 of Lindqvist's 17 occurrences are policy revision-history rows, so his count lead is softer than it looks. This is the seat most worth a human overrule. |
| Theresa J. Muldoon | pe-106 Marlowe Bellcrest | co-002 VP Engineering | `artifacts/LGL-17/ip-and-vendor-program-bundle.md:104`; `vendor-risk-assessment-datapulse-analytics.md:11,109`; `vendor-risk-register.csv:2,5,9`; `invention-disclosure-records.md:228` | 6 full-name occurrences plus 1 initialled "T. J. Muldoon", 7 in all, across 4 files in 1 set. Tier a beats tier b: EMP-0002 is manager-of-record for eleven Engineering directors over a 190-person organisation. |
| Trevor Nakagawa | pe-207 Yolanda Pritchard-Naidoo | co-118 legal chief | `artifacts/LGL-17/nda-negotiation-scenarios.md:73` | LGL-17 Scenario B (co-118, residual-knowledge clause, NEG-2026-0139) summarises the same deal that LGL-02 `mutual-nda-negotiated-enterprise.md` executes. Tiebreak 3: Pritchard-Naidoo is the executing signatory at line 163; Nakagawa is a contact line. |
| Sasha Vukovic | pe-208 Nikhil Ravensworth | co-123 CEO / co-founder | ~~`artifacts/LGL-17/nda-negotiation-scenarios.md:118`~~ **RESOLVED 2026-08-09 (`6c35840`)**: the string is gone from the document | LGL-17 Scenario C (co-123, $50,000 liquidated damages per breach, NEG-2026-0154) summarises the same deal that LGL-02 `mutual-nda-liquidated-damages.md` records. Tiebreak 3: Ravensworth is the executing signatory at line 165. Also a HIGH real-person collision, which is why this one was executed early rather than waiting for the rest of F-3. |

### Title drift (canon follows the artifact, not the PR body)

| Person | PR body said | Frozen artifact says | Canon takes |
|---|---|---|---|
| pe-202 Renata Villalobos | SVP, Professional Services | Engagement Director (`CORE-01/master-services-agreement.md:423`) | Engagement Director |
| pe-109 Ines Kowalczyk | VP, Brand and Communications | Vice President, Brand and Communications | the artifact's long form |

### Surname repeats across entities are coincidental

Five surnames are each carried by two different curated people at two different
entities. **All five are parallel-drafting noise, not relationships, not family, and not
plot points.** They are declared coincidental here for the same reason F-7 declares the
name-pool overlap: a learner joining records on surname must not be misled into reading
a connection that the universe does not intend.

| Surname | The two people | Why it could be misread |
|---|---|---|
| Lindqvist | pe-012 Beatrice A. Lindqvist (co-001, Director of Client Risk) / pe-104 Tobias Lindqvist (co-002 CISO) | co-001 is co-002's outside firm, so this reads as a relationship or a conflicts problem |
| Nakashima | pe-201 Everett Nakashima (co-101 CEO, a co-002 vendor) / pe-256 Curtis A. Nakashima (adverse party in LGL-10) | reads as a link between two unrelated matters |
| Ferrante | pe-113 Lucia M. Ferrante (co-002 Senior Counsel) / pe-251 Hon. Delia M. Ferrante (Ret.) (mediator in LGL-04) | in-house counsel sharing a surname with the mediator on her own employer's settlement |
| Kowalczyk | pe-109 Ines Kowalczyk (co-002 VP Brand) / pe-261 Denise Kowalczyk (opposing carrier's claims rep, LGL-10) | same shape as Ferrante |
| Oyelaran | pe-006 Bernadette Oyelaran / pe-009 Marguerite Oyelaran (both co-001) | two people at one firm, which reads as family |

The Kavaris repeats (pe-210, pe-211, pe-253) are the one deliberate exception: LGL-09
establishes them as a family and the beneficial-ownership analysis depends on it.

All five could be de-collided cheaply in v1.1 by changing one side of each pair, since
every one of the ten people appears in exactly one artifact set. That is a cosmetic
improvement, not a correctness fix, so it is not proposed as a follow-up.

## Reserved: names proposed but never used

These seven appear in a merged PR body and **nowhere in the tree**. They are not canon
and carry no ID. They are recorded so a future author does not re-invent them believing
they are free, and so that anyone auditing the PRs against this file can account for
every row.

| Name | Proposed as | Proposed in |
|---|---|---|
| Rosalind Achterberg | Chief Executive Officer, co-002 | PR #2 |
| Miriam Feldstein-Ruiz | Senior Counsel, Commercial, co-002 | PR #2 |
| Helena Vasquez-Thorne | VP, Procurement and Vendor Management, co-002 | PR #2 |
| Theodora Barhydt | Director, People Operations, co-002 | PR #2 |
| Rafael Quintanilla | Director, Finance Operations, co-002 | PR #2 |
| Sandrine Okorafor | VP and General Counsel, co-101 | PR #2 |
| Dorothea Kalman | Director, Property Management, co-109 | PR #2 |

The seats three of them were proposed for are now held by names that did land:
Senior Counsel Commercial by pe-113 Lucia M. Ferrante, procurement by pe-117
Grady L. Thomsen, and the co-002 CEO seat by pe-101 Kestrel Ashgrove.

## Reconciliation counts

| Measure | Count |
|---|---|
| Person rows in the two PR bodies | 82 |
| Distinct names among them | 80 (Priya Raghunathan and Renata Villalobos each appear twice, in two different roles) |
| Rows grep-verified present in the tree | 75 |
| Rows present in PR prose only | 7 |
| Canon entries in this file (`pe-` IDs) | 73 |
| of those, canonical | 72, of which 2 carry a HOMONYM flag (pe-019, pe-202) |
| of those, carries an ID but is an erratum, not canon | 1 (pe-020) |
| Rows in the errata table | 8: 6 still live in frozen text, 1 (Vukovic) resolved 2026-08-09, 1 (Achterberg) in PR prose only |
| Reserved-unused | 7 |
| Promoted from the generator population | 2 (pe-101 EMP-0001, pe-106 EMP-0002) |
| Sourced from committed data, in neither PR | 3 (pe-021 to pe-023, CORE-02 timekeepers) |
| Contested seats resolved | 7 |
| Distinct names screened for real-person collision | 85: 78 clear, 2 HIGH, 5 MEDIUM |
| Names renamed in frozen text after the screen | 2, both HIGH, on 2026-08-09 (4 strings, 2 markdown files, 2 DOCX) |

Reconciling to 82: 7 rows never landed (reserved-unused), 7 rows lost a contested seat
to a name that did land (the errata table's frozen-text rows), and the remaining 68 rows
carry into this file with IDs. Adding the two promoted roster names and the three CORE-02
timekeepers gives 73 entries.
Rosalind Achterberg is counted once, under reserved-unused; she appears again in the
errata table only because she is the third claimant to the co-002 CEO seat and the
comparison is worth seeing in one place.

The 82 figure is the verbatim enumeration of both PR bodies. An earlier task brief
carried **87**; that number could not be reproduced from any source in this repo or
either PR body, across two independent recounts. Treat 82 as ground truth and 87 as an
estimate. If five further names exist somewhere outside these two PRs they have not
been located, and none of them appears in the tracked tree. Every person string in
`artifacts/` and `datasets/` is accounted for above or belongs to the generator
populations.

## Verification method

Every "appears in" cell was produced by literal-string grep over the tracked tree,
not by reading the PR bodies:

```
grep -rlI --exclude-dir=build --exclude-dir=node_modules --exclude-dir=.git \
  -F "<full name>" artifacts datasets specs canon datagen
```

`build/` is excluded because DOCX output is derived from the markdown beside it and
would double-count. Where a full-name grep returned nothing, the surname was searched
alone, which is what surfaced the four names carrying diacritics that the ASCII
transcription in the PR bodies had flattened: Tomás E. Delgadillo, Sébastien Marchal,
Étienne Roussel, Vivian Sørensen. All four are present in the tree with their accents
intact and are canonical. Only after both passes returned empty was a name classed
reserved-unused.

Contested seats were then counted with `grep -roh ... | wc -l` for occurrences and
`grep -rl ... | wc -l` for files, and the surrounding line was read in each artifact to
confirm the role the document actually gives the person. Generator populations were
checked separately: `people-roster.csv` and `contacts.csv` were parsed as CSV (naive
comma splitting is wrong there, since `"VP, Engineering"` is one quoted field) and every one
of the 80 distinct names was tested against both. **No exact full-name collision exists
between the curated names and either generated population.**

## Real-person collision screen

Run 2026-08-08 (overnight; results landed 2026-08-09). This closes the gate that this
file originally declared open, and matches the record kept for companies on the same
date. Method: exact-quoted-name web search per name, given plus surname, with a role
qualifier added where the bare name returned too much noise. Scale: **CLEAR** (no
notable or identifiable match), **MEDIUM** (identifiable but non-notable professional in
law, tech, or finance with a public profile), **HIGH** (notable, verifiable real person,
especially in law, tech, or finance).

Scope: every name this file seats or records. That is 73 `pe-` entries, the 8 errata
aliases, and the 7 reserved-unused names, which is 85 distinct names once the four
duplicated names are counted once each. **78 came back CLEAR or LOW with no notable
match.** The 7 below are flagged.

**Both HIGH flags were renamed on 2026-08-09; the 5 MEDIUM flags were not.** The screen
ran under a rule that renamed a flagged name only if it had zero occurrences in frozen
artifacts or datasets, since canon was unmerged and free to move. All 7 flagged names
failed that test, so the screen as first written proposed v1.1 edits and renamed
nothing. The operator overrode that for the HIGH tier on 2026-08-09: a public repository
naming two verifiable living lawyers is a publishing risk that does not wait for a
version bump, and the total cost was four strings in two files. The MEDIUM tier still
stands unrenamed and is still a human call. The occurrence counts below are the
verification that made the cost knowable.

| Name | Canon position | Flag | Frozen occurrences (grep-verified) | Real-person evidence | Disposition |
|---|---|---|---|---|---|
| Jonathan K. Sterling | was pe-001, co-001 engagement partner | **HIGH** | was 3, all in `artifacts/LGL-05/engagement-letter.md` (:56, :63, :173); **now 0 repo-wide** | "Jonathan Sterling", Shareholder at Carlton Fields (AmLaw 200, Hartford); 2026 Best Lawyers "Lawyer of the Year", Super Lawyers listed. Exact given plus surname, same profession as the canon role. | **RESOLVED 2026-08-09 (`6c35840`).** Renamed to **Jonathan K. Sedgemoor**, which screens CLEAR; DOCX rebuilt in `7be55c0`. |
| Sasha Vukovic | was errata alias of pe-208, co-123 CEO | **HIGH** | was 1, `artifacts/LGL-17/nda-negotiation-scenarios.md:118`; **now 0 repo-wide** | "Sasha Vukovic", Senior Associate, Real Estate, Dentons (Vancouver); official firm bio. Exact match, notable-tier global firm. | **RESOLVED 2026-08-09 (`6c35840`).** Replaced by pe-208 Nikhil Ravensworth (CLEAR), which is the F-3 substitution; DOCX rebuilt in `7be55c0`. |
| Tobias Lindqvist | pe-104, co-002 CISO | MEDIUM | 17 across 3 CORE-05 files | "Tobias Lindqvist", Investment Strategist, LaSalle Investment Management (London); verified staff bio. Finance sector, publicly identifiable, not notable. | COLLISION-NOTE. No rename. |
| Hannah T. Ostrowski | errata alias of pe-104, co-002 CISO | MEDIUM | 12 across 5 LGL-17 files | "Hannah Ostrowski", Client Service Associate, Morgan Stanley Wealth Management; verified LinkedIn. Finance sector, publicly identifiable, not notable. | COLLISION-NOTE. No rename. |
| Roland Pham | pe-212, VP Security and Trust, co-119 | MEDIUM | 1, `artifacts/LGL-17/vendor-risk-assessment-datapulse-analytics.md` | "Roland A.H. Pham", Boston bankruptcy and immigration attorney, principal of Pham Law PC; Avvo and LinkedIn profiles. Legal field, publicly identifiable, not notable. | COLLISION-NOTE. No rename. |
| Curtis A. Nakashima | pe-256, adverse party, LGL-10 | MEDIUM | 2, `artifacts/LGL-10/litigation-matter-personal-injury.md` | "Curtis Nakashima, CPA", active accounting practices in Honolulu and Kailua. Licensed finance-adjacent professional, publicly identifiable, not notable. | COLLISION-NOTE. No rename. |
| Priyanka Raval, M.D. | pe-259, physiatrist, LGL-10 | MEDIUM | 1, `artifacts/LGL-10/litigation-matter-personal-injury.md` | "Priyanka Raval, MD", Wellstar Health System, Augusta GA. Different specialty, but an exact full-name match to a licensed physician with a public provider profile, and canon also uses the M.D. suffix. | COLLISION-NOTE. No rename. |

Three names added to this file from committed CORE-02 data (pe-021 Jordan K. Sable,
pe-022 Marlowe O. Duskwood, pe-023 Reyna T. Pemberton) were screened on the same pass
and returned no real-person match. Note only that "Sable" appears in the names of
several real US law firms (Sable and Sable LLC; Sable Law Group). That is a firm-name
adjacency, not a person collision, and pe-021 practises at a fictional firm.

**Middle initials are a cheap de-collision lever, but a weak one here.** Adding or
changing a middle initial costs one search-and-replace and no structural change, so it
is the first thing to reach for. It does not help much in this particular set: the
real-world matches for Sterling, Lindqvist, Pham, Nakashima and Raval are all on the
given-plus-surname pair, which a middle initial does not break, and in three of those
cases canon already carries an initial the real person does not. A surname change is
what actually de-collides, which is why the rename that was applied is a surname and why
any future MEDIUM-tier decision should be a surname too.

## Ground rules

- One universe, shared canon IDs. A person named here is the same person wherever they appear: the general counsel who signs the NDA is the general counsel who owns the policy library.
- Fully synthetic. No real people, no real PII, obviously fictional names. Email domains use the IANA-reserved `.example` TLD; telephone numbers use the 555 exchange.
- **The standing real-person collision screen has been run**, on 2026-08-08, the same date companies passed that gate (record in the Trazomo repo at `docs/plans/2026-08-08-verification-canon-pm-tools.md`). Results are in the Real-person collision screen section above: 85 names screened, 78 clear, 2 HIGH and 5 MEDIUM flagged. **Both HIGH flags were renamed in frozen text on 2026-08-09, so no live publishing risk remains at that tier**; the 5 MEDIUM flags are recorded and undecided. Any name added to this file after 2026-08-08 has not been screened and must be before it ships.
- Curated named people live here. The generator-produced population (`EMP-NNNN`, `ct-co-NNN-NN`) is drawn from `datagen/src/namePool.js` and is deliberately not curated; do not promote a generated name into this file without a reason, and record the reason when you do (pe-101 and pe-106 are the only two so far).
- Canon declares; it does not retro-edit frozen artifacts. A divergence becomes an erratum row with an exact location, and a follow-up. The single exception so far is the 2026-08-09 HIGH-collision rename, taken by operator decision and recorded in "Renames applied" above; treat it as a precedent for publishing risk only, not for tidiness.
- Planted findings ship in the data; answer keys live only in private training content keyed to the data-pack version. Nothing in this file is an answer key.

## Follow-ups for next corpus version

Nothing in this section was done tonight. Each item is a change to frozen content or to
a deterministic generator, and both need a deliberate version bump.

**F-1: Seat the canonical officers in `people-roster.csv`.** CORE-04's spec says its
planted features are "backed by `canon/people.md`", but the generator free-invents from
`namePool.js` because this file did not exist. The committed roster has no CFO, General
Counsel, CISO, or Chief People Officer row, and none of the twenty co-002 named
officers appears in it. Re-point `datagen/src/generators/core-04-people-roster.js` at
this file for the leadership rows and regenerate. This intentionally breaks
byte-for-byte determinism against the committed CSV and cascades into
`datasets/legal/matter-portfolio-dashboard-dataset/*` (which carries `EMP-05NN` foreign
keys), so it must ship as one coordinated dataset bump with `datagen validate --all`
re-run. Note that the cascade is not merely mechanical: `capacity-model.csv` names an
entire generated in-house legal team (EMP-0528 Lyric Everhart, EMP-0529 Kestrel Quennell,
EMP-0530 Rhoswen Blackwood, and so on) that is disjoint from the curated in-house counsel
seats pe-111 Alcaraz, pe-112 Iyer, and pe-113 Ferrante. The legal track therefore ships
two different sets of co-002 lawyers today, which is what makes F-1 necessary rather than
merely tidy.

**F-2: Decide the CEO seat on purpose.** Tonight's precedence seats Kestrel Ashgrove,
a generic-pool draw, because tier a wins and EMP-0001 anchors the org tree. That is the
correct mechanical answer and may not be the intended creative one. If the universe
wants a curated CEO, v1.1 must rename EMP-0001 *and* correct
`artifacts/LGL-17/signing-authority-matrix.md:44` in the same change, or the conflict
simply moves.

**F-3: Redraft LGL-17 to the canonical roster.** *(1 of 7 done.)* Seven substitutions
across roughly a dozen files, then rebuild the DOCX: Prewitt→Ashgrove,
Sandoval→Osei-Bonsu, Aitken→Raghunathan, Ostrowski→Lindqvist, Muldoon→Bellcrest,
Nakagawa→Pritchard-Naidoo, ~~Vukovic→Ravensworth~~ **done 2026-08-09 (`6c35840`)**.
LGL-17 is the single artifact set that carries every losing variant, so this is one
focused edit, not a corpus sweep. The six remaining substitutions are ordinary canon
hygiene with no publishing-risk deadline, which is why only the seventh was pulled
forward. Note that Ostrowski→Lindqvist is the substitution this file flags as the one
most worth a human overrule (see the pe-104 errata row), so F-3 should not be executed
as a blind find-and-replace.

**F-4: Resolve the two homonyms.** Rename the co-001 Senior Conflicts Analyst
(pe-020) off "Priya Raghunathan" in LGL-08: 7 full-name occurrences plus 8 initialled
"P. Raghunathan" audit-trail entries, 15 in all, across the markdown and the JSON.
Then rename one side of "Renata Villalobos": either the co-101 Engagement
Director in CORE-01's six MSA variants (pe-202) or the co-001 Docketing Specialist in
LGL-10 (pe-019). LGL-10 is the cheaper edit and the docketing note initialled
"R. Villalobos" is load-bearing narrative, so prefer renaming pe-202.

**F-5: Clear the two HIGH real-person collisions. CLOSED 2026-08-09.** Both were
executed rather than deferred, on operator decision, because the repository is public
and a publishing gate does not wait for a version bump. The record is in "Renames
applied" above.

- ~~pe-001 Jonathan K. Sterling to Jonathan K. Sedgemoor.~~ **Done** (`6c35840`, DOCX in `7be55c0`). Three occurrences in `artifacts/LGL-05/engagement-letter.md` (:56, :63, :173) plus that file's DOCX. Nothing else moved: the initials JKS are load-bearing only in CORE-02, and CORE-02's JKS is pe-021 Jordan K. Sable on a different matter, so no committed dataset was touched and determinism holds.
- ~~Sasha Vukovic needs no new name.~~ **Done** (`6c35840`, DOCX in `7be55c0`) by executing the F-3 substitution to pe-208 Nikhil Ravensworth early, one line at `artifacts/LGL-17/nda-negotiation-scenarios.md:118`.

**What is left of F-5 is the MEDIUM tier**, which is still open. The 5 MEDIUM flags are
recorded as COLLISION-NOTE and left for a human call. They are identifiable but
non-notable people, the kind of match that is arguably unavoidable when inventing 85
names, and renaming them costs edits to frozen text across CORE-05 and LGL-17. Recommend
deciding them as a set rather than one at a time. Tobias Lindqvist is the expensive one
at 17 occurrences across 3 CORE-05 files, and he is also the person the pe-104 errata
row says is the most contestable seat, so a MEDIUM decision on him should be taken
together with that call rather than separately.

**F-6: Finish the v1.0.1 renames (adjacent, but it bears on person canon).** The
collision-check renames were phrase- and case-scoped and missed the uppercase forms and
the email domains, leaving two documents that contradict themselves:

- `artifacts/LGL-03/commercial-lease.md` names the landlord "Birchcroft Properties LLC" four times (lines 11, 258, 353, 364) and "ASHGROVE PROPERTIES LLC" twice (lines 5 and 300, the preamble and the signature block), and keeps "c/o Ashgrove Asset Management" at lines 11 and 259.
- `artifacts/LGL-02/mutual-nda.md`, `mutual-nda-qa-broken.md`, and `mutual-nda-unilateral.md` name the counterparty "Palisade Labs, Inc." in the preamble and notice block but sign it as "**VERANDA LABS, INC.**" (lines 159/159/161) with `corpdev@verandalabs.example` (lines 119/119/121).

This matters to people canon because "Ashgrove" is now a canonical **person** surname
(pe-101, plus sixteen generated roster rows) and must not read as a live company.
Note that `mutual-nda-qa-broken.md` is the deliberately-broken QA twin, so its
inconsistency is arguably in character; the other three are not.

**F-7: Decide the name-pool / company-name overlap.** `datagen/src/namePool.js`
`LAST_NAMES` contains `Ashgrove`, `Larkspur`, `Millgate`, and `Whitlock`, each of which
is or was a canon company name (ex-co-109, co-100 Larkspur Design & Build, co-105
Millgate Insurance Services, co-112 Whitlock Brennan LLP). The committed roster
therefore carries 16 Ashgroves, 16 Larkspurs, 15 Millgates, and 12 Whitlocks as
co-002 employees. `Ravenscroft` is likewise both a pool surname (10 roster rows) and
pe-014's surname. Either purge the four from `LAST_NAMES`, which regenerates the whole
population and every downstream dataset, or accept the overlap and say so explicitly
here, so that a learner joining on surname is not misled.

The scope is wider than surnames. `FIRST_NAMES` carries `Kestrel`, which appears as the
given name on 12 roster rows (`Kestrel Quennell`, `Kestrel Osgood`, `Kestrel Ravenscroft`
and others), and `Ashgrove` appears on 16. So pe-101's full name is unique, but neither
half of it is distinctive inside the very dataset that makes him canon: the CEO shares a
first name with 11 other employees and a surname with 15. That is worth weighing
alongside F-2, because "is Kestrel Ashgrove the CEO we want" is partly a question about
whether the name reads as a person at all or as two common pool tokens.

**F-8: co-002's jurisdiction is still undecided.** LGL-08 and LGL-12 place co-002 in
a fictional "State of Calloway"; CORE-01 and LGL-03 use Delaware. Person addresses and
signature blocks inherit whichever answer wins, which is why it is noted here.
