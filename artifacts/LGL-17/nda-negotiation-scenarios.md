# NDA Negotiation Records, Q2 2026

**ATTICUS DUNDEE INC. — Office of the General Counsel, Commercial**

| Field | Value |
|---|---|
| Document ID | LEG-NDA-NEG-2026-Q2 |
| Owner | Lucia M. Ferrante, Senior Counsel, Commercial |
| Prepared by | Aleksy Pietrzak, Contract Operations Manager |
| Period | April 1 to June 30, 2026 |
| Standard form | NDA-M-2026.1 (`nda-template.md`) |
| Authority reference | LEG-POL-013 (`signing-authority-matrix.md`) |
| Classification | Confidential |

---

## How to Read These Records

Each record states the negotiation posture, the issues in dispute, and a position ladder for each issue: **target** (what the company asks for), **acceptable** (what the company will take without further escalation), and **walk-away** (the point at which the negotiation stops and goes to the General Counsel). The ladder is set before the first counterparty call and is not revised mid-call.

The purpose of keeping these records is not the individual deal. It is to see which clauses the company concedes repeatedly, so the standard form can be changed rather than renegotiated forty times a year.

---

## Scenario A: Amberfield Logistics (co-102)

| Field | Value |
|---|---|
| Record | NEG-2026-0117 |
| Counterparty | Amberfield Logistics (co-102) |
| Counterparty profile | Enterprise customer, existing relationship, healthy payer, largest single account by annual contract value |
| Counterparty contact | Fiona McAllister-Grange, Deputy General Counsel |
| Purpose | Technical discovery for a proposed multi-year renewal and platform expansion, requiring exchange of architecture, security, and roadmap material in both directions |
| Paper | Counterparty paper (Amberfield standard mutual NDA, v9) |
| Opened | April 14, 2026 |
| Executed | May 8, 2026 |
| Cycle time | 17 business days against a 3 business day target for standard form |
| Final deviation level | D3 |
| Approved by | Naomi F. Aitken, General Counsel; Hannah T. Ostrowski, Chief Information Security Officer (audit rights) |
| Signed by | Naomi F. Aitken |

### Posture

Leverage sits with the counterparty. Amberfield is the company's largest account and the NDA is the gate to a renewal conversation the company wants. That is a reason to negotiate carefully, not a reason to sign anything. The team's instruction from the General Counsel at the outset was that no term in an NDA is worth a renewal, because a term the company concedes to its largest customer becomes the term every other enterprise customer's counsel asks for.

Accepting counterparty paper was itself the first decision. It was accepted because the counterparty's form is competently drafted, genuinely mutual, and the redline is shorter than the argument about whose paper to use.

### Issues

| # | Issue | Counterparty position | Target | Acceptable | Walk-away | Outcome |
|---|---|---|---|---|---|---|
| A-1 | Confidentiality duration | Perpetual for all Confidential Information | Three years' survival, indefinite for trade secrets | Five years' survival, indefinite for trade secrets | Perpetual for all information | **Settled at acceptable.** Five years' survival; trade secrets for so long as they remain trade secrets. |
| A-2 | Indemnity | Receiving Party indemnifies Disclosing Party for any breach, uncapped, including consequential loss | No indemnity in an NDA | No indemnity in an NDA | Any indemnity | **Settled at target.** Removed. Counterparty accepted that Section 8 equitable relief plus damages at law is the remedy set. |
| A-3 | Audit rights | Disclosing Party may audit Receiving Party's systems on 48 hours' notice, at Receiving Party's cost, twice per year | No audit right | Written self-attestation on request, no more than annually | On-site audit of production systems | **Settled at acceptable.** Annual written attestation on the counterparty's control questionnaire. CISO approved the questionnaire content before signature. |
| A-4 | Affiliate extension | Confidential Information may be shared with any Amberfield affiliate | Named affiliates only, listed in a schedule | Affiliates that are controlled subsidiaries, bound by the same terms, with the disclosing entity remaining responsible | Any affiliate, including affiliates acquired later | **Settled at acceptable.** Controlled subsidiaries only; Amberfield remains responsible for their compliance. |
| A-5 | Change of control | Silent | Termination right on a change of control to a competitor | Notice on change of control plus a thirty-day termination right | Assignment to a competitor without notice | **Settled at target.** Counterparty had the same concern and proposed the clause itself. |
| A-6 | Section 9 immunity notice | Absent from counterparty form | Insert verbatim | Insert verbatim | Any refusal | **Settled at target.** Inserted without discussion. |
| A-7 | Residual knowledge | Not raised by counterparty | Not offered | Not offered | Any residuals clause | Not raised. Not offered. |

### Assessment

Four of seven issues settled at target, three at acceptable, none at walk-away. The cycle time of seventeen business days is the real cost, and most of it was spent on A-3, where the counterparty's security team and the company's security team were arguing about a control questionnaire through two sets of lawyers. The recommendation to the program is to pre-clear a standard attestation questionnaire with the Chief Information Security Officer so that A-3 can settle at D2 rather than escalating to D3 every time an enterprise counterparty asks.

---

## Scenario B: Brightquarry Analytics (co-118)

| Field | Value |
|---|---|
| Record | NEG-2026-0139 |
| Counterparty | Brightquarry Analytics (co-118) |
| Counterparty profile | Mid-size analytics company, approximately 400 employees. Prospective data enrichment partner. No existing relationship. |
| Counterparty contact | Trevor Nakagawa, Head of Legal |
| Purpose | Evaluate a data enrichment integration, requiring exchange of data schemas, matching methodology, and sample outputs |
| Paper | Atticus Dundee standard form NDA-M-2026.1 |
| Opened | May 19, 2026 |
| Executed | June 9, 2026 |
| Cycle time | 14 business days |
| Final deviation level | D3 |
| Approved by | Naomi F. Aitken, General Counsel (residual knowledge) |
| Signed by | Naomi F. Aitken |

### Posture

Roughly symmetric. Both parties want the integration and neither needs it. The counterparty accepted the company's paper without argument, then returned a redline with a single substantial addition: a residual knowledge clause.

### The residual knowledge issue

The counterparty's opening clause read, in substance, that either party may use "any information retained in the memory of its personnel" without restriction, with no exclusion for trade secrets, no exclusion for information fixed in a tangible medium, and no carve-out for patents and copyrights.

That formulation is not a residuals clause. It is a licence, because personnel who have read source code and design documents retain a great deal in memory, and a clause that permits unrestricted use of everything remembered permits unrestricted use of nearly everything disclosed. The company's position, stated in the first call on May 21, 2026, was that a residuals clause of that shape would be refused and that the negotiation would end rather than continue on it.

The counterparty's stated reason for wanting the clause was real and was accepted as such: its engineers work across many customer integrations and cannot practically partition what they learn. That is a legitimate concern and it has a bounded answer.

| # | Issue | Counterparty opening | Target | Acceptable | Walk-away | Outcome |
|---|---|---|---|---|---|---|
| B-1 | Residual knowledge | Unrestricted use of anything retained in memory | No residuals clause | Optional Section B verbatim: unaided memory only, no trade secrets, no patent or copyright licence, no intentional memorization | Any residuals clause reaching trade secrets, or silent on patents and copyrights | **Settled at acceptable.** Optional Section B accepted verbatim by the counterparty on the second exchange. |
| B-2 | Definition of Confidential Information | Marking required at disclosure | No marking requirement | Marking within thirty days for oral disclosures only | Marking required for all disclosures | **Settled at acceptable.** Thirty-day confirmation for oral disclosures; written disclosures need no marking. |
| B-3 | Survival | Two years | Three years | Two years with trade secrets indefinite | Two years flat including trade secrets | **Settled at acceptable.** |
| B-4 | Return period | Ninety days | Thirty days | Sixty days | Over ninety days | **Settled at acceptable.** Sixty days. |
| B-5 | Governing law | Counterparty's home state | [STATE OF INCORPORATION] | Delaware | Anything outside the approved list | **Settled at acceptable.** Delaware, on the approved list, D1. |

### Assessment

Every issue settled at acceptable and none at target, which is what a symmetric negotiation with a competent counterparty looks like. The residuals clause is the item that matters for the program: this is the fourth time in twelve months that a mid-size technology counterparty has opened with an unbounded residuals clause and accepted Optional Section B verbatim once it was offered.

**Recommendation to the program.** Move Optional Section B out of the optional appendix and into a pre-approved D2 fallback, so that Commercial can offer it without a General Counsel approval each time. The approval is currently D3, which adds five business days to a negotiation whose outcome is already known. The protective conditions in the clause are what make it acceptable, and those conditions are fixed text that does not require case-by-case judgment.

---

## Scenario C: Torchbird Labs (co-123)

| Field | Value |
|---|---|
| Record | NEG-2026-0154 |
| Counterparty | Torchbird Labs (co-123) |
| Counterparty profile | Early-stage startup, 11 employees, venture-backed, holds a novel time-series compression technique the company's platform team wants to evaluate |
| Counterparty contact | Sasha Vukovic, Co-founder and Chief Executive Officer |
| Purpose | Technical evaluation of a compression library for possible licence or acquisition |
| Paper | Counterparty paper (Torchbird one-way NDA, converted to mutual at the company's request) |
| Opened | June 2, 2026 |
| Escalated | June 18, 2026 |
| Status as of July 1, 2026 | **NOT EXECUTED. Deal-breaker escalation open.** |
| Deviation level as presented | D4 |
| Escalated to | Naomi F. Aitken, General Counsel; Ophelia R. Sandoval, Chief Financial Officer |

### Posture

The counterparty has a genuinely differentiated technology and knows it. It is small, it is advised by counsel who mostly does financings, and it is frightened of a large company evaluating its technology and then building it. That fear is reasonable and the company's negotiators were instructed to treat it as reasonable rather than as posturing.

The company's leverage is that it is the counterparty's most credible near-term commercial partner. It chose not to use that leverage, on the General Counsel's instruction, because a startup that signs an NDA it does not understand under commercial pressure is a dispute waiting to happen.

### Issues

| # | Issue | Counterparty position | Target | Acceptable | Walk-away | Outcome |
|---|---|---|---|---|---|---|
| C-1 | **Liquidated damages** | **$50,000 per breach, payable on demand, with each disclosure to each recipient constituting a separate breach, and expressly stated not to be a penalty** | No liquidated damages | No liquidated damages | **Any liquidated damages figure** | **DEAL-BREAKER. Escalated June 18, 2026. Not conceded.** |
| C-2 | Non-solicitation | Five years, covering all Torchbird personnel whether or not contacted | Not offered in an evaluation NDA | Optional Section A at eighteen months, contact-based, with the general advertising carve-out | Anything over twenty-four months, or without the advertising carve-out | Open. Counterparty has not responded to the eighteen-month counter. |
| C-3 | Injunctive relief without bond | Injunction available without posting bond and with an agreed waiver of any requirement to prove irreparable harm | Standard Section 8 | Standard Section 8 plus an acknowledgment of irreparable harm | Waiver of the bond requirement, or an agreed stipulation that harm is presumed | Open. Company offered the acknowledgment; counterparty wants the bond waiver. |
| C-4 | Term and survival | Perpetual survival for everything | Three years, trade secrets indefinite | Five years, trade secrets indefinite | Perpetual for all information | Open. |
| C-5 | Mutuality | One-way, Torchbird disclosing only | Mutual | Mutual | One-way against the company | **Settled at target.** Converted to mutual on the first exchange without argument. |

### Why C-1 is a deal-breaker and not a negotiation

Under LEG-POL-013 Section 2, any liquidated damages or per-breach penalty figure is a D4 deal-breaker. Three reasons support the classification, and they are recorded here because the business team asked, reasonably, why $50,000 is a problem for a company of this size.

**It is not $50,000.** The clause makes each disclosure to each recipient a separate breach. A single misdirected email to a distribution list of forty people is, on the face of the clause, forty breaches and $2,000,000. The number in the clause is not the exposure; the multiplier is.

**It converts an evidentiary problem into an arithmetic one.** In an ordinary confidentiality dispute the claimant must prove loss. A liquidated damages clause removes that burden and replaces it with a count of disclosures, which is exactly the fact a claimant can establish from the company's own systems. The clause hands the counterparty a claim that is cheap to prove and expensive to defend.

**It is enforceable enough to matter and unenforceable enough to litigate.** A stipulation that a figure "is not a penalty" does not make it one or the other; that is decided against the actual harm at the time of contracting. The company would have a real argument that $50,000 per disclosure bears no relationship to any anticipated harm from an evaluation NDA. It would have that argument in a courtroom, two years and several hundred thousand dollars later.

### Alternatives offered

The company does not want to lose this evaluation and has put three alternatives to the counterparty, in writing on June 25, 2026, each of which addresses the counterparty's underlying fear without a penalty clause.

1. **A narrow, named-recipient evaluation.** Disclosure limited to four named engineers and one named product manager, listed in a schedule, each of whom signs a personal acknowledgment. No disclosure beyond the named list without written consent.
2. **A clean-room evaluation with an independent evaluator.** The counterparty's material is reviewed by an independent technical evaluator engaged jointly, who reports conclusions rather than implementation detail. The company sees the answer without seeing the technique.
3. **An evaluation fee with a standstill.** The company pays an evaluation fee and accepts a twelve-month standstill under which it will not develop a competing implementation of the specific technique disclosed, defined by reference to the disclosed materials rather than to the field.

Option 3 gives the counterparty a contractual remedy with a real measure of damages, which is what it is actually asking for. Option 2 gives it the strongest protection available and is the recommendation if the counterparty will not move on C-1.

### Current status

Escalation to the General Counsel and the Chief Financial Officer opened June 18, 2026. The General Counsel's direction, recorded June 19, 2026, is that no exception will be granted on C-1 and that the alternatives are to be pursued. The platform team has been told that the evaluation may not proceed on any informal basis, including a conversation "without documents," pending execution.

---

## Quarter Summary

| Record | Counterparty | Level | Cycle time | Outcome |
|---|---|---|---|---|
| NEG-2026-0117 | Amberfield Logistics (co-102) | D3 | 17 business days | Executed May 8, 2026 |
| NEG-2026-0139 | Brightquarry Analytics (co-118) | D3 | 14 business days | Executed June 9, 2026 |
| NEG-2026-0154 | Torchbird Labs (co-123) | D4 | Open | Deal-breaker escalation, not executed |

Forty-one confidentiality agreements were executed in the quarter. Thirty-one were D0 or D1 and cleared within the three business day target. The three records above account for thirty-one of the thirty-eight business days of negotiation time spent in the quarter, which is the argument for the two program recommendations: pre-clear the security attestation questionnaire (Scenario A) and move Optional Section B to a D2 fallback (Scenario B).
