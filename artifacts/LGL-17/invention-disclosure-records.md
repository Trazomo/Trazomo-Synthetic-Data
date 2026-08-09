# Invention Disclosure Records and Committee Dispositions

**ATTICUS DUNDEE INC. — Office of the General Counsel, IP**

| Field | Value |
|---|---|
| Document ID | LEG-IP-IDF-2026-Q2 |
| Form version | IDF-2025.2 |
| Owner | Devraj S. Iyer, Senior Counsel, IP |
| Committee | IP Committee, monthly |
| Period covered | Q2 2026 (April 1 to June 30, 2026) |
| Classification | Confidential, attorney-client privileged where marked |

---

## Scoring Method

Each disclosure is scored on six criteria on a 1 to 5 scale, where 5 is the most favorable. Criteria are weighted and the weighted total drives the recommendation band. The score informs the committee; it does not bind it, and any departure from the band is recorded with reasons.

| Criterion | Weight | 1 means | 5 means |
|---|---|---|---|
| Novelty | 20% | Anticipated by known art or by the company's own disclosure | No art located that discloses the combination |
| Non-obviousness | 25% | An ordinary practitioner would combine two known references to reach it | Combination is counterintuitive and produces an unexpected result |
| Subject-matter eligibility | 15% | Result-oriented claiming over a generic computer | A specific technical improvement to computer functioning that can be claimed structurally |
| Detectability of infringement | 15% | Server-side only, no observable signature | Observable in a product, a document, or an output artifact |
| Commercial and roadmap alignment | 15% | Off-roadmap or being deprecated | Core to a shipped or committed product |
| Ownership and chain of title | 10% | A contributor is unassigned or the position is unclear | Every contributor is an employee under a current assignment |

| Band | Weighted total | Default recommendation |
|---|---|---|
| STRONG | 4.00 to 5.00 | File |
| MODERATE | 2.80 to 3.99 | Evaluate; trade secret and defensive publication are live alternatives |
| WEAK | 1.00 to 2.79 | Do not file |

---

## IDF-2026-014

| Field | Value |
|---|---|
| Disclosure number | IDF-2026-014 |
| Title | Cross-tenant schema drift detection with automatic producer and consumer contract renegotiation |
| Submitted | April 22, 2026 |
| Inventors | Amara O. Nkemdirim (Principal Engineer); Wei-Lin Tsao (Staff Engineer) |
| Inventor status | Both employees; assignments of record executed at hire |
| Product | SignalPost |
| Committee date | May 14, 2026 |
| **Weighted score** | **4.60 (STRONG)** |
| **Disposition** | **FILE. Non-provisional direct. Foreign filing in EP and JP.** |

### 1. Problem addressed

When a producing service changes the shape of the events it emits, downstream consumers fail silently or drop fields. Existing approaches either freeze the schema, which blocks the producer, or version the schema, which pushes a coordination burden onto every consumer and does not scale past a few dozen services. In a multi-tenant deployment the problem compounds because the same logical stream carries tenant-specific extensions.

### 2. Description of the invention

The system maintains, for each producer-consumer pair, a machine-readable compatibility contract expressed as a set of field-level assertions rather than a whole-schema version. When a producer emits a change, the system computes a drift signature for the change and evaluates it against each consumer's assertion set in isolation. Where the drift is compatible with a consumer's assertions, the consumer is not notified and no coordination occurs. Where the drift is incompatible, the system attempts an automatic renegotiation: it proposes a narrowed assertion set derived from what the consumer actually reads, verified against the consumer's observed read pattern over a trailing window, and commits the narrowed contract if the consumer's runtime accepts a shadow evaluation.

The distinguishing step is that renegotiation is driven by observed read behavior rather than by declared schema, so a consumer that declares a dependency on a field it has never read is automatically narrowed out of the coordination path.

### 3. Prior art known to the inventors

Schema registries with backward and forward compatibility checking; consumer-driven contract testing in service architectures; two published applications located by a preliminary search on drift detection in event streams. None applies the observed read pattern as the basis for automatic contract narrowing.

### 4. Disclosure history

| Question | Answer |
|---|---|
| Publicly disclosed? | No |
| Offered for sale or sold? | No |
| Described in a customer proposal, RFP response, or demonstration? | No |
| In a shipped release? | Not yet. Targeted for SignalPost 4.2, committed for Q4 2026. |
| Described in a paper, talk, or preprint submitted anywhere? | No |
| Contributed to any external repository or standards body? | No |

Clean. No statutory bar in any jurisdiction and no grace period is being consumed.

### 5. Scoring

| Criterion | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| Novelty | 20% | 5 | 1.00 | Preliminary search located nothing on read-pattern-driven contract narrowing |
| Non-obviousness | 25% | 4 | 1.00 | The combination of drift signatures with observed read behavior is not an obvious substitution; a practitioner would reach for declared schema |
| Subject-matter eligibility | 15% | 5 | 0.75 | Claimable as a specific improvement to the operation of a distributed data system, with concrete steps and a measurable reduction in coordination |
| Detectability | 15% | 4 | 0.60 | Observable in the product's contract inspection output and in vendor documentation of any competing implementation |
| Commercial alignment | 15% | 5 | 0.75 | On the committed roadmap; identified by product as a differentiator against competing platforms |
| Ownership | 10% | 5 | 0.50 | Two employee inventors, assignments of record |
| **Total** | **100%** | | **4.60** | **STRONG** |

### 6. Committee disposition

**File.** Proceed directly to a non-provisional application rather than a provisional, because the disclosure is complete enough to support claims now and the product ships in Q4 2026. Instruct outside counsel (Nadia S. Feldkamp, Atticus Dundee LLP) to prepare and file. Target filing date August 31, 2026, which is before the Q4 release and before any customer demonstration.

Foreign filing in the European Patent Office and Japan, decision confirmed at the twelve-month Paris Convention deadline. No filing decision on other jurisdictions at this time.

**Hold on disclosure.** No conference submission, blog post, or customer demonstration of this functionality before the filing receipt. Communicated to the inventors and to the VP Engineering on May 14, 2026 and acknowledged in writing by both inventors.

---

## IDF-2026-015

| Field | Value |
|---|---|
| Disclosure number | IDF-2026-015 |
| Title | Incremental entitlement cache invalidation using dependency fingerprints |
| Submitted | May 6, 2026 |
| Inventors | Bartholomew Reiss (Senior Engineer); Amara O. Nkemdirim (Principal Engineer) |
| Inventor status | Both employees; assignments of record |
| Product | Platform entitlements, internal |
| Committee date | June 11, 2026 |
| **Weighted score** | **2.80 (MODERATE, at the lower band boundary)** |
| **Disposition** | **DO NOT FILE. Maintain as a trade secret. Defensive publication of the non-core portion.** |

### 1. Problem addressed

Recomputing an entitlement decision from the full role graph on every request is expensive. Caching the decision is cheap but stale, because a change anywhere in the role graph can invalidate an unpredictable set of cached decisions. The usual answer is to flush the whole cache on any change, which produces a load spike on every administrative edit.

### 2. Description of the invention

Each cached entitlement decision stores a fingerprint of the specific subgraph the decision depended on, computed as a rolling hash over the traversed nodes and edges. On a role graph mutation, the system computes the affected node set and invalidates only cached entries whose fingerprint includes an affected node. A secondary index maps nodes to the fingerprints that touched them so the invalidation is a lookup rather than a scan.

### 3. Prior art known to the inventors

Dependency tracking in incremental build systems is the direct analogue and is decades old. Reactive dependency graphs in user interface frameworks are the same idea with different vocabulary. Cache invalidation by tagged dependency is a documented pattern in at least two widely used caching products. The inventors identified these themselves in the disclosure form, which the committee noted with approval.

### 4. Disclosure history

| Question | Answer |
|---|---|
| Publicly disclosed? | No |
| In a shipped release? | Yes, internal platform service since March 2026. Not externally documented or exposed. |
| Described in a customer proposal or demonstration? | No |
| Contributed to any external repository? | No |

### 5. Scoring

| Criterion | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| Novelty | 20% | 3 | 0.60 | The application to entitlement resolution appears new; the mechanism is not |
| Non-obviousness | 25% | 2 | 0.50 | Applying incremental build dependency tracking to a cache is the kind of substitution an ordinary practitioner makes. Expect an obviousness rejection over a combination of two references. |
| Subject-matter eligibility | 15% | 2 | 0.30 | High risk of being characterized as a generic caching optimization performed on a computer. Claiming around this would require narrowing to the fingerprint construction, which narrows the claim to something a competitor can design around. |
| Detectability | 15% | 2 | 0.30 | Entirely server-side. A competitor's implementation would produce no observable signature. Enforcement would depend on discovery of source code. |
| Commercial alignment | 15% | 4 | 0.60 | Internal platform, material to performance, not a product differentiator sold to customers |
| Ownership | 10% | 5 | 0.50 | Two employee inventors, assignments of record |
| **Total** | **100%** | | **2.80** | **MODERATE, at the boundary** |

### 6. Committee disposition

**Do not file.** The committee accepted the band recommendation and records its reasons, because the score sits exactly on the boundary and a future reader is entitled to know why the tie broke as it did.

Two criteria dominated. A patent that cannot be detected in a competitor's product is an asset the company cannot enforce without discovery, and the estimated cost through issuance of $38,000 to $52,000 buys an unenforceable right. The eligibility risk compounds this: the claim scope that survives an eligibility challenge is likely to be narrow enough to design around in a sprint.

**Maintain as a trade secret.** The implementation is server-side and never leaves the company's environment, which is exactly the profile where trade secret protection is stronger than a patent. Access to the `platform-entitlements` repository is restricted to the platform team on the existing role-based control, and the confidentiality obligations in employment and contractor agreements apply. Referred to the Chief Information Security Officer to confirm the repository access list is current.

**Defensive publication of the non-core portion.** Publish the fingerprint construction technique, without the secondary index design or the mutation-to-node-set computation, in the company's engineering publication in Q4 2026. The purpose is to create prior art against a competitor patenting the same combination, at the cost of disclosing the least valuable third of the invention. Approved by the committee; draft to be reviewed by IP counsel before release.

---

## IDF-2026-016

| Field | Value |
|---|---|
| Disclosure number | IDF-2026-016 |
| Title | Anomaly score calibration using per-tenant analyst feedback loops |
| Submitted | June 3, 2026 |
| Named contributors | Wei-Lin Tsao (Staff Engineer, employee); Ingrid Halvorsen (independent contractor, engaged 2025) |
| **Weighted score** | **2.00 (WEAK)** |
| **Disposition** | **NO FILING. Barred in absolute-novelty jurisdictions since June 11, 2025; US grace period expired June 11, 2026. Chain of title defective. Remediation required.** |

### 1. Problem addressed

Anomaly detection models produce scores that mean different things in different tenants, because each tenant's baseline traffic differs. Analysts recalibrate thresholds by hand and the recalibration does not survive a model refresh.

### 2. Description of the invention

Analyst dispositions on scored events are captured as labeled feedback and used to fit a per-tenant calibration function that maps raw model scores to a common decision scale. The calibration function is refit on a rolling window and is versioned independently of the model, so a model refresh does not discard the tenant's accumulated calibration.

### 3. Disclosure history

**This is the section that decides the outcome.**

| Date | Event |
|---|---|
| 2025-06-11 | Wei-Lin Tsao presented "Making anomaly scores mean the same thing everywhere" at the Northbound Data Systems Summit. The talk described the calibration approach, including the per-tenant refit and the independent versioning. Slides were posted publicly on the conference site the same day and remain available. |
| 2025-06-11 | No pre-disclosure IP clearance was sought. The submission went through the conference committee and the speaker's manager. |
| 2026-06-03 | Disclosure submitted to the IP Committee, twelve months less eight days after the public disclosure. |
| 2026-06-11 | Committee reviewed. |

**Consequences.**

*United States.* Under 35 U.S.C. § 102(b)(1)(A), a disclosure made by an inventor one year or less before the effective filing date is not prior art against that inventor. The one-year grace period ran from June 11, 2025 and expired on **June 11, 2026**. The committee met on June 11, 2026. A filing on that day was theoretically available; it was not practical, because the disclosure form was incomplete, the contributor's rights were unresolved, and a same-day application would have been a rushed filing on an invention the committee had not concluded was worth filing on. The committee declined to file. The grace period has now expired and the inventor's own talk is prior art against the company.

*Europe, China, Japan, and other absolute-novelty jurisdictions.* Article 54 of the European Patent Convention and the corresponding provisions elsewhere admit no general grace period for an inventor's own disclosure. Rights in those jurisdictions were lost on **June 11, 2025**, the day of the talk, and were never recoverable.

The company therefore lost foreign rights twelve months before anyone in Legal learned the invention existed.

### 4. Ownership and chain of title

Ingrid Halvorsen contributed the calibration refit design. She was engaged under a 2025 statement of work that **did not incorporate the standard invention assignment exhibit**. There is no present assignment and no obligation to assign in the executed documents. On the current record she is a joint owner of any invention she co-invented.

Under 35 U.S.C. § 262, in the absence of an agreement each joint owner of a patent may make, use, offer to sell, and sell the patented invention without the consent of and without accounting to the other owners, and may license third parties on the same terms. A joint owner the company does not control can license a competitor.

A confirmatory assignment was requested from Ms. Halvorsen on June 15, 2026. No response as of the date of this record.

### 5. Scoring

| Criterion | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| Novelty | 20% | 1 | 0.20 | Anticipated by the inventor's own public disclosure of June 11, 2025 |
| Non-obviousness | 25% | 2 | 0.50 | Per-tenant calibration of classifier outputs is well documented; the independent versioning is a modest advance |
| Subject-matter eligibility | 15% | 3 | 0.45 | Arguable either way; would require careful claiming |
| Detectability | 15% | 2 | 0.30 | Inferable from product behavior only with effort |
| Commercial alignment | 15% | 3 | 0.45 | Shipped, useful, not differentiating |
| Ownership | 10% | 1 | 0.10 | Unassigned joint contributor |
| **Total** | **100%** | | **2.00** | **WEAK** |

### 6. Committee disposition

**No filing.** Foreign rights were lost on disclosure. The US grace period expired on the day of the committee meeting, and the invention would not have been worth filing on even inside the grace period on a 2.00 score.

**Actions ordered.**

| # | Action | Owner | Due | Status |
|---|---|---|---|---|
| 1 | Obtain a confirmatory assignment from Ingrid Halvorsen, with consideration. If refused, obtain at minimum a non-exclusive licence and a covenant not to assert. | Devraj S. Iyer | 2026-08-14 | Open, no response as of 2026-07-09 |
| 2 | Preserve the June 11, 2025 slides and the conference programme as dated prior art the company can assert defensively against a third party claiming the same subject matter | Devraj S. Iyer | 2026-07-09 | Complete |
| 3 | Audit all 2024 and 2025 contractor statements of work for the missing invention assignment exhibit and report the count | Aleksy Pietrzak | 2026-08-31 | Open |
| 4 | Institute mandatory pre-disclosure IP clearance for conference submissions, papers, preprints, public repositories, and customer demonstrations of unreleased functionality. Clearance owned by the submitting employee's manager, with a two-business-day review by IP counsel. | Theresa J. Muldoon and Devraj S. Iyer | 2026-08-31 | In progress; added to the program charter as Standing Rule 3 on 2026-07-01 |
| 5 | Brief the engineering organisation on the absolute-novelty rule, using this disclosure as the worked example, with the inventor's consent | Devraj S. Iyer | 2026-09-30 | Scheduled |

**Committee note.** The failure here was not the talk. Conference talks are good for the company and the committee does not want fewer of them. The failure was that no step existed between deciding to give a talk and giving it. That gap has now been closed by Action 4, and the audit in Action 3 will tell the committee how many other disclosures are sitting unassigned.

---

## Quarter Summary

| Disclosure | Score | Band | Disposition | Filing cost committed |
|---|---|---|---|---|
| IDF-2026-014 | 4.60 | STRONG | File, non-provisional plus EP and JP | $46,000 estimated through filing |
| IDF-2026-015 | 2.80 | MODERATE | Trade secret plus partial defensive publication | $0 |
| IDF-2026-016 | 2.00 | WEAK | No filing; remediation ordered | $0 |

Three disclosures received in the quarter against a target of six. Median time from submission to disposition: 26 days, against a 30-day target. One disclosure arrived after its foreign rights had already been lost, which is the metric the committee is actually worried about and which is not currently measured. A new metric, "disclosures received after a public disclosure of the same subject matter," is proposed for Q3.
