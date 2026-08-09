# Matter File and Assessment: Departing Contractor, Trade Secret and Restrictive Covenant Exposure

**ATTICUS DUNDEE LLP — Litigation Department**

ATTORNEY WORK PRODUCT — PRIVILEGED AND CONFIDENTIAL
PREPARED IN ANTICIPATION OF LITIGATION

| Field | Value |
|---|---|
| Matter number | 26-0788 |
| Matter name | Atticus Dundee Inc. adv. Verhoeven (trade secret and restrictive covenant) |
| Client | Atticus Dundee Inc. (co-002) |
| Client contact | Serena B. Alcaraz, Associate General Counsel, Employment and Litigation |
| Adverse party | Jonah P. Verhoeven (individual, former independent contractor) |
| Potential additional defendant | Perigee Systems (co-121) |
| Intake record | INT-2026-0433, high-value queue |
| Estimated matter value | $750,000 |
| Intake response deadline | 14 days from intake, June 30, 2026. Met. |
| Anticipated forum | United States District Court for the Eastern District of Calloway |
| Supervising partner | Harold V. Amundsen |
| Handling attorney | Simone A. Ratliffe, Associate |
| Date opened | June 16, 2026 |
| Report date | July 10, 2026 |
| Matter status | Pre-suit. Preservation complete. Forensic analysis in progress. Filing decision pending. |

---

## 1. Summary

An independent contractor who wrote a material portion of the client's data ingestion pipeline finished his engagement on May 29, 2026 and began work at a direct competitor on June 15, 2026. In the eleven days before his engagement ended he cloned three source repositories he had no assigned work in, and 1.4 gigabytes of data left the client's environment to personal cloud storage. His contract contains a non-competition covenant, a non-solicitation covenant, and an invention assignment. His credentials were not disabled until June 11, 2026, thirteen days after the engagement ended.

The client's exposure is real and the evidence is better than average. Three problems constrain the case. First, the restrictive covenants sit in an independent contractor agreement, which raises both an enforceability question and a classification question that cuts against the client if litigated. Second, the confidentiality provision omits the notice required by 18 U.S.C. § 1833(b), which forfeits exemplary damages and attorney's fees under the federal statute. Third, the client's offboarding controls for contractors are weak enough that the defense will use them to argue the information was not the subject of reasonable measures to keep it secret, which is an element of the claim, not a talking point.

This report was delivered to the client on June 30, 2026 in satisfaction of the fourteen-day response deadline attached to the intake record, and is updated here as of July 10, 2026.

## 2. Intake and Escalation

The matter was reported to the firm by Serena B. Alcaraz on June 16, 2026 at 08:52. It entered the high-value intake queue because the client's preliminary exposure estimate of $750,000 exceeded the $500,000 critical-risk threshold that triggers automatic escalation under the intake rules. Automatic escalation carries a fourteen-day response obligation: a substantive assessment and recommended plan must reach the client within fourteen days of intake.

| Intake field | Value |
|---|---|
| Intake record | INT-2026-0433 |
| Category | Employment / trade secret |
| Sub-path | Dispute |
| Reported value | $750,000 |
| Routing | High-value queue, automatic escalation above the $500,000 critical-risk threshold |
| Assigned | H. V. Amundsen (partner), S. A. Ratliffe (associate) |
| Response due | June 30, 2026 |
| Response delivered | June 30, 2026 |

## 3. The Contractor and the Contract

**Engagement.** Jonah P. Verhoeven was engaged under an Independent Contractor Services Agreement dated February 5, 2024 ("ICSA"), Statement of Work 4, as a senior backend engineer on the SignalPost ingestion pipeline. He invoiced monthly against an hourly rate and was reported on Form 1099-NEC for tax years 2024 and 2025. He was never on the client's payroll and never received employee benefits.

**Working reality.** The intake materials record that Mr. Verhoeven attended the daily standup of the client's Data Platform team, was assigned work through the same ticketing queue as employees, used client-issued equipment, and reported to an employee engineering manager who set his priorities and reviewed his code. He worked substantially full time for twenty-seven months. This is set out plainly because it is the client's principal litigation risk, not because it is a matter of doubt.

**Relevant contract terms.**

| Provision | Substance |
|---|---|
| ICSA § 8 (Confidentiality) | Perpetual obligation as to trade secrets; five years as to other confidential information. **Contains no notice under 18 U.S.C. § 1833(b).** |
| ICSA § 9.1 (Non-competition) | Twelve months following termination, contractor shall not provide services to any business that competes with company in data ingestion, pipeline orchestration, or workflow automation for regulated industries. No geographic limitation. No compensation for the restricted period. |
| ICSA § 9.2 (Non-solicitation, customers) | Eighteen months. Covers customers the contractor had contact with or confidential information about. |
| ICSA § 9.3 (Non-solicitation, personnel) | Eighteen months. Covers employees and contractors. |
| ICSA § 10 (Return of materials) | Return or certified destruction of all company materials within five business days of termination. **No certificate was requested or received.** |
| Exhibit B (Invention Assignment) | Present assignment of all inventions conceived in the course of the services, with a further assurances covenant and power of attorney. Signed February 5, 2024. |
| ICSA § 17 (Governing law and forum) | Calloway law; exclusive jurisdiction in the state and federal courts sitting in Calloway County, Calloway. |

**Restricted period.** Twelve months from May 29, 2026 expires **Saturday, May 29, 2027**.

## 4. Chronology

| Date | Event | Source |
|---|---|---|
| 2024-02-05 | ICSA and Exhibit B executed | Contract file |
| 2026-04-30 | Client notifies contractor that SOW 4 will not be renewed; end date set at 2026-05-29 | Procurement email thread |
| 2026-05-18 to 2026-05-27 | Repository activity outside assigned workstream, see Part 5.1 | Version control audit log |
| 2026-05-26 22:14 to 23:47 | 1.4 GB transferred from a client-issued laptop to a personal cloud storage account | Endpoint data loss prevention alert DLP-2026-4471 |
| 2026-05-29 | Engagement ends. No exit interview. No return-of-materials certificate requested. | HR and procurement records |
| 2026-06-08 | Security operations triages a backlog of DLP alerts and surfaces DLP-2026-4471, thirteen days after it fired | Security ticket SEC-2026-2210 |
| 2026-06-11 | Directory account, VPN certificate, and source control access revoked. Thirteen days after the engagement ended. | Identity management log |
| 2026-06-15 | Contractor's public professional profile updated to show Staff Engineer, Perigee Systems, start date June 15, 2026 | Screen capture, hashed and preserved |
| 2026-06-16 | Matter reported to the firm; high-value intake; fourteen-day response clock starts | INT-2026-0433 |
| 2026-06-19 | Litigation hold issued to eleven custodians at the client | Hold notice LH-2026-0788 |
| 2026-06-22 | Forensic examiner retained by counsel; imaging of the returned laptop begins | Engagement letter, examiner file |
| 2026-06-25 | Preservation demand letters sent to Mr. Verhoeven and to Perigee Systems by certified mail and email | Correspondence file |
| 2026-06-30 | Assessment and recommended plan delivered to client. Fourteen-day intake deadline satisfied. | This report, initial version |
| 2026-07-06 | Perigee Systems counsel acknowledges the preservation demand; denies receipt of client materials; declines to identify the contractor's assigned project | Letter from Perigee counsel |
| 2026-07-08 | No response from Mr. Verhoeven | Correspondence file |

## 5. Evidence

### 5.1 Version control activity

The client's version control audit log records the following actions by Mr. Verhoeven's account between May 18 and May 27, 2026. His assigned workstream during that period was confined to the `signalpost-ingest` repository.

| Date | Repository | Action | In assigned workstream |
|---|---|---|---|
| 2026-05-18 | `signalpost-ingest` | 4 commits, 2 pull requests | Yes |
| 2026-05-19 | `ledgerline-core` | Full mirror clone | No |
| 2026-05-21 | `signalpost-ingest` | 2 commits | Yes |
| 2026-05-22 | `platform-entitlements` | Full mirror clone | No |
| 2026-05-26 | `ml-anomaly-scoring` | Full mirror clone | No |
| 2026-05-26 | `signalpost-ingest` | Full mirror clone | Yes, but a mirror clone is not a normal development action |
| 2026-05-27 | Multiple | Access token rotated by user, then unused | No |

A mirror clone copies the complete history of a repository including deleted branches. It is not a step in ordinary development work, and Mr. Verhoeven had never performed one in the preceding twenty-six months. Three of the four target repositories were outside anything he had ever committed to.

### 5.2 Data loss prevention alert DLP-2026-4471

Fired 2026-05-26 at 22:14, closed by automated rule at 23:47 after the transfer completed. Classification of the transferred content is not available from the alert metadata alone; the examiner is reconstructing it from the endpoint journal. Volume transferred: 1.4 GB. Destination: a personal cloud storage account not on the client's approved list. The alert sat unreviewed for thirteen days.

### 5.3 Forensic examination

Vivian Sørensen, EnCE, was retained by counsel on June 22, 2026. The client-issued laptop was returned on May 29, 2026, held in an unlocked equipment cabinet in the client's facilities office until June 22, 2026, and then imaged. Chain of custody before June 22 is incomplete and that gap is documented in the examiner's intake form. Work in progress as of the report date covers shellbag and link-file analysis, USB device history, the endpoint journal, and browser artifacts for the cloud storage destination.

**Preliminary observations, subject to the final report.** A USB mass storage device with a serial not on the client's asset register was connected on 2026-05-27 at 19:06. No evidence of a wiping utility. The user profile was not deleted.

### 5.4 What the client cannot currently show

The client cannot presently show what was in the 1.4 GB, cannot show that any file was opened after transfer, and cannot show that any client material has been used at or transferred to Perigee Systems. Access to the destination cloud account and to Mr. Verhoeven's personal devices requires either his cooperation or an order. This gap is the single most important open item on the file.

## 6. Trade Secret Identification

A claim fails if the plaintiff cannot identify the trade secret with particularity, and courts increasingly require that identification early. The client and counsel have provisionally identified four candidates.

| ID | Asserted trade secret | Strength | Note |
|---|---|---|---|
| TS-1 | The adaptive backpressure and reordering algorithm in `signalpost-ingest`, including tuning constants derived from two years of production telemetry | Strong | Not published, not in any patent application, materially non-obvious, and the tuning constants have independent economic value |
| TS-2 | The entitlement resolution model in `platform-entitlements` | Moderate | Architecture is conventional. The specific policy compilation step may qualify. |
| TS-3 | Feature set and training methodology for `ml-anomaly-scoring` | Moderate to strong | Feature engineering is the value; the model weights are less important |
| TS-4 | Customer-specific pipeline configurations for eleven named accounts | Weak as a trade secret, strong as confidential information | These are more naturally a contract and confidentiality claim than a trade secret claim |

Reasonable measures to maintain secrecy are an element under both 18 U.S.C. § 1839(3)(A) and the state analog. The client's measures are mixed: repository access was role-based and logged, the ICSA imposed confidentiality, and data loss prevention tooling was deployed and did in fact fire. Against that, the alert went unreviewed for thirteen days, access was not revoked for thirteen days after the engagement ended, no return-of-materials certificate was requested, and no exit process applied to contractors at all. The defense will build its reasonable-measures argument out of those four facts, and it is a real argument rather than a rhetorical one.

## 7. Claims Assessment

### 7.1 Defend Trade Secrets Act, 18 U.S.C. § 1836(b)

Available on TS-1 and TS-3, subject to the interstate commerce element, which is satisfied. Acquisition by improper means and the threat of use are both pleadable on the mirror clone plus transfer plus immediate competitive employment.

**Exemplary damages and attorney's fees are not available.** Section 1833(b)(3)(A) requires that an employer provide notice of the whistleblower immunity in any contract or agreement with an employee that governs the use of a trade secret or other confidential information, entered into or updated after May 11, 2016. Section 1833(b)(4) defines "employee" to include any individual performing work as a contractor or consultant. ICSA § 8 governs the use of confidential information, was entered into on February 5, 2024, and contains no such notice. Under § 1833(b)(3)(C) the consequence is that in an action against that individual the employer may not be awarded exemplary damages under § 1836(b)(3)(C) or attorney's fees under § 1836(b)(3)(D).

Compensatory relief, injunctive relief, and unjust enrichment under § 1836(b)(3)(A) and (B) remain available. The practical effect is that the fee-shifting leverage counsel would ordinarily use to force early resolution is not there.

**Ex parte seizure under § 1836(b)(2) was considered and rejected.** The extraordinary circumstances showing is not made out where the client can serve process, the defendant has not been shown to be evading, and a preservation demand has already gone out without any evidence of destruction. Seeking and losing a seizure order would damage the client's credibility for the preliminary injunction that matters.

### 7.2 Calloway Uniform Trade Secrets Act, Calloway Rev. Stat. § 41-2101 et seq.

Parallel claim on the same facts. Two differences matter. The state act permits exemplary damages up to twice compensatory for willful and malicious misappropriation, and it is not subject to the § 1833(b) notice forfeiture. The state statute also preempts the client's conversion and unjust enrichment claims to the extent they rest on the same misappropriation, which is why those are pleaded in the alternative in the draft complaint and not as independent theories.

### 7.3 Breach of contract

The strongest claim, and the one least dependent on forensic reconstruction.

- **ICSA § 8.** Breach is provable from the mirror clones and the transfer without proving the content qualifies as a trade secret.
- **ICSA § 10.** No certificate of return or destruction was delivered. Breach is established on the face of the record. Damages are nominal but the breach supports specific performance of the return obligation, which is what the client actually wants.
- **Exhibit B.** If any of the transferred material embodies an invention conceived during the services, the assignment already operated. This matters most if Mr. Verhoeven or Perigee Systems seeks patent protection on anything derived from the pipeline work. A watch has been placed on published applications naming him as an inventor.
- **ICSA § 9.1.** See Part 7.5.

### 7.4 Tortious interference and claims against Perigee Systems

A claim against Perigee Systems for tortious interference with contract requires knowledge of the covenant. Nothing currently shows that Perigee knew of the ICSA before June 25, 2026, when the preservation demand put it on notice. From June 25 forward, continued employment of Mr. Verhoeven in a competing role with knowledge of the covenant supports the claim, and its counsel's July 6, 2026 refusal to identify his assigned project is unhelpful to Perigee on the knowledge element going forward.

Recommendation is to hold this claim. Suing a competitor for hiring an engineer, on a covenant of doubtful enforceability, invites a counterclaim and converts a controllable dispute into a market event. Name Perigee only if the forensic work shows client material inside Perigee's environment.

### 7.5 Enforceability of the non-competition covenant

This is the weakest link in the client's position and the assessment does not soften it.

**Consideration.** The covenant was signed at the outset of the engagement in exchange for the engagement itself, which is adequate. Not a problem.

**Reasonableness.** Twelve months is defensible. The scope is not. Section 9.1 bars providing services to any business competing in three broad categories with **no geographic limitation and no compensation during the restricted period**. Calloway follows the general rule that a restraint must be no greater than necessary to protect a legitimate interest. A worldwide bar on an engineer's entire field is unlikely to be enforced as written. Whether the court blue-pencils, reforms, or refuses to enforce is the pivotal question, and the answer varies by judge within the district.

**The classification problem.** The client engaged Mr. Verhoeven as an independent contractor and reported him on Form 1099-NEC while, on the client's own description, directing his work, setting his hours through the team's process, supplying his equipment, and reviewing his output for twenty-seven months. If the client sues to enforce a covenant that depends on characterizing him as bound by employment-style restraints, it invites a defense and likely a counterclaim that he was misclassified. That counterclaim reaches overtime, benefits, and tax exposure for twenty-seven months, and it is not limited to him. Counsel's judgment is that the expected value of enforcing § 9.1 is negative once this risk is priced.

**Recommendation.** Do not seek to enforce § 9.1 at this stage. Base the preliminary injunction on the confidentiality and trade secret claims, which do not require the client to characterize the relationship at all.

### 7.6 Computer Fraud and Abuse Act, 18 U.S.C. § 1030

Not recommended. Mr. Verhoeven had authorized access to `signalpost-ingest`. Whether he had authorized access to the other three repositories is a role-permission question the client is still reconstructing. Following *Van Buren v. United States*, 593 U.S. 374 (2021), a person who accesses information he is authorized to obtain does not exceed authorized access by misusing it, and the gates-up-or-down framing makes this claim depend entirely on whether the repository permissions were actually closed to him. Preliminary indication is that the three repositories were readable by anyone in the engineering group. If that holds, the claim fails and pleading it costs credibility.

## 8. Relief and Strategy

**Primary objective.** Get the client's material back and confirm it has not propagated, quickly, with the least possible market noise.

**Recommended sequence.**

1. **Complete the forensic report.** Nothing should be filed before the examiner reports. Target July 24, 2026.
2. **Second demand to Mr. Verhoeven** with a proposed stipulated protocol: a neutral examiner images his personal devices and the cloud account, returns and deletes client material, and certifies. Offer to bear the examiner's cost. Many of these matters end here.
3. **If refused, move for a preliminary injunction** under the DTSA and the state act seeking return, forensic inspection, and a prohibition on use and disclosure. Do not seek to enjoin his employment.
4. **Hold the claim against Perigee Systems** unless the forensic work places client material inside Perigee's environment.
5. **Do not plead** the Computer Fraud and Abuse Act count or the § 9.1 non-competition count in the initial complaint. Both can be added if facts develop; neither can be unpleaded once the misclassification defense is invited.

**Budget.** Phase 1 (forensics, demand, and preservation) $85,000 to $110,000. Phase 2 (complaint and preliminary injunction through hearing) $240,000 to $310,000. Phase 3 (expedited discovery to resolution) $300,000 to $400,000. The client's $750,000 exposure estimate is consistent with a case resolved in Phase 2 or early Phase 3.

## 9. Client-Side Control Findings

These are findings about the client's own program. They are recorded here because they will be discovery targets and because they are cheap to fix.

| ID | Finding | Consequence in this matter | Recommendation |
|---|---|---|---|
| CF-1 | Contractors are outside the offboarding workflow. No exit interview, no return-of-materials certificate, no access review. | Directly supports the reasonable-measures defense; also the reason the return obligation in § 10 was never enforced. | Extend the offboarding checklist to every non-employee worker; make the return certificate a condition of final invoice payment. |
| CF-2 | Access revocation took thirteen days after a known end date. | Same. Also creates a live-credential window after departure. | Automate deprovisioning off the engagement end date in the contractor record, not off a manual ticket. |
| CF-3 | Data loss prevention alert sat unreviewed for thirteen days. | The client detected the event and then did not act on it for two weeks. That is worse in front of a court than not detecting it. | Route high-severity exfiltration alerts to a paged queue with a defined response time. |
| CF-4 | The contractor template omits the 18 U.S.C. § 1833(b) notice. | Forfeits exemplary damages and fees under the federal statute in this matter and in every other matter under the same template. | Amend the template immediately. Add the notice to all agreements on renewal. The forfeiture is per-agreement and cannot be cured retroactively for this matter. |
| CF-5 | Section 9.1 is a global, uncompensated, field-wide restraint applied uniformly to contractors. | Unlikely to be enforceable and dangerous to attempt to enforce given classification exposure. | Narrow to a customer and confidential-information restraint. Remove the general competition bar from the contractor form. |
| CF-6 | Twenty-seven month engagement with employee-style direction and control, reported on Form 1099-NEC. | Misclassification counterclaim exposure that exceeds the value of this matter. | Separate review, outside this matter, of the contractor population. |

## 10. Preservation

Litigation hold LH-2026-0788 issued June 19, 2026 to eleven custodians, comprising the engineering manager, four members of the Data Platform team, two security operations analysts, the procurement owner, the HR business partner, the associate general counsel, and the systems owner for the version control platform. Automated deletion suspended on mail, chat, version control audit logs, endpoint telemetry, and identity logs. Acknowledgements received from ten of eleven custodians; the eleventh acknowledgement is tracked as an open item.

Preservation demands were sent on June 25, 2026 to Mr. Verhoeven and to Perigee Systems. Perigee acknowledged on July 6, 2026. Mr. Verhoeven has not responded.

## 11. Open Items

| ID | Item | Owner | Due | Status |
|---|---|---|---|---|
| OI-1 | Final forensic report, including reconstruction of the transferred file set | V. Sørensen | 2026-07-24 | In progress |
| OI-2 | Confirm repository permission state as of May 2026 for the three non-workstream repositories | Client, systems owner | 2026-07-17 | Open |
| OI-3 | Second demand with stipulated inspection protocol | S. A. Ratliffe | 2026-07-28 | Drafted, held pending OI-1 |
| OI-4 | Eleventh custodian hold acknowledgement | Client, ACG counsel | 2026-07-15 | Open |
| OI-5 | Watch for published patent applications naming J. P. Verhoeven as inventor | Firm IP group | Standing, quarterly | Active |
| OI-6 | Client decision on whether to name Perigee Systems | S. B. Alcaraz | After OI-1 | Pending |
| OI-7 | Amend contractor template to add the 18 U.S.C. § 1833(b) notice | Client, contracts | 2026-08-14 | Open |

## 12. Research Audit Trail

Recorded under Litigation Department Practice Standard 9.1, which requires that the research supporting a pre-suit assessment be reconstructible by a person who did not perform it.

| Field | Value |
|---|---|
| Researcher | Simone A. Ratliffe, Associate, admitted 2021 |
| Supervising attorney | Harold V. Amundsen, Partner |
| Matter | 26-0788 |
| Research period | June 22, 2026 through July 2, 2026 |
| Total recorded research time | 21.4 hours |
| Jurisdictions researched | Federal (Eastern District of Calloway and the circuit); Calloway state |
| Currency of authorities | All authorities citator-checked on July 2, 2026. No negative treatment identified for any authority relied on. |
| Verification standard applied | Every proposition in Parts 6 and 7 traced to primary source text read in full. No authority cited from a secondary summary alone. |
| AI assistance | Internal drafting assistant used for issue outlining and first-pass summarization under the firm's Legal AI Acceptable Use Policy. Matter identifier logged in the AI audit record. No client-confidential text submitted outside the approved environment. Every output verified against primary sources by the named researcher before use. No authority in this report was sourced from an assistant output. |

### 12.1 Query log

| Date | Source | Query or retrieval | Results reviewed |
|---|---|---|---|
| 2026-06-22 | Commercial research database, federal | Statutory text and annotations, 18 U.S.C. §§ 1836, 1839, 1833 | Full statutory text; 12 annotations |
| 2026-06-22 | Commercial research database, federal | Notice requirement under § 1833(b)(3) applied to contractors and consultants | 9 cases, 4 read in full |
| 2026-06-23 | Commercial research database, federal | Ex parte seizure under § 1836(b)(2), extraordinary circumstances standard | 14 cases, 6 read in full |
| 2026-06-24 | Commercial research database, federal | Exceeds authorized access after *Van Buren*, employee and contractor cases | 21 cases, 8 read in full |
| 2026-06-25 | Commercial research database, Calloway | Calloway Uniform Trade Secrets Act, preemption of common law claims | 17 cases, 7 read in full |
| 2026-06-26 | Commercial research database, Calloway | Reasonableness and reformation of restrictive covenants; independent contractor covenants | 33 cases, 11 read in full |
| 2026-06-29 | Commercial research database, federal and Calloway | Identification of trade secrets with particularity; timing of the identification requirement | 19 cases, 6 read in full |
| 2026-06-30 | Commercial research database, Calloway | Misclassification counterclaim exposure; look-back period and remedies | 8 cases, 3 read in full; 2 agency publications |
| 2026-07-01 | Court dockets | Preliminary injunction outcomes in trade secret matters in the district, 2021 to 2026 | 28 dockets, 11 opinions reviewed |
| 2026-07-02 | Citator | Currency check on all 41 authorities relied on | 41 checked, 0 negative |

### 12.2 Authorities relied on

Federal statutes: 18 U.S.C. § 1030; 18 U.S.C. § 1833(b); 18 U.S.C. § 1836; 18 U.S.C. § 1839. Federal case law: *Van Buren v. United States*, 593 U.S. 374 (2021). State: Calloway Rev. Stat. § 41-2101 et seq. Rules: Fed. R. Civ. P. 65; Fed. R. Civ. P. 26(f) as applied to expedited discovery.

## 13. Certification

This assessment states counsel's present views on an incomplete record. The forensic examination is not finished and the client has not yet reconstructed the repository permission state. The recommendations in Part 8 should be revisited when Open Items OI-1 and OI-2 close.

Simone A. Ratliffe, Associate
Date: July 10, 2026

Reviewed and approved. Concur in the recommendation not to plead the non-competition count or the Computer Fraud and Abuse Act count in the initial complaint.

Harold V. Amundsen, Partner
Date: July 10, 2026
