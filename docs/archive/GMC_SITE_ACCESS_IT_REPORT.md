## GMC Site Access — Site Access Workflow Management System

Ghana Manganese Company (GMC) IT is developing **GMC Site Access**, a web-based workflow management system to replace the current manual, paper-based process for registering foreign visitors and expatriates for mine-site access. During the reporting period (June 2026), work focused on requirements definition, solution architecture, development environment setup, and the initial application scaffold. The system is in **early development** — requirements and technical foundations are substantially complete, but core workflow features and production deployment have not yet been delivered. The project is on track for phased build-out following the approved architecture.

### Key Highlights

- Completed a full **Software Requirements Specification (SRS)** and project overview defining three access paths (work, visit-only, and visit with mine-site access), multi-department handoffs, stakeholder approvals, audit logging, and access-termination workflows.
- Produced **architecture and DevOps design** covering Microsoft Entra ID (Multi-Factor Authentication, MFA) plus application PIN authentication, PostgreSQL data layer, Azure Blob Storage for documents, Microsoft Graph for email notifications, and a GitHub Actions–driven continuous integration/continuous deployment (CI/CD) pipeline targeting Azure App Service.
- Established the **development foundation**: Next.js application scaffold, TypeScript tooling, Tailwind CSS styling, a branded landing page, and a containerised PostgreSQL 16 database with Drizzle ORM for schema management.
- Documented **local developer onboarding** procedures so the team can run the application and database consistently on workstations.
- Merged initial pull requests into the project repository, consolidating documentation, DevOps planning, and database configuration into the main codebase.
- Defined **role-based access control** for System Administrator, Admin, Guest, and User roles, aligned to departmental workflow responsibilities across Reception, Hospital, Training School, Security, and Information Technology (IT).

### Scope and architecture

The system will route each visitor engagement through department-specific workflow layers with strict sequential handoffs, dashboard and email notifications on every action, and a complete audit trail. Authentication uses a dual layer — organisational identity via Microsoft Entra ID and an independent four-digit application PIN. Planned Azure services include App Service, Key Vault, Application Insights, Blob Storage, Queue Storage, and Azure Functions for background jobs such as visa-expiry checks and notification delivery.

### Status

| Phase | Status |
|---|---|
| Requirements and architecture | Complete |
| Local development environment | Operational |
| Core workflow and authentication | Not started (next milestone) |
| Azure infrastructure and CI/CD | Designed; not yet provisioned |
| Production go-live | Not scheduled |

### Team

**3 contributors** identified in repository history: Kennedy Anyidoho, Ernestina Avortri, and tarkohaggie-code.

### Risks and open items

- Core business workflow, Microsoft authentication integration, and document-upload features remain to be built; the application is not yet usable by departmental staff.
- Azure cloud resources, automated testing pipelines, and production deployment slots are designed but not yet implemented.
- Local visitor registration and integration with external systems (human resources, biometric hardware) are explicitly out of scope for the current phase.

### Summary

GMC Site Access will give management and department heads real-time visibility into visitor access requests, strengthen compliance through timestamped audit records, and reduce reliance on email chains that can delay processing. The immediate focus is implementing authentication, the multi-layer workflow engine, and the first production-ready Azure deployment environment.
