# Project Overview

## About the Project
GMC Site Access is a digital visitor and contractor site-access registration system for Ghana Manganese Company (GMC).

The system replaces the manual process of registering visitors, obtaining the required approvals, completing site-access requirements, and activating or terminating access.

Visitors do not create accounts or log into the system. They begin the process by submitting a public pre-registration form. Once submitted, GMC staff take over the process and move the request through the appropriate approval and access workflow.

The workflow begins with the Department Head, continues through Reception, and then follows different processing paths depending on the visitor's purpose and whether mine-site access is required.

The system maintains a clear distinction between:

**Registration Request:** information submitted before the visitor arrives.

**Person:** the visitor's reusable identity and biodata.

**Engagement:** a specific visit or work request.

**Workflow State:** the current stage of an Engagement.

**Access State:** the current status of the visitor's site access.

All significant workflow activities are recorded for accountability and traceability, while relevant staff are notified when their action is required.


## Users of the System

The system serves two broad groups.

### External Users

Visitors, expatraites, contractors, or representatives who provide information for a planned visit.

External users:
- Do not create accounts.
- Do not log into the system.
- Submit information through the public pre-registration process.

#### GMC Staff

GMC employees use the system to review, process, approve, and manage visitor access.

Staff access is controlled through Microsoft Entra ID authentication and a 4-digit PIN, with permissions determined by their assigned roles.


## Staff Roles

The system features both **system roles** and **workflow responsibilities**.

### System Roles

| Role | Responsibility |
|---|---|
| **System Administrator** | Manages staff users, assigns roles, manages PINs, and approves access termination |
| **Admin** | Performs authorised actions within assigned workflow areas |
| **Guest** | Read-only access within assigned workflow areas |
| **User** | Microsoft sign-in identity without access to workflow functions until provisioned |

### Workflow Responsibilities

| Responsibility | Area |
|---|---|
| **Department Head** | Reviews and approves pre-registration requests |
| **Receptionist** | Creates and manages Engagements and coordinates the access process |
| **HCM / GMM / DMD** | Provides stakeholder approval |
| **Hospital Staff** | Handles medical fitness clearance |
| **Training School Staff** | Handles induction clearance |
| **Security Staff** | Reviews site-access requirements and forwards approved records to IT |
| **IT Staff** | Handles biometric enrollment, access cards, and access activation or revocation |


## Registration Process

The process begins when a pre-registration request is made through the public form.

The request contains the information required for the initial review, including the selected **GMC Liaison Department**.

The GMC Liaison Department is selected from a controlled list maintained by GMC. Each department on the list has a designated Department Head responsible for reviewing requests assigned to that department.

At this stage:

- No visitor account is created.
- No Person record is created.
- No Engagement is created.
- No documents are uploaded.

The submitted request is sent to the appropriate Department Head for review.

## Department Approval

The Department Head reviews requests associated with their GMC Liaison Department.

The Department Head(GMC Liaison Person) can approve the request.

There is no rejection action at this stage. If the Department Head does not approve the request, it remains pending.

Once approved, the request is made available to Reception for further processing and Reception.


## Reception

Reception is the point at which the approved request becomes an actual visit or work engagement.

The Receptionist:

- Looks up an existing record or creates a new record using the visitors passport number.
- Creates a new Engagement.
- Determines which documents are applicable.
- Coordinates the required stakeholder approval.
- Continues the Engagement through the appropriate workflow.

Reception can request for a delegated approval.
Reception can also initiate an access termination request when required.

The HCM/GMM/DMD:
- Only handles stakeholder approval (one stakeholder approval is enough to get the engagement moving to the next stage)




## Hospital

Hospital processing applies to visitors coming to work.

Hospital staff:

- Record the medical clearance status.
- upload medical record document.

The possible clearance outcomes are:

- **Fit**
- **Fit with Conditions**
- **Unfit**

A visitor who is Fit proceeds to Training School.
A visitor who is Fit with Conditions proceeds to Training School but Reception is notified.
A visitor who is Unfit remains at the Hospital stage and Reception is notified.

Hospital clearance remains valid for three months while the Engagement is progressing through Training School.
If the visitor does not get cleared by training school after three months, they have to go back to the Hospital for another medical check.



## 9. Training School

Training School processing applies to:

- Contractors/expatriates coming to work.
- Visitors coming to the mine site.

Visitors coming to work arrive at Training School after Hospital clearance.

Visitors coming to the mine site without coming to work proceed directly from Reception to Training School.

Training School records completion of the required induction and forwards the Engagement to Security.

For the work path, if induction is not completed within three months of Hospital clearance, the current progress is archived and the Engagement returns to the Hospital stage for another medical clearance.



## 10. Security

Security reviews the information and requirements completed by the previous stages.

Once the requirements are satisfied, Security forwards the Engagement to IT for biometric enrollment and access-card processing.


## 11. Information Technology

IT completes the final access setup.

IT is responsible for:

- Biometric enrollment.
- Passport photo and biometric image capture.
- Access card processing.
- Activating access after successful completion.
- Revoking access following an approved termination.

Once access is successfully activated, Security and Reception are notified.



## Important Decisions

### Access Workflows

The Engagement follows one of three main paths depending on the purpose of the visit and whether mine-site access is required.

| Access Purpose | Mine-Site Access | Workflow |
|---|---|---|
| Coming to work | Yes | Department → Reception → Hospital → Training School → Security → IT |
| Coming to visit | No | Department → Reception |
| Coming to visit | Yes | Department → Reception → Training School → Security → IT |

Each stage must be completed before the Engagement can move to the next required stage.



### Stakeholder Approval

Reception coordinates stakeholder approval from:

- HCM
- GMM
- DMD

The stakeholders are notified together when their approval is required.

Approval from any one of the designated stakeholders is sufficient to advance the Engagement.

The system also supports delegated approval where an approved delegate is authorised to act on behalf of the relevant stakeholder.


### Visa and Permit Management

Where a visitor requires a visa or permit, the system tracks the applicable expiry date.

When a visa or permit expires, the Engagement is flagged and Reception is notified.

The Engagement cannot continue through the workflow until the issue has been reviewed and cleared by Reception.

Information and approvals completed by previous workflow stages remain available for reference and are not deleted or overwritten.



### Access Termination

Access termination follows a controlled approval process.

The process is:

**Reception initiates termination request → System Administrator Approves → IT  revokes access**

The termination request, approval, and access revocation are recorded in the system's audit trail.



### Core Records

#### Registration Request

A Registration Request represents the initial information submitted through the public pre-registration process.

It contains the visitor's initial information and selected GMC Liaison Department.

A Registration Request is not an actual visit and therefore does not contain workflow or access information.

It can be:

- Pending Department Approval
- Approved

#### Person

A Person represents the visitor's reusable identity.

The Person record contains the visitor's biodata and is primarily identified using their passport number.

A Person can have multiple Engagements over time.

Visit-specific documents, approvals, and workflow information do not belong directly to the Person.

#### Engagement

An Engagement represents a specific visit or work request.

It is created by Reception after the Department has approved the Registration Request.

The Engagement contains the information and activities associated with that particular visit, including:

- Required documents.
- Stakeholder approvals.
- Workflow progress.
- Workflow history.
- Access status.
- Termination requests.

Each Engagement has its own visit-specific documents.



## Access and Permissions

Staff members only see and act on information relevant to their assigned responsibilities.

### Admin

Admins can perform authorised write actions within their assigned workflow areas.

### Guest

Guests have read-only access within their assigned workflow areas and cannot modify records.

### Department Head

Department Heads can approve Registration Requests assigned to their GMC Liaison Department. They do not have an explicit rejection action and write access to visitor record except for approvals.

### System Administrator

System Administrators manage staff access to the system and perform administrative functions such as user provisioning, role assignment, PIN management, and termination approval.


## 17. Notifications and Audit Trail

The system provides notifications and audit logging throughout the workflow.

### Notifications

Relevant staff receive dashboard and email notifications when:

- A request requires their attention.
- A workflow stage is completed.
- A record is forwarded to another department.
- An important exception occurs.
- Access is activated or revoked.

### Audit Trail

Important actions are recorded to provide accountability and traceability.

The audit trail records information such as:

- The staff member who performed an action.
- The action performed.
- The affected record.
- The timestamp.
- Relevant workflow or access changes.



## 18. Key Business Rules

The following rules define the expected behaviour of the system:

- The public pre-registration process does not require authentication.
- Visitors do not create accounts or log into the system.
- Staff must authenticate before accessing staff functions.
- Department Heads approve requests assigned to their GMC Liaison Department.
- There is no explicit rejection action at the Department stage.
- An unapproved request remains pending.
- Registration Requests do not create Persons or Engagements.
- Engagements are created only at Reception.
- Passport documents are supporting evidence and do not automatically populate visitor information.
- Every Engagement has its own visit-specific documents.
- Guests cannot perform write actions.
- A workflow stage cannot act before the required previous stage is completed.
- Visa and permit issues must be resolved before the Engagement can continue.
- Access-card expiry cannot exceed the earliest applicable visa/permit expiry or departure date.
- Registration approval must not result in duplicate processing or duplicate notifications.
- GMC Liaison Department is selected from a controlled list.
- Important workflow actions are notified and audit-logged.



## 19. Features In Scope

- Public visitor and contractor pre-registration.
- Department Head approval.
- Staff authentication using Microsoft Entra ID and PIN.
- Role-based staff access.
- Reception processing and Engagement creation.
- Access-purpose-based workflow routing.
- Hospital fitness clearance.
- Training and induction processing.
- Security review.
- Stakeholder approval.
- Applicable document management.
- Visa and permit expiry monitoring.
- Access termination.
- Dashboard and email notifications.
- Audit logging.
- Guest read-only access.
- Foreign visitor and expatriate registration.


## 20. Features Out of Scope

- Local visitor registration.
- Native mobile application.
- SMS notifications.
- Push notifications.
- Integration with HR or ERP systems.
- Integration with biometric hardware.
- Integration with physical access-control systems.
- Self-service PIN reset.
- Automated reporting and analytics dashboards.
- Bulk import or batch processing.
- Public visitor accounts.
- Accommodation booking.
- Transport booking.
- Airport pickup booking.


## 21. Overall Process

At a high level, GMC Site Access follows this process:

**Public Pre-Registration**

↓

**Department Head Approval**

↓

**Reception**

↓

**Person Identified / Engagement Created**

↓

**Access Purpose Determined**

↓

**Required Workflow Completed**

↓

**IT Activates Site Access**

↓

**Visitor Access Remains Active Until Expiry or Termination**

The system is centered around a simple principle:

