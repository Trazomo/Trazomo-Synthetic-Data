# Draft feedback: staff engineer working session

- Candidate ID: ca-002
- Candidate name: Amias Kettleborne
- Requisition ID: RQN-2026-0105
- Date: 2026-03-19
- Interviewer: Gideon Loxley (Staff Engineer)
- Source transcript: interview-transcript-ca-002-staff-engineer.md

## Recommendation

Yes, with a narrower recommendation than the strength of the session might suggest. He is excellent on how a system is watched and good on how one is changed. For this seat that ordering is acceptable, because the path he would own is under instrumented, but the panel should decide with that ordering in front of it rather than behind it.

## Evidence

1. He asked whether the ambiguity was visible to consumers or hidden by the path before proposing anything, and then asked whether anybody was making a wrong decision today or whether the problem was latent.
2. He sequenced visibility before correctness, and gave the reason from experience: fixing something quietly leaves you explaining later why the old numbers were different, which makes you look like the cause.
3. He separated trusted header, inference and unknown into three explicit classes rather than folding unknown into inference, and routed the unknown class to a person at least at first.
4. Told the unknown class was concentrated in one external producer, he distinguished the engineering workaround from the real fix and said he would record the workaround as a workaround, in the code path rather than in a document, with the date the conversation should make it unnecessary.
5. He brought three years of observability tooling work to the health question and drew a distinction the panel had not heard before: operator instrumentation says the path is running, consumer instrumentation says the output is usable.
6. He would measure freshness per consumer rather than per stage, completeness against the producer's own count where it exists, and the size of the unknown class, and would state on the dashboard where a count is unavailable rather than substitute one.
7. Asked what he would not want to own, he named the negotiation with the external producer and said somebody with an existing relationship would do it better, which is a useful answer rather than a modest one.
