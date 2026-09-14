# Residential Construction Contract Template

## How to use this template

This is a blank template and not a contract. Nothing in it is filled in, nothing in it refers to a client, a property, a price or a date, and every value the studio has to supply is carried as a placeholder token rather than as an example: the field name in snake_case, inside double braces. A filled example would be read as a precedent, and the first job of a template is to be obviously unfilled.

The template names its own fields. The required-field list below is the authority on which fields a contract has to carry: a field's required flag is stated once, in that table, and no body section restates it. The body then repeats the fields in the same order, one section each, so a reader working down the document and a reader working down the table see the same fields in the same sequence.

A field section carries its placeholder token on its own line, followed by one sentence of drafting guidance. Where a section carries no token, the slot for that field is empty and the template supplies nothing for it. A blank cell in the placeholder_token column means the same thing.

## Required-field list

| `field_id` | `field_name` | `required` | `placeholder_token` |
|---|---|---|---|
| `CFD-LDB-01` | Parties | yes | `{{parties}}` |
| `CFD-LDB-02` | Property address | yes | `{{property_address}}` |
| `CFD-LDB-03` | Scope of work | yes | `{{scope_of_work}}` |
| `CFD-LDB-04` | Contract price | yes | `{{contract_price}}` |
| `CFD-LDB-05` | Payment schedule | yes | `{{payment_schedule}}` |
| `CFD-LDB-06` | Start date | yes | `{{start_date}}` |
| `CFD-LDB-07` | Substantial completion date | yes | `{{substantial_completion_date}}` |
| `CFD-LDB-08` | Scope-change clause | yes |  |
| `CFD-LDB-09` | Allowances and selections | yes | `{{allowances_and_selections}}` |
| `CFD-LDB-10` | Warranty period | yes | `{{warranty_period}}` |
| `CFD-LDB-11` | Insurance and licensing | yes | `{{insurance_and_licensing}}` |
| `CFD-LDB-12` | Acceptance block | yes | `{{acceptance_block}}` |
| `CFD-LDB-13` | Notice address | no | `{{notice_address}}` |
| `CFD-LDB-14` | Dispute resolution | no |  |
| `CFD-LDB-15` | Permit responsibility | no | `{{permit_responsibility}}` |
| `CFD-LDB-16` | Site access hours | no |  |

## The contract

### Parties (CFD-LDB-01)

`{{parties}}`

Name the studio and the client in the form the client record carries them, and give each party the role it holds under this contract rather than a personal name.

### Property address (CFD-LDB-02)

`{{property_address}}`

Carry the property address exactly as the client record states it, with nothing added to it and nothing tidied.

### Scope of work (CFD-LDB-03)

`{{scope_of_work}}`

Take the scope from the approved proposal and add no room, no trade and no allowance the proposal does not carry.

### Contract price (CFD-LDB-04)

`{{contract_price}}`

State the contract sum as a figure that equals the total of the approved proposal to the cent.

### Payment schedule (CFD-LDB-05)

`{{payment_schedule}}`

State the draws as percentages of the contract sum with the figures following, state the terms, and name no instrument of payment.

### Start date (CFD-LDB-06)

`{{start_date}}`

State the date work begins on site, which is the kickoff date the schedule is built from and not the date this contract is signed.

### Substantial completion date (CFD-LDB-07)

`{{substantial_completion_date}}`

State the date the work is to reach substantial completion, and state it as a date rather than as a duration.

### Scope-change clause (CFD-LDB-08)

### Allowances and selections (CFD-LDB-09)

`{{allowances_and_selections}}`

List every allowance the proposal carries, say what each one covers, and say what happens to the part of an allowance that is not drawn.

### Warranty period (CFD-LDB-10)

`{{warranty_period}}`

State the warranty period, what it covers and what starts it running.

### Insurance and licensing (CFD-LDB-11)

`{{insurance_and_licensing}}`

State the cover the studio carries and the licences the work requires, and state where the client can ask to see them.

### Acceptance block (CFD-LDB-12)

`{{acceptance_block}}`

Record acceptance by role and by date on both sides, and leave no line that invites anything else.

### Notice address (CFD-LDB-13)

`{{notice_address}}`

Give the address notice is sent to where it differs from the property address, and say which method of delivery counts as given.

### Dispute resolution (CFD-LDB-14)

The studio leaves this optional field empty unless the client asks for it, and a contract that omits it is complete.

### Permit responsibility (CFD-LDB-15)

`{{permit_responsibility}}`

Say which party files for the permits the work requires and which party carries the fees.

### Site access hours (CFD-LDB-16)

The studio leaves this optional field empty on a job with no access restriction, and the working hours in the schedule govern instead.

## Before this template is generated from

Generation stops when a required field's slot is empty. The template does not fill an empty required slot from a working file, from an earlier job, from the approved proposal or from anything else on the drive: it stops, and it names the field it stopped on, by field name and by field id, so that whoever is asked to supply the value knows which value is missing.

An optional field whose slot is empty is not a stop. The required-field list is the only place the difference is recorded, so a rule that looks for empty slots without reading the required column will stop on fields this template was free to leave empty, and will be wrong about all of them but one.
