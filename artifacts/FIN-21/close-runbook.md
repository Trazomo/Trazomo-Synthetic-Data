# Month-End Close Runbook

## Document Control

| Field | Value |
|---|---|
| Document ID | ADI-FIN-003 |
| Version | 1.0 |
| Status | Active |
| Owner | Controller |
| Approver | VP, Finance |
| Effective Date | 2026-01-05 |
| Last Reviewed | 2026-01-05 |
| Next Review Due | 2027-01-05 |
| Supersedes | None |
| Superseded By | None |

## 1. Purpose

This runbook is the procedure for the month-end close at Atticus Dundee Inc. It
states when the close runs, who owns each task, who reviews it, what has to
finish before it can start, and what evidence it has to leave behind.

It is the procedure. It is not the checklist for any one close. The checklist
template carries the same 24 tasks in the same order as a reusable schema, and
the checklist for a given period carries them with dates, an owner and a status
per row. All three come from one spine: this document names the tasks by
identifier so that a reader can hold the runbook and the checklist side by side
and see the same close.

## 2. Scope

This runbook covers every period-end close of the Company's general ledger. It
applies to every role named in it, and it applies without regard to who holds
the role in any given period. No individual is named anywhere in this document.
Owners, reviewers and the escalation path are named by role title only, so a
change of holder is a change to the roster and not an amendment to this
procedure.

Figures are out of scope here on purpose. This runbook states no amount and no
balance. The close produces figures, the checklist for the period records them,
and the close memo reports them.

## 3. The close day rule

A close day is a business day of the close, counted from the first business day
after period end, with weekends skipped: D+1 is 2026-04-01 and D+5 is
2026-04-07, so D+4 is Monday 2026-04-06 because the weekend is skipped.

Two consequences follow, and both are worth stating because both are missed:

1. A close day is never computed by adding calendar days to period end. Adding
   calendar days would put D+4 on the Saturday, which is not a close day at
   all.
2. The template carries the relative day, D+1 through D+5. Only the checklist
   for a given period carries the dated deadline. If a dated deadline and a
   relative day disagree, the relative day is the rule and the date is the
   error.

A close that runs long does not renumber its days. A task still late at D+5 is
an open item carried into the next close by the last task in this runbook, and
it keeps the close day it was scheduled for.

## 4. Roles

| Role title | Standing in the close |
|---|---|
| Staff Accountant | Owns the reconciliation, accrual and reporting preparation tasks |
| AP Clerk | Owns the payables tasks |
| AR Clerk | Owns the receivables tasks |
| FP&A Analyst | Owns the revenue roll forward and the variance explanation |
| Finance Manager | Reviews subledger and payroll work, owns the control tasks |
| Controller | Reviews the reconciliation, accrual and reporting work, owns the close memo, approves the close |
| Director, Finance | Reviews the close memo and the access review |
| VP, Finance | Reviews the approval and the period lock, and approves this procedure |

No task is owned and reviewed by the same role. That is a property of the task
list below rather than a convention applied afterwards: a close where one role
both prepares and approves an entry is a close with a control exception in it,
and one of the tasks below exists to catch exactly that.

## 5. The close task list

The 24 tasks below are the close, in the order the close takes them. Each task
carries its identifier, its owner role, its reviewer role, the task it depends
on, and the evidence it has to produce. A task with no dependency can start as
soon as its close day opens. A task with a dependency cannot start until the
task it names is finished, whatever the calendar says.

This list is the same spine as the checklist template. It is imported from the
template rather than retyped, so the runbook and the template cannot drift: if
a task changes in the template, it changes here.

### Close day D+1

| Task | What it is | Owner role | Reviewer role | Depends on | Evidence it must produce |
|---|---|---|---|---|---|
| CLS-01 | Import the final bank statement for the period | Staff Accountant | Controller | none | bank statement export for every account |
| CLS-02 | Close the payables subledger to new postings | AP Clerk | Finance Manager | none | subledger close confirmation |
| CLS-03 | Close the receivables subledger to new postings | AR Clerk | Finance Manager | none | subledger close confirmation |
| CLS-04 | Reconcile the operating account to the cash ledger | Staff Accountant | Controller | CLS-01 | reconciliation working paper showing the adjusted balances |
| CLS-05 | List the checks issued and not cleared at period end | Staff Accountant | Controller | CLS-04 | outstanding check listing agreed to the ledger |

### Close day D+2

| Task | What it is | Owner role | Reviewer role | Depends on | Evidence it must produce |
|---|---|---|---|---|---|
| CLS-06 | Age the open receivables and agree the total to the control account | AR Clerk | Finance Manager | CLS-03 | aging report with the control account tie |
| CLS-07 | Review credit memos issued and cash received but not applied | AR Clerk | Controller | CLS-06 | credit memo and unapplied cash listing |
| CLS-08 | Match invoices received to their orders and receipts | AP Clerk | Finance Manager | CLS-02 | three way match exception report |
| CLS-09 | Agree the payables subledger to the control account | AP Clerk | Controller | CLS-08 | payables tie out working paper |
| CLS-10 | Reconcile payroll funding to the payroll register | Staff Accountant | Finance Manager | CLS-04 | payroll register reconciliation |

### Close day D+3

| Task | What it is | Owner role | Reviewer role | Depends on | Evidence it must produce |
|---|---|---|---|---|---|
| CLS-11 | Accrue for goods and services received and not yet invoiced | Staff Accountant | Controller | CLS-08 | accrual roll forward schedule |
| CLS-12 | Update the prepaid amortization schedules | Staff Accountant | Finance Manager | none | prepaid schedule with the monthly amortization |
| CLS-13 | Accrue unpaid wages, bonus and commission | Staff Accountant | Controller | CLS-10 | payroll accrual schedule |
| CLS-14 | Recognize subscription revenue and roll the deferred balance | FP&A Analyst | Controller | CLS-06 | deferred revenue roll forward |
| CLS-15 | Post the close journal batch | Staff Accountant | Controller | CLS-11 | journal batch with support attached to every entry |

### Close day D+4

| Task | What it is | Owner role | Reviewer role | Depends on | Evidence it must produce |
|---|---|---|---|---|---|
| CLS-16 | Produce the pre-close trial balance | Staff Accountant | Controller | CLS-15 | trial balance with debits equal to credits |
| CLS-17 | Explain every variance above the reporting threshold | FP&A Analyst | Finance Manager | CLS-16 | budget versus actual with a written explanation per line |
| CLS-18 | Confirm no person both prepared and approved an entry | Finance Manager | Controller | CLS-15 | segregation of duties exception report |
| CLS-19 | Confirm every entry in the batch carries supporting evidence | Finance Manager | Controller | CLS-15 | evidence index by entry |
| CLS-20 | Draft the close memo with the period result | Controller | Director, Finance | CLS-17 | close memo draft, figures cited to their source |

### Close day D+5

| Task | What it is | Owner role | Reviewer role | Depends on | Evidence it must produce |
|---|---|---|---|---|---|
| CLS-21 | Review the finance system access list against current roles | Finance Manager | Director, Finance | none | access review with a sign off per exception |
| CLS-22 | Assemble the evidence binder for the period | Staff Accountant | Controller | CLS-20 | evidence binder index, one folder per reconciliation |
| CLS-23 | Approve the close and lock the period | Controller | VP, Finance | CLS-22 | period lock confirmation |
| CLS-24 | Log the open items carried into the next close | Finance Manager | Controller | CLS-23 | open item log with an owner and a due date |

## 6. What a close task's evidence must show

Every task above produces evidence, and the evidence is what makes the close
reviewable after the fact. A working paper that a reviewer cannot follow is not
evidence, it is a note. Evidence for a close task has to show all of the
following.

1. **What it supports.** The identifier of the close task it is evidence for,
   or of the control it tests. Evidence that names neither is evidence for
   nothing.
2. **Which period it covers.** The period, stated once and at the top. Evidence
   with no period cannot be filed and cannot be reused.
3. **What it is.** A title that names the work, not the file it arrived in.
4. **What it was built from.** The source it cites: the system export, the
   statement, the schedule or the policy document it was prepared against, and
   the reference within that source where the source has one. A source cited
   whole, rather than at a section or a line inside it, carries no further
   reference and needs none. A figure with no source at all is the finding the
   close exists to prevent.
5. **Who prepared it and who reviewed it.** Two roles, and never the same
   holder for both on one item.
6. **When it was prepared.** The date the preparer finished it, not the date it
   was filed.
7. **Where it is filed.** The binder reference and the storage location, so the
   evidence can be found by someone who was not in the close.
8. **How long it is kept.** The retention class the evidence falls into.

Evidence is filed as the task completes, not assembled at the end. The binder
task at D+5 indexes what is already filed; it is not the task that creates it.

## 7. Escalation

Escalation runs by role title, one step at a time, and it runs early. A task
raised on the day it slips is a scheduling problem. The same task raised at the
lock is a close problem.

1. The task owner raises it to the reviewer named for that task.
2. The reviewer raises it to the Finance Manager, or to the Controller where
   the Finance Manager is the reviewer.
3. The Controller raises it to the Director, Finance.
4. The Director, Finance raises it to the VP, Finance.
5. The VP, Finance decides whether the close proceeds, and records the decision
   with the close memo.

Three situations skip the ladder and go to the Controller immediately: a
reconciliation that does not reconcile and cannot be explained, an entry whose
preparer and approver are the same holder, and any request to post after the
period is locked.

## 8. Approval and lock

The close is approved by the Controller and the approval is reviewed by the
VP, Finance. The period is locked at approval. After the lock, a correction is
a new entry in the next period and never an edit inside the locked one.

Open items are logged as the last task of the close, each with an owner role
and a due date, and each is carried into the next close as an input rather than
as a memory.

## 9. Review of this procedure

This runbook is reviewed on the cycle stated in the document control block, and
whenever the task list in the checklist template changes. A change to the task
list is a change to this document, because they are one spine.
