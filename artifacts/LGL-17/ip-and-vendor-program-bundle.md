# IP, NDA, and Vendor Risk Program Charter

**ATTICUS DUNDEE INC. — Office of the General Counsel**

| Field | Value |
|---|---|
| Document ID | LEG-PRG-004 |
| Version | 3.1 |
| Status | Approved and in force |
| Owner | Naomi F. Aitken, General Counsel |
| Approved by | Executive Leadership Team, March 18, 2026 |
| Effective date | April 1, 2026 |
| Last reviewed | July 1, 2026 |
| Next scheduled review | April 1, 2027 |
| Review cadence | Annual, or on a material change in the control environment |
| Classification | Internal |
| Supersedes | LEG-PRG-004 v2.4 (effective April 1, 2025) |

---

## 1. Purpose

This charter governs three programs that the Office of the General Counsel runs as one portfolio because they share the same failure mode: a deadline nobody owned, a clause nobody read, or a supplier nobody assessed.

1. **Intellectual property**, comprising the patent, trademark, and copyright portfolios, the invention disclosure process, and the renewal docket.
2. **Confidentiality agreements**, comprising the standard template, the negotiation playbook, and signing authority.
3. **Vendor risk**, comprising the assessment methodology, the risk register, and the approval gates.

The programs report together to the Audit and Risk Committee of the Board once per quarter through a single dashboard.

## 2. Scope

Applies to Atticus Dundee Inc. and every entity it controls, to all employees, and to all contractors and consultants acting on the company's behalf. Applies to all intellectual property the company owns, licenses in, or licenses out, and to every third party that receives company confidential information or processes company data.

Does not apply to open source license compliance, which is governed separately by ENG-POL-011, or to customer-facing commercial terms, which are governed by LEG-PRG-002.

## 3. Program Components

| Component | Instrument | Owner | Cadence |
|---|---|---|---|
| Renewal docket | `ip-renewal-calendar.csv` with the docketing rules in `ip-renewal-calendar.md` | Devraj S. Iyer, Senior Counsel, IP | Reviewed monthly; 24-month rolling horizon |
| Invention disclosure | `invention-disclosure-records.md` | Devraj S. Iyer | Committee meets monthly |
| NDA standard form | `nda-template.md` | Lucia M. Ferrante, Senior Counsel, Commercial | Reviewed annually |
| Signing authority | `signing-authority-matrix.md` | Naomi F. Aitken, General Counsel | Reviewed annually or on org change |
| NDA negotiation record | `nda-negotiation-scenarios.md` | Aleksy Pietrzak, Contract Operations Manager | Per negotiation |
| Vendor assessments | `vendor-risk-assessment-*.md` | Cordelia B. Nwosu, Legal Operations Manager | Per vendor; reassessment by tier |
| Vendor risk register | `vendor-risk-register.csv` | Cordelia B. Nwosu | Reviewed monthly |
| Board reporting | `quarterly-board-dashboard.md` | Naomi F. Aitken | Quarterly |

## 4. Governance

**IP Committee.** Meets monthly. Standing members: Senior Counsel IP (chair), VP Engineering, Head of Product, and a rotating principal engineer. Decides whether to file, hold, publish defensively, or abandon each disclosure. Outside counsel attends by invitation.

**Vendor Risk Council.** Meets fortnightly. Standing members: Legal Operations Manager (chair), Chief Information Security Officer, Data Protection Officer, Director of Procurement. Approves LOW and MODERATE dispositions. ELEVATED and above go to the General Counsel. CRITICAL requires the General Counsel and the Chief Information Security Officer jointly, and a CRITICAL vendor may not be onboarded on a conditional basis without a dated remediation plan and a named accountable executive.

**Escalation to the Audit and Risk Committee.** Any of the following reaches the Board committee at the next meeting without waiting for the quarterly cycle: a missed statutory IP deadline; an executed agreement outside the signing authority matrix; a CRITICAL vendor placed in production without a completed assessment; or any incident involving privileged or special-category data at a supplier.

## 5. Standing Rules

1. **No deadline is owned by a calendar entry alone.** Every entry in the renewal docket has a named responsible person and a named backup. An entry without both is a defect and is reported as one.
2. **The docket runs on the earlier date.** Where a statutory rule extends a deadline that falls on a weekend or holiday, the docket records both the statutory date and the internal working date, and the internal working date always falls earlier. Statutory extensions preserve rights; they are not planning tools.
3. **Nothing goes out before the filing decision is made.** No public disclosure, conference submission, customer demonstration of unreleased functionality, or paper preprint may be released before IP clearance. The clearance step is owned by the disclosing employee's manager, not by Legal.
4. **The standard NDA is the starting position, not the ceiling.** Deviations are recorded against the playbook positions in `nda-negotiation-scenarios.md` so the company can see which clauses it concedes repeatedly.
5. **No supplier receives company data before its assessment closes.** Pilot, proof of concept, trial, and free tier are all production for this purpose.
6. **Privileged material has one route.** Any supplier that may handle privileged or attorney work product material is assessed against the privileged-material control set regardless of contract value.

## 6. Metrics

| Metric | Definition | Target | Reported |
|---|---|---|---|
| Docket integrity | Percentage of active docket entries with a named responsible person, a named backup, and a verified statutory basis | 100% | Monthly |
| Deadlines missed | Statutory or contractual IP deadlines missed in the period | 0 | Monthly |
| Deadlines in grace | Entries paid or filed inside a grace period with surcharge | 0 | Monthly |
| Disclosure throughput | Median days from disclosure submission to committee decision | 30 days | Monthly |
| NDA cycle time | Median days from request to execution, standard form | 3 business days | Monthly |
| NDA deviation rate | Percentage of executed NDAs with at least one deviation from the standard form | Below 35% | Quarterly |
| Assessment coverage | Percentage of active suppliers with a current assessment at their required cadence | 100% | Monthly |
| Conditional vendors past remediation date | Count of conditionally approved vendors with an overdue condition | 0 | Monthly |

## 7. Reassessment Cadence by Vendor Tier

| Risk tier | Weighted score band | Reassessment | Approval level |
|---|---|---|---|
| LOW | 1.00 to 1.79 | Every 24 months | Vendor Risk Council |
| MODERATE | 1.80 to 2.59 | Every 18 months | Vendor Risk Council |
| ELEVATED | 2.60 to 3.39 | Every 12 months | General Counsel |
| HIGH | 3.40 to 4.19 | Every 12 months, plus a mid-cycle control check | General Counsel |
| CRITICAL | 4.20 to 5.00 | Every 6 months | General Counsel and Chief Information Security Officer jointly |

Any material change (a new subprocessor, a change of control, a reported breach, a new data category, or the introduction of model training on customer content) triggers immediate reassessment regardless of cadence.

## 8. Roles

| Role | Name | Accountable for |
|---|---|---|
| General Counsel | Naomi F. Aitken | The charter; CRITICAL vendor decisions; board reporting |
| Senior Counsel, IP | Devraj S. Iyer | Renewal docket; invention disclosure process; outside counsel management |
| Senior Counsel, Commercial | Lucia M. Ferrante | NDA template; negotiation positions; escalation of deal-breakers |
| Legal Operations Manager | Cordelia B. Nwosu | Vendor assessments; risk register; metrics |
| Contract Operations Manager | Aleksy Pietrzak | NDA intake and execution; signing authority enforcement |
| Chief Information Security Officer | Hannah T. Ostrowski | Security control review in every vendor assessment |
| Data Protection Officer | Yusuf A. Barmani | Transfer mechanism and privacy review in every vendor assessment |
| Director of Procurement | Grady L. Thomsen | Contract gate; no purchase order without a closed assessment |
| VP Engineering | Theresa J. Muldoon | Pre-disclosure clearance; inventor participation |
| Outside IP counsel | Atticus Dundee LLP (co-001), Nadia S. Feldkamp, Partner | Prosecution, opinions, and docket confirmation |

## 9. Component Index

This bundle comprises the following instruments. Each is a controlled document under LEG-PRG-004.

| File | Instrument |
|---|---|
| `ip-renewal-calendar.md` | Docketing rules, statutory bases, and the current exception report |
| `ip-renewal-calendar.csv` | The renewal docket, 24-month rolling horizon |
| `invention-disclosure-records.md` | Invention disclosure forms IDF-2026-014, 015, and 016 with committee dispositions |
| `nda-template.md` | Standard mutual confidentiality agreement, form NDA-M-2026.1 |
| `signing-authority-matrix.md` | Signing authority and delegation |
| `nda-negotiation-scenarios.md` | Negotiation records for three live counterparties |
| `vendor-risk-assessment-datapulse-analytics.md` | Assessment VRA-2026-031 |
| `vendor-risk-assessment-talentforce.md` | Assessment VRA-2026-034 |
| `vendor-risk-assessment-globalcomms.md` | Assessment VRA-2026-036 |
| `vendor-risk-register.csv` | Active vendor risk register |
| `quarterly-board-dashboard.md` | Q2 2026 report to the Audit and Risk Committee |

## 10. Version History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2023-05-02 | N. F. Aitken | Initial charter covering the IP docket only |
| 2.0 | 2024-04-01 | N. F. Aitken | NDA program folded in; signing authority matrix created |
| 2.4 | 2025-04-01 | C. B. Nwosu | Vendor assessment methodology added; annual review |
| 3.0 | 2026-03-18 | N. F. Aitken | Three programs consolidated into one portfolio and one board report; reassessment cadence tied to score band; privileged-material control set introduced |
| 3.1 | 2026-07-01 | C. B. Nwosu | Standing Rule 2 added after the Q2 docket exception; metrics table extended with "deadlines in grace" |
