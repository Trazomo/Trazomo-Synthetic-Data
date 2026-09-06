# Approved Outbound Message Templates

**Entity:** Atticus Dundee Inc.

**Approved by:** VP, Marketing

**Last reviewed:** March 13, 2026

**Review cadence:** quarterly

**Status:** approved, and the only outbound template library approved for use

## How this library is used

The seven templates below are the approved starting text for an outbound message. A person, or an assistant working for one, picks the template whose category matches the situation, fills every variable slot from the customer relationship management export, and leaves the result where a person can read it before anything else happens to it.

Nothing in this library sends anything. Drafts stay drafts: no subject line, no body and no instruction anywhere below moves a message out of the drafting tool, and a draft nobody approves simply expires there.

A template is a starting point and not a script. Cutting a paragraph, or writing a sentence that is truer for the account in front of you, is expected. Adding a claim is not, and the rule for that is two sections down.

## Variable slots

A slot is written `{{contact.first_name}}`: two braces, the name of the export the value comes from, a dot, and the name of the column inside it. Three exports are addressable, and they are the contact, account and opportunity files of the customer relationship management seed export.

Every slot names exactly one column of one export, spelled the way that export's header row spells it. A slot that names a column no export carries is not a slot at all, and the draft stops on it rather than guessing at a value or leaving the braces in the text for the recipient to find.

The same rule covers two situations that can look like a filled slot but are not. Where the recipient is a person the export carries no row for at all, such as a signal about a new hire who has no customer relationship management record yet, every slot naming that person stays unfilled. Where the export does carry the row but the named column is blank for it, the slot stays unfilled the same way. Either way the draft stops there and names the missing input for the person reviewing it; no slot is ever filled from a guess.

## Claims

Every certification claim a template asserts is read by membership in the pinned recognized certifications vocabulary, and it resolves to a certification row of the maintained claims register. That is the whole rule, and it is the same rule the pre-send policy check runs.

A claim that resolves to no row is not approved, so no template here carries one. Where a conversation needs a claim this library does not make, the claim goes to the register owner to be added, evidenced and reviewed, and it waits there. It does not travel in a draft in the meantime.

No template states a figure from the company's accounts, names a customer, or names a competitor. A question that needs one of those is answered by the function that owns it.

## Before addressing anyone

The recipient email verification sidecar, `recipient-email-verification.yaml`, records for every target-account contact which of the two statuses that contact's address carries: verified, meaning the address was confirmed on the last enrichment run, or inferred, meaning it was constructed from the account's domain pattern and never confirmed.

Where the status is inferred, the drafter abstains. It records the missing input and stops, rather than writing to an address nobody has confirmed. Consent is a separate question, asked and answered before this one, and a permitted consent state does not make an unverified address usable.

The re_engagement category carries a gate of its own, upstream of both of these: a re-engagement draft is only assembled after the suppression check on the account clears, and an account-level do-not-contact state ends the play before any draft exists.

## The templates

### TPL-01

Category: new_hire

Subject: A short note ahead of your first weeks at {{account.name}}

```
Hello {{contact.first_name}},

Congratulations on the move to {{account.name}}. A new {{contact.title}} usually arrives to a list of systems to inherit and very little quiet time to look at any of them properly, so this is short.

We work with {{account.industry}} teams on the work that sits between their systems: the running list of what is in flight, who holds each piece, and where something stopped and nobody noticed. If that is on your list for the first quarter, I can put a fifteen minute walkthrough together at whatever point in the next few weeks suits you.

If it is not, say so and I will leave you to the first ninety days.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-02

Category: new_hire

Subject: Security and control questions, ahead of your review at {{account.name}}

```
Hello {{contact.first_name}},

Congratulations on the {{contact.title}} appointment at {{account.name}}. Most people in that seat spend the first month working out what the estate already runs on and what it has been assessed against, so here is our side of that in one paragraph.

The platform is covered by a current SOC 2 Type II report across the security and availability criteria, and the information security management system that supports it is certified to ISO/IEC 27001. The report and the certificate both go to your reviewer under a mutual nondisclosure agreement, and the statement of applicability goes with them.

If a security review is on your list this quarter, reply and I will put the materials in front of whoever is running it.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-03

Category: champion_reconnect

Subject: Picking up where we left off, now at {{account.name}}

```
Hello {{contact.first_name}},

We worked together on your last rollout, and I saw that you have taken the {{contact.title}} seat at {{account.name}}. Congratulations on the move.

I am not going to assume the same problem followed you here. What I can say is that the work we did together is a fair template for one at a {{account.industry}} team of this size, and that our people still remember which parts of it were painful and why.

If it is useful, I will write up what we would do differently this time and put it in front of you. If the timing is wrong, tell me and I will check back later in the year.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-04

Category: re_engagement

Subject: What has changed since we last spoke

```
Hello {{contact.first_name}},

We spoke last year about a rollout at {{account.name}}, and the decision went a different way, which was a reasonable call on what the platform did at the time.

Administrative actions are written to a tenant audit log retained for twelve months, and single sign-on through SAML 2.0 with user provisioning through SCIM is available on every paid tier.

If either one changes the arithmetic, I am glad to walk your team through it. If not, this is the last note you will get from me on it.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-05

Category: website_intent

Subject: The access and audit questions, answered in one paragraph

```
Hello {{contact.first_name}},

Somebody at {{account.name}} spent real time on our documentation for permissions and audit logging this week. That may have been you and it may have been a colleague, so I will keep this to what is useful either way.

Permissions inside the product are role based and your administrators hold them, not ours, and administrative actions are written to a tenant audit log retained for twelve months. On our own side, the corporate information technology environment holds a current Cyber Essentials certification, renewed each year.

If the harder version of that question is the one you actually have, reply with a time that works and I will bring an engineer who can answer it.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-06

Category: website_intent

Subject: Residency and subprocessors, in writing

```
Hello {{contact.first_name}},

Our residency and subprocessor pages saw traffic from {{account.name}} this week, so here is the short version in writing rather than a meeting invitation.

The storage region for an account is chosen when the account is created, and content for customers in the European Union and the United Kingdom is stored in a European Union region. A data processing addendum incorporating the current standard contractual clauses is available for every paid tier, and the subprocessors we use to deliver the platform are published, with at least thirty days notice of a change. On the control side, the scope of our ISO/IEC 27001 certification includes the cloud service controls of ISO/IEC 27017, assessed in the same audit cycle.

If your {{account.segment}} review needs the addendum itself, reply and I will get it to your legal reviewer this week.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```

### TPL-07

Category: general_intro

Subject: A short introduction, and one question about {{account.name}}

```
Hello {{contact.first_name}},

I look after {{account.industry}} accounts here and I have not written to you before, so this is an introduction rather than a pitch.

Atticus Dundee Inc. builds a workflow and collaboration platform that teams use to run shared work: what is in flight, who holds each piece, and what is waiting on somebody else. Teams of your size usually come to us when that picture has spread itself across four tools and nobody trusts any of them enough to run a Monday meeting from it.

If that is familiar, reply with a time and I will show you the version of it closest to a team in the {{account.segment}} band. If it is not, I will not write again.

Best regards,
{{account.owner_name}}
Atticus Dundee Inc.
```
