# Onboarding checklist template

The standard onboarding task catalog Atticus Dundee Inc. runs for every new hire, and the rules a People Operations coordinator uses to turn it into one person's checklist.

## How a due date is derived

Every task is scheduled against the start date. `due_basis` is `start_date` on every row and `due_offset_business_days` is a signed whole number of business days: negative is before the start date, zero is the start date itself, positive is after it. A due date is the business day reached by stepping that many business days from the start date, skipping Saturdays and Sundays. There is no holiday calendar.

Worked example. A task carrying an offset of minus five is due five business days before the start date. A task carrying an offset of plus five is due a full working week after the start date.

## The four phases

| Phase | What it covers |
|---|---|
| `pre_start` | everything that has to be finished before the first day |
| `day_one` | the first day itself |
| `week_one` | the first working week |
| `first_month` | the rest of the first month |

## Who owns what

A template row names a role rather than a person. Instantiating the checklist resolves each role to one named owner.

| Owner role | What the role owns |
|---|---|
| `People Operations` | the paperwork, the joining record and the readiness checks |
| `IT & Security` | the access requests, the equipment and the handover of both |
| `Hiring Manager` | the plan, the introductions, the buddy pairing and the check ins |
| `Onboarding Buddy` | the first two weeks of orientation |
| `Recruiter` | the joining instructions and the closing feedback |
| `New Hire` | the acknowledgements, the training and the elections only they can make |

The buddy pairing is made by the hiring manager rather than by People Operations.

## Access requests

A row that grants a system carries `grants_system_id` and `grants_system_name`, and every such row also carries an `approval_owner_role`. The approval owner is never the same role as the task owner, so the person who raises an access request is never the person who approves it. A request drafted from this catalog therefore always names an approver before it can move.

## Which rows apply

`applies_to_department` is either `all` or a department name. Instantiating the catalog keeps every `all` row plus the rows naming the new hire's own department, in the order below.

## The task catalog

| task_code | task_name | phase | applies_to_department | owner_role | due_offset_business_days | blocked_by_task_code | approval_owner_role |
|---|---|---|---|---|---|---|---|
| ONB-01 | Send the written offer pack and collect the signed copy | pre_start | all | People Operations | -10 |  |  |
| ONB-02 | Open the payroll and benefits enrolment record | pre_start | all | People Operations | -8 |  | IT & Security |
| ONB-03 | Raise the identity directory account request | pre_start | all | IT & Security | -7 |  | Hiring Manager |
| ONB-04 | Raise the workplace email and calendar request | pre_start | all | IT & Security | -6 |  | Hiring Manager |
| ONB-05 | Order the laptop and the building access badge | pre_start | all | IT & Security | -5 |  |  |
| ONB-06 | Name the onboarding buddy for the first two weeks | pre_start | all | Hiring Manager | -5 |  |  |
| ONB-07 | Write the first thirty day plan | pre_start | all | Hiring Manager | -4 |  |  |
| ONB-08 | Raise the source control and continuous integration access request | pre_start | Engineering | IT & Security | -4 |  | Hiring Manager |
| ONB-09 | Raise the finance ledger role request | pre_start | Finance | IT & Security | -4 |  | Hiring Manager |
| ONB-10 | Raise the customer relationship system seat request | pre_start | Sales | IT & Security | -4 |  | Hiring Manager |
| ONB-11 | Raise the product analytics workspace request | pre_start | Product | IT & Security | -4 |  | Hiring Manager |
| ONB-12 | Confirm the start date and the joining instructions with the new hire | pre_start | all | Recruiter | -3 |  |  |
| ONB-13 | Confirm every system access request is ready before day one | pre_start | all | People Operations | -2 | ONB-21 |  |
| ONB-14 | Send the welcome note and the first day agenda | pre_start | all | People Operations | -1 |  |  |
| ONB-15 | Run the first day welcome and the workplace tour | day_one | all | People Operations | 0 |  |  |
| ONB-16 | Hand over the laptop and the access badge | day_one | all | IT & Security | 0 |  |  |
| ONB-17 | Sign the security and acceptable use acknowledgement | day_one | all | New Hire | 0 |  |  |
| ONB-18 | Introduce the new hire to the immediate team | day_one | all | Hiring Manager | 0 |  |  |
| ONB-19 | Walk through the first week schedule with the buddy | day_one | all | Onboarding Buddy | 0 |  |  |
| ONB-20 | Check the payroll details and the benefits elections | day_one | all | New Hire | 0 |  |  |
| ONB-21 | Work the access provisioning request for the shared team drive | week_one | all | IT & Security | 1 |  | Hiring Manager |
| ONB-22 | Sit the workplace policy and records training | week_one | all | New Hire | 2 | ONB-16 |  |
| ONB-23 | Book the recurring one to one session | week_one | all | Hiring Manager | 2 |  |  |
| ONB-24 | Review the first thirty day plan with the manager | week_one | all | New Hire | 3 | ONB-07 |  |
| ONB-25 | Walk through the product metric definitions and the reporting calendar | week_one | Product | Hiring Manager | 3 | ONB-11 |  |
| ONB-26 | Meet the wider department at the weekly team meeting | week_one | all | Onboarding Buddy | 4 |  |  |
| ONB-27 | Run the production access and on call induction | week_one | Engineering | Hiring Manager | 4 | ONB-08 |  |
| ONB-28 | Shadow three customer sessions before taking an account | week_one | Customer Success | Onboarding Buddy | 4 |  |  |
| ONB-29 | Check in on the first week and record anything outstanding | week_one | all | People Operations | 5 |  |  |
| ONB-30 | Finish the mandatory compliance training modules | first_month | all | New Hire | 10 | ONB-22 |  |
| ONB-31 | Confirm the buddy pairing is working and close the buddy period | first_month | all | Hiring Manager | 10 | ONB-19 |  |
| ONB-32 | Confirm the probation review date is in the calendar | first_month | all | People Operations | 15 |  |  |
| ONB-33 | Present the first piece of analysis to the product team | first_month | Product | New Hire | 20 |  |  |
| ONB-34 | Run the thirty day check in with the new hire | first_month | all | Hiring Manager | 20 |  |  |

## Review cadence

The catalog is reviewed once a half year by People Operations with IT & Security, and any row whose offset no longer matches how long the work actually takes is changed there rather than in a single person's checklist.
