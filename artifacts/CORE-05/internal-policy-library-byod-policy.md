# Bring Your Own Device (BYOD) Policy

## Document Control

| Field | Value |
|---|---|
| Document ID | ADI-POL-006 |
| Version | 1.4 |
| Status | Superseded |
| Owner | Tobias Lindqvist, Chief Information Security Officer |
| Approver | Tobias Lindqvist, Chief Information Security Officer |
| Effective Date | 2023-04-01 |
| Last Reviewed | 2024-04-01 |
| Next Review Due | 2025-04-01 |
| Supersedes | ADI-POL-006 v1.3 |
| Superseded By | ADI-POL-003 v5.0 (effective 2026-03-01) |

## 1. Purpose

Atticus Dundee Inc. permits employees to use personally owned devices for work under defined conditions. This policy sets out which devices qualify, what the employee agrees to in exchange for access, what the Company can and cannot do to an enrolled device, and what happens when the arrangement ends.

Participation in the program is voluntary. Employees who prefer to keep Company work off their personal devices may request Company-issued equipment instead, and doing so carries no consequence for the employee.

## 2. Scope

This policy applies to all employees, contractors, and temporary workers who use a personally owned device to access Company email, calendar, chat, documents, or applications, and to the Company personnel who administer the program.

Company-issued devices are outside the scope of this policy and are governed by ADI-POL-003 (Acceptable Use Policy).

## 3. Definitions

**Personal device.** A smartphone, tablet, or personal computer owned by the individual rather than by the Company.

**Enrollment.** Registration of a personal device with the Company mobile device management (MDM) platform, which applies the Company security profile to the device.

**Participation Agreement.** The signed form, attached to this policy as the BYOD Participation Agreement, by which the employee accepts the terms of the program, including the wipe consent in Section 8.

**Work data.** Company email, files, credentials, application data, and any other information belonging to the Company or to a Company customer that is present on the device.

## 4. Device Eligibility

1. The following personal devices may be enrolled: smartphones, tablets, and personal laptop or desktop computers.
2. Enrolled devices must run one of the following operating systems or later:
   - iOS 15.0 or iPadOS 15.0
   - Android 11
   - macOS 12
   - Windows 10, version 21H2
3. Vendor security updates must be applied within 30 days of release. Devices running an operating system below the minimum version are blocked from Company services until they are updated.
4. Devices that have been jailbroken, rooted, or otherwise modified to bypass vendor security controls are not eligible and will be blocked on detection.
5. A maximum of two personal devices per employee may be enrolled. Requests for additional devices are handled as exceptions under Section 12.
6. Shared or family devices are not eligible. The employee must be the sole regular user of an enrolled device.

## 5. Enrollment

1. The employee requests enrollment through the IT service desk and signs the BYOD Participation Agreement. Enrollment does not proceed until the signed agreement is on file with IT Asset Management.
2. The employee re-acknowledges the Participation Agreement annually, and again whenever the terms of the program change materially.
3. IT enrolls the device in the MDM platform, which applies the Company security profile, provisions Company applications, and registers the device for conditional access.
4. Employees must not attempt to remove, disable, or spoof the MDM profile. Removal of the profile revokes access immediately and is treated as a security event.
5. Access to Company services from a personal device that is not enrolled is blocked by conditional access.

## 6. Security Requirements

1. Full-device encryption must be enabled and must remain enabled.
2. The device must be protected by a passcode of at least six alphanumeric characters, or by a biometric unlock backed by a passcode of that strength.
3. The device must lock automatically after no more than 15 minutes of inactivity.
4. Company email and files are accessed only through the Company-approved applications provisioned by MDM. Configuring Company email in a third-party or native mail client that MDM does not manage is prohibited.
5. Work data must not be copied into personal cloud backups, personal note-taking applications, personal messaging applications, or removable media.
6. Company data classified as Restricted may not be accessed from a personal device under any circumstances.
7. Devices connect to Company resources through the Company VPN when using a public or untrusted network.
8. Antimalware software is required on personal computers and must be kept current.

## 7. Telecom Stipend

1. Employees enrolled in the program receive a telecom stipend of $65 per month, paid through payroll, in recognition of the voice and data usage attributable to Company work.
2. The stipend is taxable to the employee and is not a reimbursement of actual charges. The Company does not reimburse carrier bills, overage charges, device purchase, insurance, or repair.
3. The stipend starts in the payroll period following enrollment and ends in the payroll period following unenrollment or separation.
4. Employees who receive a Company-issued mobile device are not eligible for the stipend.

## 8. Remote Wipe

1. By signing the BYOD Participation Agreement, the employee consents to remote wipe of the enrolled device by the Company.
2. The Company may initiate a **full-device wipe**, restoring the device to factory settings and removing personal as well as Company content, in any of the following circumstances:
   - the device is reported lost or stolen;
   - the employee separates from the Company and does not present the device for unenrollment within five business days of the separation date;
   - the MDM platform detects tampering, jailbreak, or root;
   - the Security team determines that Company data on the device is at risk of unauthorized disclosure.
3. Where circumstances permit, the Company will attempt a targeted removal of Company applications and data before initiating a full-device wipe, and will give the employee notice and an opportunity to back up personal content. The Company is not obliged to do so where delay would put Company or customer data at risk.
4. The Company is not responsible for personal data, photographs, messages, or applications lost as a result of a wipe carried out under this section. Employees are responsible for maintaining their own backups of personal content.
5. Wipe actions are logged, and each is reviewed by the Chief Information Security Officer.

## 9. Privacy of Personal Data

1. The MDM platform collects device attributes needed to enforce this policy: model, operating system version, encryption state, passcode compliance, jailbreak or root status, the inventory of managed applications, and the device's last check-in time.
2. The Company does not read personal email, personal messages, personal photographs, or browsing history on an enrolled device, and does not collect device location except where the device has been reported lost or stolen and location is enabled by the device owner at the time.
3. Company access to work data on the device may be preserved and collected where the device is subject to a legal hold issued under ADI-POL-001 (Data Retention Policy). In that event, collection is limited to work data wherever technically possible.
4. Employees should keep personal content out of Company-managed applications, because content placed there is treated as work data.

## 10. Support

1. The IT service desk supports enrollment, Company applications, and connectivity to Company services on enrolled devices.
2. The service desk does not support device hardware, carrier service, personal applications, or operating system faults unrelated to Company software.
3. The Company does not repair or replace personal devices. An employee whose personal device becomes unusable may request temporary Company-issued equipment.

## 11. Offboarding and Device Disposal

1. On the separation date, or on withdrawal from the program, the employee presents the device to IT for unenrollment, or completes unenrollment through the MDM self-service portal and confirms completion to the IT service desk.
2. Unenrollment removes Company applications, accounts, certificates, and managed data from the device.
3. Employees must unenroll a device before selling, trading in, recycling, or otherwise transferring it, and must perform a factory reset before transfer.
4. Failure to complete unenrollment within five business days of separation triggers the wipe provisions in Section 8.

## 12. Exceptions

Exceptions require the written approval of the Chief Information Security Officer. Requests are submitted to security@atticusdundee.example and must state the requirement at issue, the business justification, the compensating controls, and the requested duration. Exceptions are recorded in the exception register and are reviewed at least annually.

## 13. Enforcement

Removing the MDM profile, using an unenrolled device to access Company services, storing Restricted data on a personal device, or failing to unenroll a device on separation may result in immediate revocation of access, recovery of the stipend, and disciplinary action up to and including termination of employment.

## 14. Related Documents

- ADI-POL-001, Data Retention Policy
- ADI-POL-003, Acceptable Use Policy
- BYOD Participation Agreement (IT service desk)
- Company Software Catalog (IT service desk)

## Version History

| Version | Date | Summary of Change | Approved By |
|---|---|---|---|
| 1.0 | 2020-02-10 | Initial policy issued for smartphone and tablet enrollment. | Tobias Lindqvist |
| 1.1 | 2021-03-15 | Added personal computer eligibility and antimalware requirement. | Tobias Lindqvist |
| 1.2 | 2022-01-24 | Introduced the telecom stipend and the annual re-acknowledgment. | Tobias Lindqvist |
| 1.3 | 2022-11-14 | Added conditional access enforcement and privacy disclosures. | Tobias Lindqvist |
| 1.4 | 2023-04-01 | Raised minimum operating system versions; set the stipend at $65 per month; clarified wipe circumstances and offboarding timelines. | Tobias Lindqvist |
