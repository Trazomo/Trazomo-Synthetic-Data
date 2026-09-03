# Draft feedback: staff engineer working session

- Candidate ID: ca-001
- Candidate name: Ianthe Wrenfield
- Requisition ID: RQN-2026-0105
- Date: 2026-03-13
- Interviewer: Gideon Loxley (Staff Engineer)
- Format: design working session
- Source transcript: interview-transcript-ca-001-staff-engineer.md

## Recommendation

Strong yes on technical depth and on design judgment. She did the thing the session is built to detect: she refused to design before she knew what was actually in the traffic, and she was specific about how long a census would have to run and why. I would hire her for this seat.

## Evidence

1. Her first move on the ambiguous field was a census of live traffic classified by which meaning the field carried, rather than a design, and she asked how we currently know which producers use which meaning before proposing anything.
2. She set the census length by the slowest producer's own cycle, and named weekly producers as the ones that break during a change precisely because a short census cannot see them.
3. Offered an ugly census result, she proposed splitting the field into two explicit ones and leaving the ambiguous field untouched, on the ground that the ambiguity stops growing immediately even though nothing else moves.
4. She named the cost of that design: three fields where there was one, and a worse inheritance for the next person if the distinction is not written down.
5. She put two years of schema migration work behind her claim that the write side is easy and the read side carries the risk, and gave a concrete case where a widened column type made a downstream parser drop records while reporting success.
6. Constrained so that no field could be added, she moved the disambiguation into the path, stamped a resolved meaning with a confidence marker on the internal representation, and refused to present an inference as a fact.
7. She now requires a reconciliation on both sides of any change touching a type, and will not call a migration complete until the two sides agree for a full cycle.
