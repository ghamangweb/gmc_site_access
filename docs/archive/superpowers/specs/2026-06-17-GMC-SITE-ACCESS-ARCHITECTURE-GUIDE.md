# GMC Site Access — Visual Architecture Guide

**Read this first.** Flows and mental models for understanding the system.
**Technical reference:** [2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-DESIGN.md](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-DESIGN.md)

> **Diagrams:** Light boxes, dark text and lines — readable in light and dark editors. Refresh preview after edits.

<!-- Mermaid: light nodes + dark text/lines — readable on light and dark editor backgrounds -->

## Part 1 — The mental model

**One sentence:** GMC staff process **visits** (engagements) for **people** (visitors/expatriates) through a **department pipeline**, backed by Azure.

**Think of it like a hospital patient file:**

```text
Person     = the human (reused when they return)
Engagement = one folder for this visit (new every time)
Documents  = papers clipped inside this folder (fresh every visit)
Workflow   = the folder moving desk to desk (Reception → Hospital → …)
```

The **Engagement** is the centre. Everything else hangs off it.

```text
                    Person ──────────────┐
              (many visits over years) │
                                       ▼
  StaffUser ──────────────►  ENGAGEMENT  ──────► Documents
  (acts on)                  (one visit)  ──────► Stakeholder approvals
                                       │  ──────► Workflow states
                                       └──────► Audit log
```

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TB
  P["Person<br/>visitor / expatriate"]
  S["StaffUser<br/>GMC employee"]

  P ~~~ S

  E["ENGAGEMENT<br/>one visit / work request<br/><b>centre of the system</b>"]

  P -->|"many visits<br/>over years"| E
  S -->|"acts on"| E

  D1["Documents"]
  D2["Stakeholder<br/>approvals"]
  D3["Workflow<br/>states"]
  D4["Audit log"]

  E --> D1
  E --> D2
  E --> D3
  E --> D4
```

---

## Part 2 — The cast

### Visitors vs staff

| | Person | StaffUser |
|---|---|---|
| **Who** | Visitor / expatriate | GMC employee |
| **Logs in?** | No | Yes (Entra ID + PIN) |
| **Example** | Kwame the contractor | Receptionist Jane |

### Starting a new visit (Person lookup)

Receptionist **types** passport number. System does **not** read the scan automatically.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TD
  A[Receptionist types passport number] --> B{Person exists?}
  B -->|Yes| C[Pre-fill name, DOB, contact from saved profile]
  B -->|No| D[Empty form — enter demographics]
  C --> E[Create new Engagement]
  D --> E
  E --> F[Upload fresh documents<br/>passport scan, visa, etc.]
  F --> G[Stakeholder approval<br/>HCM or GMM or DMD — any one]
```

**Remember:** passport **number** = lookup key. Passport **scan** = evidence document only.

### What lives on an Engagement

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart LR
  E[Engagement]

  E --> D1[Documents<br/>passport, visa, fitness form…]
  E --> D2[Stakeholder approval<br/>HCM / GMM / DMD]
  E --> D3[Workflow state<br/>where in pipeline]
  E --> D4[Access state<br/>site access rights]
  E --> D5[Audit trail<br/>who did what when]
```

---

## Part 3 — The happy paths

Three paths are chosen at Reception.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TD
  R[Reception<br/>capture + documents + stakeholder approval]

  R -->|Coming to work| W[WORK PATH]
  R -->|Visit, no mine site| V[VISIT ONLY]
  R -->|Visit + mine site| M[VISIT + MINE PATH]

  W --> H[Hospital]
  H --> T[Training]
  T --> S[Security]
  S --> IT[IT]
  IT --> Done1[Completed + Active]

  V --> Done2[Completed at Reception]

  M --> T2[Training]
  T2 --> S2[Security]
  S2 --> IT2[IT]
  IT2 --> Done3[Completed + Active]
```

### Work path — step by step

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
sequenceDiagram
  participant Rec as Reception
  participant HCM as HCM/GMM/DMD
  participant Hos as Hospital
  participant Trn as Training
  participant Sec as Security
  participant IT as IT

  Rec->>Rec: Type passport, create Engagement, upload docs
  Rec->>HCM: Request approval
  HCM->>Rec: Any one approves
  Rec->>Hos: Hand off
  Hos->>Hos: Upload fitness form + clearance + comments
  alt Fit or fit with conditions
    Hos->>Trn: Hand off
    Trn->>Sec: Induction complete
    Sec->>IT: Approved
    IT->>IT: Biometrics + access card
    IT->>Rec: Active — notify Reception + Security
  else Unfit
    Hos->>Rec: Blocked — notify Reception
  end
```

### Two lifecycles on the same Engagement

Don't mix these up — they run in parallel:

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
stateDiagram-v2
  state "Workflow (pipeline)" as WF {
    [*] --> AtReception
    AtReception --> AtHospital
    AtHospital --> AtTraining
    AtTraining --> AtSecurity
    AtSecurity --> AwaitingIT
    AwaitingIT --> Completed
  }

  state "Access (site rights)" as AC {
    [*] --> Pending
    Pending --> Active: IT provisions card
    Active --> Terminated: termination workflow
  }
```

**Example:** After IT finishes → `Workflow = Completed` and `Access = Active`. Person can be on site for months while workflow stays completed.

---

## Part 4 — When things go wrong

### Visa / permit expires

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TD
  A[Daily check finds expired visa] --> B[isVisaFlagged = true]
  B --> C[Block all departments]
  B --> D[Reset to Reception]
  B --> E[Prior layers become read-only]
  B --> F[Notify Reception + Security + IT]
  F --> G[Receptionist decides what to do]
  G --> H[Upload new docs + resubmit]
  H --> I[Clear flag → continue from Reception]
```

**Policy:** Access card never outlasts visa. Extension = new Engagement later, not patching the old one.

### Hospital — unfit

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart LR
  H[Hospital submits] --> U{Clearance?}
  U -->|Fit| T[→ Training]
  U -->|Fit with conditions| T
  U -->|Unfit| X[Stays at Hospital<br/>cannot advance]
  X --> N[Notify Reception]
```

Hospital must upload **fitness form** + status + doctor comments before any outcome.

### Hospital clearance times out (3 months at Training)

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TD
  A[Hospital cleared patient] --> B[Training has 3 months to complete]
  B -->|Completed in time| C[→ Security]
  B -->|Not completed| D[Archive Training progress]
  D --> E[Start new WorkflowCycle]
  E --> F[Back to Hospital for new checkup + new fitness form]
```

---

## Part 5 — Under the hood

### What staff see vs what runs in Azure

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TB
  subgraph user [What you see]
    Browser[Browser<br/>Next.js app]
  end

  subgraph azure [Azure — behind the scenes]
    App[App Service<br/>website + API]
    DB[(PostgreSQL<br/>people, engagements, audit)]
    Blob[Blob Storage<br/>document files]
    Queue[Storage Queue<br/>email jobs]
    Fn[Functions<br/>timers + email worker]
    Graph[Microsoft Graph<br/>send email]
    Entra[Entra ID<br/>login + MFA]
    KV[Key Vault<br/>passwords & secrets]
  end

  Browser --> Entra
  Browser --> App
  App --> DB
  App --> Blob
  App --> Queue
  Queue --> Fn
  Fn --> Graph
  Fn --> DB
  App --> KV
  Fn --> KV
```

### Logging in (four gates)

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart TD
  A[Open app] --> B{Microsoft login OK?}
  B -->|No| L[Login screen]
  B -->|Yes| C{Provisioned by System Admin?}
  C -->|No| U[/unauthorized/]
  C -->|Yes| D{PIN entered this session?}
  D -->|No| P[PIN screen]
  D -->|Yes| E{Right department role?}
  E -->|No| X[403 Forbidden]
  E -->|Yes| F[Dashboard]
```

### Every click that moves a case forward

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart LR
  A[Staff clicks Approve/Submit] --> B[Save to database]
  B --> C[Dashboard notification<br/>instant]
  B --> D[Queue email job<br/>async]
  D --> E[Function sends email<br/>via Microsoft 365]
  B --> F[Response back to user<br/>fast]
```

### Database security (Option A — your choice)

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart LR
  App[App Service] -->|allowed IP + SSL| DB[(PostgreSQL)]
  Fn[Functions] -->|allowed IP + SSL| DB
  Internet[Everyone else] -.->|blocked| DB
```

Not hidden — **firewalled**. Like a building on a street with a door that only opens for your servers.

### Background jobs (while you sleep)

| Job | When | What |
|---|---|---|
| `checkVisaExpiry` | Daily | Flag expired visas, reset to Reception |
| `checkHospitalTimeout` | Daily | 3-month Training timeout → back to Hospital |
| `sendEmail` | On queue message | Send queued emails via Graph |

---

## Part 6 — Who can do what

### System roles (app permissions)

| Role | Can do |
|---|---|
| **User** | Login only → sent to `/unauthorized` |
| **Guest** | View their department's queue (read-only) |
| **Admin** | View + act at their department |
| **System Admin** | Manage users, reset PINs, approve terminations |

### Workflow roles (which desk)

`Receptionist` · `Hospital` · `TrainingSchool` · `Security` · `IT` · `HCM` · `GMM` · `DMD`

One person can hold multiple workflow roles. Dashboard shows queues for their role(s).

### Before any action is allowed

```text
✓ Admin (not Guest)
✓ Not visa-flagged
✓ Case is at your department's step
✓ Previous department finished
✓ Required fields + documents present
```

---

## Part 7 — Shipping code

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#f8fafc','primaryTextColor':'#0f172a','primaryBorderColor':'#334155','secondaryColor':'#e2e8f0','secondaryTextColor':'#0f172a','secondaryBorderColor':'#334155','tertiaryColor':'#f1f5f9','tertiaryTextColor':'#0f172a','lineColor':'#334155','textColor':'#0f172a','mainBkg':'#f8fafc','nodeBorder':'#475569','clusterBkg':'#f1f5f9','clusterBorder':'#64748b','titleColor':'#0f172a','edgeLabelBackground':'#f8fafc','edgeLabelText':'#0f172a','actorBkg':'#f8fafc','actorTextColor':'#0f172a','actorBorder':'#334155','actorLineColor':'#334155','signalColor':'#334155','signalTextColor':'#0f172a','labelTextColor':'#0f172a','loopTextColor':'#0f172a','noteBkgColor':'#f8fafc','noteTextColor':'#0f172a','noteBorderColor':'#334155','stateLabelColor':'#0f172a','labelColor':'#0f172a'}}}%%
flowchart LR
  FB[Feature branch] --> ST[staging branch]
  ST -->|deploy| AZS[Azure staging]
  ST -->|after GMC sign-off| MN[main branch]
  MN -->|deploy| AZP[Azure production]
```

| Branch | Environment |
|---|---|
| `staging` | Staging |
| `main` | Production |

---

## Quick reference card

```text
Person       → who (reused)
Engagement   → this visit (new each time)
Document     → file for this visit (fresh each time)
StaffUser    → GMC employee using the app

Work path    → Reception → Hospital → Training → Security → IT
Visit only   → Reception only
Visit + mine → Reception → Training → Security → IT

Visa expires → flag, block, back to Reception
Hospital unfit → stuck at Hospital
3-month rule → back to Hospital, new cycle

Azure        → App Service + PostgreSQL + Blob + Functions + Graph + Entra ID
```

---

## Related docs

- [Technical design spec](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-DESIGN.md) — entities, SKUs, rules tables
- [Architecture audit](./2026-06-17-GMC-SITE-ACCESS-ARCHITECTURE-AUDIT.md) — review findings
- [SRS](../../SOFTWARE_REQUIREMENT_SPECIFICATION.md) — full requirements
- [Project overview](../../PROJECT_OVERVIEW.md) — business context
