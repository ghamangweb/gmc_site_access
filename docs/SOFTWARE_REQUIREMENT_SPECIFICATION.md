# FUNCTIONAL REQUIREMENTS

## AUTH LAYER

This application implements a dual-layer authentication strategy combining identity verification with application-specific access control:

**Identity Layer**: Strict Microsoft Entra ID (formerly Azure AD) authentication, enforcing the organization's Multi-Factor Authentication (MFA) policies.

**Application Layer**: A mandatory 4-digit security PIN required for dashboard access, acting as an independent authorization barrier.

### User Registration - Sign Up

Users must register using a valid Microsoft Account.

**Initial Access Control**: Successful Microsoft authentication does not grant immediate dashboard access.

**Routing**: Upon successful identity verification, all new users are redirected automatically routed to 
`/unauthorized` page. On this page, the user is prompted to choose the appropriate role from the available options with CTA to make a request to the system administrator for authorization.

**Admin Provisioning**: Access is granted solely by a `System Administrator`. The `System Administrator` must manually verify the user's eligibility and promote their status from user to `admin` within the system. This ensures that possession of a valid Microsoft account alone is insufficient for entry.

---

### Sign In

**Microsoft Authentication**: The user authenticates via Microsoft, satisfying all configured MFA requirements (e.g., push notification, authenticator code).

**PIN Verification**: Immediately following successful Microsoft login, the user must enter their 4-digit security PIN.

**Failure Condition**: Failure at either stage denies access to the dashboard.

---

### Onboarding

First time signed in users will be prompted to set a unique 4-digit security PIN (e.g., 8655), through a compulsory onboarding step.

**PIN Creation**: The user is required to set a unique 4-digit security PIN (e.g., 8655).

#### PIN Restrictions

The following PINs shall be explicitly rejected by the system:

| Restricted Pattern | Example |
|---|---|
| All zeros | `0000` |
| Repeating digits | `1111`, `2222` |
| Ascending sequence | `1234` |
| Descending sequence | `4321` |
| Any repeating or sequential pattern | `1122`, `1235` |

---

### Failed Attempt Policy
- PIN entry attempts shall be **rate-limited** to prevent automated guessing

**Security Function**: This PIN serves as the second factor of the application layer, distinct from Microsoft's MFA. It ensures that even if a user's Microsoft credentials are compromised or MFA is bypassed, the application remains secure.

---

### Passcode Recovery and Reset

To maintain the integrity of the second security layer:

**System Admin-Only Reset**: Admins cannot self-reset their PIN. Only a System Administrator can reset a user's PIN.

**Rationale**: This prevents unauthorized actors who may have gained Microsoft access from bypassing the application layer by resetting the PIN themselves.

In essence, the system features four (4) types of users: `User`, `Guest`, `Admin` and `System Admin`.

### Role Definition

The system distinguishes between two categories of roles:

**1. System Roles (Access Control Roles)**

These roles define access to the application:

- **User**: Standard applicant with no administrative privileges.
- **Guest**: Read-only user assigned to a workflow role. Guests may be promoted to Admin by a System Administrator.
- **Admin**: Can access dashboards and perform administrative monitoring functions but cannot reset security credentials.
- **System Admin**: Has full system privileges including user management, role assignment, and security resets.

**2. Workflow Roles (Approval Roles)**

These roles define responsibilities within the application workflow: Receptionist, DMD, HCM, GMM, Hospital, Training School, Security, and Information Technology.

These roles are not system login roles and are assigned based on organizational responsibilities within the workflow.

**User Privileges**:

- `User`: Cannot access the dashboard.
- `Guest`" Can access the dashboard in `read only` mode.
- `Admin`: Can access the dashboard but cannot reset PINs.
- `System Admin`: Can access the dashboard, reset PINs, and perform sensitive actions such as demoting and promoting users.

---

## WORKFLOW RULES (GLOBAL)

### Approval Flow Structure

Reception → Hospital → Training School → Security → IT

### Global Rule

Each layer:

- Admins can only edit their own data while active
- Becomes read-only after approval and forward movement
- Guests have read-only access and cannot create, edit, approve, reject, or delete records.

### Notification Rule

Every action (approve, reject, submit) triggers:

- Dashboard notification
- Email notification

### Rejection Rule

If a layer records a rejection:

- The record does not automatically reset to Reception.
- The action is handled according to layer-specific workflow rules.
- The Hospital-to-Training timeout exception still applies (direct route back to Hospital for re-checkup).

### Visa/Work-Permit Expiry Reset Rule

If a valid visa or work/residence permit expires while a record is in workflow:

- The record is returned to Reception as draft/correction for document renewal.
- Workflow restarts from Reception after updated valid documents are provided.
- The system sends dashboard and email notifications to Reception, Security, and Information Technology.
- Previous layers remain read-only until Reception resubmits the record.

### Hospital-to-Training Revalidation Timeout Rule

When a record reaches Training School after Hospital clearance:

- Training School must record induction completion/sign-off within 3 months of the Hospital medical clearance date.
- If completion/sign-off is not recorded within this 3-month window, the Hospital clearance is marked invalid/expired.
- An invalid/expired Hospital clearance blocks progression to Security and IT until a new Hospital checkup is completed.
- In this timeout case, the record routes directly to Hospital for re-checkup (not Reception).
- Any active Training School progress for that cycle is removed from active workflow and retained as archived history.

---

## RECEPTION LAYER

### Data

The reception layer features six (6) distinct sections (Section 1 – Section 6).

### Input Types

Input types include input boxes, text area, file upload, radio buttons, checkboxes, dropdown menus and date picker.

---

### Applicable File Uploads

At the Reception layer, file uploads are not compulsory by default. The Receptionist selects which document uploads are applicable for the visitor. Only the uploads marked as applicable become required for that record.

The Receptionist may mark any of the following as applicable:

- Passport biodata page (scanned)
- Valid visa (visa type will be toggled via radio buttons)
- MINCOM letter of approval or consent
- Work or residence permit
- Ghana Card
- Letter of assignment / Contract from sponsor
- Proof of medical/travel insurance

The record cannot advance to the next layer until all applicable uploads have been provided. Uploads not marked as applicable are not required.

---

### Required Data Inputs

The following data inputs are required at the reception layer, without these required inputs the next layer downstream cannot proceed with anything. The required inputs are:

- Employment Status
- Full Name
- Date of Birth
- Gender
- Passport No. (if applicable)
- Nationality
- Email Address
- Telephone No. Off Site
- Telephone No. on Site
- Emergency Contact Name
- Emergency Contact No
- Company Name
- Contact Name for Monthly Reporting
- Contact Email Address
- Emergency Contact Name within your company
- Emergency Contact Telephone No. within your company
- GMC Site – Liaison Person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- Reason for Request
- Airport Pickup/Protocol Required
- Transport Required To
- Transport Required From
- Accommodation Required
- Permanent Access Badge
- Ghana Visa Required
- General Site Induction
- Other Inductions or Training
- Bringing Equipment on Site
- PPE Required
- IT Access Required
- Visa Type
- Access Level
- Accommodation Confirmed
- Itinerary Attached
- Inflight Updated
- Remarks/Other Information

---

### Required Approvals

The system should feature three approval methods: signature draw pad, signature upload, and text input.

- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver

The system will automatically record the timestamps for the following fields:

- HCM Date
- GMM Date
- DMD Date


### Approval Rules

#### Standard Approval

The system shall **simultaneously notify HCM, GMM, and DMD** via dashboard and email when an approval is requested.

Approval from **any one** of the three authorized approvers (HCM, GMM, or DMD) is sufficient to satisfy the approval requirement.

Upon receipt of a valid approval, the system shall automatically:

- Mark the approval stage as **completed**
- Record the **approval timestamp**
- Set the record to **read-only** at the Reception layer
- Progress the workflow to the **Hospital layer**
- Send dashboard and email notifications to the **Hospital layer**

---

## Delegated Approval

Where HCM, GMM, and DMD are all unavailable, the Receptionist may initiate a **Delegated Approval Request**.

### Initiation

Upon initiation, a predefined notification template shall be sent via email and dashboard notification to:

- HCM
- GMM
- DMD
- System Administrator

### Granting Delegation

The System Administrator may grant **temporary delegated approval privileges** to the Receptionist.

While delegated approval privileges are active, the Receptionist may perform a **single approval action** on the affected record.

### Required Records

The system shall record the following for every delegated approval:

| Field | Description |
|---|---|
| Delegated Approver Name | Name of the Receptionist granted privileges |
| Delegation Granted By | Name of the System Administrator |
| Delegation Granted Date | Date privileges were granted |
| Delegated Approval Date | Date the approval action was performed |
| Reason for Delegation | Justification for the delegation request |

### Audit & Revocation
All delegated approvals shall be recorded in the **audit log**.
The System Administrator may **revoke** delegated approval privileges at any time.

### Form Sections and Fields

#### Section 1 – Employee / Contractor / Visitor Details

- Employment Status
- Full Name
- Date of Birth
- Gender
- Passport No. (if applicable)
- Nationality
- Email Address
- Telephone No. Off Site
- Telephone No. on Site
- Emergency Contact Name
- Emergency Contact No

#### Section 2 – Company Details

- Company Name
- Contact Name for Monthly Reporting
- Contact Email Address
- Emergency Contact Name within your company
- Emergency Contact Telephone No. within your company

#### Section 3 – Access Details

- GMC Site – Liaison Person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- Reason for Request

#### Section 4 – Site Support Requirements

- Airport Pickup/Protocol Required
- Transport Required To
- Transport Required From
- Accommodation Required
- Permanent Access Badge
- Ghana Visa Required
- General Site Induction
- Other Inductions or Training
- Bringing Equipment on Site
- PPE Required
- IT Access Required
- Visa Type
- Access Level

#### Section 5 – Authorization

- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver

#### Section 6 – Administration

- Accommodation Confirmed
- Itinerary Attached
- Inflight Updated
- Remarks/Other Information

---

### Notifications

The system should be designed to support both dashboard and email notifications. At the dashboard level, the user should be able to make an approval request to HCM, GMM and DMD with a button click (this specific notification should be receivable via both dashboard and email). Upon approval from any one of HCM, GMM, or DMD, the system should automatically send both an email and a dashboard notification to the next layer downstream (Hospital).

---

## HOSPITAL LAYER

### Notifications

The hospital layer is triggered by a notification from the reception layer.

The following data is **available to the Hospital Layer from the shared application record**:

- Employment Status
- Full Name
- Date of Birth
- Gender
- Nationality
- Email Address
- Telephone No. (Off Site)
- Telephone No. (On Site)
- Emergency Contact Name
- Emergency Contact No.
- Company Name
- Emergency Tel. (Company)
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date

> **Note**: `Emergency Contact Name within your company` is required at Reception but is not referenced by Hospital (only `Emergency Tel. (Company)` is referenced).

---

### Compulsory File Uploads

The following file uploads are required at the hospital layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Hospital fitness form

---

### Required Data

The following data is required from the Hospital Layer:

- Medical clearance status
- Doctor Comments

The system will automatically record timestamps for the following data:

- Medical clearance date

### Revalidation on Training Timeout

If Training School does not complete induction within 3 months of Hospital medical clearance date, the system shall:

- Mark the existing Hospital clearance as invalid/expired
- Return the record directly to Hospital for fresh medical checkup
- Require new Hospital clearance before Training School can proceed again
- Send dashboard and email notifications that revalidation is required

---

## TRAINING SCHOOL LAYER

### Notifications

The Training School layer is triggered by a notification from the hospital layer.

The following data is **available to the Training School Layer from the shared application record**:

- Employment Status
- Full Name
- Date of Birth
- Gender
- Nationality
- Email Address
- Telephone No. (Off Site)
- Telephone No. (On Site)
- Emergency Contact Name
- Emergency Contact No.
- Company Name
- GMC Liaison Person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date
- Overall Status
- Medical Clearance Status
- Medical Clearance Date
- Doctor Comments

### Compulsory File Uploads

The following file uploads are required at the training school layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Induction declaration form
- Induction registration form

---

### Required Data

The following data is required from the Training School Layer:

- General site induction
- Other inductions and training
- Induction status
- Induction completion date
- Induction sign-off (signature)

The system will automatically record timestamps for the following data:

- Completion date (triggered by induction sign-off)
- Induction status (triggered by induction sign-off)

### Timeout Handling and Archiving

If induction completion/sign-off is not recorded within 3 months of the linked Hospital medical clearance date, the system shall:

- Remove the current Training School cycle from active workflow
- Archive the Training School cycle for audit/history purposes (not hard delete)
- Route the record directly back to Hospital for re-checkup
- Send dashboard and email notifications to relevant parties indicating Hospital revalidation is required

---

## SECURITY LAYER

### Notifications

The Security layer is triggered by a notification from the Training School layer.

The following data is **available to the Security Layer from the shared application record**:

- Employment Status
- Full Name
- Date of Birth
- Gender
- Passport No. (if applicable)
- Nationality
- Email Address
- Telephone No. Off Site
- Telephone No. on Site
- Emergency Contact Name
- Emergency Contact No
- Company Name
- Emergency Contact Name within your company
- Emergency Contact Telephone No. within your company
- GMC Site – Liaison Person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- Reason for Request
- Accommodation Required
- Permanent Access Badge
- Ghana Visa Required
- General Site Induction
- Other Inductions or Training
- Bringing Equipment on Site
- PPE Required
- Visa Type
- Access Level
- Accommodation Confirmed
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date
- Medical Clearance Status
- Medical Clearance Date
- Induction Status
- Completion Date

### Required Data

The Security layer audits data from prior layers and notifies Information Technology to complete biometric enrollment. Security does not capture additional form fields beyond audit actions and workflow notifications.

---

## INFORMATION TECHNOLOGY LAYER

### Notifications

The Information Technology layer is triggered by a notification from the Security layer (after Security has audited the record).

The system should support both dashboard and email notifications. Upon successful biometric enrollment, the system should automatically send both an email and a dashboard notification to **Security** and **Reception**.

### Data Passed

The following data is **available to the Information Technology Layer from the Security Layer shared application record**:

- Employment Status
- Full Name
- Gender
- Nationality
- Email Address
- Telephone No. (Off Site)
- Telephone No. (On Site)
- Emergency Contact Name
- Emergency Contact No
- Company Name
- Date of Arrival
- Date of Departure
- Visa Type
- Access Level
- Permanent Access Badge
- General Site Induction
- Other Inductions or Training
- IT Access Required
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date
- Medical Clearance Status
- Medical Clearance Date
- Induction Status
- Completion Date
- PPEs Required
- Record ID
- Registration Timestamp
- Overall Status

---

### Compulsory File Uploads

The following file uploads are required at the information technology layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Visitor passport-sized photo

---

### Required Data

The following data is required from the Information Technology Layer:

- ID Type
- Biometric Captured
- Biometric Image
- Access Card Number
- Access Card Expiry Date
- Overall Status

`ID Type` is determined from `Visa Type` and supporting documents (read-only context from upstream).

The system will automatically record timestamps for the following data:

- Access Card Expiry Date (default tied to permit or departure date; IT may override)
- Overall Status (set to Active on successful enrollment)


## ACCESS TERMINATION

### Purpose

The system shall support the termination and revocation of access for registered users(expatriate).


### Access Termination Request

Users assigned to the **Reception** workflow role shall have access to a **Terminate Access** action from the dashboard.

The termination request shall require the following inputs:

| Field | Requirement |
|---|---|
| Record Selection | Mandatory |
| Termination Reason | Mandatory |


### Workflow

Upon submission of a termination request, the system shall automatically:

1. Create an **Access Termination Request**
2. Send dashboard and email notifications to the **System Administrator**
3. Mark the affected record as **Pending Access Revocation**


### System Administrator Action

The System Administrator shall review the termination request and may either:

- **Approve** Access Revocation
- **Reject** Access Revocation

The System Administrator may provide comments before completing the action.

### IT Notification

Upon approval of the termination request:

- The system shall send dashboard and email notifications to the **Information Technology** layer.
- The Information Technology layer shall be responsible for removing the registered user from the system.


## Audit Trail

The system shall maintain a complete audit log of:

- Termination Request creation
- System Administrator decision (approval or rejection)
- IT access removal confirmation
- All comments entered throughout the process


# NON-FUNCTIONAL REQUIREMENTS
