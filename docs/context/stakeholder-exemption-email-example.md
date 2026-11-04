# Stakeholder exemption email example

Sent only to active staff holding the Receptionist role. Visitor, approval,
comment and destination fields come from the saved approval transaction.
The stakeholder writes the comment in Approve with Exemption; fixed wording
is maintained in `src/lib/email/templates.ts` (`stakeholderExemptionApprovedTemplate`).

**Subject:** GMC Site Access: Workflow Exemption Approved - Kojo Mensah

Hello,

An approval with exemption has been granted for the following visitor:

**Visitor:** Kojo Mensah<br>
**Passport/ID:** G1234567<br>
**Exempted stages:** Hospital<br>
**Approved by:** Jane Doe (GMM)<br>
**Approved at (UTC):** 2026-11-04T10:00:00.000Z

**Stakeholder's comment:**<br>
Medical clearance has already been verified for this engagement.

The engagement has moved to **Training School** for processing.

[View Engagement](https://example.test/dashboard/reception/00000000-0000-4000-8000-000000000001)

The example uses fictional details and an example domain. Actual emails link to
the configured application's Reception record. Multiple selected stages appear
in the same email; comment line breaks are preserved and HTML characters escaped.
