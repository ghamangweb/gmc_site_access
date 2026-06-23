# GMC Site Access — Project Overview

## About the Project

GMC Site Access is a web-based workflow management system that digitizes the end-to-end process of registering foreign visitors, expatriates and locals(in the future) for site access at Ghana Manganese Company (GMC).

The system is secured by a dual-layer authentication model — Microsoft Entra ID (with MFA) as the identity layer, and a mandatory 4-digit security PIN as an independent application-level barrier. Access is role-controlled: only users provisioned by a System Administrator can reach the dashboard.

Once inside, the system routes each record through workflow layers based on access purpose captured at Reception. **Coming to work** follows the full path (Reception → Hospital → Training School → Security → IT). **Coming to visit without mine-site access** is handled entirely at Reception. **Coming to visit with mine-site access** follows Reception → Training School → Security → IT (Hospital is skipped). Strict handoff rules apply within each path: no layer can act until the previous required layer has completed and notified the next. Every action triggers both a dashboard and email notification. Reception reset is triggered by visa/work-permit expiry, while Hospital-to-Training revalidation timeout (work path only) returns the record directly to `Hospital` for a fresh checkup.

The system supports both Admin and Guest access at each layer, with full audit logging, delegated approval for exceptional cases, and a complete access termination workflow for when a visitor's access needs to be revoked.

## The Problem It Solves

Managing site access at GMC currently relies on a manual, paper-based process involving multiple departments. Documents are passed between Reception, the Hospital, Training School, Security, and IT with no central system tracking where a record is, who has acted on it, or what is still pending.

This creates several recurring problems including:
- Downstream departments — Hospital, Training School, Security, and IT are notified by email. Emails can go unread or get buried, leaving departments unaware that a visitor is ready for them to act on.
- There is no audit trail. If a dispute arises or a compliance check is required, reconstructing what happened and who was responsible may be time-consuming and unreliable.
- Access revocation has no formal workflow, meaning a departed visitor's access may not be removed promptly or at all.

GMC Site Access solves this by replacing the paper process with a single, controlled digital system. Each record follows the path determined at Reception, every approval is timestamped and attributed, every handoff triggers an automatic notification, and every action is logged. Management and department heads have real-time visibility into where any record stands at any point in the process.


## Target users

GMC Site Access is used by GMC staff who manage site access for foreign visitors and expatriates. Visitors and expatriates are the **subjects** of records in the system; they do not log in or interact with the application directly.

### System roles (access control)

| Role | Who | Primary use |
|---|---|---|
| **System Administrator** | IT or designated GMC admin | Provisions users, assigns roles, resets PINs, approves access termination requests, grants delegated approval |
| **Admin** | Department staff with write access | Creates and processes records, approves or rejects at their assigned workflow layer |
| **Guest** | Department staff with read-only access | Views records and workflow status at their assigned layer without making changes |
| **User** | New sign-ups awaiting provisioning | Authenticates via Microsoft but cannot access the dashboard until promoted by a System Administrator |

### Workflow roles (department responsibilities)

Each Admin or Guest is assigned one or more workflow roles based on their department:

| Workflow role | Department | Responsibility |
|---|---|---|
| **Receptionist** | Reception | Captures visitor data, uploads documents, requests stakeholder approval, initiates access termination |
| **HCM / GMM / DMD** | Reception | Approves visitor access requests (any one approval is sufficient) |
| **Hospital Records Staff** | Hospital | Records medical clearance |
| **Training School Staff** | Training School | Records induction records |
| **Security Staff** | Security | Audits prior layers and forwards records for biometric enrollment |
| **Information Technology Staff** | IT | Completes biometric enrollment, assigns access cards, revokes access on termination |


## Success criteria

The project is successful when GMC can run the full site access lifecycle digitally, with the problems of the paper process resolved.

#### Workflow and visibility

- Every record follows the access path determined at Reception (work, visit-only, or visit-with-mine-site-access)
- Within each path, no layer can act before the previous required layer has completed
- Any authorized user can see where a record stands in the workflow at any time


#### Notifications and handoffs

- Every submit, approve, and reject action triggers both a dashboard notification and an email to the relevant parties
- Downstream departments are automatically notified when a record is ready for them — removing reliance on manually forwarded emails that may go unread

### Compliance and accountability

- Every action on a record is timestamped, attributed to a user, and recorded in the audit log
- Stakeholder approvals (HCM, GMM, DMD) are captured with approver name, signature, and date
- Delegated approvals and access termination requests are fully logged with justification and decision history

#### Security and access control

- Only users provisioned by a System Administrator can reach the dashboard
- All dashboard access requires both Microsoft Entra ID authentication (with MFA) and a valid application PIN
- Access termination follows a formal workflow: Reception requests → System Administrator approves → IT revokes

#### End-to-end completion

- A work-path record can progress from Reception through to Active status after IT completes biometric enrollment
- Visit-only records complete at Reception after stakeholder approval and applicable document capture
- Visit-with-mine-site records complete induction at Training School after Reception
- Required documents and data fields are enforced at each layer — a record cannot advance with missing compulsory inputs. At Reception, only document types marked as applicable by the Receptionist are required.
- IT can confirm removal of a departed expatriate's access through the termination workflow


## Core User Flow

Records are routed at Reception based on **access purpose** and, for visitors, whether they will **visit the mine site**.

| Access purpose | Mine site visit | Path |
|---|---|---|
| Coming to work | Yes| Reception → Hospital → Training School → Security → IT |
| Coming to visit | No | Reception only |
| Coming to visit | Yes | Reception → Training School → Security → IT |

#### Reception

The **Reception** layer captures and submits visitor information. The Receptionist records whether the person is coming to work or coming to visit. For visitors, the Receptionist also records whether they will visit the mine site. This selection determines the workflow path. The Receptionist also selects which document uploads are applicable; only those selections become required uploads. Stakeholder approval (HCM, DMD, GMM) is obtained as today — all three are notified simultaneously, and approval from any one is sufficient to advance the record along its path.

#### Hospital

The **Hospital** layer applies only to the **work path**. It processes records after Reception approval and conducts a medical assessment. When the visitor is fit to proceed, Hospital notifies Training School. Hospital clearance remains valid for up to **three months** while the record is at Training School. If Training School does not record completion/sign-off within that period, Hospital clearance becomes invalid and the record is routed back to Hospital for re-checkup.

#### Training School

The **Training School** layer conducts induction. On the **work path**, it follows Hospital clearance. On the **visit-with-mine-site-access path**, records are sent directly from Reception to Training School (Hospital is skipped). Once induction is complete, records on both paths proceed to Security. On the work path, if induction completion is not recorded within three months of Hospital clearance, Training School progress is archived and the record returns to Hospital for a new medical checkup.

#### Security

The **Security** layer applies to both the **work path** and the **visit-with-mine-site-access path**. It audits results from prior layers, then notifies Information Technology to complete biometric enrollment and visitor card issuance.

#### Information Technology

The **Information Technology** layer applies to both the **work path** and the **visit-with-mine-site-access path**. It completes biometric enrollment and issues access/visitor cards. After enrollment succeeds, Security and Reception are notified. This layer is also responsible for revoking access when a visitor's access needs to be terminated.


## Features in scope

- Dual-layer authentication (Microsoft Entra ID with MFA + mandatory 4-digit application PIN)
- Role-based access control (system roles: User, Guest, Admin, System Admin; workflow roles per department)
- Access-path-based workflow routing (work, visit-only, visit-with-mine-site-access)
- Five-layer sequential workflow for work-path records (Reception → Hospital → Training School → Security → IT)
- Multi-section form input with validation across all layers
- Applicable document upload selection at Reception (Receptionist marks which uploads apply; only those are required)
- Compulsory document uploads at Hospital, Training School, and IT layers
- Stakeholder approval workflow (HCM / GMM / DMD) with delegated approval fallback
- Dashboard and email notifications on every action
- Visa/work-permit expiry flagging 
- Access termination and revocation workflow
- Full audit logging
- Guest read-only access per workflow layer
- Foreign visitor and expatriate registration

## Features out of scope

- Local visitor registration (planned for a future phase)
- Mobile native application
- SMS or push notifications
- External system integrations (HR, ERP, biometric hardware, physical access control)
- Self-service PIN reset
- Automated reporting and analytics dashboards
- Bulk import or batch processing
- Public visitor self-registration
- Accommodation, transport, or airport pickup booking systems
