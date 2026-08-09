# Signing Authority and Deviation Matrix: Confidentiality Agreements

**ATTICUS DUNDEE INC. — Office of the General Counsel**

| Field | Value |
|---|---|
| Document ID | LEG-POL-013 |
| Version | 4.0 |
| Owner | Naomi F. Aitken, General Counsel |
| Approved by | Executive Leadership Team, March 18, 2026 |
| Effective | April 1, 2026 |
| Review | Annual, or on an organizational change affecting a named role |
| Classification | Internal |
| Related | `nda-template.md` (form NDA-M-2026.1); `ip-and-vendor-program-bundle.md` (LEG-PRG-004) |

---

## 1. Scope and Basic Rule

This matrix governs who may sign a confidentiality agreement on behalf of Atticus Dundee Inc. and who must approve a departure from the standard form.

**The basic rule: authority to sign follows the deviation, not the counterparty.** An agreement on the unmodified standard form may be signed at the lowest level regardless of who the counterparty is. A single deviation moves the whole agreement to the level required for that deviation. Where two deviations apply at different levels, the higher level governs the whole agreement.

No person may sign an agreement that grants a right the signer does not have authority to grant, and no person may approve a deviation in an agreement they will also sign, except the General Counsel and the Chief Executive Officer.

## 2. Deviation Levels

| Level | Description | Examples |
|---|---|---|
| **D0** | No deviation. Standard form, bracketed fields completed, no optional sections. | Term of two years, survival of three years, standard exclusions |
| **D1** | Pre-approved variation. Falls inside a range Legal has already agreed. | Term of one to three years; survival of two to five years; notice period of up to ten business days; return period of up to sixty days; Optional Section A at eighteen months or less |
| **D2** | Substantive but bounded. Changes a right or an obligation without changing the risk profile of the form. | Counterparty paper accepted after review; a fifth exclusion; a marking requirement with a thirty-day cure; Optional Section A at nineteen to twenty-four months; a specified affiliate extension |
| **D3** | Material. Changes the risk profile. | Optional Section B (residual knowledge) in any form; perpetual confidentiality for all information rather than for trade secrets only; any indemnity; any limitation of liability; a governing law outside the approved list; audit rights; a clause requiring notice to the counterparty before responding to legal process |
| **D4** | Deal-breaker. Not signable at any level without an express written exception from the General Counsel and the Chief Financial Officer. | Any liquidated damages or per-breach penalty figure; removal of the Section 9 immunity notice; assignment of intellectual property; a licence to the counterparty of any Atticus Dundee intellectual property; an obligation to purchase, to proceed, or to negotiate exclusively; a non-compete of any kind |

## 3. Authority Matrix

| Deviation level | May sign | Must approve before signature | Target turnaround |
|---|---|---|---|
| D0 | Contract Operations Manager (Aleksy Pietrzak) or any Contract Operations Specialist | None. System-validated against the form. | 1 business day |
| D1 | Contract Operations Manager | Contract Operations Manager, recorded in the deviation log | 2 business days |
| D2 | Senior Counsel, Commercial (Lucia M. Ferrante) | Senior Counsel, Commercial | 3 business days |
| D3 | General Counsel (Naomi F. Aitken) | General Counsel; and Chief Information Security Officer where the deviation touches security obligations or audit rights; and Data Protection Officer where personal data is in scope | 5 business days |
| D4 | Chief Executive Officer (Julian A. Prewitt) | General Counsel **and** Chief Financial Officer (Ophelia R. Sandoval), in writing, with the exception recorded in the register under Section 6 | Not committed. Escalation, not a queue. |

## 4. Delegation

| Named holder | Delegate in absence | Limit on the delegation |
|---|---|---|
| Contract Operations Manager | Contract Operations Specialist on duty | D0 and D1 only |
| Senior Counsel, Commercial | Senior Counsel, IP (Devraj S. Iyer) | D2 only; no D3 |
| General Counsel | Senior Counsel, Commercial | D3 only, and only for a period stated in writing not exceeding fifteen consecutive days; no D4 delegation is permitted in any circumstance |
| Chief Executive Officer | None | D4 authority is not delegable |

A delegation must be in writing, dated, time-bounded, and recorded in the deviation log before it is used.

## 5. Special Rules

**5.1 Counterparty paper.** Accepting the counterparty's form rather than sending the standard form is at minimum D2, and rises to the level of the most significant deviation the counterparty form contains against the standard form. Counterparty paper must be redlined against the standard form and the redline retained; an unmarked acceptance is a control failure whatever the terms turn out to be.

**5.2 Approved governing law list.** [STATE OF INCORPORATION], Delaware, New York, and England and Wales are pre-approved and are D0 or D1. Any other governing law is D3. A governing law field left unresolved at execution is a QA failure, not a deviation, and the agreement must not be signed.

**5.3 Personal data.** Where the exchange will include personal data, the Data Protection Officer must confirm that a confidentiality agreement is the right instrument and that a data processing agreement is not required instead. This applies at every level including D0.

**5.4 Privileged material.** Where the counterparty may receive privileged material or attorney work product, the agreement is at minimum D3 and the privileged-material control set in LEG-PRG-004 applies. A confidentiality agreement alone is not a sufficient control for privileged material.

**5.5 Government and regulated counterparties.** Any counterparty that is a government body, or that is subject to a statutory disclosure regime that would override Section 4 of the standard form, is D3 regardless of other terms.

**5.6 Speed exception.** There is none. A counterparty's deadline does not change the authority level. Where the deadline is genuinely immovable, the correct response is to escalate to the level required, not to sign at a lower level and regularize afterwards.

## 6. Exception Register

Every D4 exception is recorded in the exception register held by Legal Operations, with the counterparty, the clause, the business justification, the approvers, the date, and any expiry. The register is reported to the Audit and Risk Committee each quarter. There have been two D4 exceptions in the eighteen months to June 30, 2026, both for assignment of intellectual property in agreements ancillary to an acquisition, and none for liquidated damages.

## 7. Logging Requirements

Every executed confidentiality agreement is logged with the counterparty legal name, the counterparty canon identifier where one exists, the deviation level, each deviation with its clause reference, the approver, the signer, the execution date, the term, the survival period, and the location of the executed original. The log is the source for the deviation rate metric in LEG-PRG-004 Section 6.

## 8. Version History

| Version | Date | Change |
|---|---|---|
| 3.0 | 2025-04-01 | Deviation levels D0 to D3 introduced |
| 3.2 | 2025-09-15 | Section 5.4 (privileged material) added after a supplier review |
| 4.0 | 2026-03-18 | D4 deal-breaker level created and liquidated damages moved into it; Section 5.6 added; delegation limits tightened so that D4 is not delegable; approved governing law list published |
