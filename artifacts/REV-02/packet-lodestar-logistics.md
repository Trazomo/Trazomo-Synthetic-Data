# Account Fact Packet: Lodestar Logistics

**Account:** Lodestar Logistics (co-122)

**Segment:** Enterprise

**Industry:** Logistics

**Compiled as of:** 2026-03-16

**Index of record:** `fact-index.json`

**Status:** research packet, assembled from public and third-party research only

## How to read this packet

Every statement of fact below carries a bracketed `fact_id` in the form `[F-NN]`, and `fact_id` values are zero-padded and sequential across the whole artifact. That reference resolves to a row of `fact-index.json`, which states its governing metadata before its rows and is the source of record for all three files here: this packet, the second researched target packet, and the competitor battlecard. Each row carries a non-empty `collection_date` and a non-empty `source`, so no row in the index is missing either.

Each row also carries a `subject`, which is a canon company id. Every `[F-NN]` cited below resolves to a row whose subject is this account, and a reference that resolves to another subject's row does not belong in this file.

Every figure printed below byte-matches the `value` of the row it cites. Where a figure and the index disagree, the index wins and this packet is wrong. A sentence here that carries no `[F-NN]` is not a fact about this account; it is framing, and nothing downstream may cite it as research.

Facts are grouped by the index category they carry. The category enum, stated verbatim in the index's governing metadata, is `firmographic`, `hiring`, `technology`, `pricing_page_snapshot` and `news`. Neither of the two researched target packets carries a `pricing_page_snapshot` row: the single captured pricing page, unique corpus-wide, sits in the competitor battlecard as a distinct quoted block.

## Freshness

The freshness rule for this artifact, stated verbatim in the index's governing metadata and repeated here so this packet stands on its own: a fact is stale iff anchor_date 2026-03-16 minus collection_date exceeds 90 days, strictly; a fact collected exactly 2025-12-16 is fresh.

Two consequences follow, and both matter for how this packet is read. A fact collected on or after 2025-12-16 is current under this rule and may be used as it stands. A fact collected before 2025-12-16 is stale, must be labelled stale wherever it is used, and is never presented as the current state of the account. The boundary itself is not a grey area, and the boundary convention is written down here rather than left to be inferred: 2025-12-16 is exactly 90 days before the anchor date, the rule turns on a strict inequality, and a fact collected on that date is therefore fresh.

No fact in this packet is stale.

## Firmographic profile

Lodestar Logistics operates from Manchester, United Kingdom [F-01]. The account is a United Kingdom logistics operator, and every figure in this section describes the United Kingdom operation.

The workforce is recorded at 2,400 [F-02]. This is the boundary fact of the artifact. Its `collection_date` is 2025-12-16, exactly 90 days before the anchor date, so under the strict inequality of the rule above it is fresh and is current for use as it stands. It is also the oldest fact in this packet, so a reader who needs a headcount confirmed inside the last quarter of the window should treat it as the first thing to re-collect, without labelling it stale, because it is not.

The network runs across 34 depots [F-03], and the operator runs a fleet of 610 vehicles [F-04]. Those two figures together, read against the workforce figure, describe an asset-heavy operation with a wide physical footprint rather than a single-site business.

## Leadership and hiring

The account has appointed a Director of Information Technology, with a start date of 2026-02-16 [F-05]. The appointment is recorded by role and start date only; the packet names no individual, here or anywhere else, and no research packet in this artifact carries a person.

That appointment is the fact most likely to change how the account buys. A newly seated technology director inherits an estate rather than choosing it, and the first months of that seat are usually spent working out what the estate already runs on.

Alongside it, the account is carrying 11 open operations and technology roles [F-06]. Read with the appointment, that is a function being staffed up rather than held flat.

## Technology estate

The operator runs an in-house warehouse management system, with no third-party platform of record [F-07]. That is a build-side estate: there is no incumbent vendor contract to displace, and no incumbent vendor relationship to work around.

Across the depots, research records three separate task and messaging tools in use across depots [F-08]. Nothing in the index says which tools, and this packet does not guess. What the fact supports is a statement about fragmentation, not a statement about any named product.

## News

The operator has announced a second northern distribution hub, with opening planned for the second half of 2026 [F-09]. That is the only announcement in the window that this packet carries, and it is the only forward-looking commitment anything here may cite.

## What this packet does not contain

This packet carries no contact, no named individual and no customer relationship management record. It is firmographic and public-web research about an organisation, and the people data for this account lives in the seller's own systems under its own rules.

It carries no claim about what the seller holds or operates. It carries no figure that is not indexed, and it carries no conclusion. A brief built on this packet resolves each of its own claims to an `[F-NN]` above, states the `collection_date` of each fact it leans on, and drops anything that resolves to nothing.
