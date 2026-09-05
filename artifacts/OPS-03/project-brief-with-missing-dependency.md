# Project brief

- Organization: Atticus Dundee Inc.
- Program: the contract operations platform rollout
- Date: 2026-03-18
- Author: Halcyon Bellcrest (Program Manager)
- Sponsor: Oleander Underhill (VP, Operations)
- Status: approved for planning

## Background

Atticus Dundee Inc. licenses a contract operations platform from Copperline Software, Inc. under the master services agreement dated January 12, 2026. The vendor runs the implementation on its own phase plan and reports against it. This brief covers our side of the same work: the decisions we owe, the data we clean, the people we put on it, and the order we intend to work in.

The processes moving onto the platform are contract intake and triage, obligation extraction and tracking, renewal and notice-period tracking, approval routing, and executive reporting. That list is the scope the agreement describes and the scope this program delivers. Nothing outside it is being configured under this plan.

Today those processes run on shared mailboxes, a folder tree and a set of spreadsheets that disagree with each other. The cost of that is not a figure anyone has ever produced. It is the renewals we notice late and the approvals nobody can reconstruct afterwards.

## Objectives and scope

Objectives:

- Put contract intake and triage into one queue with one owner per request, so a request is either assigned or visibly unassigned.
- Hold obligations and renewal dates in one place, so a notice period is never missed because the record sat in a folder nobody reads.
- Route approvals by rule rather than by memory, and leave a record of who approved what and when.
- Give the executive team a reporting view they can read without asking anyone to assemble it by hand.

In scope:

- Configuration of the licensed modules for the processes named above.
- Cleanup and field mapping of the legacy contract repository, and the migration itself at cutover.
- Written business rules for approval routing and obligation tracking.
- Acceptance testing by our own people.
- Cutover and the first weeks of live running.

Out of scope:

- Any change to the commercial terms of the agreement.
- Work that sits on the vendor's side of its phase plan.
- Contract templates and clause libraries, which stay with the legal team.
- Anything outside the processes named above.

## Milestones

| id | milestone | target date | stated predecessors |
|---|---|---|---|
| M1 | Current-state process map and pain-point inventory signed off | 2026-03-27 | the process owners named in the team section |
| M2 | Legacy contract repository cleaned and mapped to the target fields | 2026-04-17 | M1; the repository extract and the agreed field mapping we already hold |
| M3 | Approval routing and obligation tracking rules agreed and written down | 2026-04-24 | M1; the decision turnaround stated in the dependencies |
| M4 | Acceptance test scripts drafted and named testers confirmed | 2026-05-15 | M3; the testers the process owners name |
| M5 | Production configuration and cutover readiness work begins | 2026-06-05 | M2; M3; M4 |
| M6 | Cutover rehearsal run and go-live readiness review held | 2026-07-10 | M5 |

Dates are targets rather than promises made to anyone outside this program. A slip on one row moves the rows beneath it unless the sponsor says otherwise in writing.

## Team and stakeholders

- Oleander Underhill (VP, Operations), sponsor. Owns the go or no go at each milestone and the escalation path.
- Halcyon Bellcrest (Program Manager), program manager. Owns this plan, the weekly status and the log of open decisions.
- Isolde Greywick (Director, Operations), process owner for contract intake, triage and approval routing.
- Aldous Holloway (Contracts Manager), process owner for obligation and renewal tracking, and our reader of record on the agreement.
- Gideon Dunmore (IT & Security Manager), owner of environment access, identity and the joiners and leavers list.
- Renata Villalobos (Engagement Director), the vendor's engagement director and our single point of contact on that side.

## Assumptions and dependencies

Assumptions:

- The processes named in scope do not change while the configuration work is under way. A process that changes after its rules are agreed is a change to this plan, not a detail.
- The extract of the legacy contract repository we already hold is the file we clean and migrate. No further export is needed from anyone.
- The field mapping agreed at the design workshops is settled and is what M2 maps to. Reopening it is a change to this plan.
- Acceptance test scripts are written against the agreed business rules rather than against a running system, so M4 waits on no environment.
- A change order for additional training services is with the vendor for signature. Build the plan on the basis that it is executed, lock its dates in, and hold no task for the signature.

Dependencies we owe:

- Named testers. The process owners give us the names of the acceptance testers by 2026-05-15. Nothing earlier in the plan asks for them.
- Decision turnaround. Open design questions come back answered within five working days of being asked. Slower than that and M3 moves.
- Environment access. Our team's access to the test environment is in place today and stays in place for the life of this plan. If it lapses, M2 and M4 slip day for day.

## Risks and communication cadence

Risks:

- The legacy repository is dirtier than the sample suggested and cleanup runs past M2. Mitigation: the process owners review a sample of the mapped records before M2 closes, and we re-plan there rather than at cutover.
- The people we need for acceptance testing are the people who run the current process by hand. Mitigation: testers are agreed with their own managers at M4 rather than assumed.
- Approval routing rules turn out to differ by region. Mitigation: the rules are written down at M3, and a regional exception is recorded there rather than configured quietly.
- This plan and the vendor's phase plan drift apart. Mitigation: the sponsor and the vendor's engagement director hold a standing schedule review, and this brief is amended rather than annotated.

Communication cadence:

- Weekly written status from the program manager to the sponsor and the process owners, each Monday.
- Fortnightly schedule review with the vendor's engagement director.
- Decisions and their reasons recorded in the program decision log on the day they are made.
- Anything that moves a target date goes to the sponsor in writing before that date passes.
