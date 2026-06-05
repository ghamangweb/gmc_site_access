#### FUNCTIONAL REQUIREMNTS


### AUTH LAYER

This application implements a dual-layer authentication strategy combining identity verification with application-specific access control:

**Identity Layer**: Strict Microsoft Entra ID (formerly Azure AD) authentication, enforcing the organization's Multi-Factor Authentication (MFA) policies. 
**Application Layer**: A mandatory 4-digit security PIN required for dashboard access, acting as an independent authorization barrier.

# User Registration - Sign Up

Users must register using a valid Microsoft Account.

**Initial Access Control**: Successful Microsoft authentication does not grant immediate dashboard access.
**Routing**: Upon successful identity verification, all new users are automatically routed to an `/unauthorized` landing page.
**Admin Provisioning**: Access is granted solely by a System Administrator.  The admin must manually verify the user's eligibility and promote their status from user to authorized_admin within the system. This ensures that possession of a valid Microsoft account alone is insufficient for entry.

# Onboarding 

Once promoted by an administrator, the user must complete a compulsory onboarding step:

**PIN Creation**: The user is required to set a unique 4-digit security PIN (e.g., 8655).
Security Function: This PIN serves as the second factor of the application layer, distinct from Microsoft’s MFA. It ensures that even if a user’s Microsoft credentials are compromised or MFA is bypassed, the application remains secure. 



# Sign in

The login process requires successful completion of both layers:

**Microsoft Authentication**: The user authenticates via Microsoft, satisfying all configured MFA requirements (e.g., push notification, authenticator code). 
**PIN Verification**: Immediately following successful Microsoft login, the user must enter their 4-digit security PIN.
**Failure Condition**: Failure at either stage denies access to the dashboard. 


# Passcode Recovery and Reset

To maintain the integrity of the second security layer:

**System Admin-Only Reset**: Admins cannot self-reset their PIN. Only a System Administrator can reset a user’s PIN.
**Rationale**: This prevents unauthorized actors who may have gained Microsoft access from bypassing the application layer by resetting the PIN themselves

In essence, the system features three(3) types of users: `User`, `Admin` and `System Admin`.

**User Privileges**: 
- `User`: Cannot access the dashboard. 
- `Admin`: Can access the dashboard but cannot reset PINs.
- `System Admin`: Can access the dashboard, reset PINs, and senstive actions such as demoting and promoting users.


### RECEPTION LAYER



## Data
The reception layer features six(6) distict sections(Section 1 - Section 6)


# Input Types
Input types include input boxes, text area, file upload, radio buttons, checkboxes,dropdown menus and date picker.


# Compulsory File uploads
The following file uploads are required at the reception layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Passport biodata page(scanned)
- Valid visa (visa type will be toggled via radio buttons)
- MINCOM letter of approval or consent
- Work or residence permit
- Ghana Card
- Letter of assignement / Contract from sponsor
- Proof of medical/travel Insurance

# Required Data inputs 
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
- Contact Name for Monthly reporting
- Contact Email Address
- Emergency Contact Name within your company
- Emergency Contact Telephone No. within your company
- GMC Site – Liaison person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- Reason for Request
- Airport pickup/Protocol Required
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
- Visa type
- Access Level
- Accommodation confirmed
- Itinerary Attached
- Inflight Updated
- Remarks/Other Information




# Required Approvals
The system shoud feature three approval methods, Signature draw pad, signature upload and Text input 

- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver

The system will automaticaly record the timestamps for the following fields:
- HCM Date
- GMM Date
- DMD Date


##  Form Sections and Fields

# Section 1 - Employee/ Contractor/ Visitor Details

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

# Section 2 - Company Details

- Company Name
- Contact Name for Monthly reporting
- Contact Email Address
- Emergency Contact Name within your company
- Emergency Contact Telephone No. within your company

# Section 3 - Access Details

- GMC Site – Liaison person
- GMC Liaison Department
- Date of Arrival
- Date of Departure
- Reason for Request

# Section 4 - Site Support Requirements

- Airport pickup/Protocol Required
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
- Visa type
- Access Level

# Section 5 - Authorization

- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver


# Section 6 - Administration
- Accommodation confirmed
- Itinerary Attached
- Inflight Updated
- Remarks/Other Information






# Notifications

The system should be designed to support both dashboard and email notifiations. At the dashboard level, the user should be able to make an approval request to HCM, GMM and DMD with a button click(This specific notification should be receivable via both dashboard and email). Upon approval by all three parties, the system should automatically send both an email and a dashboard notification to the next layer downstream(Hospital).







### HOSPITAL LAYER

# Notifications
The hospital layer is triggered by a notification from the reception layer. 

The following data is passed from the reception layer to the hospital layer:
- Employment Status
- Fullname
- Date of birth 
- Gender
- Nationality
- Email Address
-Telephone No. (Off Site)
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

Note: `Emergency Contact Name within your company` is required at Reception but is not passed to Hospital (only `Emergency Tel. (Company)` is passed).



# Compulsory File uploads
The following file uploads are required at the hospital layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Hospital fitness form

# Required data
The following data is required from the Hospital layer:
- Medical clearance status
- Doctor Comments

The system will automatically record timestamps for the following data:
- medical clearance date

### TRAINING SCHOOL LAYER

# Notifications
The Training School layer is triggered by a notification from the hospital layer. 

The following data is passed from the hospital layer to the Training School layer:
- Employment Status
- Fullname
- Date of birth 
- Gender
- Nationality
- Email Address
- Telephone No. (Off Site)
- Telephone No. (On Site)
- Emergency Contact Name
- Emergency Contact No.
- Company Name
- GMC Liaison person
- GMC Liaison Department
- Date of arrival 
- Date of departure
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date
- overall status
- Medical clearance status
- Medical clearance date
- Doctor Comments

# Compulsory File uploads
The following file uploads are required at the training school layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Induction declaration form
- Induction registration form



# Required data
The following data is required from the Training School layer:
- General site induction
- Other inductions and training
- induction status
- Induction completion date
- Induction sign-off (signature)

The system will automatically record timestamps for the following data:
- Completion date (triggered by induction sign-off)
- induction status(triggered by induction sign-off)



### SECURITY LAYER

# Notifications
The Security layer is triggered by a notification from the Training School layer. 

The following data is passed from the Training School layer to the Security layer:
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
- GMC Site – Liaison person
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
- Visa type
- Access Level
- Accommodation confirmed
- HCM Approval Name
- HCM Signature of Approver
- GMM Approval Name
- GMM Signature of Approver
- DMD Approval Name
- DMD Signature of Approver
- HCM Date
- GMM Date
- DMD Date
- Medical clearance status
- Medical clearance date
- induction status
- completion date

# Required data
The Security layer audits data from prior layers and notifies Information Technology to complete biometric enrollment. Security does not capture additional form fields beyond audit actions and workflow notifications.

### INFORMATION TECHNOLOGY LAYER

# Notifications
The Information Technology layer is triggered by a notification from the Security layer (after Security has audited the record).

The system should support both dashboard and email notifications. Upon successful biometric enrollment, the system should automatically send both an email and a dashboard notification to **Security** and **Reception**.

# Data passed
The following data is passed from the Security layer to the Information Technology layer:

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
- IT Access Required
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
- Medical clearance status
- Medical clearance date
- induction status
- completion date
- PPEs required
- Record ID
- Registration Timestamp
- Overall Status


# Compulsory File uploads
The following file uploads are required at the information technology layer, without these required uploads the next layer downstream cannot proceed with anything. The required uploads are:

- Visitor passport sized photo

# Required data
The following data is required from the Information Technology layer:

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


#### NON-FUNCTIONAL REQUIREMENTS
