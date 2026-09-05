# Interview transcript: staff engineer working session

- Organization: Atticus Dundee Inc.
- Candidate ID: ca-002
- Candidate name: Amias Kettleborne
- Requisition ID: RQN-2026-0105
- Date: 2026-03-19
- Interviewer: Gideon Loxley (Staff Engineer)
- Format: video conference, recorded with consent
- Competencies assessed:
  - Structured problem solving (CMP-01)
  - Technical depth (CMP-02)
  - System design judgment (CMP-03)

## Transcript

[00:00:06] Gideon Loxley (Staff Engineer): Hello. We are recording and transcribing. Is that all right with you?

[00:00:21] Amias Kettleborne (Candidate): Yes, that is fine.

[00:00:27] Gideon Loxley (Staff Engineer): This is a working session. I will describe a real problem, we will design against it, and I will push on the parts I care about. There is no single right answer.

[00:00:57] Amias Kettleborne (Candidate): Understood.

[00:01:04] Gideon Loxley (Staff Engineer): We take event records from about a dozen producers into one path, and five consumers read the output. One field has two meanings depending on which producer sent it, and we do not reliably know which is which.

[00:01:49] Amias Kettleborne (Candidate): Is the ambiguity visible to consumers today, or does the path hide it?

[00:02:09] Gideon Loxley (Staff Engineer): The path hides it, badly.

[00:02:19] Amias Kettleborne (Candidate): Then before I design anything I would want to know what the hiding costs. Is anybody making a wrong decision today because of it, or is it a latent problem?

[00:02:58] Gideon Loxley (Staff Engineer): Assume at least one consumer is quietly wrong and does not know.

[00:03:16] Amias Kettleborne (Candidate): Then step one is to make it visible before it is correct. I would emit a signal per record saying which meaning the path inferred and how confident it was, and I would put that in front of the consumers before changing any behavior.

[00:04:00] Gideon Loxley (Staff Engineer): Why visibility first?

[00:04:09] Amias Kettleborne (Candidate): Because I have been the person who fixed something quietly and then had to explain, later, why the old numbers were different. Doing it in that order makes you look like you caused the problem.

[00:04:50] Gideon Loxley (Staff Engineer): Fair. Now design the fix.

[00:05:02] Amias Kettleborne (Candidate): How is the meaning inferred today?

[00:05:14] Gideon Loxley (Staff Engineer): A header we trust on some producers, and inference from the record shape on the rest.

[00:05:33] Amias Kettleborne (Candidate): Then I would separate those two paths explicitly. Trusted header is one class, inference is another, and unknown is a third rather than being folded into the inference.

[00:06:11] Gideon Loxley (Staff Engineer): What do you do with the unknown class?

[00:06:22] Amias Kettleborne (Candidate): Route it somewhere a person looks at it, at least at first. If the unknown class is small, that is a week of somebody's attention and it collapses the problem. If it is large, I have learned something important before I built anything.

[00:07:07] Gideon Loxley (Staff Engineer): Suppose it is about one record in a thousand.

[00:07:22] Amias Kettleborne (Candidate): Small enough to inspect and large enough to matter to somebody. I would want to know whether it is spread across producers or concentrated in one, because those are completely different problems.

[00:08:03] Gideon Loxley (Staff Engineer): Concentrated in one producer, and it is an external one.

[00:08:20] Amias Kettleborne (Candidate): Then the engineering fix is a workaround and the real fix is a conversation with that producer. I would build the workaround, and I would write down that it is a workaround with the date the conversation is expected to make it unnecessary.

[00:09:04] Gideon Loxley (Staff Engineer): Do those notes ever get read?

[00:09:16] Amias Kettleborne (Candidate): Rarely, which is why I put them in the code path rather than in a document.

[00:09:38] Gideon Loxley (Staff Engineer): Let us move. How do you know a path like this is healthy?

[00:09:56] Amias Kettleborne (Candidate): This is where I am strongest. Three years of observability tooling work, and my view is that most systems are instrumented for the operator rather than for the consumer.

[00:10:37] Gideon Loxley (Staff Engineer): Explain the distinction.

[00:10:47] Amias Kettleborne (Candidate): Operator instrumentation tells you the path is running. Consumer instrumentation tells you the output is usable. A path can be perfectly healthy and producing nothing anybody can act on, and only the second kind of signal catches that.

[00:11:31] Gideon Loxley (Staff Engineer): What would you measure here?

[00:11:42] Amias Kettleborne (Candidate): Freshness per consumer rather than per stage, completeness against the producer's own count where we can get it, and the size of the unknown class we just talked about.

[00:12:20] Gideon Loxley (Staff Engineer): The producer's own count is not always available.

[00:12:35] Amias Kettleborne (Candidate): No, and where it is not I would rather say so on the dashboard than compute a substitute that looks authoritative and is not.

[00:13:10] Gideon Loxley (Staff Engineer): Good. Something harder. The path is fine and a consumer insists it is broken. What do you do?

[00:13:35] Amias Kettleborne (Candidate): Take their case seriously for longer than feels reasonable. Most of the time they are seeing something real and describing it in a way that maps badly onto my model of the system.

[00:14:14] Gideon Loxley (Staff Engineer): And when they are simply wrong?

[00:14:25] Amias Kettleborne (Candidate): Then I show my working rather than assert a conclusion, and I try to leave them able to check it themselves next time.

[00:14:57] Gideon Loxley (Staff Engineer): Last question. What part of this problem would you not want to own?

[00:15:16] Amias Kettleborne (Candidate): The negotiation with the external producer. I would do it, and somebody with an existing relationship there would do it better and faster.

[00:15:52] Gideon Loxley (Staff Engineer): That is a good answer to end on. Questions for me?

[00:16:08] Amias Kettleborne (Candidate): What do you expect from a new person in the first design review?

[00:16:27] Gideon Loxley (Staff Engineer): Questions, mostly. The people who arrive with answers about a system they have not read tend to be wrong in expensive ways.

[00:16:59] Amias Kettleborne (Candidate): That is reassuring. Thank you for the session.

[00:17:14] Gideon Loxley (Staff Engineer): Thank you. I will write mine up this afternoon.
