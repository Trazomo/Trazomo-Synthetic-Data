# Feedback Request Template

## 1. How to use this template

This is a blank feedback request template and not a filled request. No client, no price, no date and no entity the studio works with appears anywhere in it. Every value is carried as a placeholder token: the field name in snake case, inside double braces.

The template is filled once per row of the completed projects log, the studio's project log of every project brought to substantial completion. The loop drafts the request and the draft is held for the owner, who reads it and decides whether it goes. The loop never sends a request.

Each of the ten fields is listed once in the required-field list below, with its field id, its required flag, its placeholder token, the source columns it reads and the condition it depends on, then repeated as a body section in the same order.

## 2. Required-field list

| `field_id` | `field_name` | `required` | `placeholder_token` | `source_columns` | `condition` |
|---|---|---|---|---|---|
| `FRQ-LDB-01` | Subject line | yes | `{{subject_line}}` | none | none |
| `FRQ-LDB-02` | Studio name | yes | `{{studio_name}}` | none | none |
| `FRQ-LDB-03` | Client name | yes | `{{client_name}}` | `client_name` | none |
| `FRQ-LDB-04` | Project name | yes | `{{project_name}}` | `project_name` | none |
| `FRQ-LDB-05` | Completion date | yes | `{{completion_date}}` | `completion_date` | none |
| `FRQ-LDB-06` | Thank you note | yes | `{{thank_you_note}}` | none | none |
| `FRQ-LDB-07` | Resolved issue note | conditional | `{{resolved_issue_note}}` | `issue_summary`, `issue_resolved_date` | the log row carries an issue resolved date |
| `FRQ-LDB-08` | Feedback question | yes | `{{feedback_question}}` | none | none |
| `FRQ-LDB-09` | Sender role | yes | `{{sender_role}}` | none | none |
| `FRQ-LDB-10` | AI disclosure line | conditional | `{{ai_disclosure_line}}` | none | the request was drafted with AI assistance |

## 3. The request

### Subject line (FRQ-LDB-01)

`{{subject_line}}`

Write a short, plain subject that says the studio would value the client's view of the finished project.

### Studio name (FRQ-LDB-02)

`{{studio_name}}`

Sign the request with the studio's trading name exactly as the client knows it.

### Client name (FRQ-LDB-03)

`{{client_name}}`

Address the client as the project log names them, and name no other client anywhere in the request.

### Project name (FRQ-LDB-04)

`{{project_name}}`

Name the project as the project log names it, so the client knows which piece of work is meant.

### Completion date (FRQ-LDB-05)

`{{completion_date}}`

State the day the project reached substantial completion, written out in words for the client.

### Thank you note (FRQ-LDB-06)

`{{thank_you_note}}`

Thank the client for the work in two or three sentences that claim nothing the project log does not state.

### Resolved issue note (FRQ-LDB-07)

`{{resolved_issue_note}}`

Say plainly what went wrong after completion and how the studio put it right, in the client's own terms rather than as an apology.

### Feedback question (FRQ-LDB-08)

`{{feedback_question}}`

Ask one open question about the experience, and leave the client free to answer it however they choose.

### Sender role (FRQ-LDB-09)

`{{sender_role}}`

Give the role of the person the request comes from, the owner or the project lead, and no personal name.

### AI disclosure line (FRQ-LDB-10)

`{{ai_disclosure_line}}`

Carry the studio's own disclosure sentence, word for word as the data-handling checklist states it.

## 4. Before a request is drafted

The gate runs before any field is filled. Read the project's row in the project log. A request is drafted only for a completed project whose log row carries no open support issue. An open support issue is a row with an `issue_opened_date` and no `issue_resolved_date`: the studio still owes that household work.

A project carrying an open support issue goes to the owner, and no request is drafted. The owner decides when the work is finished and whether a request follows. A project whose issue carries a resolved date passes the gate, and its request fills the resolved issue note.

## 5. What a request never says

A request never claims more than the project log states about the work, the dates or the result. It never offers a gift, a discount or any other incentive for feedback, and it never asks for a particular rating or for a review on any named site. It names no other client and no other project.

## 6. Closing note

Generation stops when a required field's slot is empty, and names the field it stopped on by field name and field id. It never fills an empty slot from a working file or from anything else on the drive. A conditional field whose condition is not met stays out of the request.

Every draft is held for the owner to read, change and send. The loop never sends a request.
