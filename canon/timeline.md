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
| 2025-04-01 to 2026-03-31 | The rolling twelve month attrition window the co-002 people analytics set reports over, closing on the same quarter end the finance and operations packs close on; the thirteen month end headcounts it is measured against open at 2025-03-31 | `datasets/hr/engagement-attrition-dataset` |
| 2025-08-04 | customer onboarding revamp program kickoff at co-002 | `artifacts/OPS-14` |
| 2025-10-01 to 2025-12-31 | Q4 2025, the prior board reporting period whose deck structure the current pack follows | `artifacts/FIN-30` |
| 2025-10-01 to 2026-03-31 | The People-department review period a manager's one to one log covers and the performance review draft reports on | `artifacts/HR-09` |
| 2025-10-06 to 2025-10-17 | The co-002 goal-setting window that opened the 2025-10-01 to 2026-03-31 goal period, the same half year the performance review cycle covers; the manager-approved goals it produced are the goals the self-assessments at that period's close respond to | `datasets/hr/goals-self-assessment-records` |
| 2025-11-14 to 2026-03-31 | FIN-04 AR aging document dates; the oldest open invoice is the 90+ bucket floor | `datasets/finance/ar-aging-export` |
| 2026-01-05 to 2026-03-26 | FIN-06 purchase orders raised; goods and services received through 2026-03-31 | `datasets/finance/purchase-orders`, `datasets/finance/open-pos` |
| 2026-01-06 to 2026-03-31 | co-100's small office refresh for co-002 runs from inquiry to closeout: proposal approved 2026-01-27, contract signed 2026-02-03, delivery 2026-02-10 to 2026-03-24, four mock draws settled inside terms, record closed 2026-03-31. This is a Larkspur-side client record about co-002 and no co-002 artifact carries the other side | `datasets/smb/client-record-co002-office-refresh` |
| 2026-01-07 | Prior quarterly review of the finance system access list; the next review is a close task | `datasets/finance/user-access-role-assignments` |
| 2026-01-12 | CORE-01 MSA Effective Date, the date the agreement is entered into (co-002 with co-101) | artifacts/CORE-01 |
| 2026-01-12 to 2026-03-20 | co-002 role requisitions raised across the quarter and stated open at 2026-04-03; the interview loops on one of them run inside 2026-03-09 to 2026-03-20, within the same window | `artifacts/HR-01`, `artifacts/HR-03` |
| 2026-01-12 to 2026-01-18 | co-100 inbound inquiry queue for the week: 14 inquiries across four channels, untriaged, two of them received on the weekend | `datasets/smb/inbound-inquiry-queue` |
| 2026-01-12 to 2026-03-27 | The co-131 Okafor kitchen and primary bath renovation, from the inquiry that opens the queue to closeout: proposal approved 2026-02-02, contract signed 2026-02-09, delivery 2026-02-16 to 2026-03-27, four mock draws on a 20 / 30 / 30 / 20 schedule all settled. The client record's proposal stage still reads pending while the payment log carries the settled deposit the contract issued | `datasets/smb/client-record-okafor` |
| 2026-01-15 to 2026-03-30 | FIN-20 regulatory and policy updates published; effective dates run 2026-04-01 to 2027-01-01 | `datasets/finance/regulatory-updates-feed` |
| 2026-01-19 to 2026-02-20 | customer onboarding revamp pilot cohort runs | `artifacts/OPS-14` |
| 2026-02-01 | CORE-01 Subscription Start Date; the initial subscription term runs twelve months to 2027-01-31 | artifacts/CORE-01 |
| 2026-02-01 | co-101 CORE-01 subscription invoiced in advance, $450,000, service 2026-02-01 to 2027-01-31, amortized $37,500 a month from February | `artifacts/CORE-01` section 5.2, `datasets/finance/vendor-bills` |
| 2026-02-01 to 2026-02-28 | The prior close period whose disclosure footnotes are the drafting exemplar for March | `artifacts/FIN-28` |
| 2026-02-01 to 2026-03-31 | co-100 issues 19 invoices across six jobs and six clients, 8 of them the already-recorded co-131 and co-002 draws and 11 new, on `net_7`, `net_15` and `net_30` terms. Two invoices are being settled under installment plans, one installment each settled by quarter end. One invoice's own status on the invoicing surface reads paid while the mock payment log carries no settled payment for it | `datasets/smb/invoices-issued`, `datasets/smb/payment-status-mock` |
| 2026-02-02 | co-100's proposal for the co-131 Okafor kitchen and primary bath renovation is approved: 12 line items priced against a 12 row rate basis, totalling $148,500.00 on a 20 / 30 / 30 / 20 draw schedule at net_7 terms. One line is priced at a materials rate whose effective window closed 2025-12-31 | `artifacts/SMB-06` |
| 2026-02-02 to 2026-04-03 | Collections contacts on the aged receivables, including one promise to pay and one dispute raised | `datasets/finance/collections-contact-log` |
| 2026-02-02 to 2026-03-31 | co-100 job costing for the quarter: 696 hours and $58,510.00 of external cost on the co-131 renovation, which is the only one of the six jobs carrying no open change order, and 67 time entries and 34 expense rows across all six. One expense coded to a job is a personal purchase that belongs to no job | `datasets/smb/time-entries-mock`, `datasets/smb/job-expenses-mock` |
| 2026-02-09 to 2026-02-16 | Onboarding for the Okafor renovation: the welcome pack and intake questionnaire issue on signature, the intake comes back with 18 answers, and the kickoff walkthrough runs 2026-02-16 | `datasets/smb/intake-questionnaire`, `datasets/smb/kickoff-checklist`, `datasets/smb/client-next-steps-checklist` |
| 2026-02-15 to 2026-03-14 | CORE-02 outside-counsel billing period; invoice dated 2026-03-20, in the finance inbound queue as pending_classification | datasets/core/outside-counsel-invoice/invoice.json |
| 2026-02-16 to 2026-03-27 | Delivery of the Okafor renovation against a six milestone schedule: kickoff 2026-02-16, demolition complete 2026-02-27 against a planned 2026-02-20, rough in complete 2026-03-13, cabinetry complete 2026-03-18, substantial completion 2026-03-20, punch list and closeout planned 2026-03-27 and still open. 18 delivery tasks and 16 project documents are indexed against those milestones | `datasets/smb/milestone-schedule`, `datasets/smb/project-tasks-and-dates`, `datasets/smb/project-documents-index` (2b) |
| 2026-02-16 to 2026-03-26 | support tooling consolidation program tracked in Planner by the delivery team and in Smartsheet by the PMO; both exports and the directory captured 2026-03-26 | `datasets/operations/work-management-export-planner-smartsheet` |
| 2026-02-18 to 2026-03-26 | developer documentation relaunch tracked in a Notion data source and an Asana project by the developer relations team; both exports captured 2026-03-26 | `datasets/operations/work-management-platform-export` |
| 2026-03-01 to 2026-03-31 | FIN-01 statement period; FIN-02 posting period; FIN-03 checks issued and outstanding at period end | datasets/finance |
| 2026-03-01 to 2026-03-31 | FIN-07 vendor invoices received into the AP queue; FIN-11 bills posted | `datasets/finance` |
| 2026-03-02 to 2026-03-31 | Employee expenses incurred; reports submitted through 2026-04-03 and unposted at the close | `datasets/finance/expense-reports` |
| 2026-03-02 to 2026-03-27 | RAID items for the reporting migration raised and reviewed on per-item cadences; log as of 2026-03-27 | `datasets/operations/raid-log-seed` |
| 2026-03-02 to 2026-03-27 | stakeholder register for the customer portal relaunch maintained; register as of 2026-03-27 | `datasets/operations/stakeholder-register-seed` |
| 2026-03-03 | invite for the 2026-03-10 cross-functional delivery sync issued with the consent notice in its body; instantiating the recorded-meeting invite and consent notice templates, issued beside the AI notetaker vendor evaluation checklist | `datasets/operations/meeting-consent-notice-and-invite-templates` |
| 2026-03-04 to 2026-04-02 | Applications to one open co-002 operations requisition received across the window and screened on a rolling basis; two candidates advanced into the interview loop already dated inside it, and the batch shortlist decision for the candidates still pending falls due at the end of the window and is not recorded | `artifacts/HR-02`, `artifacts/HR-04` |
| 2026-03-10 | co-002 cross-functional delivery sync, recorded under the AI-notetaker consent banner; the OPS-01 transcript | `artifacts/OPS-01` |
| 2026-03-11 to 2026-03-13 | follow-up email thread on the sync's decisions, one attribution disputed | `artifacts/OPS-03B` |
| 2026-03-13, 2026-03-27 | co-002 payroll funding transfers (operating to payroll account) | FIN-01/FIN-02 |
| 2026-03-13, 2026-03-27 | biweekly Operations team retros; the earlier one is the prior-retro summary OPS-02 embeds, the later is the OPS-02 transcript | `artifacts/OPS-02` |
| 2026-03-16 to 2026-03-31 | operations intake queue receives 18 requests across four channels, untriaged | `datasets/operations/intake-request-batch` |
| 2026-03-16 and 2026-03-30 | The client-facing status update for the Okafor renovation is issued 2026-03-16, inside the delivery window; the studio's internal notes on the same job are written as of 2026-03-30 (the client record's own as-of date is 2026-03-31) | `artifacts/SMB-14`, `artifacts/SMB-15` (2b) |
| 2026-03-18 | co-002 project brief for the contract operations platform rollout, planning co-002's own side of the Copperline implementation | `artifacts/OPS-03` |
| 2026-03-18 to 2026-03-24 | customer portal relaunch team chat window; the work-item graph exported 2026-03-24 | `datasets/operations/work-item-graph-with-hidden-link` |
| 2026-03-19 to 2026-03-31 | cross-functional handoffs logged on the contract operations platform rollout, between co-002 teams and Copperline Software | `datasets/operations/cross-functional-handoff-log` |
| 2026-03-20 | region go-live sign-off SOP effective; the written escalation path for stuck onboarding customers takes effect with it | `artifacts/OPS-10` |
| 2026-03-23 | first customer onboarding cohort begins | `artifacts/OPS-14` |
| 2026-03-23 to 2026-03-27 | weekly status inputs for the integrations marketplace launch collected from four workstream leads; board snapshot as of 2026-03-27 | `datasets/operations/weekly-status-inputs-with-conflicting-claim` |
| 2026-03-23 to 2026-04-02 | The self-assessment window for that goal period, opening on the review cycle's own open date and closing the day before the 2026-04-03 as-of; every self-assessment in scope is submitted inside it | `datasets/hr/goals-self-assessment-records` |
| 2026-03-23 to 2026-04-06 | Inbound finance requests received into the intake queue, untriaged | `datasets/finance/inbound-requests-queue` |
| 2026-03-23 to 2026-04-24 | The co-002 performance review cycle covering the 2025-10-01 to 2026-03-31 review period for the People and IT & Security departments; per reviewer feedback due dates straddle the 2026-04-03 as-of and the cycle closes on the last Friday of April | `datasets/hr/review-cycle-roster` |
| 2026-03-24 | annual insurance premium invoiced by co-105 and posted as a prepaid, policy period 2026-04-01 to 2027-03-31 | `datasets/finance/vendor-bills` |
| 2026-03-25 | work-tracker backlog export for the reporting migration delivery program | `datasets/operations/backlog-export-with-quality-gaps` |
| 2026-03-27 to 2026-04-10 | Notice period and last working day of one co-002 employee exit; the offboarding tracker and its access inventory are live at 2026-04-03 with the exit five business days out | `datasets/hr/offboarding-checklist-access-inventory` |
| 2026-03-31 | FIN-04 aging as-of date; FIN-05 pre-close trial balance; FIN-09 close batch posting date; FIN-10 open-PO cut-off | `datasets/finance` |
| 2026-03-31 | Materiality thresholds for the 2026 plan year applied to the March variance pack; four lines over threshold and three over the flux threshold | `datasets/finance/materiality-thresholds`, `datasets/finance/actuals-vs-budget` |
| 2026-03-31 | platform delivery portfolio rollup compiled by the PMO across five projects | `datasets/operations/portfolio-status-rollup` |
| 2026-03-31 | Q1 2026 company OKR rollup compiled with raw metric detail | `datasets/operations/okr-metrics-rollup-with-contradiction` |
| 2026-03-31 | program knowledge corpus assembled as of quarter end | `artifacts/OPS-14` |
| 2026-03-31 | As-of date for both co-100 client records; punch items on the Okafor project are open at that date and the co-002 record is closed | `datasets/smb/client-record-okafor`, `datasets/smb/client-record-co002-office-refresh` |
| 2026-03-31 | Aging as of quarter end across the four co-100 clients carrying an open balance: one client is past the studio's first reminder step with no promise to pay on record, one is on an installment plan whose next payment is not due until 2026-04-10, and two carry a promise to pay dated in early April. Every bucket and every reminder stage is derived from the invoice due dates and the as-of date | `datasets/smb/aging-summary` |
| 2026-03-31 | Margin snapshot on six co-100 jobs against a 15.00 percent floor and a $5,000.00 change-order materiality threshold. One job clears the floor on its contract-scope margin and falls below it once an open unbilled change order above the threshold is included; one job is billed ahead of the work performed | `datasets/smb/job-progress` |
| 2026-04-01 | the FIN-01 deposit in transit posts at the bank | FIN-01 spec |
| 2026-04-01 to 2026-04-07 | March close; the window inside which the FIN-09 batch is approved | this file, `datasets/finance/journal-entries-batch` |
| 2026-04-01, 04-02, 04-03, 04-06, 04-07 | Close days D+1 to D+5 as business days after period end; 2026-04-04 and 2026-04-05 are a weekend and are skipped | `datasets/finance/close-checklist` |
| 2026-04-02 | FIN-08 proposed payment run `PR-2026-04-02`, pending approval, unreleased | `datasets/finance/payment-run` |
| 2026-04-01 to 2026-04-30 | FIN-40 quiet period: the Q1 2026 draft figures stay unreleased until the results announcement | `artifacts/FIN-40` |
| 2026-04-06 to 2026-04-24 | Second round interview panel scheduling window on the open co-002 operations requisition; the panel seats are the three interviewers the March loop used, and the window closes on the last business day before the requisition's own target start date | datasets/hr/interviewer-calendars |
| 2026-04-06 | Close status as-of (D+4) for the checklist, the control matrix, the access list and the intake queue | `datasets/finance` |
| 2026-04-06 | Variance pack produced at D+4; `variance_explanation` is blank on every line, because the pack is the input CLS-17 consumes rather than its output, and the checklist file still carries CLS-17 as not started | `datasets/finance/actuals-vs-budget`, `datasets/finance/close-checklist` |
| 2026-04-06 | Q1 2026 metrics pack approved for board use off the pre-close trial balance CLS-16 produces; the two headline figures are the ones the FIN-40 excerpt already carries in rounded form | `datasets/finance/approved-metrics-pack`, `artifacts/FIN-40` |
| 2026-04-06 | Start date of the one co-002 new hire the onboarding pack is instantiated for; the requisition's own frozen target start date, and the first business day after the snapshot boundary the CORE-04 roster closes at | `datasets/hr/onboarding-checklist-templates` |
| 2026-04-07 | Finance system access review (CLS-21) due at D+5 and not yet performed | `datasets/finance/close-checklist`, `datasets/finance/user-access-role-assignments` |
| 2026-04-07 | Evidence binder assembled at D+5 (CLS-22); binder references EVB-2026Q1-001 upward span the tested controls and the completed close tasks | `datasets/finance/audit-evidence-index` |
| 2026-04-21 | Board meeting at which the FIN-40 Q1 2026 board pack is presented | `artifacts/FIN-40` |
| 2026-04-30 | Q1 2026 results announcement to investors and employees; the FIN-40 excerpt stops being material non-public information | `artifacts/FIN-40` |
| 2026-05-15 | The co-002 compensation review cycle date, at which the current bands are re-cut for the next plan year; it sits after the 2026-04-03 as-of because the pay equity report the bands support is an input to that decision rather than a justification written after it | `datasets/hr/compensation-band-dataset` |
