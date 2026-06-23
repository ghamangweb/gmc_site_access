# Project Overview

## About the Project

GMC Site Access digitizes foreign visitor and expatriate site-access registration at Ghana Manganese Company. Visitors are record subjects only — they do not log in.

GMC staff authenticate via Microsoft Entra ID, then a 4-digit PIN, then access a role-based dashboard. Only System-Admin-provisioned users get past `/unauthorized`.

Each visit is an **Engagement** routed through workflow layers based on access purpose set at Reception. Admin (write) and Guest (read-only) at each layer. Every action triggers dashboard + email notification and is audit-logged.

---

## Pages

```
/                       → redirect to dashboard or sign-in
/(auth)/*               → Microsoft sign-in, PIN, unauthorized
/dashboard/[layer]      → workflow queue for assigned role
```

Layer values: `reception`, `hospital`, `training`, `security`, `it`, `admin` (System Admin user management).

---

## Navigation

Staff see dashboard navigation for their assigned workflow role(s). System Administrators additionally access user provisioning and termination approval.

No public pages beyond sign-in.

---

## Core User Flow

Records route at Reception by **access purpose** and (for visitors) **mine-site access**:

| Access purpose | Mine site | Path |
|---|---|---|
| Coming to work | Yes | Reception → Hospital → Training School → Security → IT |
| Coming to visit | No | Reception only |
| Coming to visit | Yes | Reception → Training School → Security → IT |

No layer acts before the previous required layer completes.

### Reception

- Receptionist types passport number (manual lookup — no OCR)
- System pre-fills or creates Person, creates new Engagement
- Captures access purpose and mine-site flag (determines path)
- Receptionist marks which document uploads apply; only those are required
- Document types: `passport_biodata`, `visa`, `permit`, `insurance`
- Stakeholder approval: HCM, GMM, DMD notified together; any one approval advances the record
- Can initiate access termination requests

### Hospital

- Work path only
- Upload fitness form (`hospital_fitness_form`); record clearance status + doctor comments
- Fit / FitWithConditions → Training School
- Unfit → stays at Hospital; Reception notified
- Clearance valid three months while record is at Training School

### Training School

- Work path: after Hospital clearance
- Visit + mine site: directly from Reception (Hospital skipped)
- Records induction completion → Security
- Document types: induction records
- Work path: if not completed within three months of hospital clearance, progress archived, record returns to Hospital

### Security

- Work and visit + mine site paths
- Audits prior layers → forwards to IT for biometric enrollment

### Information Technology

- Biometric enrollment and access/visitor cards
- Document types: `biometric_image`, `passport_photo`
- Sets access active on success; notifies Security and Reception
- Revokes access on approved termination

### Visa / permit expiry

- System flags expired visa/permit → record resets to Reception
- Prior layer data read-only until Reception clears flag

### Access termination

- Reception requests → System Administrator approves → IT revokes

---

## Data Architecture

### Person

- Reused visitor identity; keyed by `passport_no`
- Holds biodata only — not the centre of workflow
- Does not own per-visit documents

### Engagement

- One visit / work request — **aggregate root**
- Owns documents, stakeholder approvals, workflow cycles, transitions, termination requests
- `workflow_state` — where the record is in the handoff chain
- `access_state` — whether site access is pending, active, or terminated
- Fresh documents uploaded every engagement

### StaffUser

- GMC employee — Entra ID + PIN + system role + workflow roles
- Lives in `staff_users` table

---

## Business Rules

Rules agents must enforce — referenced from services and guards:

- Fresh documents every engagement — never attach visit docs to Person alone
- Passport lookup is manual — Receptionist types passport number; no OCR
- Passport biodata upload is evidence only — does not auto-fill form fields
- `is_visa_flagged` blocks all layer writes until Reception clears
- Guests cannot write — Admin required for all mutations
- No layer acts before the previous required layer completes
- Access card expiry ≤ visa/permit end or departure date (whichever is earlier)

---

## Roles

### System roles

| Role | Access |
|---|---|
| System Administrator | Provisions users, assigns roles, resets PINs, approves termination |
| Admin | Creates and processes records at assigned layer |
| Guest | Read-only at assigned layer |
| User | Microsoft sign-in only — not provisioned |

### Workflow roles

| Role | Department |
|---|---|
| Receptionist | Reception |
| HCM / GMM / DMD | Reception (stakeholder approval) |
| Hospital Records Staff | Hospital |
| Training School Staff | Training School |
| Security Staff | Security |
| Information Technology Staff | IT |

---

## Features In Scope

- Auth subsystem (Entra ID + PIN + middleware pipeline)
- Role-based access (system roles + workflow roles)
- Path-based workflow routing (work, visit-only, visit + mine site)
- Multi-section forms with per-layer validation
- Applicable document selection at Reception
- Compulsory uploads at Hospital, Training, IT
- Stakeholder approval (HCM / GMM / DMD) + delegated approval fallback
- Dashboard and email notifications on every action
- Visa/permit expiry flagging and Reception reset
- Access termination workflow
- Full audit logging
- Guest read-only per layer
- Foreign visitor and expatriate registration

## Features Out of Scope

- Local visitor registration
- Mobile native app
- SMS or push notifications
- External integrations (HR, ERP, biometric hardware, physical access control)
- Self-service PIN reset
- Automated reporting and analytics dashboards
- Bulk import or batch processing
- Public visitor self-registration
- Accommodation, transport, or airport pickup booking
