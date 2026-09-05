# Interview transcript: recruiter screen

- Organization: Atticus Dundee Inc.
- Candidate ID: ca-001
- Candidate name: Ianthe Wrenfield
- Requisition ID: RQN-2026-0105
- Date: 2026-03-09
- Interviewer: Lior Fenmore (Recruiter)
- Format: video conference, recorded with consent
- Competencies assessed:
  - Written communication (CMP-04)
  - Collaboration across teams (CMP-05)

## Transcript

[00:00:06] Lior Fenmore (Recruiter): Good afternoon, and thank you for making the time. Before anything else, are you happy for this to be recorded and transcribed?

[00:00:24] Ianthe Wrenfield (Candidate): Yes, that is fine.

[00:00:31] Lior Fenmore (Recruiter): Thank you. This is a screen rather than a technical conversation, so I will keep it to about half an hour. I want to understand what you are looking for and give you an honest picture of the role.

[00:00:58] Ianthe Wrenfield (Candidate): That works. I have read the brief, so I have a few questions saved up.

[00:01:12] Lior Fenmore (Recruiter): Good. Let us start with you. What have you been doing?

[00:01:26] Ianthe Wrenfield (Candidate): I have been on the platform side of a mid sized product team. The last four years have been almost entirely distributed systems work, mostly the ingest and enrichment path that everything else reads from.

[00:02:03] Lior Fenmore (Recruiter): When you say the path everything else reads from, how many teams are downstream of you?

[00:02:19] Ianthe Wrenfield (Candidate): Five, and two of them are outside engineering. That is the part I have found most interesting and also most tiring.

[00:02:41] Lior Fenmore (Recruiter): Say more about tiring.

[00:02:48] Ianthe Wrenfield (Candidate): Every change to the shape of the data is a negotiation with people who did not choose to be in the negotiation. You cannot just announce a change. You have to write it down, give people a window, and then chase the ones who did not read it.

[00:03:22] Lior Fenmore (Recruiter): How do you write it down?

[00:03:29] Ianthe Wrenfield (Candidate): A short note with the before and after, a date, and what breaks if you do nothing. I keep them all in one place so somebody can go back and see when a field changed.

[00:04:01] Lior Fenmore (Recruiter): That is close to how the team here works. They write a design note before code and argue in the document. Does that appeal or does it sound slow?

[00:04:24] Ianthe Wrenfield (Candidate): It appeals. I have worked the other way and the arguing still happens, it just happens later and in person, which is worse.

[00:04:47] Lior Fenmore (Recruiter): Tell me about a time the writing did not save you.

[00:04:56] Ianthe Wrenfield (Candidate): There was a field we deprecated. I wrote the note, gave a long window, and one consumer had automation reading the field that nobody on their side remembered building. It broke on a weekend.

[00:05:32] Lior Fenmore (Recruiter): What did you change afterward?

[00:05:39] Ianthe Wrenfield (Candidate): I stopped trusting the announcement and started checking traffic. If nothing is reading it for a month, then it is safe to remove. If something is, I go and find who owns it before I do anything.

[00:06:12] Lior Fenmore (Recruiter): That is a useful instinct here. The team owns a path with the same problem.

[00:06:28] Ianthe Wrenfield (Candidate): I assumed so from the brief. It reads like a team that has been three people against a four person design.

[00:06:47] Lior Fenmore (Recruiter): That is fair and I will not pretend otherwise. Why are you looking?

[00:07:03] Ianthe Wrenfield (Candidate): The work I want to do next is sequencing rather than absorbing. Where I am now, the backlog is set by whoever asks loudest, and I have stopped being able to change that from where I sit.

[00:07:36] Lior Fenmore (Recruiter): What would make this a bad move for you?

[00:07:44] Ianthe Wrenfield (Candidate): If the sequencing turns out to be nominal. If I arrive and the queue is still set elsewhere, I would be unhappy inside a quarter and I would rather say that now.

[00:08:11] Lior Fenmore (Recruiter): I would rather you said it now too. I will pass that to the hiring manager as a question for him rather than for you.

[00:08:31] Ianthe Wrenfield (Candidate): Thank you, that is helpful.

[00:08:40] Lior Fenmore (Recruiter): Tell me about working with people outside engineering.

[00:08:51] Ianthe Wrenfield (Candidate): The two non engineering consumers I mentioned were an operations group and a reporting group. The operations group taught me to stop writing for engineers. They needed to know what changed for them, not how it was implemented.

[00:09:29] Lior Fenmore (Recruiter): Did you get that right first time?

[00:09:37] Ianthe Wrenfield (Candidate): No. My first few notes were unreadable to them and they told me so, politely. I rewrote the template with one of their analysts sitting next to me and it has been fine since.

[00:10:12] Lior Fenmore (Recruiter): That is the answer I was hoping for. Have you managed anyone?

[00:10:26] Ianthe Wrenfield (Candidate): Not formally. I have mentored two people and I have run the on call handover, which is management of a kind but not the kind you mean.

[00:10:53] Lior Fenmore (Recruiter): Is management where you want to go?

[00:11:01] Ianthe Wrenfield (Candidate): Not yet. I would like another stretch of building first, and I would like it to be somewhere the building is respected.

[00:11:24] Lior Fenmore (Recruiter): Understood. Practical questions now. What is your notice?

[00:11:38] Ianthe Wrenfield (Candidate): Six weeks, and I would take a short break between, so I would be looking at early May at the soonest.

[00:11:59] Lior Fenmore (Recruiter): That fits the target start on the requisition, so no problem there. Are you in any other processes?

[00:12:20] Ianthe Wrenfield (Candidate): Two. One is early and one is at final stage. I will tell you if that changes rather than surprising you at the end.

[00:12:45] Lior Fenmore (Recruiter): I appreciate that. What are your questions for me?

[00:12:56] Ianthe Wrenfield (Candidate): How is the on call load shared, and who decides what the team works on next quarter?

[00:13:15] Lior Fenmore (Recruiter): On call is shared across the whole group rather than sitting on one team, and the next quarter is set by the hiring manager with the department director. I will make sure you get to ask him the second one directly.

[00:13:47] Ianthe Wrenfield (Candidate): That is what I wanted to hear. And the loop itself?

[00:14:01] Lior Fenmore (Recruiter): Three conversations. This one, then the hiring manager, then a working session with a staff engineer on design. Written feedback from each of us before anyone discusses a decision.

[00:14:33] Ianthe Wrenfield (Candidate): That is a shorter loop than I expected.

[00:14:43] Lior Fenmore (Recruiter): It is deliberate. We would rather ask three good questions than seven polite ones. Anything you would like me to pass on before we finish?

[00:15:09] Ianthe Wrenfield (Candidate): Only the sequencing question. I would rather it be answered honestly than answered well.

[00:15:28] Lior Fenmore (Recruiter): Noted, and it will be. I will come back to you inside two working days either way. Thank you for your time.

[00:15:50] Ianthe Wrenfield (Candidate): Thank you.
