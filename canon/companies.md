# Canon Companies

Universe bible for Trazomo-Synthetic-Data. Every entity here is fictional. Names marked **adopted** already appear in shipped legal content and are kept so re-grounding is a numbering exercise, not a rewrite; names marked **proposed** are new with this consolidation. All supporting-cast names were confirmed by Salvador and passed the real-company collision check on 2026-08-08 (medium and high-risk names replaced; record in the Trazomo repo at `docs/plans/2026-08-08-verification-canon-pm-tools.md`).

Source: 2026-08-08 program consolidation (`docs/plans/2026-08-08-program-consolidation.md`), which merged the entity proposals of the legal coverage matrix and the five track implementation plans into one roster. This file replaces the prior `canon/companies.md`, which defined only co-001 and co-002.

## ID conventions

| Range | Meaning |
|---|---|
| co-001 to co-099 | Protagonist / anchor entities (decided, stable) |
| co-100 | Larkspur Design & Build (decided, stable) |
| co-101 to co-129 | Atticus Dundee ecosystem supporting cast (assigned below) |
| co-131 to co-139 | Larkspur local cast (assigned below) |
| co-140 and up | Generator-produced population (CRM accounts, contacts, bulk fixtures; neutral generated names) |

Entities that exist only inside one artifact (for example the holding companies, subsidiaries, and fund vehicles inside the LGL-08 corporate family tree) live in that artifact's spec, not in this roster.

Named people (firm associates, co-002 employees and managers, candidates, the Larkspur crew, household members, beneficial owners) belong in `canon/people.md`, which does not exist yet and is a build dependency of CORE-04, the HR track, and `smb-shift-to-payroll-readiness`.

## Anchors (decided 2026-08-08)

| ID | Name | Role | Cross-path relationships |
|---|---|---|---|
| co-001 | Atticus Dundee LLP | The fictional law firm. Legal-track protagonist (firm perspective). | Outside counsel to co-002: engagement letter LGL-05, invoice CORE-02 (reviewed in legal `outside-counsel`, routed in `finance-intake-routing`). Its own matter portfolio drives LGL-22, its AI governance bundle LGL-16. |
| co-002 | Atticus Dundee Inc. | The fictional corporate entity: a roughly 600-person B2B software company selling a workflow and collaboration SaaS with a small-team tier (product defined 2026-08-08; the Larkspur subscription rides the small-team tier). Protagonist of the finance, HR, revenue, and operations tracks; legal-track protagonist (in-house perspective); flagship client of co-001. | Customer on the CORE-01 MSA with co-101. Its books (FIN), people (CORE-04, HR), sell side (CORE-03, REV), delivery teams (OPS), policy library (CORE-05), IP and vendor program (LGL-17), and self-service legal portal (LGL-21) all live here. Commercial client of co-100 (small office refresh). |
| co-100 | Larkspur Design & Build | Small residential interior-design-and-build studio, about 9 employees. SMB-track protagonist; the client-record spine of every SMB module. | Serves co-002 on a small office refresh (SMB-05). Also holds a small subscription to co-002's product, satisfying the "client of co-002" reading of the canon decision and giving revenue an SMB-segment fixture. Confirm or trim one of the two directions (open item). |

## Atticus Dundee ecosystem (co-101 to co-129)

| ID | Name (status) | Role | Cross-path relationships |
|---|---|---|---|
| co-101 | Copperline Software (proposed) | SaaS vendor to co-002, annual contract | The CORE-01 MSA counterparty (legal contract cluster); prepaid/amortization source in `finance-accruals-and-prepaids`; the vendor contract gating a milestone in `operations-brief-to-project-plan`; integration partner in the operations handoff log (OPS-13) |
| co-102 | Amberfield Logistics (proposed) | Enterprise customer of co-002, healthy payer | Legal `crm-integration`'s "Enterprise Renewal FY27" record (CORE-03 view); finance AR aging baseline (FIN-04); revenue champion-source account (the old closed-won deal in REV-03); large-counterparty NDA scenario in LGL-17 |
| co-103 | Fernwell Retail Group (proposed) | Customer of co-002 with a collections problem | Finance collections and credit-hold fixtures (FIN-04, FIN-15, FIN-16); appears in the revenue win/loss corpus (REV-05) |
| co-104 | Anchor Point Bank (proposed) | Primary bank of co-002 | Bank feed for `finance-cash-bank-reconciliation` (FIN-01), bank balances for FP&A (FIN-32) |
| co-105 | Millgate Insurance Services (proposed) | Insurance and facilities vendor to co-002 | Second prepaid schedule source (FIN-12), deliberate distractor from co-101's pattern |
| co-106 | TalentForce HR Platform (adopted) | HR, payroll, and benefits platform vendor to co-002 | Critical-risk conditionally-approved vendor assessment in LGL-17; accrual source and SoD test surface in finance (FIN-07, FIN-11); the HRIS-adjacent vendor backdrop for the HR track |
| co-107 | Cedarline Office Supply (proposed) | Goods vendor to co-002 | Planted bank-detail change, the fraud-pattern flag in `finance-po-invoice-payment-match` (FIN-07) |
| co-108 | Palisade Labs (proposed) | NDA counterparty of co-002 | The LGL-02 mutual NDA (standard template plus broken QA twin); the NDA that can gate an operations milestone |
| co-109 | Birchcroft Properties (proposed) | Landlord of co-002 | The LGL-03 commercial lease (4-field extraction exercise) |
| co-110 | CloudHost Inc. (adopted) | Cloud-hosting provider, former vendor of co-002 | The SLA-dispute thread: LGL-07 standard intake record, then the LGL-04 settlement agreement |
| co-111 | Calder & Voss LLP (proposed) | Outside law firm, co-002 panel | LGL-18 RFP and panel benchmark, firm 1 |
| co-112 | Whitlock Brennan LLP (proposed) | Outside law firm, co-002 panel | LGL-18, firm 2 |
| co-113 | Marrow Gale LLP (proposed) | Outside law firm, co-002 panel | LGL-18, firm 3 |
| co-114 | TechBridge Solutions Inc. (adopted) | Acquisition target with layered multi-tier ownership | LGL-08 conflicts family tree; chain runs through a shared PE-fund manager to existing client co-115 and a founder board seat at co-002 |
| co-115 | CarePeak Technologies Inc. (adopted) | Healthcare-technology company, about 3,000 employees; recurring compliance client of co-001 | LGL-14 compliance program bundle (AML policy, training matrix, cert tracker, incident log, board dashboard); the existing-client link in the LGL-08 conflict chain |
| co-116 | Horizon Energy Holdings Ltd. (adopted) | BVI holding entity, foreign beneficial owner with former-PEP profile | LGL-09 high-risk intake (15/15 risk score; OFAC/PEP/FCPA/source-of-funds triggers) |
| co-117 | Ironvale Manufacturing (proposed) | Opposing party in co-002's commercial/employment dispute | LGL-11 litigation matter (FRCP deadline chain, trial cascade); LGL-13 discovery production set belongs to this matter |
| co-118 | Brightquarry Analytics (proposed) | Mid-size analytics company | Mid-size NDA negotiation scenario (residual-knowledge clause) in LGL-17 |
| co-119 | DataPulse Analytics (adopted) | Analytics vendor to co-002 | Low-risk approved vendor assessment in LGL-17 |
| co-120 | GlobalComms Translation Service (adopted) | Translation vendor handling privileged documents | Do-not-approve vendor assessment in LGL-17 |
| co-121 | Aphelion Systems (proposed) | Competitor of co-002 | Revenue battlecards and competitive prioritization (REV-02, REV-03, CORE-03) |
| co-122 | Lodestar Logistics (proposed) | Target account of co-002 | Qualifying new-hire signal inside the trigger window (REV-03); account fact packet (REV-02) |
| co-123 | Torchbird Labs (proposed) | Small startup NDA counterparty | Tier-3 deal-breaker NDA scenario (liquidated damages per breach) in LGL-17 / LGL-02 variants |
| co-124 | Talonworks Interactive (proposed) | Closed-lost account of co-002 | Re-engagement signal after closed-lost, plus the noise-hire negative case (REV-03); do-not-contact fixture lives on its contacts (REV-01) |
| co-125 | Thornfield Health (proposed) | Target account of co-002; the champion's new employer | Champion employer-change re-link play (REV-03), joining co-102's old closed-won deal |
| co-126 to co-129 | reserved | Open ecosystem slots for future assignment | Assign here before dipping into the co-140+ generator range for a named fixture |

## Larkspur local cast (co-131 to co-139)

| ID | Name (status) | Role | Cross-path relationships |
|---|---|---|---|
| co-131 | The Okafor household (adopted from SMB plan) | Residential client of co-100 | Primary subject of the lead-to-cash record (SMB-04), onboarding, project hub, milestone, and referral-loop fixtures |
| co-132 | The Marsh household (proposed) | Residential client of co-100, chronically slow to pay | AR aging and collections fixtures (SMB-19, SMB-31) |
| co-133 | Voltridge Electrical (proposed) | Electrical subcontractor to co-100 | Labor/subcontractor cost line in job costing (SMB-21) |
| co-134 | Highmarch Building Supply (proposed) | Materials supplier to co-100 | Materials cost line and miscoded-expense distractor (SMB-21) |
| co-135 | Fairhaven Realty Group (proposed) | Residential real-estate agency, referral partner of co-100 | Source of referral-loop inbound leads (SMB-25, SMB-03) |
| co-136 to co-139 | reserved | Open Larkspur-cast slots | |

## Ground rules

- One universe, shared canon IDs: the same entity's NDA appears in legal, its invoices in finance, its new hire in HR, its kickoff meeting in operations. Cross-track joins are the point.
- Planted findings ship in the data; answer keys live only in private training content keyed to the data-pack version.
- Fully synthetic: no real people, no real PII, obviously fictional names. Check every name against real companies before publishing (standing gate; none of the proposed names above has been checked yet).
- Generators are seeded and deterministic: committed data and regenerated data always match.
