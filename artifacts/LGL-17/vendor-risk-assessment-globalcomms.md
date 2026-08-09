# Vendor Risk Assessment: GlobalComms Translation Service

**ATTICUS DUNDEE INC. — Legal Operations, Vendor Risk Program**

| Field | Value |
|---|---|
| Assessment ID | VRA-2026-036 |
| Vendor | GlobalComms Translation Service (co-120) |
| Vendor contact | Étienne Roussel, Account Director |
| Service | Human and machine translation of legal and commercial documents |
| Business owner | Serena B. Alcaraz, Associate General Counsel, Employment and Litigation |
| Assessor | Cordelia B. Nwosu, Legal Operations Manager |
| Security reviewer | Hannah T. Ostrowski, Chief Information Security Officer |
| Privacy reviewer | Yusuf A. Barmani, Data Protection Officer |
| Assessment type | Initial, initiated retrospectively after unassessed use was discovered |
| Initiated | May 26, 2026 |
| Completed | June 23, 2026 |
| Spend to date | $31,400 across three matters, on a departmental card, outside procurement |
| **Weighted risk score** | **4.80** |
| **Risk tier** | **CRITICAL** |
| **Disposition** | **DO NOT APPROVE** |
| Decided by | Naomi F. Aitken (General Counsel) and Hannah T. Ostrowski (CISO), jointly, June 25, 2026 |
| Classification | Confidential, attorney-client privileged |

---

## 1. How This Assessment Came About

GlobalComms was not put through the vendor risk process before use. It was engaged directly by the Litigation team in November 2025 to translate document sets in three matters, paid on a departmental purchasing card in amounts below the procurement threshold, and was never entered in the vendor register. The engagement surfaced on May 22, 2026 during a routine card spend review by Finance.

The material sent to GlobalComms across those three matters included documents collected for discovery and at least one memorandum prepared by outside counsel. **The assessment below is therefore not only a decision about whether to approve a vendor. It is also the factual record for the exposure analysis in Section 7.**

## 2. Scope of the Engagement as Performed

| Data category | Sent to vendor | Notes |
|---|---|---|
| Commercial contracts, non-privileged | Yes | Two matters |
| Documents collected for discovery | Yes | One matter, approximately 2,100 documents |
| **Attorney work product** | **Yes** | **One memorandum prepared by outside counsel, 11 pages, sent 2026-02-04** |
| **Attorney-client communications** | **Yes, incidentally** | **Within the discovery collection; the collection was not privilege-screened before transmission** |
| Personal data of employees and third parties | Yes | Within the discovery collection |

## 3. Scoring Method

Six domains scored 1 to 5, where 1 is the lowest risk and 5 is the highest, weighted to a composite between 1.00 and 5.00. Tiers: LOW 1.00 to 1.79; MODERATE 1.80 to 2.59; ELEVATED 2.60 to 3.39; HIGH 3.40 to 4.19; CRITICAL 4.20 to 5.00.

Where a vendor may handle privileged material, the privileged-material control set in LEG-PRG-004 applies in addition to the domain scoring. It contains four mandatory controls. **A vendor that fails any mandatory control cannot be approved regardless of its composite score.** GlobalComms fails all four.

## 4. Scoring

| Domain | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| D1. Data sensitivity and scope | 25% | 5 | 1.25 | Privileged material, attorney work product, and unscreened discovery collections containing third-party personal data |
| D2. Security posture and certification | 20% | 5 | 1.00 | No SOC 2, no ISO 27001, no independent assessment of any kind. Linguist portal has no encryption at rest. Multi-factor authentication is optional for linguists and is enabled for 61 percent of them by the vendor's own figure. |
| D3. Privacy and cross-border transfer | 15% | 5 | 0.75 | Linguists in fourteen countries. No transfer mechanism documented for any of them. No records of processing. No data protection officer or equivalent. |
| D4. Business continuity and concentration | 10% | 3 | 0.30 | A replaceable service in a competitive market. This is the only domain that does not score at the top, and it is the reason the composite is 4.80 rather than 5.00. |
| D5. Contractual and legal protections | 20% | 5 | 1.00 | Vendor's terms of service only; no negotiated agreement. Terms grant the vendor a perpetual, irrevocable, worldwide licence to use submitted content to develop and improve its services. Liability capped at fees paid for the affected order. Audit rights refused. Cyber liability of $1,000,000 with a $500,000 professional services sublimit. |
| D6. AI, subprocessors, and subcontracting | 10% | 5 | 0.50 | Submitted documents are pre-processed through a third-party machine translation service before human review. Linguists are independent contractors permitted to subcontract without notice. No subprocessor list exists. |
| **Composite** | **100%** | | **4.80** | **CRITICAL** |

## 5. Mandatory Control Set for Privileged Material

| # | Mandatory control | Required standard | Vendor status |
|---|---|---|---|
| M-1 | Named-individual access. Every person who can access company material is identified by name, is under a direct written confidentiality obligation to the company or to a party that has flowed the obligation down in writing, and appears on a list the company can inspect. | Named list, written flow-down | **FAIL.** Vendor declines to identify linguists, citing its own confidentiality obligations to them. Its linguist agreement runs twelve months and permits subcontracting without notice to the vendor's customer. |
| M-2 | No third-party processing. Company material is not transmitted to, processed by, or stored on any system operated by a party other than the vendor, without prior written approval. | No unapproved third-party processing | **FAIL.** All submitted documents pass through a third-party machine translation service as a first pass. Confirmed in writing by the vendor on 2026-06-11. |
| M-3 | No training or derived use. The vendor acquires no right to use company material for any purpose other than performing the service, and no right to train, tune, or evaluate any model on it. | Contractual prohibition | **FAIL.** The vendor's terms grant a perpetual, irrevocable licence to use submitted content to improve its services. The vendor declined to amend, stating the clause is standard across its customer base. |
| M-4 | Segregation and deletion. Company material is segregated, is deleted on request within thirty days, and deletion is certified. | Certified deletion within 30 days | **FAIL.** No deletion capability for material already ingested by the machine translation pre-processor. The vendor states it "cannot represent" what that service retains. |

Four mandatory failures out of four. This is not a score to be negotiated down; it is a structural incompatibility between how this vendor operates and what privileged material requires.

## 6. Findings

**F-1 (Critical). Privileged and work product material was transmitted to a third-party machine translation service.** This is the finding that decides the matter. Every document sent to GlobalComms was pre-processed by a service the company has no relationship with, under terms the company has never seen, with retention the vendor cannot describe. Disclosure of privileged material to a third party outside any confidentiality framework is the classic fact pattern for a waiver argument. Whether waiver occurred is a legal question addressed in Section 7; that the disclosure occurred is not in doubt.

**F-2 (Critical). The vendor acquires a perpetual licence in submitted content.** The terms are unambiguous and the vendor will not amend them. Under those terms the vendor may retain and use client documents indefinitely to improve its products, which is inconsistent with any duty of confidentiality the company owes.

**F-3 (Critical). The company cannot identify who saw its documents.** M-1 fails not because the vendor is careless but because its business model is a distributed contractor pool. That model is legitimate for marketing copy. It is incompatible with material subject to a duty of confidentiality that runs to named individuals.

**F-4 (High). The discovery collection was not privilege-screened before transmission.** This is a company-side failure, not a vendor failure. Approximately 2,100 documents were sent for translation without a privilege screen. The collection is known to contain at least some attorney-client communications.

**F-5 (High). Procurement and vendor risk controls were bypassed.** Three engagements, $31,400, on a departmental purchasing card, in amounts individually below the procurement review threshold. The threshold is the control that failed. A control that can be defeated by splitting an engagement into three payments is not a control.

**F-6 (Moderate). Insurance is inadequate.** $1,000,000 cyber liability with a $500,000 professional services sublimit against an exposure that includes potential privilege waiver in active litigation.

## 7. Exposure Analysis and Remediation

*This section is attorney work product prepared at the direction of the General Counsel.*

**Privilege.** The transmission of an outside counsel memorandum, and of unscreened attorney-client communications, to a vendor with no confidentiality framework and to that vendor's undisclosed machine translation subprocessor is a disclosure to third parties. Whether it waives privilege turns on the reasonableness of the steps taken to prevent disclosure and the promptness of the steps taken to rectify it. Neither factor is favorable on the first count and both are within the company's control on the second. Prompt, documented, and complete remediation is therefore not merely good practice here; it is an element of the argument the company will make if the question is ever litigated.

**Actions ordered by the General Counsel on June 25, 2026.**

| # | Action | Owner | Due | Status |
|---|---|---|---|---|
| 1 | Cease all use of the vendor immediately. No further submissions of any kind. | S. B. Alcaraz | 2026-06-25 | Complete |
| 2 | Written demand to the vendor for return and certified deletion of all company material, and for written disclosure of every third party to which it was transmitted, every location where it is stored, and every retention period applicable | C. B. Nwosu | 2026-06-30 | Sent 2026-06-29; response outstanding |
| 3 | Reconstruct a complete inventory of every document sent, by matter, with dates and Bates or file identifiers | S. B. Alcaraz | 2026-07-24 | In progress |
| 4 | Privilege-screen the reconstructed inventory and identify every privileged or work product document that was transmitted | Outside counsel, Atticus Dundee LLP | 2026-08-14 | Instructed 2026-06-26 |
| 5 | Assess, per matter, whether disclosure to opposing parties or the court is required or advisable, and whether a clawback provision or protective order in the matter covers the disclosure | Outside counsel, Atticus Dundee LLP | 2026-08-14 | Instructed 2026-06-26 |
| 6 | Notify the company's professional liability insurer as a circumstance | N. F. Aitken | 2026-07-10 | Complete, notified 2026-07-08 |
| 7 | Identify and assess an approved translation vendor meeting the privileged-material control set | C. B. Nwosu | 2026-08-31 | Two candidates in assessment |
| 8 | Close the procurement threshold gap: any engagement involving company documents requires a vendor register entry regardless of amount, and purchasing cards are blocked for professional services merchant categories | G. L. Thomsen | 2026-08-31 | Card control implemented 2026-07-02; policy amendment drafted |
| 9 | Report to the Audit and Risk Committee in the Q2 report rather than waiting for the incident to close | N. F. Aitken | 2026-07-15 | Complete, included |

## 8. Disposition

**DO NOT APPROVE.** The vendor fails all four mandatory controls in the privileged-material control set. Its composite score of 4.80 is the highest recorded in the program to date. Its terms cannot be amended on the vendor's own account, its subprocessing cannot be constrained, and its personnel cannot be identified.

**No conditional path is available.** A conditional approval requires conditions capable of being closed. Three of the four mandatory failures are properties of the vendor's business model rather than gaps in its controls, and the fourth, M-3, has been expressly refused. There is nothing to condition.

**Vendor register entry.** GlobalComms Translation Service is entered in the register with status DO NOT APPROVE and a note directing any future requester to this assessment. Re-approval requires a new assessment and evidence that the business model has changed, not a fresh sales conversation.

## 9. Approvals

| Role | Name | Decision | Date |
|---|---|---|---|
| Assessor | Cordelia B. Nwosu | Recommend do not approve | 2026-06-23 |
| Security | Hannah T. Ostrowski | Concur | 2026-06-23 |
| Privacy | Yusuf A. Barmani | Concur | 2026-06-24 |
| Business owner | Serena B. Alcaraz | Concur; accepts the finding at F-4 as a Litigation team failure | 2026-06-24 |
| General Counsel | Naomi F. Aitken | **Do not approve** | 2026-06-25 |
| Chief Information Security Officer | Hannah T. Ostrowski | **Do not approve** | 2026-06-25 |
