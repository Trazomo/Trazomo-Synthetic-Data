# Interview transcript: staff engineer working session

- Organization: Atticus Dundee Inc.
- Candidate ID: ca-001
- Candidate name: Ianthe Wrenfield
- Requisition ID: RQN-2026-0105
- Date: 2026-03-13
- Interviewer: Gideon Loxley (Staff Engineer)
- Format: video conference, recorded with consent
- Competencies assessed:
  - Structured problem solving (CMP-01)
  - Technical depth (CMP-02)
  - System design judgment (CMP-03)

## Transcript

[00:00:08] Gideon Loxley (Staff Engineer): Hello. Recording is on, and you have already consented on the earlier calls, but I will ask again. Is that still fine?

[00:00:29] Ianthe Wrenfield (Candidate): Still fine.

[00:00:35] Gideon Loxley (Staff Engineer): This is a working session rather than a quiz. I will describe something close to what we actually have and we will design against it together. Interrupt me whenever.

[00:01:02] Ianthe Wrenfield (Candidate): Good.

[00:01:08] Gideon Loxley (Staff Engineer): We take event records from about a dozen producers into one path. Downstream there are five consumers, two of which are product surfaces and three of which are internal. The records have a shape that has grown by accretion.

[00:01:47] Ianthe Wrenfield (Candidate): Grown how? Optional fields added over time, or nested structures?

[00:02:04] Gideon Loxley (Staff Engineer): Both, and one field that used to mean one thing and now means two depending on the producer.

[00:02:23] Ianthe Wrenfield (Candidate): That last one is the expensive one. Before I design anything, can I ask how you know which producers are on which meaning?

[00:02:52] Gideon Loxley (Staff Engineer): We mostly do not. There is a header we trust and a set we infer.

[00:03:09] Ianthe Wrenfield (Candidate): Then my first move is not a design, it is a census. I would want a job that classifies live traffic by which meaning the field carries, run for long enough to catch the producers that are quiet most of the time.

[00:03:52] Gideon Loxley (Staff Engineer): How long is long enough?

[00:04:01] Ianthe Wrenfield (Candidate): Longer than the slowest producer's own cycle. If somebody publishes weekly, a two day census tells you nothing about them, and those are exactly the producers that break during a change.

[00:04:41] Gideon Loxley (Staff Engineer): Assume the census is done and the answer is ugly. Nine producers on the old meaning, three on the new, and one that alternates.

[00:05:12] Ianthe Wrenfield (Candidate): The one that alternates is the whole problem. Can I split the field rather than fix it?

[00:05:33] Gideon Loxley (Staff Engineer): Say more.

[00:05:39] Ianthe Wrenfield (Candidate): Introduce two explicit fields with unambiguous meanings, write both from the path, and leave the ambiguous field in place and untouched. Nobody has to move on my timetable. The ambiguity stops growing immediately, which is most of the value.

[00:06:24] Gideon Loxley (Staff Engineer): What does that cost you?

[00:06:32] Ianthe Wrenfield (Candidate): Storage, a little. Confusion, more. For a while there are three fields where there was one, and if I do not write down which is which, the next person inherits a worse problem than I did.

[00:07:09] Gideon Loxley (Staff Engineer): How do you make the old field actually go away?

[00:07:22] Ianthe Wrenfield (Candidate): I do not, on my own authority. I measure who reads it, publish the list, and go to each reader with the replacement already written for their case. The field goes away when the list is empty.

[00:08:00] Gideon Loxley (Staff Engineer): Some of those readers are outside engineering.

[00:08:14] Ianthe Wrenfield (Candidate): Then the replacement has to be written in their vocabulary, not mine. I have made that mistake before and it costs a full cycle.

[00:08:44] Gideon Loxley (Staff Engineer): Let us make it harder. Suppose you cannot add fields, because the record is on a contract with an external producer.

[00:09:14] Ianthe Wrenfield (Candidate): Then the disambiguation moves into the path rather than into the record. I would resolve the meaning at ingest, using the header where it is trusted and the census classification where it is not, and I would stamp the resolved meaning on the internal representation.

[00:10:00] Gideon Loxley (Staff Engineer): And when the classification is wrong?

[00:10:11] Ianthe Wrenfield (Candidate): It will be, for some producer, some of the time. So the stamp needs a confidence marker and the consumers that care need to be able to see it. What I will not do is silently guess and present the guess as fact.

[00:10:55] Gideon Loxley (Staff Engineer): Good. Different area. Have you done a schema migration on a live read path?

[00:11:16] Ianthe Wrenfield (Candidate): Two years of schema migration work, on and off, and every one of them taught me the same lesson in a different costume.

[00:11:45] Gideon Loxley (Staff Engineer): Which is?

[00:11:51] Ianthe Wrenfield (Candidate): That the write side is easy and the read side is where the risk lives. You can change what you write in an afternoon. Changing what somebody else reads takes as long as it takes them.

[00:12:30] Gideon Loxley (Staff Engineer): Give me a concrete failure.

[00:12:40] Ianthe Wrenfield (Candidate): I widened a column type and a downstream consumer had a parser that was strict about length. Nothing failed loudly. Their job just started dropping records at the edge of the range and reporting success.

[00:13:22] Gideon Loxley (Staff Engineer): How did you find it?

[00:13:31] Ianthe Wrenfield (Candidate): Their weekly total stopped matching ours and an analyst on their side asked a polite question. It had been wrong for eleven days.

[00:14:04] Gideon Loxley (Staff Engineer): What is different now?

[00:14:14] Ianthe Wrenfield (Candidate): I ask for a reconciliation on both sides of any change that touches a type, and I refuse to call a migration done until the two sides agree for a full cycle.

[00:14:52] Gideon Loxley (Staff Engineer): Last one. If I gave you the path we have and one quarter, what would you change first?

[00:15:16] Ianthe Wrenfield (Candidate): The ambiguous field, because everything else you have described gets harder while it exists. But I would want to be wrong about that after the census rather than before it.

[00:15:56] Gideon Loxley (Staff Engineer): That is the right shape of answer. Questions for me?

[00:16:10] Ianthe Wrenfield (Candidate): How much of the design happens in the document and how much in review?

[00:16:28] Gideon Loxley (Staff Engineer): Most of it in the document. Review is where we catch the thing the author could not see, not where we do the thinking.

[00:16:57] Ianthe Wrenfield (Candidate): Then I would fit. Thank you.

[00:17:09] Gideon Loxley (Staff Engineer): Thank you for the session. I will write mine up today.
