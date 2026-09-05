# Interview transcript: hiring manager

- Organization: Atticus Dundee Inc.
- Candidate ID: ca-002
- Candidate name: Amias Kettleborne
- Requisition ID: RQN-2026-0105
- Date: 2026-03-17
- Interviewer: Dashiell Ashgrove (Engineering Manager)
- Format: video conference, recorded with consent
- Competencies assessed:
  - Structured problem solving (CMP-01)
  - System design judgment (CMP-03)
  - Collaboration across teams (CMP-05)

## Transcript

[00:00:07] Dashiell Ashgrove (Engineering Manager): Good afternoon. Recording and transcription are on. Are you happy with that?

[00:00:23] Amias Kettleborne (Candidate): Yes.

[00:00:29] Dashiell Ashgrove (Engineering Manager): I have the screen notes. I know you want to move from the delivery path onto the data path, so let us test that properly rather than take it on trust.

[00:00:58] Amias Kettleborne (Candidate): That is fair.

[00:01:05] Dashiell Ashgrove (Engineering Manager): What is the largest data problem you have owned rather than supported?

[00:01:24] Amias Kettleborne (Candidate): The verification side of a rebuild. My group moved a nightly aggregation onto streaming pipelines, and I owned the question of how anyone would know the new one was right.

[00:02:03] Dashiell Ashgrove (Engineering Manager): How long were you on that?

[00:02:11] Amias Kettleborne (Candidate): Six years of streaming pipelines exposure in total across two employers, though only about a year of it was that rebuild.

[00:02:44] Dashiell Ashgrove (Engineering Manager): Let us stay on the rebuild. How did you answer the correctness question?

[00:03:02] Amias Kettleborne (Candidate): Parallel run, with the old aggregation and the new one both producing, and a comparison that reported by category rather than by record. Record level comparison drowns you.

[00:03:44] Dashiell Ashgrove (Engineering Manager): What categories?

[00:03:51] Amias Kettleborne (Candidate): Late arriving data, records the new path rejected, records where the two disagreed on a value, and records the old path had silently deduplicated. The last category was the interesting one.

[00:04:33] Dashiell Ashgrove (Engineering Manager): Why interesting?

[00:04:41] Amias Kettleborne (Candidate): Because the deduplication had never been written down. It was a side effect of how the old job read its input. The new path did not do it and looked wrong until we worked out that the old one had been quietly discarding things for years.

[00:05:27] Dashiell Ashgrove (Engineering Manager): What did you do with that?

[00:05:36] Amias Kettleborne (Candidate): Escalated it, because it was a decision about what the numbers mean rather than an engineering choice. The group lead took it to the consumers and they chose to keep the old behavior explicitly.

[00:06:16] Dashiell Ashgrove (Engineering Manager): Was that the right outcome?

[00:06:25] Amias Kettleborne (Candidate): I think so. What matters is that it became a written choice rather than an accident.

[00:06:50] Dashiell Ashgrove (Engineering Manager): Good. Now, the seat here sequences a backlog. What would you want in the first month?

[00:07:14] Amias Kettleborne (Candidate): A list of every consumer and what each one would lose if the path stopped. I have found that the most useful thing to have on day one and the hardest thing to get.

[00:07:52] Dashiell Ashgrove (Engineering Manager): Hardest because?

[00:08:00] Amias Kettleborne (Candidate): Because people answer the question they wish you had asked. They tell you what the path does rather than what it is for.

[00:08:29] Dashiell Ashgrove (Engineering Manager): And after the list?

[00:08:38] Amias Kettleborne (Candidate): I would want to fix whatever is generating the most interruption before I touch anything structural, because a team that is being interrupted cannot execute a plan anyway.

[00:09:16] Dashiell Ashgrove (Engineering Manager): That is a defensible order. Tell me about the platform underneath your current work.

[00:09:38] Amias Kettleborne (Candidate): Containerized, with a service mesh in front of the internal traffic. I have operated against it rather than built it.

[00:10:09] Dashiell Ashgrove (Engineering Manager): What has that cost you?

[00:10:18] Amias Kettleborne (Candidate): Time, mostly, on failures that look like application problems and are not. A retry policy set at the mesh layer once made a duplicate delivery problem look like a bug in my own consumer.

[00:11:00] Dashiell Ashgrove (Engineering Manager): How long did that take to find?

[00:11:10] Amias Kettleborne (Candidate): Most of a week, and I only found it because somebody on the platform side happened to mention a config change in passing.

[00:11:45] Dashiell Ashgrove (Engineering Manager): What would you do differently?

[00:11:55] Amias Kettleborne (Candidate): Ask for the change log before I start debugging, every time. It sounds obvious and I still forget under pressure.

[00:12:28] Dashiell Ashgrove (Engineering Manager): Let us go to a disagreement. Tell me about one you lost.

[00:12:47] Amias Kettleborne (Candidate): I wanted a check to block a release and the team lead wanted it to warn. I lost, and the check warned for a quarter and was ignored, and then it caught something and became blocking without further argument.

[00:13:33] Dashiell Ashgrove (Engineering Manager): Do you think you were right?

[00:13:43] Amias Kettleborne (Candidate): I was right about the check and wrong about the sequencing. Making it blocking immediately would have burned the credit I needed to make it blocking later.

[00:14:20] Dashiell Ashgrove (Engineering Manager): That is a mature answer. What about writing? The recruiter flagged that design documents are newer to you.

[00:14:50] Amias Kettleborne (Candidate): They are. I write clearly for operational audiences and I have not had to argue a design in writing to people who disagree with me. I expect the first few to be reworked heavily.

[00:15:31] Dashiell Ashgrove (Engineering Manager): They will be, and that is normal. Is that something you want or something you will tolerate?

[00:15:57] Amias Kettleborne (Candidate): Want. The reason I am leaving is that nothing I proposed ever got that far.

[00:16:22] Dashiell Ashgrove (Engineering Manager): Understood. Questions for me?

[00:16:34] Amias Kettleborne (Candidate): What does the team do when it disagrees and the disagreement does not resolve?

[00:16:56] Dashiell Ashgrove (Engineering Manager): It comes to me and I close it, in the document, with the reason. I would rather be wrong in writing than leave it open.

[00:17:29] Amias Kettleborne (Candidate): That is the answer I was hoping for.

[00:17:42] Dashiell Ashgrove (Engineering Manager): Anything else?

[00:17:50] Amias Kettleborne (Candidate): How much of this seat is on call?

[00:18:02] Dashiell Ashgrove (Engineering Manager): Shared across the group. It is real and it is not the job.

[00:18:24] Amias Kettleborne (Candidate): Good. Thank you for the time.

[00:18:36] Dashiell Ashgrove (Engineering Manager): Thank you. The working session is next.
