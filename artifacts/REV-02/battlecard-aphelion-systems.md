# Competitive Battlecard: Aphelion Systems

**Competitor:** Aphelion Systems (co-121)

**Position:** competitor of Atticus Dundee Inc. (co-002) in business workflow and collaboration software

**Compiled as of:** 2026-03-11

**Index of record:** `fact-index.json`

**Status:** research battlecard, assembled from public and third-party research only

## How to read this battlecard

Every statement of fact below carries a bracketed `fact_id` in the form `[F-NN]`, and `fact_id` values are zero-padded and sequential across the whole artifact. That reference resolves to a row of `fact-index.json`, which states its governing metadata before its rows and is the source of record for all three files here: this battlecard and the two researched target packets. Each row carries a non-empty `collection_date` and a non-empty `source`, so no row in the index is missing either.

Each row also carries a `subject`, which is a canon company id. Every `[F-NN]` cited below resolves to a row whose subject is this competitor, and a reference that resolves to another subject's row does not belong in this file.

Every figure printed below byte-matches the `value` of the row it cites. Where a figure and the index disagree, the index wins and this battlecard is wrong. A sentence here that carries no `[F-NN]` is not a fact about this competitor; it is framing, and nothing downstream may cite it as research.

Facts are grouped by the index category they carry. The category enum, stated verbatim in the index's governing metadata, is `firmographic`, `hiring`, `technology`, `pricing_page_snapshot` and `news`. This is the only file in the artifact that carries a `pricing_page_snapshot` row, it carries exactly one, and that row is unique corpus-wide.

Aphelion Systems is a competitor, not a customer and not a prospect. It has no record in the seller's customer relationship management export, which is correct: nothing here comes from that export, and nothing here is people data.

## Freshness

The freshness rule for this artifact, stated once and applied everywhere: a fact is stale iff anchor_date 2026-03-16 minus collection_date exceeds 90 days, strictly; a fact collected exactly 2025-12-16 is fresh.

The rule turns on a strict inequality, so a fact collected on 2025-12-16, exactly 90 days before the anchor date, is fresh, and a fact collected before that date is stale. That is the boundary convention, and it is written down rather than left to be inferred. No fact in this battlecard is stale. The one stale fact corpus-wide sits in the Thornfield Health researched target packet, is labelled there, and is not repeated here.

## The company

Aphelion Systems was founded in 2014 [F-22] and operates from Boston, Massachusetts, United States [F-21], with engineering offices in Boston and Warsaw [F-23]. It sells one workflow and collaboration product to business customers, with a free tier [F-24].

That last fact is the shape of the competitor to hold in mind. It is a single-product company reaching into the same buying centre the seller reaches, and the free tier is the entry point most of its accounts arrive through.

## Two sources disagree on headcount

The index carries a disagreeing pair. The attribute slug `employee_count` appears on exactly two index rows sharing this competitor as their subject, the two rows carry different sources and different collection dates, and their values are non-equal. No third row anywhere in the index carries that slug, so the pair has no tiebreaker inside the artifact. Both rows are presented here, with their dates and their sources, and neither is presented as the answer.

| fact_id | attribute | value | collection_date | source |
|---|---|---|---|---|
| F-19 | `employee_count` | 480 | 2026-01-15 | Corrance Market Desk |
| F-20 | `employee_count` | 620 | 2026-02-20 | Halloway Research Desk |

One research desk records an employee count of 480, collected on 2026-01-15 [F-19]. A different research desk records an employee count of 620, collected on 2026-02-20 [F-20]. Both collection dates sit inside the freshness window, so neither is stale, and the later date is not on its own a reason to prefer the later figure: the two desks count differently, and the index says nothing about how either arrived at its number.

**This battlecard explicitly does not resolve the disagreement, and no downstream output should resolve it silently.** An answer that cites headcount returns both values with their dates and their sources, or it says that the headcount is disputed and gives the range. An answer that returns one figure alone, or that averages the two, is reporting a number the research does not support.

The slug that carries this pair is not a pricing attribute, and it is not the snapshot category. The captured pricing page in the next section stays the unique pricing witness in the artifact.

## Published pricing page, as captured

The competitor publishes list pricing. The distinct quoted block below reproduces that page as captured rather than summarising it, and it carries its own capture-date line and source line. It is the single `pricing_page_snapshot` row in the artifact, and its capture date sits inside the freshness window.

**Capture date:** 2026-03-02

**Source:** Aphelion Systems published pricing page

**Indexed as:** [F-25]

```
Aphelion Systems

Pricing

Team
$19.00 per seat per month
For a single team getting started.

Standard
$32.00 per seat per month
Our most popular plan.

Scale
$57.00 per seat per month
For organisations running work across many teams.

Prices shown are per seat per month, billed annually.
```

The headline per-seat price on the captured page is $32.00, the Standard tier, which the page itself marks as its most popular plan [F-25]. The two flanking tiers are published at $19.00 and $57.00 per seat per month [F-25].

Three things about this snapshot govern how it is used. It is a capture of a published page on 2026-03-02 and not a quote, an offer, or a price anyone was charged. It is list pricing, so it says nothing about what any account actually pays. And it is the only pricing evidence in the artifact, so a claim about this competitor's pricing that does not resolve to [F-25] resolves to nothing.

## Hiring signals

The competitor is carrying 27 open engineering roles [F-26]. It has also appointed a Vice President of Sales, with a start date of 2026-01-05 [F-27]. As everywhere in this artifact, the appointment is recorded by role and start date only, and no individual is named.

A sales leadership change plus open engineering headcount is the pattern that usually precedes a change in how a competitor goes to market. It is not evidence of what that change will be, and this card does not speculate.

## Product and technology

The competitor publishes an integration directory of 41 connectors [F-28], and it publishes native mobile applications for both major mobile platforms [F-29].

Both facts describe surface area, not depth. The index holds no fact about how any of those connectors behave, and nothing here supports a claim about the quality of any of them.

## News

The competitor opened a London office, announced 2026-02-10 [F-30]. That is the only announcement in the window that this battlecard carries.

## How to use this card

Resolve every claim to an `[F-NN]` above and state the `collection_date` alongside it. Where the attribute is `employee_count`, return both rows. Where the topic is price, cite [F-25] and say that it is a captured list page.

This card holds no claim about what the seller holds or operates, no figure that is not indexed, and no comparison table that scores one product against the other. It records what public research says about a competitor as of the dates in the index, and nothing else.
