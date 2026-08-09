# Vendor Risk Assessment: DataPulse Analytics

**ATTICUS DUNDEE INC. — Legal Operations, Vendor Risk Program**

| Field | Value |
|---|---|
| Assessment ID | VRA-2026-031 |
| Vendor | DataPulse Analytics (co-119) |
| Vendor contact | Roland Pham, VP Security and Trust |
| Service | Product usage benchmarking and market analytics |
| Business owner | Theresa J. Muldoon, VP Engineering |
| Assessor | Cordelia B. Nwosu, Legal Operations Manager |
| Security reviewer | Hannah T. Ostrowski, Chief Information Security Officer |
| Privacy reviewer | Yusuf A. Barmani, Data Protection Officer |
| Assessment type | Initial |
| Initiated | April 7, 2026 |
| Completed | April 28, 2026 |
| Annual contract value | $84,000 |
| **Weighted risk score** | **1.35** |
| **Risk tier** | **LOW** |
| **Disposition** | **APPROVED** |
| Approved by | Vendor Risk Council, April 30, 2026 |
| Next reassessment | April 30, 2028 (24-month cadence for LOW) |
| Classification | Internal |

---

## 1. Scope of the Engagement

DataPulse Analytics receives aggregated product telemetry from the SignalPost platform and returns benchmark reports comparing the company's operational metrics against an anonymized industry cohort. The data flow is one-way outbound with a reporting return. DataPulse has no access to the company's production environment, no access to customer data, and no administrative credentials of any kind.

### 1.1 Data in scope

| Data category | In scope | Notes |
|---|---|---|
| Aggregated product telemetry | Yes | Event counts, latency percentiles, error rates, feature adoption rates, aggregated at the tenant level with tenant identifiers replaced by rotating pseudonyms |
| Personal data | No | Confirmed by the Data Protection Officer against a field-level data map dated April 14, 2026 |
| Special category personal data | No | |
| Customer content | No | |
| Privileged material or attorney work product | No | |
| Financial or payment data | No | |
| Source code | No | |

The pseudonym rotation schedule was reviewed. Tenant pseudonyms rotate quarterly and the mapping is held only in the company's environment. DataPulse cannot re-identify a tenant across quarters.

## 2. Scoring Method

Six domains scored 1 to 5, where 1 is the lowest risk and 5 is the highest, weighted to a composite between 1.00 and 5.00.

| Tier | Band |
|---|---|
| LOW | 1.00 to 1.79 |
| MODERATE | 1.80 to 2.59 |
| ELEVATED | 2.60 to 3.39 |
| HIGH | 3.40 to 4.19 |
| CRITICAL | 4.20 to 5.00 |

## 3. Scoring

| Domain | Weight | Score | Weighted | Basis |
|---|---|---|---|---|
| D1. Data sensitivity and scope | 25% | 1 | 0.25 | Aggregated, pseudonymized operational telemetry. No personal data, no customer content, no privileged material. |
| D2. Security posture and certification | 20% | 1 | 0.20 | SOC 2 Type II covering security, availability, and confidentiality, twelve-month period ended 2025-12-31, unqualified opinion, no exceptions. ISO/IEC 27001 certificate current to 2027-09-30. |
| D3. Privacy and cross-border transfer | 15% | 2 | 0.30 | No personal data in scope, so the transfer question is largely theoretical. Scored 2 rather than 1 because the vendor's own support tooling is hosted in a third country and a residual re-identification risk, however small, is not zero. |
| D4. Business continuity and concentration | 10% | 2 | 0.20 | Single source for benchmarking, but the service is advisory. Loss of the vendor delays a quarterly report; it does not stop any business process. |
| D5. Contractual and legal protections | 20% | 1 | 0.20 | Company paper. Standard confidentiality, no rights in company data beyond the stated purpose, no publicity, thirty-day termination for convenience, cyber liability of $10,000,000. |
| D6. AI, subprocessors, and subcontracting | 10% | 2 | 0.20 | Three named subprocessors, all disclosed, all with a right of objection on thirty days' notice. Contractual prohibition on training any model on company data. Scored 2 rather than 1 because the vendor operates machine learning internally and the prohibition is contractual rather than architectural. |
| **Composite** | **100%** | | **1.35** | **LOW** |

## 4. Evidence Reviewed

| # | Artifact | Date | Reviewer |
|---|---|---|---|
| 1 | SOC 2 Type II report, period ended 2025-12-31 | Received 2026-04-09 | H. T. Ostrowski |
| 2 | ISO/IEC 27001 certificate and statement of applicability | Received 2026-04-09 | H. T. Ostrowski |
| 3 | Penetration test executive summary, tested 2026-01-19 to 2026-01-30 | Received 2026-04-13 | H. T. Ostrowski |
| 4 | Field-level data map for the telemetry feed | Prepared 2026-04-14 | Y. A. Barmani |
| 5 | Subprocessor list with locations and functions | Received 2026-04-09 | Y. A. Barmani |
| 6 | Vendor security questionnaire, 142 items | Returned 2026-04-16 | H. T. Ostrowski |
| 7 | Certificate of insurance | Received 2026-04-20 | C. B. Nwosu |
| 8 | Executed master agreement and data processing addendum | Executed 2026-04-30 | C. B. Nwosu |

## 5. Findings

### 5.1 Positive findings

**F-1.** The SOC 2 Type II report is current, unqualified, and covers the confidentiality criterion, which many analytics vendors omit. The complementary user entity controls were reviewed and the company satisfies all four.

**F-2.** The contract prohibits DataPulse from using company data to train, tune, or evaluate any model, and from including company data in any benchmark cohort presented to another customer except in a form aggregated across at least twelve participants. The twelve-participant floor was negotiated and is the reason D6 did not score higher.

**F-3.** DataPulse holds no credentials to any company system. The feed is pushed outbound by the company on a schedule. This eliminates the most common analytics-vendor exposure, which is a standing read credential into a production data store.

### 5.2 Observations, non-blocking

**O-1.** The vendor's support tooling is hosted in a third country and support engineers can view submitted diagnostic bundles. Diagnostic bundles could in principle contain a tenant pseudonym alongside a timestamp, which is a weak re-identification vector for anyone holding the company's own logs. Advisory only. Recommended that diagnostic bundles be scrubbed of pseudonyms before submission.

**O-2.** The subprocessor objection right is thirty days, which is short if the objection requires the company to find an alternative vendor. Advisory. Recommended that the objection period be extended to sixty days at renewal.

**O-3.** No exit or data portability provision, because there is no company data held at the vendor at rest beyond ninety days. Confirmed by the vendor's retention statement and accepted.

## 6. Disposition

**APPROVED.** No mandatory conditions.

Two advisory recommendations, tracked but not gating:

| ID | Recommendation | Owner | Target |
|---|---|---|---|
| R-1 | Scrub tenant pseudonyms from diagnostic bundles before submission to vendor support | T. J. Muldoon | 2026-09-11 |
| R-2 | Extend the subprocessor objection period to sixty days at the next renewal | C. B. Nwosu | Renewal, 2027-04-30 |

**Approval scope.** This approval covers the data categories in Section 1.1 only. Introduction of any personal data, customer content, or source code into the feed requires reassessment before transmission, not after.

**Reassessment.** April 30, 2028, or immediately on any of: a new subprocessor, a change of control, a reported security incident, a change to the data categories in Section 1.1, or the introduction of model training on customer content.

## 7. Approvals

| Role | Name | Decision | Date |
|---|---|---|---|
| Assessor | Cordelia B. Nwosu | Recommend approval | 2026-04-28 |
| Security | Hannah T. Ostrowski | Concur | 2026-04-28 |
| Privacy | Yusuf A. Barmani | Concur | 2026-04-29 |
| Procurement | Grady L. Thomsen | Purchase order released | 2026-04-30 |
| Vendor Risk Council | Chair: C. B. Nwosu | **Approved** | 2026-04-30 |
