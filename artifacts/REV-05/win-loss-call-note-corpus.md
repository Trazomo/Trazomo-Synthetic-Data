# Win and Loss Call Note Corpus

**Entity:** Atticus Dundee Inc.

**Compiled as of:** 2026-03-15

**Maintained by:** Revenue Operations

**Status:** frozen reference corpus; notes as recorded on the day of each call

## What this corpus is

Eleven call notes drawn from eight closed deals, five won and three lost. Each note was written by the person who took the call, on the day of the call, and is reproduced here without rewriting. Nothing below was re-interviewed afterwards and nothing was corrected with the benefit of the outcome.

The corpus has two halves. The deal registry names the eight deals and carries the facts a reader needs in order to compare them: the account, its segment, the amount, the outcome and the close date. The call notes carry what the buyer said, in two forms, structured attribute readouts the note taker filled in during the call and free prose beneath them.

The registry is a comparison set and nothing more. A reader may pair deals by whatever attributes a question needs. This corpus pairs none of them, ranks none of them and averages nothing across them.

## Registry rules

These rules govern every row of the registry, and they are stated here so that a reader never has to infer them.

**One row per deal.** `deal_id` is `deal-NN`, sequential. `account_id` resolves in the customer relationship management seed export, `accounts.csv`. `segment` byte-equals that account's `accounts.csv` segment. `amount` is integer dollars. `outcome` is `won` or `lost`. `close_date` is ISO. `opportunity_id` is present if and only if the deal closed inside the CORE-03 export window, and is empty otherwise.

**Outcome witnesses.** Every `won` deal's account has `accounts.csv` status `customer`. Every `lost` deal's account has status `closed_lost` or `target`. A lost deal never sits at a customer-status account, so the current relationship carried on the account record and the outcome recorded here stay coherent, and the status column is the witness for a won outcome that has no row of its own in the export.

**The export-window rule.** Every deal's `close_date` precedes 2025-07-20, the date the CORE-03 export window opens, except exactly one: the lost deal at the closed-lost account, whose registry row byte-joins `opp-co-124-01` in `opportunities.csv` on `opportunity_id`, on `amount` 27161, on `close_date` 2026-03-12 and on segment Mid-Market. The reason the rest of the registry sits outside the window is the plain one. The won deals closed before the window opened, which is why zero Closed Won rows exist in the export at all. A reader who goes looking in `opportunities.csv` for a won opportunity behind a won registry row will not find one, and that absence is a property of the export window rather than of the outcomes recorded here.

**Amount bands.** `band(amount) = floor(amount / 50000)`. Bands are $50,000.00 wide and are counted from zero, so band 0 holds every amount below $50,000.00. The registry carries no band column, and a reader computes the band from the amount with this function.

## Attribute readouts

Each note carries one to three readouts. A readout is a single line in this shape:

`attribute: <slug> / direction: <positive|negative> / note: "<the buyer's own framing>"`

The `attribute` slug comes from this pinned vocabulary and from nowhere else:

- `procurement_process`
- `price_sensitivity`
- `onboarding_effort`
- `integration_depth`
- `champion_strength`
- `feature_fit`
- `security_review`

`direction` takes one of exactly two values, `positive` or `negative`. It records how the buyer's framing of that attribute landed for the deal on that call: `positive` where the framing helped the deal forward, `negative` where the framing worked against it.

Direction is a reading of one call, not a verdict on a deal and not a verdict on an attribute. Two records may frame the same attribute in opposite directions. Where a reading is contradictory in that way both records stand, and this corpus carries no resolution of the disagreement, no third record settling it and no later note correcting either one. The `note` text is the buyer's framing as the note taker heard it, kept verbatim rather than summarized, because the wording is the point.

## Call date rules

Three rules govern every `call_date`.

1. Every `call_date` is at or before 2026-03-16.
2. Every `call_date` is inside its deal's life, at or before that deal's registry `close_date`.
3. Every call at the closed-lost account is dated strictly before that deal's Closed Lost transition of 2026-03-12. Those are notes taken while the deal was live. Nothing here stages a later conversation with that account, and no note below was taken after the loss.

## Participants

Participants are recorded by role only, on both sides. A seller-side role carries the seller's account id, `co-002`. A buyer-side role is marked `buyer side` and carries no account id. No person is named anywhere in this corpus, on either side of any call.

## The deal registry

| deal_id | account_id | segment | amount | outcome | close_date | opportunity_id |
|---|---|---|---|---|---|---|
| deal-01 | co-102 | Enterprise | 310000 | won | 2024-11-14 | |
| deal-02 | co-103 | Mid-Market | 24800 | won | 2025-06-19 | |
| deal-03 | co-145 | Mid-Market | 118000 | won | 2025-05-08 | |
| deal-04 | co-153 | Enterprise | 152000 | won | 2025-03-27 | |
| deal-05 | co-149 | SMB | 31200 | won | 2025-04-15 | |
| deal-06 | co-124 | Mid-Market | 27161 | lost | 2026-03-12 | opp-co-124-01 |
| deal-07 | co-158 | Enterprise | 96400 | lost | 2025-05-30 | |
| deal-08 | co-163 | Mid-Market | 68900 | lost | 2025-06-02 | |

## The call notes

A record id is `WL-NN`, sequential. Every `deal_id` below resolves to a row of the registry above, and more than one record may sit on the same deal.

### WL-01

- `deal_id`: deal-01
- `call_date`: 2024-09-18
- Participants, seller side: Account Executive (co-002), Solutions Engineer (co-002)
- Participants, buyer side: Head of Finance (buyer side), Director of Freight Operations (buyer side)

attribute: price_sensitivity / direction: negative / note: "The number is well above what we set aside for this. I am not saying no to the platform, I am saying no to that line as it stands."

attribute: feature_fit / direction: positive / note: "This is the first thing we have looked at that models a shipment handoff the way we actually run one, instead of the way a diagram says we do."

The call ran long because the freight side wanted to walk the whole daily handoff, dock by dock, and check it against the board. That part went well and the operations lead did most of the selling for us. Finance was not arguing about whether the platform was worth having, only about the size of the line in a year that was already committed. We left with a request to come back with the same scope phased across two budget years.

### WL-02

- `deal_id`: deal-01
- `call_date`: 2024-11-02
- Participants, seller side: Account Executive (co-002), Solutions Engineer (co-002)
- Participants, buyer side: Head of Finance (buyer side), Head of Information Technology (buyer side)

attribute: champion_strength / direction: positive / note: "I will take this into the operating review myself. I have already told them what I think it is worth and I have not been argued with yet."

attribute: integration_depth / direction: positive / note: "It reads our yard and dock systems without us building a bridge for it first, which is more than the last two we tried could manage."

attribute: security_review / direction: negative / note: "Our reviewer's questionnaire is long and it is slow, and nothing gets scheduled around it. Expect it to take the weeks it takes."

Second call with the finance lead in the room, and the phased shape from September answered the budget objection cleanly. Information technology had already run their own read of the connectors and came in supportive, which is why the integration question closed in ten minutes rather than a session of its own. The internal review queue is the only open item and both sides now treat it as a scheduling problem rather than a decision. The finance lead is carrying this to the operating review without being asked to.

### WL-03

- `deal_id`: deal-02
- `call_date`: 2025-05-12
- Participants, seller side: Account Executive (co-002)
- Participants, buyer side: Head of Retail Operations (buyer side), Store Systems Manager (buyer side)

attribute: feature_fit / direction: positive / note: "The seasonal set work is exactly the mess we described to you, and seeing all of it in one place was the first time it has ever looked finite."

attribute: onboarding_effort / direction: negative / note: "Every one of my store leads is already carrying two systems they did not ask for. Adding a third one in season is not a thing I can do to them."

A short working call built around the seasonal set calendar the operations lead brought. The fit was not in question by the end of it and the store systems manager said the same thing in different words. The whole conversation turned on when, not whether, and we agreed to look at a single region ahead of the season rather than a full rollout. That framing is what kept the deal alive.

### WL-04

- `deal_id`: deal-02
- `call_date`: 2025-06-10
- Participants, seller side: Account Executive (co-002)
- Participants, buyer side: Head of Retail Operations (buyer side)

attribute: champion_strength / direction: positive / note: "I have the budget owner's ear on this one and I do not need a committee to get it over the line. Leave it with me for a week."

Fifteen minute call to confirm the single-region scope and the start date after the season. Nothing new came up on the product side. The operations lead has the budget owner directly and asked us to stop working the account while she closed it internally, which we did.

### WL-05

- `deal_id`: deal-03
- `call_date`: 2025-04-21
- Participants, seller side: Account Executive (co-002), Solutions Engineer (co-002)
- Participants, buyer side: VP of Engineering (buyer side), Head of Program Management (buyer side)

attribute: integration_depth / direction: positive / note: "It sits underneath the issue tracker we already run instead of trying to replace it, and honestly that is the only version of this we would have taken a meeting about."

attribute: price_sensitivity / direction: negative / note: "Per seat at our headcount is the whole conversation. Give me a shape that does not punish us for hiring engineers."

Technical call with the engineering leadership of a software team that had already rejected two products in this category for trying to own the issue tracker. The program management lead pushed hard on reporting across teams and the walkthrough answered it. Pricing was the only friction left and it was a shape question rather than a level question. We agreed to come back with a band-based structure instead of a straight per-seat one.

### WL-06

- `deal_id`: deal-04
- `call_date`: 2025-03-05
- Participants, seller side: Account Executive (co-002), Sales Director (co-002)
- Participants, buyer side: Head of Procurement (buyer side), Director of Platform Engineering (buyer side)

attribute: procurement_process / direction: positive / note: "Our purchasing path is strict and I would not trade it for anything. It tells you the order of the steps, who signs each one and the date it ends, so nothing sits waiting on somebody's memory."

attribute: champion_strength / direction: positive / note: "Platform engineering wants this and has put that in writing already. That is the hard part behind us."

attribute: security_review / direction: negative / note: "The review queue is the constraint here, not the decision. Whatever we agree today still waits on that queue."

First call with procurement in the room rather than at the end, which is why this moved. The purchasing lead laid out the remaining steps with dates against them and held to all of them. Platform engineering had already written its recommendation, so the commercial conversation was about sequencing rather than persuasion. The only stated risk was the internal review queue, and procurement had already booked a slot in it before the call.

### WL-07

- `deal_id`: deal-05
- `call_date`: 2025-04-01
- Participants, seller side: Account Executive (co-002)
- Participants, buyer side: Managing Editor (buyer side), Production Coordinator (buyer side)

attribute: onboarding_effort / direction: negative / note: "We are eleven people and nobody here is going to run a rollout. If it needs a project, it is not for us."

attribute: feature_fit / direction: positive / note: "The production board is what we came for. It replaces the whiteboard photograph that gets passed round on a Friday and forgotten by Tuesday."

Small media team, one call, no technical evaluation of any kind. The editor was explicit that anything requiring setup work would end the conversation, so we walked the default board and changed nothing about it. The production coordinator had the team in the tool the same afternoon. Price never came up.

### WL-08

- `deal_id`: deal-06
- `call_date`: 2026-01-28
- Participants, seller side: Account Executive (co-002), Customer Success Manager (co-002)
- Participants, buyer side: Head of Digital Production (buyer side), Finance Manager (buyer side)

attribute: feature_fit / direction: positive / note: "Nobody here is arguing that the tool does not do the job. The production teams would keep it tomorrow if the number were different."

attribute: price_sensitivity / direction: negative / note: "We have been told to hold every renewal flat this year and this one is not flat. That is the entire problem and none of it is about you."

Opening renewal conversation for the coming term, with finance in the room from the first call at the account's request. Usage is not in question and the customer success review showed the production teams in the tool daily through the last term. The finance manager described a flat-renewal instruction that came from above her and applies across the media group, not to this line alone. We agreed to look at scope and term length before anything else.

### WL-09

- `deal_id`: deal-06
- `call_date`: 2026-02-25
- Participants, seller side: Account Executive (co-002), Sales Director (co-002)
- Participants, buyer side: Head of Digital Production (buyer side), Finance Manager (buyer side)

attribute: price_sensitivity / direction: negative / note: "The proposal is a fair proposal and it is still more than the figure I have been handed. I cannot move the figure and I have tried."

attribute: champion_strength / direction: positive / note: "I am still the one arguing for this internally and I have not stopped. What I do not have is the decision."

Follow-up on the proposal that went across last week, covering the reduced scope and the shorter term. The production lead is unchanged in her position and said so in front of finance. The finance manager was equally clear that the flat-renewal figure is not hers to move and that the gap remains after the reduction. Paperwork was to go to their reviewer only once the number was settled, and it was not settled on this call.

### WL-10

- `deal_id`: deal-07
- `call_date`: 2025-05-14
- Participants, seller side: Account Executive (co-002), Sales Director (co-002)
- Participants, buyer side: Head of Procurement (buyer side), Head of Store Technology (buyer side)

attribute: procurement_process / direction: negative / note: "Our purchasing path is a wall. It does not tell you the order of anything, it just collects signatures until somebody loses interest, and it has ended more of these than any budget ever has."

attribute: security_review / direction: negative / note: "The reviewer's queue moves once a quarter and we are not in this one. Anything we agree now is really an agreement about next year."

Third call at this account and the first with procurement present. The store technology lead still wants the platform and has since the first meeting, and neither of the objections raised on this call was about the product. Procurement described its own path as unpredictable and would not commit to a next step or a date. With the review queue closed until the following quarter as well, there was no version of this that lands inside the current year.

### WL-11

- `deal_id`: deal-08
- `call_date`: 2025-05-20
- Participants, seller side: Account Executive (co-002), Solutions Engineer (co-002)
- Participants, buyer side: Head of Merchandising (buyer side), IT Manager (buyer side)

attribute: onboarding_effort / direction: negative / note: "Somebody has to own the setup here and that somebody does not exist on my team. I am not going to pretend otherwise to get this signed."

attribute: integration_depth / direction: positive / note: "It read our stock file without a project wrapped around it, which is more than we expected on a first look."

attribute: price_sensitivity / direction: negative / note: "It is the second-year number that worries me rather than the first. The first year is affordable and the shape after it is not."

Technical session that went better than the commercial one. The stock file connector worked in the room and the IT manager had no further questions after it. The merchandising lead was open that there is no internal owner for the setup work and that Aphelion Systems had offered a managed start at a lower first-year figure. We were asked for a two-year total on the same scope and the account went the other way before we returned it.
