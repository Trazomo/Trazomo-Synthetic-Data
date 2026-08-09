# IP Renewal Docket: Rules, Statutory Bases, and Exception Report

**ATTICUS DUNDEE INC. — Office of the General Counsel, IP**

| Field | Value |
|---|---|
| Document ID | LEG-IP-DOC-002 |
| Version | 6.2 |
| Owner | Devraj S. Iyer, Senior Counsel, IP |
| Docket data | `ip-renewal-calendar.csv` |
| Docket as of | July 1, 2026 |
| Horizon | Rolling 24 months, through June 30, 2028 |
| Confirmed against outside counsel docket | June 30, 2026, Nadia S. Feldkamp, Atticus Dundee LLP |
| Classification | Internal |

---

## 1. How the Docket Works

Every entry carries four dates and one owner.

**Anniversary date.** The date the statutory clock runs from: patent issue date, registration date, publication date, priority date.

**Window opens.** The first date on which the filing or payment may be made without a surcharge. For US patent maintenance fees this is six months before the due date.

**Due date.** The last date on which the filing or payment may be made without a surcharge.

**Grace ends.** The last date on which the filing or payment may be made at all, with a surcharge. After this date the right is lost, subject only to petition procedures that are expensive, uncertain, and not part of anyone's plan.

**Internal working date.** Not a column in the CSV because it is derived: it is the due date less the lead time in Section 4. Nobody works to the grace date.

## 2. Statutory Bases

### 2.1 US patent maintenance fees

35 U.S.C. § 41(b) and 37 C.F.R. § 1.362. Fees are due at 3.5, 7.5, and 11.5 years from the date of grant. Each fee may be paid without surcharge during the six-month window preceding its due date, and with a surcharge under 37 C.F.R. § 1.20(h) during the six-month grace period following it. A patent on which a fee is not paid by the end of the grace period expires as of the end of the grace period.

There are no maintenance fees on design patents or on plant patents. Reissue patents carry the maintenance schedule of the original patent, which is the mistake most commonly made in a docket of this size.

### 2.2 US trademark maintenance

- **Section 8 declaration of continued use.** 15 U.S.C. § 1058. Due between the fifth and sixth anniversaries of registration, with a six-month grace period and an additional fee.
- **Section 15 declaration of incontestability.** 15 U.S.C. § 1065. Optional. Available after five consecutive years of continuous use following registration, and filed in practice together with the first Section 8. There is no deadline; the cost of missing it is the benefit forgone, not the registration.
- **Sections 8 and 9 combined declaration and renewal.** 15 U.S.C. §§ 1058, 1059. Due between the ninth and tenth anniversaries of registration and every ten years thereafter, with a six-month grace period.
- **Statement of use or extension request on an intent-to-use application.** 15 U.S.C. § 1051(d) and 37 C.F.R. § 2.89. Due within six months of the notice of allowance, extendable in five successive six-month increments to a maximum of thirty-six months from the notice of allowance.

### 2.3 Weekend and holiday rollover at the USPTO

35 U.S.C. § 21(b), 37 C.F.R. § 1.7 (patents), and 37 C.F.R. § 2.196 (trademarks). When the last day for taking an action falls on a Saturday, Sunday, or a federal holiday within the District of Columbia, the action may be taken on the next succeeding business day.

**The docket records the rollover but does not rely on it.** See Standing Rule 2 of the program charter. Where a rollover applies, the CSV records the rolled statutory date in the relevant date column and notes the underlying calendar date, and the internal working date is computed from the earlier of the two.

### 2.4 Copyright

- **17 U.S.C. § 412.** Statutory damages and attorney's fees are unavailable for infringement of an unpublished work commenced before registration, or for infringement of a published work commenced after first publication and before registration unless registration is made within three months after first publication. The three-month window is therefore docketed as a deadline even though registration itself has no deadline.
- **37 C.F.R. § 201.38.** The designation of an agent to receive notifications of claimed infringement must be renewed every three years to remain current.
- Works created on or after January 1, 1978 are not subject to renewal registration. The docket carries no copyright renewal entries and should not acquire any.

### 2.5 International

- **PCT national phase.** 35 U.S.C. § 371 and 37 C.F.R. § 1.495. Thirty months from the earliest priority date for entry into the US national phase. Other offices apply thirty or thirty-one months; the docket carries the shorter figure.
- **Madrid Protocol international registration.** Article 7 of the Protocol. Renewal every ten years from the date of the international registration, with a six-month grace period and a surcharge.
- **European patent national annuities.** Payable annually to each national office after grant and validation, subject to national grace periods with surcharge. The docket carries a single consolidated entry per validated family per year, with the constituent national due dates held by the annuity agent.

## 3. Fee Schedule Used

Fees below are large-entity amounts used for budgeting only. **Confirm the current fee at the time of payment.** Fee schedules change and an underpayment is treated as a non-payment.

| Item | Basis | Budget amount |
|---|---|---|
| Patent maintenance fee, 3.5 year | 37 C.F.R. § 1.20(e) | $2,150 |
| Patent maintenance fee, 7.5 year | 37 C.F.R. § 1.20(f) | $4,040 |
| Patent maintenance fee, 11.5 year | 37 C.F.R. § 1.20(g) | $8,280 |
| Surcharge, late payment within grace | 37 C.F.R. § 1.20(h) | $550 |
| Section 8 declaration | 37 C.F.R. § 2.6 | $225 per class |
| Section 15 declaration | 37 C.F.R. § 2.6 | $200 per class |
| Section 9 renewal | 37 C.F.R. § 2.6 | $325 per class |
| Statement of use / extension request | 37 C.F.R. § 2.6 | $150 per class |
| Copyright registration, computer program | 37 C.F.R. § 201.3 | $65 |
| DMCA agent designation | 37 C.F.R. § 201.38 | $6 |

## 4. Internal Lead Times

| Entry type | Lead time before due date | Rationale |
|---|---|---|
| Patent maintenance fee | 60 days | Payment must clear and be confirmed in the public record |
| Trademark Section 8 or Sections 8 and 9 | 90 days | Specimens must be collected from the business and reviewed for current use |
| Statement of use or extension | 60 days | Specimen and date-of-first-use evidence |
| PCT national phase entry | 120 days | Translation, claim amendment, and foreign associate instruction |
| Copyright registration under the three-month rule | 30 days | Deposit material must be prepared and cleared for trade secret content |
| DMCA agent renewal | 30 days | Administrative |
| Foreign annuities | 90 days | Agent instruction and funds transfer |

## 5. Exception Report as of July 1, 2026

Three entries are outside normal state.

### EXC-1 (Critical): ADI-P-0052-US is in the grace period

Patent US 11,538,116 B2 issued December 6, 2022. The first maintenance fee was due at 3.5 years, on June 6, 2026, which fell on a Saturday, so the statutory due date rolled to Monday, June 8, 2026. **The fee was not paid.** The patent is now in the six-month grace period under 37 C.F.R. § 1.362(e), which ends December 6, 2026, a Sunday, rolling to Monday, December 7, 2026. Payment during grace requires the surcharge under 37 C.F.R. § 1.20(h).

Cost of the miss: $550. Cost if the grace period is also missed: the patent expires.

Root cause: the docket entry named a responsible person who left the company in February 2026 and no backup was named. The entry was not surfaced in the March, April, or May monthly reviews because the review report filtered on entries with an assigned owner. **The filter is the defect, not the departure.**

Actions: fee authorized for payment on July 8, 2026 with surcharge; monthly review report changed on July 1, 2026 to list unassigned entries first; a full docket integrity sweep completed on July 1, 2026 confirmed no other entry lacks a named responsible person and a named backup. Standing Rule 2 and the "deadlines in grace" metric were added to the program charter in response.

### EXC-2 (Watch): ADI-C-0031 three-month registration window closes August 18, 2026

SignalPost 4.0 was first published on May 18, 2026. The three-month window under 17 U.S.C. § 412 closes on August 18, 2026. Registration after that date remains possible but forfeits statutory damages and attorney's fees for infringement commencing before registration. The deposit is held up on a trade secret redaction question: the deposit rules permit redacted deposit for computer programs containing trade secrets, and the redaction set has not been agreed with engineering. Escalated to the VP Engineering on June 24, 2026.

### EXC-3 (Watch): ADI-C-0028 chain of title incomplete

The LedgerLine documentation set registered in March 2024 includes material contributed by an independent contractor engaged in 2023 whose statement of work did not incorporate the standard invention assignment exhibit. A confirmatory assignment has been requested and not yet returned. Until it is recorded, the registration's ownership statement is exposed. Target for resolution: September 15, 2026. This is the second instance of the same defect in twelve months; see also IDF-2026-016 in `invention-disclosure-records.md`.

## 6. Docket Summary

| Category | Active entries in horizon | Next 90 days | In grace | Owner assigned |
|---|---|---|---|---|
| US patents, maintenance | 4 | 1 | 1 | 4 of 4 |
| US patent applications | 1 | 0 | 0 | 1 of 1 |
| Foreign patents, annuities | 1 | 0 | 0 | 1 of 1 |
| US trademarks | 4 | 0 | 0 | 4 of 4 |
| International trademarks | 1 | 0 | 0 | 1 of 1 |
| Copyright and related | 3 | 2 | 0 | 3 of 3 |
| **Total** | **14** | **3** | **1** | **14 of 14** |

## 7. Change Log

| Version | Date | Change |
|---|---|---|
| 6.0 | 2026-04-01 | Reissued under program charter v3.0 |
| 6.1 | 2026-06-24 | EXC-2 opened |
| 6.2 | 2026-07-01 | EXC-1 opened; Section 1 rewritten to define the internal working date; monthly review filter defect corrected; docket integrity sweep recorded |
