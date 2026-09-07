# Campaign Offer Brief: The Coordination Gap Campaign

**Campaign:** The Coordination Gap Campaign

**Segment variant:** SEG-02, Mid-Market target accounts

**Prepared for:** Atticus Dundee Inc. (co-002)

**Compiled as of:** 2026-03-14

**Definitions of record:** `datasets/revenue/campaign-segment-and-offer-brief/segment-definitions.json`

**Counts of record:** `datasets/revenue/campaign-segment-and-offer-brief/audience-counts.csv`

**Research index of record:** `artifacts/REV-02/fact-index.json`

**Status:** planning document. It proposes a campaign. It runs nothing and it contacts nobody.

## How to read this brief

Three figures appear below and no others. The audience figure is the count the definitions file's own filter produces for this variant, and it is stated once, in the audience section, byte-equal to the counts file's row for this variant. The two competitor figures each carry a bracketed `fact_id` in the form `[F-NN]`, and each resolves to a row of the research index of record and byte-matches that row's value.

A figure typed into this brief that resolves to neither the counts file nor the research index resolves to nothing, and nothing downstream may cite it. That is the whole discipline of this document: the brief carries no number of its own.

## The segment

This campaign targets the variant SEG-02, named "Mid-Market target accounts" in the definitions file. SEG-02 carries two clauses, and an account matches only when both hold:

- `status` `eq` `target`
- `segment` `eq` `Mid-Market`

Both clauses run over the base population rather than over the raw export. The definitions file states two governing rules ahead of its variants, and both are restated here verbatim so this brief stands on its own:

- Base population: accounts.csv rows whose duplicate_of_account_id is empty.
- Blank industry rule: a blank industry satisfies no industry clause.

The second rule does not bite on SEG-02, which carries no industry clause, but it is part of the filter contract and a reader comparing this variant against another one needs it in front of them.

## Audience

**Audience count for SEG-02: 7 accounts.**

That figure is not typed into this brief as a judgement. It is the count the counts file carries for SEG-02, produced by running the clauses above over the base population, and anyone who reruns the filter over the account export gets the same figure or finds a defect. If the export changes, the count changes, and this brief is stale until it is recompiled.

## Consent and suppression screen

The audience count above is a pre-suppression firmographic count over the customer relationship management export. It counts accounts that satisfy the SEG-02 clauses, and it counts nothing else. It is not a list of accounts anyone may contact, and it is not a list anyone may treat as approved.

Before any outreach, the outreach-time list passes the consent and suppression screen, which is the system of record for who may be contacted and which runs at the point of contact rather than here. That screen decides contactability. This brief mints no consent state, asserts none, and reorders nothing about how the screen's gates run.

One consequence is deliberate, and it should be read as a property of the count rather than as a defect in it: a wholly suppressed account may sit inside this audience by design. At these bytes at least one account matching SEG-02 is wholly suppressed in the frozen consent and suppression master, so the audience figure and the contactable list are different numbers and are meant to be. A brief that presents the audience count as an outreach list is wrong about both of them.

## Offer and positioning

The offer is a scoped paid pilot of the seller's workflow and coordination product, run inside one department of a matched account, on standard published terms, for a fixed term with a named business outcome agreed in writing before the pilot opens. There is no price concession attached to this campaign and no non-standard commercial term.

The positioning rests on what the segment has in common. These are Mid-Market accounts the seller does not yet serve, and the pilot is offered as the cheapest honest way for such an account to find out whether coordinated work changes anything for it, rather than as a commitment it has to argue for internally first.

The competitor these accounts most often shortlist is Aphelion Systems (co-121). Two research facts govern how this campaign talks about that competitor, and both resolve to the research index of record.

The first is published price. Aphelion Systems publishes a headline per-seat price of $32.00 per seat per month on its public pricing page, captured 2026-03-02 [F-25]. That is list pricing on a published page. It is not a quote, it is not an offer anyone received, and it says nothing about what any account actually pays, so this campaign uses it only to describe what a buyer sees when the buyer looks the competitor up.

The second is published surface area. Aphelion Systems publishes an integration directory of connectors, and the published directory carries 41 of them [F-28]. That is a count of published connectors and nothing more. The research index holds no fact about how any of those connectors behave, so nothing in this campaign claims or implies anything about their depth or their quality.

Headcount is deliberately absent from this brief. The research index carries two disagreeing rows for that competitor attribute, from different sources and different collection dates, and it resolves neither. A campaign that quoted one of the two would be settling a disagreement the research does not settle, which is the one thing the index is explicit that no downstream output may do.

## Measurement

This brief sets no measurement target and states no expected result. Targets are set by the campaign owner when the outreach-time list is built, in the systems that record outreach and pipeline, and they belong in the campaign record rather than in a planning document. A target typed here would resolve to nothing in the research index and to nothing in the counts file, which is exactly the failure this artifact exists to make visible.

What is worth recording at the point the campaign closes is narrower than a target: how many matched accounts reached the outreach-time list after the consent and suppression screen, and how that compares with the pre-suppression figure above. That comparison is the point of the campaign, and it cannot be stated in advance.

## What this brief does not contain

It names no contact and no individual. The audience is a set of accounts; the people data for those accounts lives in the seller's own systems under its own rules, and a campaign brief is not where it is restated.

It carries no certification claim and no compliance claim of any kind. It carries no discount and no pricing exception. It carries no automation: the brief proposes a campaign, a human system runs it, and nothing in this document is an instruction to a machine.
