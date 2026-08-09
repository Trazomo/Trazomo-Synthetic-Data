# Acceptable Use Policy

## Document Control

| Field | Value |
|---|---|
| Document ID | ADI-POL-003 |
| Version | 5.0 |
| Status | Active |
| Owner | Tobias Lindqvist, Chief Information Security Officer |
| Approver | Tobias Lindqvist, Chief Information Security Officer |
| Effective Date | 2026-03-01 |
| Last Reviewed | 2025-06-30 |
| Next Review Due | 2026-06-30 |
| Supersedes | ADI-POL-006 |
| Superseded By | None |

## 1. Purpose

This policy defines how personnel of Atticus Dundee Inc. may use Company information systems, networks, applications, and data, and the security obligations that attach to that use.

## 2. Scope

This policy applies to all employees, officers, directors, contractors, temporary workers, and third parties who access Company systems or data, on any device, from any location. It covers Company-issued endpoints, personal devices used under Section 7, Company accounts on third-party services, and any network used to reach Company data. Acceptance is a condition of system access, which is granted only after the user completes the annual security awareness training.

## 3. Data Classification

All Company information falls into one of four tiers, and the tier determines how it must be handled.

1. **Restricted.** Information whose disclosure would cause severe harm to the Company, a customer, or an individual: customer production data, authentication secrets and private keys, unreleased financial results, and special categories of personal data. It may be stored only in systems approved in writing by Security, must be encrypted in transit and at rest, and may not be copied to removable media or to personal storage.
2. **Confidential.** Information shared under an obligation of confidence or intended for a defined internal audience: contracts, pricing, roadmaps, personnel records, customer correspondence. It may be disclosed externally only under an executed non-disclosure agreement or contract term.
3. **Internal.** Information for general internal use, such as policies and team documentation. Not published externally without approval.
4. **Public.** Information approved for public release.

Where the classification of a record is unclear, treat it as Confidential and ask the data owner.

## 4. Access and Authentication

1. Each user is issued a unique account. Accounts, credentials, and access tokens are never shared.
2. Multi-factor authentication is mandatory for every Company system that supports it. Phishing-resistant factors, meaning hardware security keys or platform passkeys, are required for administrative and production access. SMS is not an acceptable second factor for any system.
3. Passwords are generated and stored in the Company password manager. Reuse of a Company password on a non-Company service is prohibited.
4. Users lock unattended sessions, and endpoints lock automatically after ten minutes of inactivity.
5. Access follows least privilege, is reviewed quarterly by system owners, and is revoked on the effective date of separation or role change.
6. Elevated and production access is requested through the access management workflow, is time-bound, and expires automatically.

## 5. Acceptable Use of Company Systems

Company systems are provided for Company business. Incidental personal use is permitted where it is limited, does not interfere with work, incurs no cost to the Company, and does not violate this policy. Users are responsible for the security of the data they handle and for reporting anything that appears to be a security event under Section 11.

## 6. Prohibited Activities

The following are prohibited on Company systems, networks, and accounts:

1. Accessing, altering, or exfiltrating data the user is not authorized to access, including through another person's credentials.
2. Circumventing or disabling security controls, including endpoint agents, logging, VPN, DNS filtering, and disk encryption.
3. Scanning or testing the security of Company or third-party systems without written authorization from the Chief Information Security Officer.
4. Storing or transmitting Restricted or Confidential data through personal email, personal cloud storage, personal messaging, or unapproved file-transfer services.
5. Connecting unapproved hardware to the corporate network, including personal routers, access points, and network-attached storage.
6. Using Company systems to harass, defame, or discriminate, to view or distribute unlawful material, or to conduct outside business.
7. Using unlicensed commercial software, or using open source components in Company products outside the license review process.
8. Cryptocurrency mining, operating public-facing services, or reselling Company network or compute capacity.
9. Auto-forwarding Company email to a non-Company address.

## 7. Personal Devices

Effective 2026-03-01 this section replaces the standalone bring-your-own-device policy, ADI-POL-006, which it supersedes in full. Personal device use is governed here.

1. **Permitted devices.** Personal smartphones and tablets may be used to access Company email, calendar, chat, and approved productivity applications. Personal laptops and desktops may not be used to access Company systems, other than through the browser-based virtual desktop for approved contingency scenarios. Access to production environments, customer data, and source control from a personal device is prohibited in all cases.
2. **Enrollment.** Any personal device used for work must be enrolled in the Company mobile device management (MDM) platform before it is granted access. Enrollment installs a managed work profile that separates Company applications and data from personal applications and data. Devices that are jailbroken, rooted, or running unsigned system software are refused enrollment and blocked.
3. **Minimum operating system.** Enrolled devices must run iOS 18.0 or later, iPadOS 18.0 or later, or Android 15 or later, and must have all vendor security updates applied within 14 days of release. Devices that fall below the minimum version lose access automatically until they are updated.
4. **Encryption and device security.** Device-level encryption must be enabled. The device must require a passcode of at least six digits or a biometric unlock, and must lock automatically after no more than five minutes of inactivity.
5. **Remote wipe.** The Company may remotely wipe the managed work profile at any time, including on separation, on report of loss or theft, or on detection of a policy violation. The wipe is selective: it removes Company applications, accounts, and data, and does not remove personal photographs, messages, or applications. Consent to selective wipe is captured through the click-through acknowledgment presented during MDM enrollment, and enrollment cannot be completed without it.
6. **Separation of work data.** Company data must remain inside the managed work profile. Copying Company data into personal applications, personal cloud backups, or personal messaging is prohibited, and the MDM configuration blocks it where technically possible.
7. **No stipend.** Personal device use is voluntary. The Company does not provide a stipend for personal devices and does not reimburse carrier charges, device purchase, or device repair. Employees who prefer not to enroll a personal device may request a Company-issued mobile device through the IT service desk.
8. **Loss, theft, and disposal.** Loss or theft of an enrolled device must be reported to the IT service desk and to security@atticusdundee.example immediately, and in any event within 24 hours. Before selling, trading in, or disposing of an enrolled device, the user must unenroll it through the MDM self-service portal.
9. **Offboarding.** Enrollment terminates on the separation date and the work profile is wiped. The user is responsible for retrieving any personal data they have stored inside the work profile before that date.

## 8. Software Installation and Unapproved Services

1. Software is installed from the Company software catalog. Installing anything outside the catalog on a Company endpoint requires an approved request in the IT service desk.
2. Any third-party service that processes Company data, including free-tier services signed up for with a Company email address, must go through security review and, where a contract is signed, the Legal Department. Adopting such a service without review, sometimes described as shadow IT, is a policy violation regardless of cost.
3. Browser extensions require approval, and those requesting read or write access to page content are approved only by exception.
4. Security may remove unapproved software or block unapproved services without prior notice.

## 9. Generative AI Tools

1. Generative AI tools may be used for Company work only where they appear on the approved AI tools list maintained by Security and published in the software catalog. Use of any other generative AI service for Company work is prohibited.
2. Restricted data may not be entered into any generative AI tool. Customer data, including customer content, customer personal data, and any data received under a customer contract, may not be entered into any generative AI tool, whether or not that tool is on the approved list, except where the Legal Department has confirmed in writing that the customer contract permits it.
3. Confidential data may be entered only into approved tools under a Company enterprise agreement that disables training on Company inputs and provides zero or contractually bounded retention.
4. Output must be reviewed by a qualified person before it is relied on, published, committed to a production system, or used in a customer deliverable. The user remains accountable for the output.
5. AI-generated code is subject to the same review, license, and security scanning requirements as code written by hand.
6. AI features embedded in an approved application are covered by that approval only where the software catalog entry says so.

## 10. Monitoring

The Company logs and monitors use of its systems, networks, accounts, and Company-issued devices for security, compliance, capacity, and investigative purposes, including authentication events, network and DNS telemetry, endpoint activity, email and file-sharing metadata, and, where an investigation is authorized by the General Counsel, message and file content.

On personal devices enrolled under Section 7, monitoring is limited to the managed work profile and to device posture attributes such as operating system version, encryption state, and jailbreak status. Users have no expectation of privacy in Company systems or in the managed work profile.

## 11. Incident Reporting

Any suspected or actual security incident, including phishing, malware, credential compromise, lost or stolen devices, misdirected data, or unauthorized access, must be reported to security@atticusdundee.example within 24 hours of discovery. Users must not attempt to investigate or remediate an incident themselves beyond disconnecting an affected device from the network. Good-faith reports, including reports of the reporter's own mistakes, are not a basis for discipline.

## 12. Exceptions

Exceptions require the written approval of the Chief Information Security Officer. Requests are submitted to security@atticusdundee.example and must identify the control at issue, the business need, the compensating controls, and a proposed expiry date not more than twelve months out. Exceptions are recorded in the exception register and lapse on expiry unless renewed.

## 13. Enforcement

Violations may result in suspension of access, disciplinary action up to and including termination of employment, termination of a contractor engagement, and referral to law enforcement where the conduct may be unlawful.

## 14. Related Documents

- ADI-POL-001, Data Retention Policy
- ADI-POL-002, Remote Work Policy
- ADI-POL-004, Social Media Policy
- ADI-HR-001, Employee Handbook

## Version History

| Version | Date | Summary of Change | Approved By |
|---|---|---|---|
| 1.0 | 2018-09-17 | Initial policy issued. | Tobias Lindqvist |
| 2.0 | 2020-07-01 | Added data classification tiers and monitoring notice. | Tobias Lindqvist |
| 3.0 | 2022-01-10 | Added mandatory multi-factor authentication and quarterly access reviews. | Tobias Lindqvist |
| 4.0 | 2024-05-13 | Added shadow IT and third-party service review requirements; set 24-hour incident reporting. | Tobias Lindqvist |
| 4.1 | 2025-06-30 | Added generative AI tool requirements and phishing-resistant factors for administrative access. | Tobias Lindqvist |
| 5.0 | 2026-03-01 | Absorbed the standalone bring-your-own-device policy as Section 7; restated personal device requirements; expanded monitoring notice for managed work profiles. | Tobias Lindqvist |
