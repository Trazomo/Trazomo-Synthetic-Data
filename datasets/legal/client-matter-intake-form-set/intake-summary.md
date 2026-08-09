# Client & Matter Intake Form Set

Generated synthetic data. Source: `specs/artifact-specs.yaml` (LGL-07).

## Routing rules

- Critical-risk auto-escalation threshold: **$500,000**. Any matter at or above this value is auto-escalated regardless of type.
- Vendor-intake routing bands: below $25,000 routes to self-service; $25,000-$100,000 routes to standard review; at or above $100,000 routes to escalated review.

## Standard record

LGL-07-STD-001: cloud-hosting SLA dispute, valued at $250,000, requested by Wrenna Greywick. Counterparty: CloudHost Inc. (co-110). Response deadline 2026-04-10. Auto-escalated: false.

## High-value record

LGL-07-HV-001: employment/trade-secret matter, valued at $750,000, requested by Emlyn Osgood. Response deadline is 14 days out (2026-03-28). Joins the LGL-12 thread. Auto-escalated: true.

## Vendor-intake sub-paths

| Record | Sub-path | Value (USD) | Routed to |
|---|---|---|---|
| LGL-07-VEND-001 | new_vendor | 12,000 | self_service |
| LGL-07-VEND-002 | new_vendor | 60,000 | standard_review |
| LGL-07-VEND-003 | renewal | 95,000 | standard_review |
| LGL-07-VEND-004 | renewal | 140,000 | escalated_review |
| LGL-07-VEND-005 | compliance | 8,000 | self_service |
| LGL-07-VEND-006 | compliance | 25,000 | standard_review |
| LGL-07-VEND-007 | dispute | 110,000 | escalated_review |
| LGL-07-VEND-008 | dispute | 30,000 | standard_review |
