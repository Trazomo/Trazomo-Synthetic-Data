# Draft feedback: hiring manager

- Candidate ID: ca-001
- Candidate name: Ianthe Wrenfield
- Requisition ID: RQN-2026-0105
- Date: 2026-03-12
- Interviewer: Dashiell Ashgrove (Engineering Manager)
- Source transcript: interview-transcript-ca-001-hiring-manager.md

## Recommendation

Advance to the working session. This is the strongest structured problem solving I have seen on this requisition, and the design judgment held up when I pushed on it. The one thing I want the working session to test is depth rather than process: everything she described was well sequenced, and I would like to see her reason about a system she has not already made sense of.

## Evidence

1. She described the ingest path she owns as a batch route with a continuous edge added later, and explained why that was a reasonable call at the time and a poor one a year afterward.
2. She traced the failure to a support case where a customer saw two different figures, and identified that both were correct as of different moments rather than treating one as a bug.
3. Her migration plan was staged rather than asserted: dual write, a comparison job reporting by shape instead of by row, then a read switch per consumer starting with the smallest, each step with a way back.
4. She held the shadow period open for about three months because the comparison job kept surfacing a month end disagreement, and refused to switch any consumer until it was understood.
5. She reported three years of container orchestration ownership, framed as being the person paged when the platform misbehaved rather than the person who chose it.
6. Asked about a disagreement she lost, she said she was right about the coupling and wrong about the timing, then wrote the interface between the two halves herself and stopped reopening the decision.
7. Her first month plan is deliberately non structural: read the incidents and the design notes, and ask each downstream team what it is working around, on the view that the workarounds are the honest backlog.
