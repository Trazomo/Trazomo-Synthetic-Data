# Canon Timeline

Status: proposed in PR #7 (D1, 2026-08-15); becomes canon when PR #7 merges (the
merge is the approval; the anchors marked "(proposal)" below are what is being
approved). Once it is canon, later finance artifacts (AR aging, PO matching,
accruals, flux) use the same anchor period unless their spec says otherwise.

## Anchors derived from the dated CORE artifacts on tag v1.0.2

| Anchor | Value | Derived from |
|---|---|---|
| Universe "now" | first week of April 2026 | CORE-01 MSA Effective Date 2026-01-12, Subscription Start Date 2026-02-01 (initial subscription term to 2027-01-31); CORE-02 invoice INV-ADLLP-100142 dated 2026-03-20 for the 2026-02-15 to 2026-03-14 billing period; CORE-03 CRM activity concentrated in 2026-03 |
| co-002 fiscal year | calendar year (proposal; nothing in canon contradicts it) | consolidation and finance plans are silent |
| Finance anchor period | March 2026: statement 2026-03-01 to 2026-03-31; close 2026-04-01 to 2026-04-07 | the artifacts above |
| Book and bank opening balance for March | agree; the February 2026 reconciliation closed with no carry-forward items (proposal) | needed so FIN-01/FIN-02 tie out from one opening figure |
| March close roles | preparer EMP-0486 (Staff Accountant), reviewer EMP-0473 (Controller), CORE-04 roster | design Section 2.4; neither is the roster's SoD-conflict row |

`datagen/src/dates.js#ANCHOR_DATE` (2026-03-16) is the seed clock for the CORE-03,
CORE-04, LGL-07, LGL-21 and LGL-22 generators, not the universe "now". Do not bump
it for D1: bumping rerolls the bytes of all five.

## Dated events

| Date | Event | Source |
|---|---|---|
| 2024-04-30 to 2026-03-31 | The 24 month-end reporting periods the FP&A trend covers; January and February 2026 sum to the FIN-05 profit-and-loss beginning balances and March 2026 equals its period movement | `datasets/finance/actuals-24mo`, `datasets/finance/kpi-source-data`, `datasets/finance/bank-balances` |
| 2025-10-01 to 2025-12-31 | Q4 2025, the prior board reporting period whose deck structure the current pack follows | `artifacts/FIN-30` |
| 2025-11-14 to 2026-03-31 | FIN-04 AR aging document dates; the oldest open invoice is the 90+ bucket floor | `datasets/finance/ar-aging-export` |
| 2026-01-05 to 2026-03-26 | FIN-06 purchase orders raised; goods and services received through 2026-03-31 | `datasets/finance/purchase-orders`, `datasets/finance/open-pos` |
| 2026-01-07 | Prior quarterly review of the finance system access list; the next review is a close task | `datasets/finance/user-access-role-assignments` |
| 2026-01-12 | CORE-01 MSA Effective Date, the date the agreement is entered into (co-002 with co-101) | artifacts/CORE-01 |
| 2026-01-15 to 2026-03-30 | FIN-20 regulatory and policy updates published; effective dates run 2026-04-01 to 2027-01-01 | `datasets/finance/regulatory-updates-feed` |
| 2026-02-01 | CORE-01 Subscription Start Date; the initial subscription term runs twelve months to 2027-01-31 | artifacts/CORE-01 |
| 2026-02-01 | co-101 CORE-01 subscription invoiced in advance, $450,000, service 2026-02-01 to 2027-01-31, amortized $37,500 a month from February | `artifacts/CORE-01` section 5.2, `datasets/finance/vendor-bills` |
| 2026-02-01 to 2026-02-28 | The prior close period whose disclosure footnotes are the drafting exemplar for March | `artifacts/FIN-28` |
| 2026-02-02 to 2026-04-03 | Collections contacts on the aged receivables, including one promise to pay and one dispute raised | `datasets/finance/collections-contact-log` |
| 2026-02-15 to 2026-03-14 | CORE-02 outside-counsel billing period; invoice dated 2026-03-20, in the finance inbound queue as pending_classification | datasets/core/outside-counsel-invoice/invoice.json |
| 2026-03-01 to 2026-03-31 | FIN-01 statement period; FIN-02 posting period; FIN-03 checks issued and outstanding at period end | datasets/finance |
| 2026-03-01 to 2026-03-31 | FIN-07 vendor invoices received into the AP queue; FIN-11 bills posted | `datasets/finance` |
| 2026-03-02 to 2026-03-31 | Employee expenses incurred; reports submitted through 2026-04-03 and unposted at the close | `datasets/finance/expense-reports` |
| 2026-03-10 | co-002 cross-functional delivery sync, recorded under the AI-notetaker consent banner; the OPS-01 transcript | `artifacts/OPS-01` |
| 2026-03-11 to 2026-03-13 | follow-up email thread on the sync's decisions, one attribution disputed | `artifacts/OPS-03B` |
| 2026-03-13, 2026-03-27 | co-002 payroll funding transfers (operating to payroll account) | FIN-01/FIN-02 |
| 2026-03-13, 2026-03-27 | biweekly Operations team retros; the earlier one is the prior-retro summary OPS-02 embeds, the later is the OPS-02 transcript | `artifacts/OPS-02` |
| 2026-03-23 to 2026-04-06 | Inbound finance requests received into the intake queue, untriaged | `datasets/finance/inbound-requests-queue` |
| 2026-03-24 | annual insurance premium invoiced by co-105 and posted as a prepaid, policy period 2026-04-01 to 2027-03-31 | `datasets/finance/vendor-bills` |
| 2026-03-31 | FIN-04 aging as-of date; FIN-05 pre-close trial balance; FIN-09 close batch posting date; FIN-10 open-PO cut-off | `datasets/finance` |
| 2026-03-31 | Materiality thresholds for the 2026 plan year applied to the March variance pack; four lines over threshold and three over the flux threshold | `datasets/finance/materiality-thresholds`, `datasets/finance/actuals-vs-budget` |
| 2026-04-01 | the FIN-01 deposit in transit posts at the bank | FIN-01 spec |
| 2026-04-01 to 2026-04-07 | March close; the window inside which the FIN-09 batch is approved | this file, `datasets/finance/journal-entries-batch` |
| 2026-04-01, 04-02, 04-03, 04-06, 04-07 | Close days D+1 to D+5 as business days after period end; 2026-04-04 and 2026-04-05 are a weekend and are skipped | `datasets/finance/close-checklist` |
| 2026-04-02 | FIN-08 proposed payment run `PR-2026-04-02`, pending approval, unreleased | `datasets/finance/payment-run` |
| 2026-04-01 to 2026-04-30 | FIN-40 quiet period: the Q1 2026 draft figures stay unreleased until the results announcement | `artifacts/FIN-40` |
| 2026-04-06 | Close status as-of (D+4) for the checklist, the control matrix, the access list and the intake queue | `datasets/finance` |
| 2026-04-06 | Variance pack produced at D+4; `variance_explanation` is blank on every line, because the pack is the input CLS-17 consumes rather than its output, and the checklist file still carries CLS-17 as not started | `datasets/finance/actuals-vs-budget`, `datasets/finance/close-checklist` |
| 2026-04-06 | Q1 2026 metrics pack approved for board use off the pre-close trial balance CLS-16 produces; the two headline figures are the ones the FIN-40 excerpt already carries in rounded form | `datasets/finance/approved-metrics-pack`, `artifacts/FIN-40` |
| 2026-04-07 | Finance system access review (CLS-21) due at D+5 and not yet performed | `datasets/finance/close-checklist`, `datasets/finance/user-access-role-assignments` |
| 2026-04-07 | Evidence binder assembled at D+5 (CLS-22); binder references EVB-2026Q1-001 upward span the tested controls and the completed close tasks | `datasets/finance/audit-evidence-index` |
| 2026-04-21 | Board meeting at which the FIN-40 Q1 2026 board pack is presented | `artifacts/FIN-40` |
| 2026-04-30 | Q1 2026 results announcement to investors and employees; the FIN-40 excerpt stops being material non-public information | `artifacts/FIN-40` |
