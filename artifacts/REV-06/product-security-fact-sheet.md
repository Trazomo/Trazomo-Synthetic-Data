# Product and Security Fact Sheet

**Entity:** Atticus Dundee Inc.

**Maintained by:** Chief Information Security Officer

**Last reviewed:** March 11, 2026

**Review cadence:** quarterly

**Status:** current, and approved as the maintained baseline for product and security claims

## About the product

Atticus Dundee Inc. is a business software company of roughly six hundred people. It sells one product to business customers: a workflow and collaboration platform that teams use to run shared work, with a small-team tier for smaller organizations that buy without a procurement process. The product is delivered as a hosted service, and there is no customer-installed edition. This document refers to it as the platform throughout.

Nothing about the company's finances appears here. Financial disclosure travels under its own controls and is not a product or security claim.

## How this register is used

The register below is the maintained baseline for product and security claims. Anyone answering a security questionnaire, drafting an outbound message, briefing a partner, or reviewing copy that an assistant produced resolves every claim in that text against a row in this register. A claim that resolves to a row may be sent as written. A claim that resolves to no row is not approved, and the reviewer either drops it or brings it here to be added, evidenced, and reviewed first.

Claims are grouped into five categories:

- `certification`: an audit report or certification that an independent third party issues to the company.
- `security-control`: a control the company operates itself.
- `availability`: a service level or resilience commitment.
- `data-protection`: a commitment about customer content and personal data.
- `company`: a fact about the company, or about this register.

## Claims register

| claim_id | category | claim |
|---|---|---|
| FS-01 | certification | The company maintains a current SOC 2 Type II report covering the security and availability trust services criteria for the platform. An independent audit firm issues the report once a year, and the company shares it with customers and prospects under a mutual nondisclosure agreement. |
| FS-02 | certification | The information security management system that supports the platform is certified to ISO/IEC 27001. The certificate and the statement of applicability are available on request. |
| FS-03 | certification | The scope of the ISO/IEC 27001 certification includes the cloud service controls of ISO/IEC 27017, assessed in the same audit cycle. |
| FS-04 | certification | The corporate information technology environment holds a current Cyber Essentials certification, renewed each year. |
| FS-05 | security-control | Customer content is encrypted in transit and at rest. Transit uses TLS 1.2 or higher, and storage uses AES-256. |
| FS-06 | security-control | Single sign-on through SAML 2.0 and user provisioning through SCIM are available on every paid tier, including the small-team tier. |
| FS-07 | security-control | Permissions inside the product are role based and the customer administers them, and administrative actions are written to a tenant audit log retained for twelve months. |
| FS-08 | security-control | Employee access to customer content is limited to named support and engineering roles, requires an approved ticket, is time limited, and is logged. There is no standing access to a customer tenant. |
| FS-09 | security-control | An independent firm tests the production platform at least once a year, and a summary of the most recent test is available under a mutual nondisclosure agreement. |
| FS-10 | security-control | A confirmed security incident affecting customer content is reported to the affected customers without undue delay, and no later than seventy-two hours after the company confirms it. |
| FS-11 | availability | Paid tiers carry a 99.9 percent monthly uptime commitment, measured against the published service level terms. |
| FS-12 | availability | Current and historical service status is published on a public status page, and planned maintenance is announced there at least five business days in advance. |
| FS-13 | availability | Production data is backed up daily and retained for thirty days, and restores are exercised every quarter against the documented recovery objectives. |
| FS-14 | data-protection | The storage region for a customer account is chosen when the account is created. Content for customers in the European Union and the United Kingdom is stored in a European Union region, and it is not moved without written customer instruction. |
| FS-15 | data-protection | A data processing addendum incorporating the current standard contractual clauses is available for every paid tier. |
| FS-16 | data-protection | The subprocessors used to deliver the platform are published, and customers receive at least thirty days notice of a change, with a right to object. |
| FS-17 | data-protection | Customer content is not used to train shared machine learning models. An assistive feature that processes customer content does so only for the account that content belongs to. |
| FS-18 | company | The company employs roughly six hundred people and sells a workflow and collaboration platform to business customers, with a small-team tier for smaller organizations. |
| FS-19 | company | This register is the approved baseline for product and security claims. A claim that does not appear here is not approved for outbound or customer-facing use until it is added and reviewed. |

## What this register does not cover

The register states what the company holds and operates today. It does not list a certification, an authorization, or an accreditation that the company is considering, has scoped, has begun, or has merely been asked about by a prospect. If a scheme is not named in a certification row above, the company does not hold it, and no outbound message may say that it does.

The register also carries no customer name, no competitor name, and no figure from the company's accounts. A question that needs one of those is answered by the function that owns it, not from this sheet.

## Evidence and questions

Every row above is backed by a report, a certificate, a control record, or a published page, held by the function that operates the control. Requests for evidence, and proposals to add a row, go to the Chief Information Security Officer.
