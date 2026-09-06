# Interview scorecard: staff engineer working session

- Scorecard ID: SCD-2026-0006
- Candidate ID: ca-002
- Requisition ID: RQN-2026-0105
- Panel role: staff-engineer
- Interviewer: Gideon Loxley (Staff Engineer)
- Panelist employee ID: EMP-0053
- Interview date: 2026-03-19
- Requested date: 2026-03-19
- Status: submitted
- Submitted date: 2026-03-20

## Competency ratings

| Competency | Rating | Evidence |
|---|---|---|
| Structured problem solving (CMP-01) | 3 | Asked whether the ambiguity was visible to consumers or hidden by the path, and then whether anybody was making a wrong decision today, before proposing anything at all. Wanted to know whether the unknown class was spread or concentrated for the same reason. |
| Technical depth (CMP-02) | 4 | Drew the distinction between instrumentation that says the path is running and instrumentation that says the output is usable, and chose what he would measure from it: freshness per consumer, completeness against the producer's own count, and the size of the unknown class. |
| System design judgment (CMP-03) | 3 | Sequenced visibility before correctness and gave the reason from his own experience. On the fix he separated trusted, inferred and unknown rather than folding unknown into inference, but left the design there rather than carrying it further under pressure. |

## Additional observations

Strongest on how a system is watched and steadier on how one is changed, and the ordering was visible in every answer rather than only in the last. Asked what he would not want to own and named the negotiation with the external producer, saying somebody with an existing relationship would do it better. Worth reading beside the recruiter screen, which found the opposite gap.
