# AI notetaker vendor evaluation checklist

## Document control

| Field | Value |
|---|---|
| Document ID | ADI-TPL-003 |
| Version | 1.0 |
| Status | Active |
| Owner | Director, Operations |
| Approver | VP, Operations |
| Effective Date | 2026-03-02 |
| Last Reviewed | 2026-02-27 |
| Next Review Due | 2027-02-26 |
| Supersedes | None |
| Superseded By | None |

## How to use this checklist

Before any notetaker product joins a meeting at Atticus Dundee Inc., complete one copy of this checklist for it. Ask the vendor every question in order, write the answer in the vendor's own words, and record where that answer is written down: a contract clause, a settings page or a published policy. An answer with no evidence counts as pending.

The first two questions come first on purpose. What the vendor does with our meeting content, how long it keeps it and whether it trains models on it, decides most evaluations before any feature is compared.

## Questions

| # | Question | Why it matters | Answer | Evidence |
|---|---|---|---|---|
| 1 | Does the vendor retain our meeting content (recordings, transcripts and summaries), and for how long after the meeting? | Content the vendor keeps sits outside our records policy, and the length of time it is kept decides how long that exposure lasts. |  |  |
| 2 | Does the vendor use our meeting content to train or improve any model, its own or anyone else's, and can that use be excluded in the contract? | Content used for model training cannot be taken back out; this answer decides whether the vendor's use of our data is acceptable at all. |  |  |
| 3 | Does the product perform biometric identification, such as voiceprints or speaker identification, and can an admin switch it off for every meeting? | Biometric identification is a separate act from recording and needs its own consent; a product that cannot switch it off cannot meet our default. |  |  |
| 4 | Which subprocessors handle our meeting content, and where is it stored and processed? | Every subprocessor is another party holding the content, under terms we have not read. |  |  |
| 5 | Will the vendor delete our content on request, including every copy and backup, and confirm the deletion in writing? | A strike request or the end of a retention period means nothing if the vendor keeps a copy. |  |  |
| 6 | Who inside the vendor can read our meeting content, for what reasons, and is that access logged? | Access by the vendor's own staff is disclosure of the meeting to people who were not in it. |  |  |
| 7 | Can an admin turn recording, transcribing and biometric identification on or off separately, for each meeting? | The three acts need three settings; a single switch forces an attendee to consent to all three at once. |  |  |
| 8 | How does the product tell attendees that a notetaker is present, and can it ever join a meeting without being visible? | Consent depends on every attendee knowing the notetaker is there before anything is captured. |  |  |
| 9 | Can we export and retrieve every recording, transcript and summary in a standard format, at any time? | The records owner has to be able to produce a record without asking the vendor for it. |  |  |
| 10 | What do the contract terms say about the vendor's use of our data, and do they take precedence over the vendor's published policies? | The contract is the answer that holds; a published policy or a settings page can change without notice. |  |  |

## Decision

| Outcome | When |
|---|---|
| approve | every answer is written down with evidence, the vendor does not train any model on our content, it keeps content no longer than {{policy.retention_period}}, and biometric identification can be switched off |
| approve with conditions | the answers are acceptable only with a contract change or a setting the vendor has committed to in writing; each condition is written beside the decision |
| reject | the vendor keeps content beyond {{policy.retention_period}} or trains models on it and will not change either in the contract, or biometric identification cannot be switched off |

Every answer on this checklist is pending until the {{policy.approver_role}} signs the decision.
