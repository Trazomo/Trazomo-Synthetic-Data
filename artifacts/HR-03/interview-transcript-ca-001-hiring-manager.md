# Interview transcript: hiring manager

- Organization: Atticus Dundee Inc.
- Candidate ID: ca-001
- Candidate name: Ianthe Wrenfield
- Requisition ID: RQN-2026-0105
- Date: 2026-03-12
- Interviewer: Dashiell Ashgrove (Engineering Manager)
- Format: video conference, recorded with consent
- Competencies assessed:
  - Structured problem solving (CMP-01)
  - System design judgment (CMP-03)
  - Collaboration across teams (CMP-05)

## Transcript

[00:00:09] Dashiell Ashgrove (Engineering Manager): Thanks for coming back. Are you happy to be recorded again?

[00:00:21] Ianthe Wrenfield (Candidate): Yes.

[00:00:26] Dashiell Ashgrove (Engineering Manager): Good. I have the screen notes, so I am not going to make you repeat your history. I want to spend the hour on how you decide things.

[00:00:52] Ianthe Wrenfield (Candidate): That suits me.

[00:01:00] Dashiell Ashgrove (Engineering Manager): Start with the ingest path you own now. What shape is it in and why is it that shape?

[00:01:19] Ianthe Wrenfield (Candidate): It is a batch path with a continuous edge bolted on. It started as a nightly job because the first consumer was a report. Then a product surface needed the same data inside a minute, so somebody added a second route rather than changing the first.

[00:02:02] Dashiell Ashgrove (Engineering Manager): Was that the wrong call?

[00:02:09] Ianthe Wrenfield (Candidate): At the time, no. It was the only thing that could ship that quarter. It became the wrong call about a year later when the two routes disagreed and nobody could say which one was authoritative.

[00:02:44] Dashiell Ashgrove (Engineering Manager): How did that surface?

[00:02:51] Ianthe Wrenfield (Candidate): A support case. A customer saw one number in the product and a different number in their export. It took us a day and a half to work out that both were correct as of different moments.

[00:03:26] Dashiell Ashgrove (Engineering Manager): What did you do about it?

[00:03:33] Ianthe Wrenfield (Candidate): I wrote up the two routes and the drift, and I proposed collapsing them. That proposal was rejected twice before it was accepted, which I think was reasonable both times.

[00:04:05] Dashiell Ashgrove (Engineering Manager): Why reasonable?

[00:04:11] Ianthe Wrenfield (Candidate): The first time I had no measurement, only an argument. The second time I had the measurement but no migration plan that kept the read path up. The third time I had both.

[00:04:44] Dashiell Ashgrove (Engineering Manager): Walk me through the migration plan.

[00:04:53] Ianthe Wrenfield (Candidate): Dual write first, with the new route shadowing the old and nobody reading it. Then a comparison job that reported disagreements by shape rather than by row, because the row level noise was useless. Then a read switch per consumer, smallest first, with a way back.

[00:05:41] Dashiell Ashgrove (Engineering Manager): How long did the shadow period run?

[00:05:50] Ianthe Wrenfield (Candidate): About three months, which was longer than I wanted. The comparison job kept finding a class of disagreement at month end, and I refused to switch anyone until we understood it.

[00:06:26] Dashiell Ashgrove (Engineering Manager): What was it?

[00:06:32] Ianthe Wrenfield (Candidate): A time zone assumption in the old route that only mattered on the last day of a month. It had been wrong for as long as the route had existed and nobody had noticed because the report was read the following week.

[00:07:12] Dashiell Ashgrove (Engineering Manager): So the migration found a bug rather than caused one.

[00:07:24] Ianthe Wrenfield (Candidate): Yes, and that was the moment the project stopped being unpopular.

[00:07:39] Dashiell Ashgrove (Engineering Manager): Let us go somewhere else. The brief says this seat sequences the backlog. What would you do in the first month here?

[00:08:04] Ianthe Wrenfield (Candidate): Nothing structural. I would read the last two quarters of incidents and the design notes, and I would ask each downstream team what they are working around.

[00:08:36] Ianthe Wrenfield (Candidate): The workarounds are the honest backlog. What a team has built around you tells you more than what they have asked you for.

[00:08:58] Dashiell Ashgrove (Engineering Manager): And after that month?

[00:09:07] Ianthe Wrenfield (Candidate): I would expect to propose an order and be argued with. I would want the argument to happen in writing and to be closed by you rather than left open.

[00:09:37] Dashiell Ashgrove (Engineering Manager): That is how it works here, and I will hold you to the writing part.

[00:09:52] Ianthe Wrenfield (Candidate): Understood.

[00:10:00] Dashiell Ashgrove (Engineering Manager): Tell me about the platform underneath. What have you run yourself?

[00:10:15] Ianthe Wrenfield (Candidate): I have had three years of container orchestration ownership, in the sense of being the person who got paged when the platform misbehaved rather than the person who chose it.

[00:10:48] Dashiell Ashgrove (Engineering Manager): What did that teach you that choosing it would not have?

[00:11:02] Ianthe Wrenfield (Candidate): That the interesting failures are almost never the ones the platform documents. They are resource limits set by somebody who left, and a probe that passes while the service is useless.

[00:11:41] Dashiell Ashgrove (Engineering Manager): Do you want to keep doing that work?

[00:11:52] Ianthe Wrenfield (Candidate): Some of it. I do not want it to be the job. I would rather be close enough to it that I design with it in mind.

[00:12:19] Dashiell Ashgrove (Engineering Manager): That is roughly the balance here. Now a harder question. Tell me about a disagreement you lost.

[00:12:41] Ianthe Wrenfield (Candidate): I argued against splitting a service and I was overruled by a director. I still think I was right about the coupling and wrong about the timing, which is a polite way of saying I lost.

[00:13:19] Dashiell Ashgrove (Engineering Manager): How did you behave afterward?

[00:13:28] Ianthe Wrenfield (Candidate): I wrote the interface between the two halves myself, because I had the strongest view about where it should sit, and I stopped relitigating the split.

[00:14:02] Dashiell Ashgrove (Engineering Manager): Good. What about people who do not report to you and do not want to help?

[00:14:20] Ianthe Wrenfield (Candidate): I start by asking what they are being measured on. Half the time the reason they will not help is that helping costs them something nobody has accounted for.

[00:14:53] Dashiell Ashgrove (Engineering Manager): And the other half?

[00:15:02] Ianthe Wrenfield (Candidate): The other half they have been burned by a previous change and they do not believe the timeline. That one you fix by being boringly reliable for a couple of cycles.

[00:15:36] Dashiell Ashgrove (Engineering Manager): What questions do you have for me?

[00:15:47] Ianthe Wrenfield (Candidate): The recruiter said I should ask you directly who sets the quarter.

[00:16:03] Dashiell Ashgrove (Engineering Manager): I do, with the department director, and the team writes the proposal. If you take the seat, the proposal is yours to write from the second quarter onward.

[00:16:34] Ianthe Wrenfield (Candidate): That is a real answer. Thank you.

[00:16:46] Dashiell Ashgrove (Engineering Manager): Anything else?

[00:16:53] Ianthe Wrenfield (Candidate): What has gone badly for this team recently?

[00:17:05] Dashiell Ashgrove (Engineering Manager): We deferred a schema change for two quarters and then had to do it under pressure. It went fine and it should not have been done that way.

[00:17:35] Ianthe Wrenfield (Candidate): I would rather know that than not.

[00:17:46] Dashiell Ashgrove (Engineering Manager): Then we are even. The next conversation is a working session on design. Thank you for your time.

[00:18:09] Ianthe Wrenfield (Candidate): Thank you.
