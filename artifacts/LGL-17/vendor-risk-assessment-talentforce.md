# Vendor Risk Assessment: TalentForce HR Platform

**ATTICUS DUNDEE INC. — Legal Operations, Vendor Risk Program**

| Field | Value |
|---|---|
| Assessment ID | VRA-2026-034 |
| Vendor | TalentForce HR Platform (co-106) |
| Vendor contact | Kimberly Dressler, Director of Trust and Compliance |
| Service | Human resources information system, payroll processing, and benefits administration |
| Business owner | Chief People Officer |
| Assessor | Cordelia B. Nwosu, Legal Operations Manager |
| Security reviewer | Hannah T. Ostrowski, Chief Information Security Officer |
| Privacy reviewer | Yusuf A. Barmani, Data Protection Officer |
| Assessment type | Reassessment following a material change (new subprocessor and new AI features) |
| Prior assessment | VRA-2024-018, tier HIGH, approved with conditions, September 2024 |
| Initiated | May 5, 2026 |
| Completed | June 2, 2026 |
| Annual contract value | $412,000 |
| **Weighted risk score** | **4.40** |
| **Risk tier** | **CRITICAL** |
| **Disposition** | **CONDITIONALLY APPROVED** |
| Approved by | Naomi F. Aitken (General Counsel) and Hannah T. Ostrowski (CISO), jointly, June 9, 2026 |
| Next reassessment | December 11, 2026 (6-month cadence for CRITICAL) |
| Classification | Confidential |

---

## 1. Scope of the Engagement

TalentForce is the system of record for the company's workforce. It holds the employee master record, runs payroll for approximately 600 employees, and administers benefits enrollment including health plans. It is deeply integrated: it is the upstream source for identity provisioning, for the finance general ledger payroll journal, and for the people roster used across the business.

This is a reassessment rather than an initial assessment. It was triggered by two material changes notified by the vendor on April 21, 2026: the addition of an offshore support center as a subprocessor with production access, and the general availability of "TalentForce Insights," a set of features built on models trained on customer data.

### 1.1 Data in scope

| Data category | In scope | Volume | Notes |
|---|---|---|---|
| Employee identity and contact data | Yes | ~600 current, ~1,400 former | Retained for the statutory period after termination |
| National identification numbers | Yes | ~600 | Required for payroll tax reporting |
| Bank account details | Yes | ~600 | Direct deposit |
| Compensation and equity data | Yes | ~600 | Including performance ratings |
| **Health and benefits data (special category)** | **Yes** | **~600 employees plus ~900 dependents** | Plan enrollment, dependent records, disability accommodation records |
| Immigration and work authorization records | Yes | ~70 | |
| Employee relations case records | Yes | ~40 open | Includes investigation records that may be privileged |
| Customer content | No | | |

The employee relations case module is the most sensitive surface in the platform and was not separately assessed in 2024. Investigation records prepared at the direction of counsel may be privileged, and they sit in a general-purpose HR system with role-based access managed by HR rather than by Legal.

## 2. Scoring Method

Six domains scored 1 to 5, where 1 is the lowest risk and 5 is the highest, weighted to a composite between 1.00 and 5.00. Tiers: LOW 1.00 to 1.79; MODERATE 1.80 to 2.59; ELEVATED 2.60 to 3.39; HIGH 3.40 to 4.19; CRITICAL 4.20 to 5.00.

## 3. Scoring

| Domain | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| D1. Data sensitivity and scope | 25% | 5 | 1.25 | Special category health data, national identifiers, bank details, and potentially privileged employee relations records for the entire workforce and dependents |
| D2. Security posture and certification | 20% | 4 | 0.80 | SOC 2 Type II with three exceptions, one unremediated in logical access. No ISO 27001. Penetration test summary provided but the full report withheld. |
| D3. Privacy and cross-border transfer | 15% | 5 | 0.75 | New offshore support subprocessor with production access to special category data, onboarded without a completed transfer impact assessment and without prior notice to the company within the contractual window |
| D4. Business continuity and concentration | 10% | 4 | 0.40 | Single vendor for payroll. An outage on a pay date is a same-day operational and legal failure. Exit is constrained by the portability gap in Finding F-6. |
| D5. Contractual and legal protections | 20% | 4 | 0.80 | Breach notification obligation is "without undue delay" with no fixed hour count. Liability capped at twelve months' fees, which is below the plausible cost of a payroll data incident at this population. Audit right is limited to a questionnaire. |
| D6. AI, subprocessors, and subcontracting | 10% | 4 | 0.40 | "TalentForce Insights" trained on customer data with opt-out available but **not enabled by default**. Subprocessor list grew from six to nine in twelve months, twice without the contractual notice period being observed. |
| **Composite** | **100%** | | **4.40** | **CRITICAL** |

The tier moved from HIGH (3.55 in 2024) to CRITICAL. The movement is driven by D3 and D6, both of which are consequences of the vendor's April 2026 changes, and by D1, which rose because the employee relations module was brought into scope in this assessment and was out of scope in 2024.

## 4. Evidence Reviewed

| # | Artifact | Date | Reviewer |
|---|---|---|---|
| 1 | SOC 2 Type II report, period ended 2026-03-31 | Received 2026-05-08 | H. T. Ostrowski |
| 2 | Management response to SOC 2 exceptions | Received 2026-05-15 | H. T. Ostrowski |
| 3 | Updated subprocessor list, nine entries | Received 2026-05-08 | Y. A. Barmani |
| 4 | Transfer impact assessment for the offshore support center | **Not provided** | Y. A. Barmani |
| 5 | TalentForce Insights model documentation and data usage statement | Received 2026-05-19 | Y. A. Barmani, H. T. Ostrowski |
| 6 | Current master subscription agreement and data processing addendum | On file | C. B. Nwosu |
| 7 | Vendor security questionnaire, 214 items | Returned 2026-05-22, 11 items incomplete | H. T. Ostrowski |
| 8 | Business continuity and disaster recovery plan summary | Received 2026-05-26 | C. B. Nwosu |
| 9 | Data export specification and sample export | Received 2026-05-28 | C. B. Nwosu |
| 10 | Certificate of insurance, cyber and technology errors and omissions | Received 2026-05-11 | C. B. Nwosu |

## 5. Findings

**F-1 (Critical). Offshore support center onboarded with production access before notice.** The vendor added a support center as a subprocessor with read and write access to production tenant data. The subscription agreement requires thirty days' prior written notice of a new subprocessor with a right of objection. Notice was given on April 21, 2026 with an effective date of April 6, 2026, that is, fifteen days after the subprocessor was already live. The company's objection right was therefore not exercisable when it mattered. No transfer impact assessment has been provided for the transfer of special category data to that location.

**F-2 (Critical). AI features default to on.** "TalentForce Insights" produces attrition predictions, compensation benchmarking, and hiring recommendations from models the vendor states are trained on aggregated customer data. The opt-out is available in the tenant administration console and is **not enabled by default**. The feature went generally available on April 6, 2026. The company's tenant had the feature enabled from April 6 to May 19, 2026, a period of 43 days, before the assessment surfaced it and the business owner disabled it. Whether company data entered a training set during that period is the subject of Condition C-2.

**F-3 (High). SOC 2 exception in logical access is unremediated.** The report identifies an exception in which terminated vendor personnel retained active accounts for a period exceeding the vendor's own policy in nine instances during the audit period. Management's response commits to remediation "in the current fiscal year" without a date. This is the same control family as the company's own finding CF-2 in an unrelated matter, and the company is not in a strong position to be sanctimonious about it, but it is a real exception in a system holding payroll data.

**F-4 (High). Breach notification has no clock.** The data processing addendum obliges the vendor to notify "without undue delay." The company's own obligations to employees and to regulators run on fixed hour counts. A vendor clause without a fixed clock converts the company's fixed obligation into a dependency on the vendor's judgment.

**F-5 (High). Employee relations records and privilege.** The employee relations module holds investigation records, some prepared at the direction of counsel. Access is administered by HR role, not by matter. Vendor support personnel, including the new offshore center, can access these records in the course of a support ticket. There is no privileged-material control set applied to this vendor and no mechanism to mark a record as privileged and restrict vendor-side access to it.

**F-6 (Moderate). Exit and portability gap.** The standard export produces current-state CSV files. Historical payroll registers, benefit enrollment history, and employee relations case history are available only by a professional services engagement quoted at $46,000 and a six-week lead time. The company's obligation to retain payroll records outlives this contract, so the export gap is a direct constraint on the ability to change vendors.

**F-7 (Moderate). Liability cap.** Twelve months' fees, or $412,000, against a population of 600 employees and 900 dependents holding special category data. Notification and credit monitoring alone for that population would approach the cap.

## 6. Disposition

**CONDITIONALLY APPROVED.** The vendor stays in production. The reasoning is stated plainly because a CRITICAL tier that results in continued use requires a justification a reader can test.

Payroll cannot be switched off while conditions are negotiated. An abrupt exit would itself create legal exposure, including a risk of late wage payment. The correct response to a critical-tier system of record is not removal, which is not available, but a dated remediation plan with a named accountable executive and a stated consequence for non-delivery. The consequence here is real: failure to close Conditions C-1, C-2, or C-3 by their dates triggers the notice provisions in Section 6.2.

### 6.1 Conditions

| ID | Condition | Owner | Due | Consequence if missed | Status |
|---|---|---|---|---|---|
| C-1 | Vendor delivers a completed transfer impact assessment for the offshore support center, and either restricts that center to a data set excluding special category data or implements a documented access approval workflow for it | Y. A. Barmani with vendor | 2026-08-14 | Section 6.2 notice | Open |
| C-2 | Vendor confirms in writing, signed by an officer, whether any company data was used to train, tune, or evaluate any model during the period April 6 to May 19, 2026, and if so, what has been done about it | C. B. Nwosu with vendor | 2026-07-31 | Section 6.2 notice | Open, first request sent 2026-06-10 |
| C-3 | Contract amendment fixing breach notification at 48 hours from the vendor becoming aware, and raising the liability cap for a security incident involving personal data to three times annual fees | C. B. Nwosu | 2026-09-11 | Section 6.2 notice | In negotiation |
| C-4 | Vendor closes the SOC 2 logical access exception and provides evidence, or provides a bridge letter with a committed remediation date | H. T. Ostrowski | 2026-10-30 | Escalation to General Counsel | Open |
| C-5 | Company implements a privileged-material handling standard for employee relations records: matter-level restriction, an explicit vendor support access approval step, and a quarterly access review | Chief People Officer with N. F. Aitken | 2026-09-11 | Escalation to General Counsel | Open |
| C-6 | Company obtains and stores a full historical export (payroll registers, benefit history, case history) and repeats it every six months, so that exit is not dependent on vendor cooperation at the moment of exit | C. B. Nwosu | 2026-10-30 | Escalation to General Counsel | Budget approved 2026-06-15 |
| C-7 | Vendor agrees that AI features which process customer data will default to off for the company's tenant, and that any new such feature requires the company's affirmative opt-in | C. B. Nwosu | 2026-09-11 | Escalation to General Counsel | In negotiation |

### 6.2 Consequence of a missed condition

Failure to close C-1, C-2, or C-3 by the stated date obliges the company to issue a written notice of material concern under the subscription agreement, to open a formal alternatives evaluation for payroll and HRIS, and to report the failure to the Audit and Risk Committee at its next meeting rather than in the quarterly cycle. The business owner and the General Counsel are jointly accountable for issuing that notice.

### 6.3 Scope restriction pending closure

No new data category may be introduced into TalentForce until C-1 and C-2 are closed. Specifically, the proposed migration of contractor records into the platform is suspended.

## 7. Approvals

| Role | Name | Decision | Date |
|---|---|---|---|
| Assessor | Cordelia B. Nwosu | Recommend conditional approval | 2026-06-02 |
| Security | Hannah T. Ostrowski | Concur, subject to C-3 and C-4 | 2026-06-04 |
| Privacy | Yusuf A. Barmani | Concur, subject to C-1 and C-2. Records a reservation that C-1 should have been a pre-condition rather than a condition. | 2026-06-04 |
| General Counsel | Naomi F. Aitken | **Conditionally approved** | 2026-06-09 |
| Chief Information Security Officer | Hannah T. Ostrowski | **Conditionally approved** | 2026-06-09 |

**Reservation recorded.** The Data Protection Officer's view, recorded at his request, is that transferring special category data to a subprocessor without a completed transfer impact assessment should stop the transfer rather than generate a condition with an August due date. The General Counsel's decision notes the reservation, accepts that it is well founded, and rests the contrary conclusion on the absence of any means to suspend the transfer without suspending payroll support. The reservation and the reasoning both go to the Audit and Risk Committee in the Q2 report.
