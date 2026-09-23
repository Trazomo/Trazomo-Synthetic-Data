# Recorded meeting invite template

## Document control

| Field | Value |
|---|---|
| Document ID | ADI-TPL-001 |
| Version | 1.0 |
| Status | Active |
| Owner | Director, Operations |
| Approver | VP, Operations |
| Effective Date | 2026-03-02 |
| Last Reviewed | 2026-02-27 |
| Next Review Due | 2027-02-26 |
| Supersedes | None |
| Superseded By | None |

## Invite body

Use this text for every meeting at Atticus Dundee Inc. that an AI notetaker will record. Fill every slot, and paste the consent notice exactly as written: it is the only line in the invite that is never edited.

```
Subject: {{meeting.title}}
When: {{meeting.date}} at {{meeting.start_time}} for {{meeting.duration_minutes}} minutes
Where: {{meeting.format}}
Agenda: {{meeting.agenda}}
Notetaker: an AI notetaker records this meeting and produces a transcript and a summary, which are kept for {{policy.retention_period}} and held by {{policy.records_owner}}.
Consent notice: This meeting is recorded. Recording, transcription, and biometric identification are three separate acts; this meeting uses recording and transcription only, and biometric identification is disabled. An AI notetaker produces the transcript and a summary for attendees. If you do not consent, say so now and the recording stops; you may also ask afterward for any remark to be struck from the record.
Organizer: {{organizer.full_name}}, {{organizer.role_title}}
```

## Slots

A slot is written `{{group.field}}`: two braces, a group name, a dot and a field name, all lowercase. Three groups exist: meeting, organizer and policy. Every slot below appears in the invite body, and the invite body uses no slot that is not listed here.

| Slot | Group | Field | Source | Example |
|---|---|---|---|---|
| `{{meeting.title}}` | meeting | title | the organizer, as the calendar entry names the meeting | Cross-functional delivery sync on the customer onboarding revamp |
| `{{meeting.date}}` | meeting | date | the calendar entry, as an ISO date | 2026-03-10 |
| `{{meeting.start_time}}` | meeting | start_time | the calendar entry, as a 24-hour clock time in UTC | 09:30 |
| `{{meeting.duration_minutes}}` | meeting | duration_minutes | the calendar entry, as a whole number of minutes | 45 |
| `{{meeting.format}}` | meeting | format | the organizer, including whether the meeting is recorded | video conference, recorded |
| `{{meeting.agenda}}` | meeting | agenda | the organizer | where the customer onboarding revamp stands, and what each team owes before the next sync |
| `{{organizer.full_name}}` | organizer | full_name | the staff directory, as it spells the name | given in the filled example below |
| `{{organizer.role_title}}` | organizer | role_title | the staff directory, as it spells the title | Program Manager |
| `{{policy.retention_period}}` | policy | retention_period | the team's records policy, never the notetaker's default setting | the period the records policy sets |
| `{{policy.records_owner}}` | policy | records_owner | the team's records policy, as a role title | the Director, Operations |

A slot with no value stops the invite from going out. Nobody fills one from a guess, and nobody sends an invite with the braces still in it.

## Filled example

The invite for the delivery sync on 2026-03-10, with every slot filled. The consent notice is unchanged.

```
Subject: Cross-functional delivery sync on the customer onboarding revamp
When: 2026-03-10 at 09:30 for 45 minutes
Where: video conference, recorded
Agenda: where the customer onboarding revamp stands, and what each team owes before the next sync
Notetaker: an AI notetaker records this meeting and produces a transcript and a summary, which are kept for the period the records policy sets and held by the Director, Operations.
Consent notice: This meeting is recorded. Recording, transcription, and biometric identification are three separate acts; this meeting uses recording and transcription only, and biometric identification is disabled. An AI notetaker produces the transcript and a summary for attendees. If you do not consent, say so now and the recording stops; you may also ask afterward for any remark to be struck from the record.
Organizer: Lyric Quennell, Program Manager
```

## Calendar object

The same invite, as a calendar file, sits beside this document as `meeting-invite-sample.ics`. Two rules apply when reading it. The description is escaped and folded as RFC 5545 requires, so unfold it and unescape it before comparing it with the consent notice. Every instant in it is UTC, with no time zone block, so the reader supplies the local time.
