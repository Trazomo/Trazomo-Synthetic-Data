# Changelog

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
