# Referral Nurture Sequence

## 1. How to use this template

This is a blank referral nurture sequence template and not a filled sequence. It is written for the studio's referral partner, Fairhaven Realty Group, the agency whose introductions bring the studio new residential inquiries. Every value is carried as a placeholder token: the field name in snake case, inside double braces.

The sequence runs three touches after a project reaches substantial completion. It keeps the referral partner informed that the studio has finished another piece of work, and nothing more. Each touch is drafted from one row of the completed projects log, the studio's project log, and every touch is held for the owner, who reads it and decides whether it goes. The loop never sends a touch.

Each of the eleven fields is listed once in the required-field list below, with its field id, the touch it belongs to, its required flag, its placeholder token, the source columns it reads and the condition it depends on. Each is then repeated as a body section, in the same order, under the touch it belongs to.

## 2. Required-field list

| `field_id` | `field_name` | `touch` | `required` | `placeholder_token` | `source_columns` | `condition` |
|---|---|---|---|---|---|---|
| `RNS-LDB-01` | Studio name | all | yes | `{{studio_name}}` | none | none |
| `RNS-LDB-02` | Sender role | all | yes | `{{sender_role}}` | none | none |
| `RNS-LDB-03` | AI disclosure line | all | conditional | `{{ai_disclosure_line}}` | none | the touch was drafted with AI assistance |
| `RNS-LDB-04` | Touch one subject line | one | yes | `{{touch_one_subject_line}}` | none | none |
| `RNS-LDB-05` | Project type | one | yes | `{{project_type}}` | `project_type` | none |
| `RNS-LDB-06` | Completion month | one | yes | `{{completion_month}}` | `completion_date` | none |
| `RNS-LDB-07` | Touch one note | one | yes | `{{touch_one_note}}` | none | none |
| `RNS-LDB-08` | Touch two subject line | two | yes | `{{touch_two_subject_line}}` | none | none |
| `RNS-LDB-09` | Touch two note | two | yes | `{{touch_two_note}}` | none | none |
| `RNS-LDB-10` | Touch three subject line | three | yes | `{{touch_three_subject_line}}` | none | none |
| `RNS-LDB-11` | Touch three note | three | yes | `{{touch_three_note}}` | none | none |

## 3. Fields every touch carries

These three fields appear on every touch, in the same place.

### Studio name (RNS-LDB-01)

`{{studio_name}}`

Sign the touch with the studio's trading name exactly as the partner knows it.

### Sender role (RNS-LDB-02)

`{{sender_role}}`

Give the role of the person the touch comes from, the owner or the project lead, and no personal name.

### AI disclosure line (RNS-LDB-03)

`{{ai_disclosure_line}}`

Carry the studio's own disclosure sentence, word for word as the data-handling checklist states it, on a touch drafted with AI assistance.

## 4. Touch one, after completion

The first touch is drafted once the project log shows the project at substantial completion and the start rule in section seven is met. It tells the partner what kind of project the studio finished and in which month.

### Touch one subject line (RNS-LDB-04)

`{{touch_one_subject_line}}`

Write a short subject that says the studio has finished another project in the partner's area.

### Project type (RNS-LDB-05)

`{{project_type}}`

State the project type as the project log records it, residential or commercial, and nothing about the property.

### Completion month (RNS-LDB-06)

`{{completion_month}}`

Give only the month and year the project reached completion, never the day.

### Touch one note (RNS-LDB-07)

`{{touch_one_note}}`

Thank the partner for the introductions they make and say, in two or three sentences, that the studio has capacity for new residential work.

## 5. Touch two, two weeks after touch one

The second touch follows two weeks after touch one, if the sequence has not stopped.

### Touch two subject line (RNS-LDB-08)

`{{touch_two_subject_line}}`

Write a short subject that offers the partner something useful rather than asking for anything.

### Touch two note (RNS-LDB-09)

`{{touch_two_note}}`

Offer one practical point a homeowner buying or selling might want to know about planning a renovation, with no mention of any client or project.

## 6. Touch three, four weeks after touch two

The third touch follows four weeks after touch two, if the sequence has not stopped, and it is the last.

### Touch three subject line (RNS-LDB-10)

`{{touch_three_subject_line}}`

Write a short subject that closes the sequence politely.

### Touch three note (RNS-LDB-11)

`{{touch_three_note}}`

Say the studio is glad to hear from the partner whenever a homeowner needs a design and build team, and that this is the last note in the series.

## 7. When the sequence starts and stops

The sequence starts only for a completed project whose project log row carries no open support issue. An open support issue is an `issue_opened_date` with no `issue_resolved_date`, and a project carrying one goes to the owner; no touch is drafted for it.

Every touch is drafted and held for the owner. Nothing in the sequence is sent by the loop, and the loop never sends a touch on its own.

A touch to the referral partner never names the client. It never carries the property address or the project name either, because the project name carries the household's surname. It carries the project type and the month of completion and nothing else from the project log: the partner learns that the studio finished a residential project in a given month, not whose house it was.

The sequence stops as soon as the partner replies, and it stops at once if the partner asks for no further messages. No fee, gift or other incentive is offered for an introduction, in any touch.

## 8. Closing note

Generation stops when a required field's slot is empty, and names the field it stopped on by field name and field id. It never fills an empty slot from a working file or from anything else on the drive. The disclosure field stays out of a touch that was not drafted with AI assistance.

Every touch is held for the owner to read, change and send.
