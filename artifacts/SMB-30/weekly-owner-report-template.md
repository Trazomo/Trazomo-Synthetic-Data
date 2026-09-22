# Weekly Owner Report Template

## 1. How to use this template

This is a blank template and not a report. Nothing in it is filled in: no client, no price, no date and no entity the studio works with appears anywhere in it. Every value the owner supplies is carried as a placeholder token: the field name in snake_case, inside double braces.

Each field is listed once in the template's own required-field list below, with its field id, its required flag, its placeholder token, the source columns it reads and the window it covers, then repeated as a body section in the same order. Eleven of the fourteen fields are required and three are optional. The required-field list is the authority: a field's required flag is stated once, in that table, and no body section restates it.

A field section carries its placeholder token on its own line and one sentence saying where the value comes from. The source columns a figure field is computed from belong to the issued invoice register and to the mock payment log, so a figure in a filled report can be traced back to the rows it came from. Where a section carries no token and no text, its slot is empty.

## 2. Required-field list

| `field_id` | `field_name` | `required` | `placeholder_token` | `source_columns` | `window_rule` |
|---|---|---|---|---|---|
| `RPT-LDB-01` | Report week | yes | `{{report_week}}` | none, the window itself | not a figure |
| `RPT-LDB-02` | Report date | yes | `{{report_date}}` | none | not a figure |
| `RPT-LDB-03` | Invoices issued this week | yes | `{{invoices_issued_this_week}}` | `invoice_id`, `invoice_date` | week bounded |
| `RPT-LDB-04` | Value invoiced this week | yes | `{{value_invoiced_this_week}}` | `invoice_amount_usd`, `invoice_date` | week bounded |
| `RPT-LDB-05` | Payments settled this week | yes | `{{payments_settled_this_week}}` | `settled_amount_usd`, `settlement_date`, `settlement_status` | week bounded |
| `RPT-LDB-06` | Cash on hand | yes | `{{cash_on_hand}}` | `settled_amount_usd`, `settlement_status` | as-of date |
| `RPT-LDB-07` | Cash after committed payables | yes | `{{cash_after_committed_payables}}` | `settled_amount_usd`, `settlement_status`, plus committed outgoings | as-of date |
| `RPT-LDB-08` | Cash basis assumption | yes | `{{cash_basis_assumption}}` | none, it is the sentence the two readings demand | not a figure |
| `RPT-LDB-09` | Total open balance | yes | `{{total_open_balance}}` | `invoice_amount_usd`, `installment_amount_usd`, `settlement_status` | as-of date |
| `RPT-LDB-10` | Oldest open item | yes | `{{oldest_open_item}}` | `invoice_id`, `due_date`, `installment_due_date`, `settlement_status` | as-of date |
| `RPT-LDB-11` | Invoices open past their terms | no | `{{invoices_open_past_their_terms}}` | `due_date`, `settlement_status` | as-of date |
| `RPT-LDB-12` | Provisional figures and why | yes | `{{provisional_figures_and_why}}` | none, it names the fields carrying the marker | not a figure |
| `RPT-LDB-13` | Owner note | no | `{{owner_note}}` | none | not a figure |
| `RPT-LDB-14` | Next week's draw plan | no |  | none | not a figure |

## 3. The report

### Report week (RPT-LDB-01)

`{{report_week}}`

State the week this report covers, opening day and closing day, and measure every week bounded figure against it.

### Report date (RPT-LDB-02)

`{{report_date}}`

State the day the report was written, which sits inside the report week and fixes every as of figure.

### Invoices issued this week (RPT-LDB-03)

`{{invoices_issued_this_week}}`

Count the `invoice_id` values in the issued invoice register whose `invoice_date` falls inside the report week.

### Value invoiced this week (RPT-LDB-04)

`{{value_invoiced_this_week}}`

Sum `invoice_amount_usd` over those same rows of the issued invoice register.

### Payments settled this week (RPT-LDB-05)

`{{payments_settled_this_week}}`

Sum `settled_amount_usd` over the mock payment log rows whose `settlement_status` reads settled and whose `settlement_date` falls inside the report week.

### Cash on hand (RPT-LDB-06)

`{{cash_on_hand}}`

Sum `settled_amount_usd` over every mock payment log row whose `settlement_status` reads settled up to the report date.

### Cash after committed payables (RPT-LDB-07)

`{{cash_after_committed_payables}}`

Take that same settled total and subtract what is already owed out at the report date.

### Cash basis assumption (RPT-LDB-08)

`{{cash_basis_assumption}}`

State in one sentence which of the two readings above this report used.

### Total open balance (RPT-LDB-09)

`{{total_open_balance}}`

Sum `installment_amount_usd` behind a payment plan and `invoice_amount_usd` otherwise, over obligations whose `settlement_status` reads open.

### Oldest open item (RPT-LDB-10)

`{{oldest_open_item}}`

Name the `invoice_id` whose earliest unsettled obligation is furthest back, reading `installment_due_date` behind a payment plan and `due_date` otherwise.

### Invoices open past their terms (RPT-LDB-11)

`{{invoices_open_past_their_terms}}`

Count the invoices whose `due_date` is earlier than the report date and whose `settlement_status` reads open.

### Provisional figures and why (RPT-LDB-12)

`{{provisional_figures_and_why}}`

Name every figure carrying the marker and say why its window is open.

### Owner note (RPT-LDB-13)

`{{owner_note}}`

Say what the figures do not, and leave it out on a quiet week.

### Next week's draw plan (RPT-LDB-14)

## 4. One metric defined twice

Cash on hand and cash after committed payables are two readings of one question, how much money the studio has. Cash on hand counts what has settled. Cash after committed payables subtracts what is already owed out. They are two separate fields with two separate tokens, `{{cash_on_hand}}` and `{{cash_after_committed_payables}}`, and a third field, `{{cash_basis_assumption}}`, states which reading this report used. That sentence is the assumption line, and the template says a report carrying either figure without it is incomplete.

## 5. The provisional rule

Any figure whose window is still open at the report date carries the marker PROVISIONAL beside it, and no figure carrying that marker is presented as final. The report date sits inside the report week, so the week bounded fields are the ones the rule applies to: Invoices issued this week (RPT-LDB-03), Value invoiced this week (RPT-LDB-04) and Payments settled this week (RPT-LDB-05). Every figure carrying the marker is named in Provisional figures and why (RPT-LDB-12), with the reason its window is open. The open balance and aging fields are as-of figures, so they are not provisional.

## 6. Before this report is generated

Generation stops when a required field's slot is empty. The template never fills an empty required slot from a working file or from anything else on the drive: it stops and names the field it stopped on, by field name and by field id.

An optional field whose slot is empty is not a stop. The required-field list is the only place that difference is recorded, so a rule that finds empty slots without reading the required column returns one and blocks on a field this template was free to leave empty.

Generation never presents an open window figure as final either.
