# Email Templates

Wording used by `src/lib/email/templates.ts`. Change the copy here first, then in code.

---

## 1. Visitor invitation

- **To:** The visitor
- **When:** A Department Head invites someone to register

> **Subject:** GMC Site Access: you're invited to register for a site visit
>
> Hello,
>
> The {department} department at Ghana Manganese Company has invited you to register for a site visit.
>
> **[Start your registration]**
>
> To learn how we use your information, read our **[Privacy Policy]**.
>
> If you were not expecting this invitation, you can ignore this email.

*Privacy Policy link goes to `/privacy-policy`.*

---

## 2. Visitor registration submitted — to Department Head

- **To:** Department Heads of the visitor's department
- **When:** A visitor submits the registration form

> **Subject:** GMC Site Access: {visitor name} has completed their registration
>
> {Visitor name} has completed the registration form for site access.

*No button in this email.*

---

## 3. Visitor registration submitted — to Reception

- **To:** Receptionists
- **When:** A visitor submits the registration form

> **Subject:** GMC Site Access: new visitor registration
>
> {Visitor name} from {company name} has registered for site access.
>
> **[Go to dashboard]**

*Company name comes from the visitor's registration form.*

---

## 4. Management approval needed

- **To:** CSO, HCM, GMM and EM
- **When:** Reception sends an application for management approval

> **Subject:** GMC Site Access: your approval is needed for {name}
>
> Reception has requested your approval for {name}'s site access application.
>
> You can review the full details on your dashboard using the link below.
>
> **[Review the application]**

---

## 5. Management approved — to Hospital

- **To:** Hospital staff
- **When:** Management approves an application that needs medicals

> **Subject:** GMC Site Access: {name} is due for medicals
>
> {Name}'s site access application has been approved by management, and is due for medicals.
>
> This is for your information. Once the medicals have been done, you can record the result on the application.
>
> **[Record medical status]**

---

## 6. Due for induction — to Training School

- **To:** Training School staff
- **When:** Management approves an application that skips medicals, **or** Hospital clears the person (Fit / Fit with Conditions)

> **Subject:** GMC Site Access: {name} is due for induction
>
> {Name}'s site access application has been approved by management, and they are now due for induction.
>
> This is for your information. Once induction has been done, you can record it on the application.
>
> **[Record induction status]**

*One email for both triggers.*

---

## 7. Management rejected the application

- **To:** Receptionists, and the Department Head who invited the visitor
- **When:** A manager rejects the application

> **Subject:** GMC Site Access: {name}'s application was not approved
>
> {Approver name}, {approver title}, did not approve {name}'s site access application.
>
> Reason given: {reason}
>
> **[Go to your dashboard]**

---

## 8. Delegated approval request — to System Administrator

- **To:** System Administrators
- **When:** Reception reports that no manager is available to approve

> **Subject:** GMC Site Access: delegated approval request
>
> {Receptionist name} is requesting a delegated approval for {name}'s site access application.
>
> **[Review request]**

*Receptionist's name is the signed-in user who made the request.*

---

## 9. Delegated approval granted — to Reception

- **To:** The Receptionist who asked
- **When:** A System Administrator grants the request in #8

> **Subject:** GMC Site Access: you can now approve this application
>
> Hi {name},
>
> You've been granted a one-off delegated approval privilege for an engagement.
>
> **[Complete the approval]**

---

## 10. Medical check — Unfit — to Reception

- **To:** Receptionists
- **When:** Hospital marks the person Unfit

> **Subject:** GMC Site Access: {name} did not pass the medical check
>
> {Name} has been assessed as unfit following their medicals and is pending re-evaluation.
>
> **[View records]**

---

## 11. Medical check — Fit with Conditions — to Reception

- **To:** Receptionists
- **When:** Hospital marks the person Fit with Conditions

> **Subject:** GMC Site Access: {name} passed the medical check with conditions
>
> {Name} has been assessed as fit with conditions following their medicals and is now due for induction.
>
> Doctor's comments: {doctor's comments}
>
> **[View hospital record]**

*Doctor's comments are required when Hospital selects Fit with Conditions.*

---

## 12. Induction completed — to Security

- **To:** Security staff
- **When:** Training School marks induction as complete

> **Subject:** GMC Site Access: {name} is ready for an access card
>
> {Name} has completed induction and is ready for biometrics.
>
> **[Review records]**

---

## 13. Site access active — to Reception

- **To:** Receptionists
- **When:** Security issues the access card

> **Subject:** GMC Site Access: {name} now has site access
>
> {Name} now has site access.
>
> Access card number: {card number}
> Valid until: {expiry date}
>
> **[View records]**

---

## 14. Access revocation request — to Security

- **To:** Security staff
- **When:** Reception asks for a person's site access to be revoked

> **Subject:** GMC Site Access: Access Revocation
>
> Reception has asked for {name}'s site access to be revoked.
>
> Reason given: {reason}
>
> **[Go to dashboard]**

---

## 15. Site access revoked — to Reception

- **To:** Receptionists
- **When:** Security completes the revocation in #14

> **Subject:** GMC Site Access: site access revoked for {name}
>
> Security has revoked {name}'s site access.
>
> **[Open the application]**

---

## 16. New staff account request — to System Administrator

- **To:** System Administrators
- **When:** A GMC staff member requests an account

> **Subject:** GMC Site Access: {name} has requested an account
>
> {Name} ({email}) has asked for an account as **{role name}**.
>
> Department: {department}
>
> **[Review and set up the account]**

*Role shown by its readable name (e.g. "Security", not `SecurityStaff`).*

---

## 17. Staff account approved

- **To:** The staff member who requested the account
- **When:** A System Administrator approves the account

> **Subject:** GMC Site Access: your account is ready
>
> Hi {name},
>
> Your GMC Site Access account has been approved.
>
> Your role: {role names}
> Department: {department}
>
> To get started, sign in and create your PIN.
>
> **[Sign in]**

*Job role(s) shown by readable name; when there is none, the account type (e.g. "System Administrator").*

---

## 18. PIN reset

- **To:** The staff member whose PIN was reset
- **When:** A System Administrator resets their PIN

> **Subject:** GMC Site Access: your PIN has been reset
>
> Hi {name},
>
> A System Administrator has reset your PIN. The next time you sign in, you will be asked to create a new one.
>
> **[Sign in]**
>
> If you did not ask for this, please contact your System Administrator.
