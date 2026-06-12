# GMC Site Access — Project Overview

## About the Project

GMC Site Access is a web-based workflow management system that digitizes the end-to-end process of registering foreign visitors, expatriates and locals(in the future) for site access at Ghana Manganese Company (GMC).

The system is secured by a dual-layer authentication model — Microsoft Entra ID (with MFA) as the identity layer, and a mandatory 4-digit security PIN as an independent application-level barrier. Access is role-controlled: only users provisioned by a System Administrator can reach the dashboard.

Once inside, the system routes each visitor record through five sequential processing layers — Reception, Hospital, Training School, Security, and Information Technology, enforcing strict handoff rules between them. No layer can act until the one before it has completed and notified the next. Every action triggers both a dashboard and email notification. Rejections at any layer return the record to `Reception` for correction before the workflow can resume.

The system supports both Admin and Guest access at each layer, with full audit logging, delegated approval for exceptional cases, and a complete access termination workflow for when a visitor's access needs to be revoked.

## The Problem It Solves

Managing site access at GMC currently relies on a manual, paper-based process involving multiple departments. Documents are passed between Reception, the Hospital, Training School, Security, and IT with no central system tracking where a record is, who has acted on it, or what is still pending.

This creates several recurring problems including:
- Downstream departments — Hospital, Training School, Security, and IT are notified by email. Emails can go unread or get buried, leaving departments unaware that a visitor is ready for them to act on.
- There is no audit trail. If a dispute arises or a compliance check is required, reconstructing what happened and who was responsible may be time-consuming and unreliable.
- Access revocation has no formal workflow, meaning a departed visitor's access may not be removed promptly or at all.

GMC Site Access solves this by replacing the paper process with a single, controlled digital system. Every visitor record follows the same path, every approval is timestamped and attributed, every handoff triggers an automatic notification, and every action is logged. Management and department heads have real-time visibility into where any record stands at any point in the process.


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
| **HCM / GMM / DMD** | Management | Approves visitor access requests (any one approval is sufficient) |
| **Hospital** | Medical | Conducts fitness assessment and records medical clearance |
| **Training School** | Training | Conducts site induction and records completion |
| **Security** | Security | Audits prior layers and forwards records for biometric enrollment |
| **Information Technology** | IT | Completes biometric enrollment, assigns access cards, revokes access on termination |

### Record subjects (not system users)

- **Foreign visitors** and **expatriates** (Employee, Contractor, or Visitor) whose site access is being registered
- **Local visitors** are not supported in the current phase


## Success criteria

The project is successful when GMC can run the full site access lifecycle digitally, with the problems of the paper process resolved.

### Workflow and visibility

- Every visitor record follows the defined five-layer path (Reception → Hospital → Training School → Security → IT) with no layer able to act before the previous one has completed
- Any authorized user can see where a record stands in the workflow at any time
- Rejections at any layer return the record to Reception for correction and restart the workflow from there

### Notifications and handoffs

- Every submit, approve, and reject action triggers both a dashboard notification and an email to the relevant parties
- Downstream departments are automatically notified when a record is ready for them — removing reliance on manually forwarded emails that may go unread

### Compliance and accountability

- Every action on a record is timestamped, attributed to a user, and recorded in the audit log
- Stakeholder approvals (HCM, GMM, DMD) are captured with approver name, signature, and date
- Delegated approvals and access termination requests are fully logged with justification and decision history

### Security and access control

- Only users provisioned by a System Administrator can reach the dashboard
- All dashboard access requires both Microsoft Entra ID authentication (with MFA) and a valid application PIN
- Access termination follows a formal workflow: Reception requests → System Administrator approves → IT revokes

### End-to-end completion

- A record can progress from initial submission at Reception through to Active status after IT completes biometric enrollment
- Required documents and data fields are enforced at each layer — a record cannot advance with missing compulsory inputs
- IT can confirm removal of a departed expatriate's access through the termination workflow


## Core User Flow

### Reception

The **Reception** layer captures and submits visitor information. This includes uploading required documents, entering visitor details, and obtaining approval from stakeholders (HCM, DMD, GMM). All three are notified simultaneously; approval from any one of them is sufficient to advance the record.

### Hospital

The **Hospital** layer processes visitor information after being notified by Reception. Its main purpose is to conduct a medical assessment of the visitor and record the results in the system.

When the assessment is complete and the visitor is fit to proceed, Hospital notifies the next layer (Training School). If the visitor is not fit to proceed, Hospital notifies Reception to handle the case from there. These notifications are automatically sent by the system based on user actions.


### Training School

The **Training School** layer conducts visitor induction. Once induction is complete and the visitor is fit to proceed, Training School notifies the next layer (Security) so the visitor can move forward.

### Security

The **Security** layer audits results from prior layers, then notifies Information Technology to complete biometric enrollment.

### Information Technology

The **Information Technology** layer completes biometric enrollment. After enrollment succeeds, Security and Reception are notified. At the same time, this layer also is responsible for revoking a visitor's access if they are to exit the system.


## Features in scope

- Dual-layer authentication (Microsoft Entra ID with MFA + mandatory 4-digit application PIN)
- Role-based access control (system roles: User, Guest, Admin, System Admin; workflow roles per department)
- Five-layer sequential workflow (Reception → Hospital → Training School → Security → IT)
- Multi-section form input with validation across all layers
- Compulsory document uploads at each layer
- Stakeholder approval workflow (HCM / GMM / DMD) with delegated approval fallback
- Dashboard and email notifications on every action
- Rejection and correction loop (record returns to Reception)
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
