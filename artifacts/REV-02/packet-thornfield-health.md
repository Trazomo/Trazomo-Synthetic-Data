# Account Fact Packet: Thornfield Health

**Account:** Thornfield Health (co-125)

**Segment:** Enterprise

**Industry:** Healthcare

**Compiled as of:** 2026-03-13

**Index of record:** `fact-index.json`

**Status:** research packet, assembled from public and third-party research only

## How to read this packet

Every statement of fact below carries a bracketed `fact_id` in the form `[F-NN]`, and `fact_id` values are zero-padded and sequential across the whole artifact. That reference resolves to a row of `fact-index.json`, which states its governing metadata before its rows and is the source of record for all three files here: this packet, the second researched target packet, and the competitor battlecard. Each row carries a non-empty `collection_date` and a non-empty `source`, so no row in the index is missing either.

Each row also carries a `subject`, which is a canon company id. Every `[F-NN]` cited below resolves to a row whose subject is this account, and a reference that resolves to another subject's row does not belong in this file.

Every figure printed below byte-matches the `value` of the row it cites. Where a figure and the index disagree, the index wins and this packet is wrong. A sentence here that carries no `[F-NN]` is not a fact about this account; it is framing, and nothing downstream may cite it as research.

Facts are grouped by the index category they carry. The category enum, stated verbatim in the index's governing metadata, is `firmographic`, `hiring`, `technology`, `pricing_page_snapshot` and `news`. Neither of the two researched target packets carries a `pricing_page_snapshot` row: the single captured pricing page, unique corpus-wide, sits in the competitor battlecard as a distinct quoted block.

## Freshness

The freshness rule for this artifact, stated verbatim in the index's governing metadata and repeated here so this packet stands on its own: a fact is stale iff anchor_date 2026-03-16 minus collection_date exceeds 90 days, strictly; a fact collected exactly 2025-12-16 is fresh.

The rule turns on a strict inequality, so the boundary is not a grey area, and the boundary convention is written down rather than left to be inferred. A fact collected on 2025-12-16, exactly 90 days before the anchor date, is fresh. A fact collected before 2025-12-16 is stale.

**This packet contains the one stale fact in the artifact.** It is [F-13], in the technology section below, and it is labelled stale at the point it is stated. It is not the current state of this account's estate. Anything downstream that repeats it repeats the label with it, or it is not repeating the fact correctly.

## Firmographic profile

Thornfield Health operates from Columbus, Ohio, United States [F-10]. It runs 23 care sites [F-11] and employs a clinical staff of 1,850 [F-12]. That is a multi-site organization with a distributed workforce rather than a single large campus, and the operating problems in front of it tend to be problems of coordination across sites.

Buying follows the same shape. Procurement is regional procurement, each region contracts separately [F-14]. A seller reading only the headline segment would expect one central purchasing decision; the index says otherwise, and any plan that assumes a single central signature is planning against the wrong buying unit.

## Leadership and hiring

The account has appointed a Head of Clinical Systems, with a start date of 2026-01-12 [F-15]. As everywhere in this artifact, the appointment is recorded by role and start date only, and no individual is named.

The account is carrying 6 open clinical systems roles [F-16]. Read with the appointment, that is a systems function being built out rather than maintained, and it is the freshest hiring evidence this packet holds.

## Technology estate

**Stale fact, labelled.** Research records one supplier-provided electronic records platform in use across every site [F-13]. This fact carries a `collection_date` of 2025-11-20. Measured against the anchor date of 2026-03-16, that exceeds 90 days, so by the rule stated above it is **stale**. It is recorded here because it is the only estate-level record the index holds for this account, and it is labelled because it may no longer be true. It is not evidence of the current platform position, it may not be used to say what the account runs today, and any brief that leans on it says, in the same sentence, that it was collected on 2025-11-20 and is stale. Confirming or replacing it is the first research action this account needs.

The current-window technology evidence is narrower and is not a substitute for the stale fact. Research records site scheduling kept in spreadsheets at most sites [F-17]. That describes one workflow, not the estate, and it should not be stretched into a claim about the estate as a whole.

## News

The account has announced two further outpatient sites for 2026 [F-18]. That is the only announcement in the window that this packet carries.

## What this packet does not contain

This packet carries no contact, no named individual and no customer relationship management record. It is firmographic and public-web research about an organization, and the people data for this account lives in the seller's own systems under its own rules.

It carries no claim about what the seller holds or operates. It carries no figure that is not indexed, and it carries no conclusion. A brief built on this packet resolves each of its own claims to an `[F-NN]` above, states the `collection_date` of each fact it leans on, keeps the stale label attached to [F-13], and drops anything that resolves to nothing.
