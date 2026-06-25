# GMC Site Access — Architecture Design (Technical Reference)

**Date:** 2026-06-17
**Status:** Approved — builder reference
**Visual guide (read first):** [2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-GUIDE.md](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-GUIDE.md)

---

## 1. Key decisions

| Area | Decision |
|---|---|
| Hosting | Full Azure |
| Application | Next.js monolith on Azure App Service |
| Database | Azure Database for PostgreSQL (Flexible Server) |
| File storage | Azure Blob Storage |
| Background jobs | Azure Functions (timer + queue triggers) |
| Email | Microsoft Graph API via async Storage Queue |
| Identity | Entra ID (MFA) + application PIN (per SRS) |
| Domain model | Person + Engagement; StaffUser for GMC staff |
| Visa expiry | Flag + block + reset to Reception; prior layers read-only |
| CI/CD | `staging` → staging, `main` → production |
| DB networking | Public endpoint; firewall allows App Service + Functions only; SSL |

---

## 2. Domain model

### 2.1 Entities

```text
StaffUser
  staffUserId, entraObjectId, email, displayName
  systemRole (User | Guest | Admin | SystemAdmin)
  workflowRoles[]
  pinHash, pinFailedAttempts?, pinLockedUntil, provisionedAt, createdAt

Person
  personId, passportNo (unique, typed by Receptionist — no OCR v1)
  fullName, dob, gender, nationality, email, phone, emergency contact

Engagement (aggregate root)
  engagementId, personId, accessPurpose, arrivalDate, departureDate
  workflowState, accessState, isVisaFlagged, reception data
  └── documents[], stakeholderApprovals[], workflowCycles[]
  └── transitions[], terminationRequests[]

WorkflowCycle
  cycleId, engagementId, cycleNumber, hospitalClearance, archived?

HospitalClearance
  clearanceStatus (Fit | Unfit | FitWithConditions)
  doctorComments, clearanceDate

WorkflowTransition
  id, engagementId, cycleId, fromState, toState, performedBy, performedAt, comments

Document
  id, engagementId, cycleId?, docType, blobUrl, uploadedBy, uploadedAt

StakeholderApproval
  id, engagementId, approverRole (HCM | GMM | DMD)
  approverStaffUserId, approverName, signature, approvedAt
```

### 2.2 Engagement aggregate invariants

- All child changes via Engagement domain methods only
- `WorkflowTransition` append-only
- One active `WorkflowCycle` at a time
- `isVisaFlagged = true` blocks all layer actions until Reception clears

### 2.3 Business rules

| Rule | Behaviour |
|---|---|
| New visit | New Engagement; pre-fill Person if passport exists |
| Documents | Fresh per engagement; types per layer (see Guide Part 2) |
| Person lookup | Manual passport number entry; no OCR v1 |
| Reception gate | ≥1 StakeholderApproval + applicable docs before leaving Reception |
| Stakeholder approval | HCM/GMM/DMD notified; any one suffices |
| Delegated approval | System Admin grants Receptionist one-off approval; logged |
| Access duration | Card expiry ≤ visa/permit or departure (earlier wins) |
| Visa expiry | Flag, block, `workflowState → AtReception`, prior layers read-only; notify Reception + Security + IT; Reception clears flag |
| Hospital clearance | Fitness form + status + doctor comments required |
| Hospital Fit / FitWithConditions | → AtTraining |
| Hospital Unfit | Stays AtHospital; Reception notified |
| Hospital 3-month timeout | New WorkflowCycle; archive Training; → Hospital; new fitness form |
| Work path | Reception → Hospital → Training → Security → IT |
| Visit only | Reception → Completed |
| Visit + mine | Reception → Training → Security → IT |

### 2.4 State machines

**Workflow:** `Draft → AtReception → AtHospital → AtTraining → AtSecurity → AwaitingProvisioning → Completed`
(Visit-only and visit+mine variants — see Visual Guide Part 3)

**Access:** `Pending → Active → Expired | TerminationRequested → Terminated`

### 2.5 Stage types

| Stage | Type |
|---|---|
| Reception, Hospital, Training, Security | Approval |
| IT | Execution (provision / revoke) |

---

## 3. Application architecture

### 3.1 Azure components

| Component | Role |
|---|---|
| App Service | Next.js monolith (UI + API + service layer) |
| PostgreSQL Flexible Server | Relational data |
| Blob Storage | Document files |
| Storage Queue | `email-jobs` |
| Functions | `checkVisaExpiry`, `checkHospitalTimeout` (timers), `sendEmail` (queue) |
| Key Vault | Secrets; accessed via managed identity |
| Entra ID | Identity + MFA |
| Graph API | Outbound email |
| Application Insights | Logging |

### 3.2 App layers

Middleware → Pages / API Routes → Service layer → Data access (ORM) + Blob client

### 3.3 Database networking

- Public PostgreSQL endpoint; firewall allowlist for App Service + Functions outbound IPs
- SSL required; credentials in Key Vault
- Timer functions must be idempotent

### 3.4 Notifications

- **Sync:** workflow transitions, dashboard notifications (PostgreSQL)
- **Async:** all emails via Storage Queue → `sendEmail` Function → Graph API

### 3.5 Auth pipeline

Entra ID session → provisioned check → PIN gate → workflow role check → handler

### 3.6 Action guards

Admin role, not visa-flagged, correct workflow state, prior layer complete, required fields/docs present.

### 3.7 Security

- Private Blob containers; short-lived SAS URLs (e.g. 15 min)
- PIN hashed (bcrypt/argon2); rate-limited via `pinLockedUntil`
- Managed identities for Key Vault and Blob

---

## 4. Deployment

| Environment | Branch |
|---|---|
| staging | `staging` |
| prod | `main` |
| dev | local + Docker Compose PostgreSQL |

**Flow:** feature → `staging` → deploy staging → sign-off → merge `main` → deploy prod. Migrations run per environment on deploy.

### Prod SKUs (starting point)

App Service B2 · PostgreSQL Burstable B2ms · Blob LRS · Functions Consumption · Key Vault Standard

### Backup

PostgreSQL PITR (35 days prod) · Blob GRS optional prod · Git `main` = source of truth

---

## 5. Testing (v1 priority)

Unit: service layer (transitions, flagging, PIN) · Integration: API + workflow paths · Auth middleware

Tools: Vitest; Playwright optional later.

---

## 6. Out of scope (v1)

Local visitors · SMS/push · HR/ERP/biometric integrations · self-service PIN reset · analytics dashboards

---

## 7. Open items

| Item | Notes |
|---|---|
| Permit renewal on site | Access ends at visa end; extension = new engagement — confirm with GMC |
| PostgreSQL SKU | B2ms starting point |
| Graph API permissions | IT must grant `Mail.Send` or shared mailbox access |

---

## 8. References

- [Visual Architecture Guide](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-GUIDE.md)
- [Architecture Audit](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-AUDIT.md)
- `docs/PROJECT_OVERVIEW.md`
- `docs/SOFTWARE_REQUIREMENT_SPECIFICATION.md`
