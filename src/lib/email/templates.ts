import {
  type RequestableRole,
  ROLE_LABELS,
  SYSTEM_ROLE_LABELS,
  type SystemRole,
  type WorkflowRole,
} from "@/lib/domain/types";

// Wording agreed in docs/email-templates.md — change the copy there first.

export type EmailTemplate = {
  to: string;
  subject: string;
  html: string;
};

type MessageTemplate = Omit<EmailTemplate, "to">;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function baseUrl(): string {
  const url = process.env.AUTH_URL;
  if (!url) {
    throw new Error("AUTH_URL is not configured");
  }
  return url;
}

// Subjects are plain text, so names go in raw — escaping would show "&amp;".
function subject(text: string): string {
  return `GMC Site Access: ${text}`;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}">${label}</a></p>`;
}

// Approver roles are stored as text and include values no longer in the
// list ("Delegated", the retired "DMD"), so an unknown one shows as stored.
function roleLabel(role: string): string {
  return ROLE_LABELS[role as RequestableRole] ?? role;
}

export function accessRequestedTemplate(opts: {
  requesterName: string;
  requesterEmail: string;
  requestedRole: string;
  department?: string;
}): MessageTemplate {
  const requesterName = escapeHtml(opts.requesterName);
  const requesterEmail = escapeHtml(opts.requesterEmail);
  const requestedRole = escapeHtml(roleLabel(opts.requestedRole));
  const departmentLine = opts.department
    ? `<p>Department: ${escapeHtml(opts.department)}</p>`
    : "";
  return {
    subject: subject(`${opts.requesterName} has requested an account`),
    html: `<p>${requesterName} (${requesterEmail}) has asked for an account as <strong>${requestedRole}</strong>.</p>${departmentLine}${button(`${baseUrl()}/dashboard/system-admin/users`, "Review and set up the account")}`,
  };
}

export function accessApprovedTemplate(opts: {
  recipientName: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  department?: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  // The job role is what the reader recognises; the system role only stands
  // in when there is no job role (e.g. a System Administrator).
  const roles = escapeHtml(
    opts.workflowRoles.length > 0
      ? opts.workflowRoles.map(roleLabel).join(", ")
      : SYSTEM_ROLE_LABELS[opts.systemRole],
  );
  const departmentLine = opts.department
    ? `<br>Department: ${escapeHtml(opts.department)}`
    : "";
  return {
    subject: subject("your account is ready"),
    html: `<p>Hi ${recipientName},</p><p>Your GMC Site Access account has been approved.</p><p>Your role: ${roles}${departmentLine}</p><p>To get started, sign in and create your PIN.</p>${button(baseUrl(), "Sign in")}`,
  };
}

export function pinResetTemplate(opts: {
  recipientName: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: subject("your PIN has been reset"),
    html: `<p>Hi ${recipientName},</p><p>A System Administrator has reset your PIN. The next time you sign in, you will be asked to create a new one.</p>${button(baseUrl(), "Sign in")}<p>If you did not ask for this, please contact your System Administrator.</p>`,
  };
}

export function departmentInvitationTemplate(opts: {
  token: string;
  department: string;
}): MessageTemplate {
  const department = escapeHtml(opts.department);
  const link = `${baseUrl()}/register?token=${encodeURIComponent(opts.token)}`;
  return {
    subject: subject("you're invited to register for a site visit"),
    html: `<p>Hello,</p><p>The ${department} department at Ghana Manganese Company has invited you to register for a site visit.</p>${button(link, "Start your registration")}<p>To learn how we use your information, read our <a href="${baseUrl()}/privacy-policy">Privacy Policy</a>.</p><p>If you were not expecting this invitation, you can ignore this email.</p>`,
  };
}

export function registrationSubmittedTemplate(opts: {
  visitorName?: string;
  companyName?: string;
  // Department Heads are only told; Reception acts on it from their
  // dashboard, so only theirs carries a link.
  audience: "DepartmentHead" | "Receptionist";
}): MessageTemplate {
  const visitorName = opts.visitorName ?? "A visitor";
  const visitor = escapeHtml(visitorName);

  if (opts.audience === "DepartmentHead") {
    return {
      subject: subject(`${visitorName} has completed their registration`),
      html: `<p>${visitor} has completed the registration form for site access.</p>`,
    };
  }

  const company = opts.companyName
    ? ` from ${escapeHtml(opts.companyName)}`
    : "";
  return {
    subject: subject("new visitor registration"),
    html: `<p>${visitor}${company} has registered for site access.</p>${button(`${baseUrl()}/dashboard/reception`, "Go to dashboard")}`,
  };
}

// Every link has to land on the route the *recipient* can open. `proxy.ts`
// gates /dashboard/<layer> on that layer's workflow role, so mailing a
// Receptionist a /dashboard/hospital/... link answered them with a bare
// "Forbidden" — which is exactly what used to happen on an Unfit clearance.
// One helper per audience, and each template names the audience it is for.
function engagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/reception/${engagementId}`;
}

function approvalsEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/approvals/${engagementId}`;
}

function hospitalEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/hospital/${engagementId}`;
}

function trainingEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/training/${engagementId}`;
}

function securityEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/security/${engagementId}`;
}

export function stakeholderApprovalRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`your approval is needed for ${opts.personName}`),
    html: `<p>Reception has requested your approval for ${personName}'s site access application.</p><p>You can review the full details on your dashboard using the link below.</p>${button(approvalsEngagementLink(opts.engagementId), "Review the application")}`,
  };
}

// Training School hears the same thing whether the person came straight from
// management approval or through Hospital.
function dueForInductionTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`${opts.personName} is due for induction`),
    html: `<p>${personName}'s site access application has been approved by management, and they are now due for induction.</p><p>This is for your information. Once induction has been done, you can record it on the application.</p>${button(trainingEngagementLink(opts.engagementId), "Record induction status")}`,
  };
}

export function stakeholderApprovalReceivedTemplate(opts: {
  personName: string;
  engagementId: string;
  // Who the record was routed to — Hospital, or Training School when the
  // person needs no medicals.
  nextRole: WorkflowRole;
}): MessageTemplate {
  if (opts.nextRole !== "HospitalStaff") {
    return dueForInductionTemplate(opts);
  }

  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`${opts.personName} is due for medicals`),
    html: `<p>${personName}'s site access application has been approved by management, and is due for medicals.</p><p>This is for your information. Once the medicals have been done, you can record the result on the application.</p>${button(hospitalEngagementLink(opts.engagementId), "Record medical status")}`,
  };
}

// Each audience goes to its own dashboard: the Department Head cannot open a
// Reception record, and the notification sits on both dashboards.
export function stakeholderApprovalRejectedTemplate(opts: {
  personName: string;
  rejectedBy: string;
  approverRole: string;
  reason: string;
  audience: "Receptionist" | "DepartmentHead";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const rejectedBy = escapeHtml(opts.rejectedBy);
  const approverRole = escapeHtml(roleLabel(opts.approverRole));
  const reason = escapeHtml(opts.reason);
  const dashboard =
    opts.audience === "Receptionist"
      ? `${baseUrl()}/dashboard/reception`
      : `${baseUrl()}/dashboard/department`;

  return {
    subject: subject(`${opts.personName}'s application was not approved`),
    html: `<p>${rejectedBy}, ${approverRole}, did not approve ${personName}'s site access application.</p><p>Reason given: ${reason}</p>${button(dashboard, "Go to your dashboard")}`,
  };
}

export function delegatedApprovalRequestedTemplate(opts: {
  personName: string;
  receptionistName: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const receptionistName = escapeHtml(opts.receptionistName);
  return {
    subject: subject("delegated approval request"),
    html: `<p>${receptionistName} is requesting a delegated approval for ${personName}'s site access application.</p>${button(`${baseUrl()}/dashboard/system-admin/delegations`, "Review request")}`,
  };
}

export function delegatedApprovalGrantedTemplate(opts: {
  recipientName: string;
  engagementId: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: subject("you can now approve this application"),
    html: `<p>Hi ${recipientName},</p><p>You've been granted a one-off delegated approval privilege for an engagement.</p>${button(engagementLink(opts.engagementId), "Complete the approval")}`,
  };
}

export function hospitalClearedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  return dueForInductionTemplate(opts);
}

export function inductionCompletedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);

  return {
    subject: subject(`${opts.personName} is ready for an access card`),
    html: `<p>${personName} has completed induction and is ready for biometrics.</p>${button(securityEngagementLink(opts.engagementId), "Review records")}`,
  };
}

export function hospitalUnfitTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`${opts.personName} did not pass the medical check`),
    html: `<p>${personName} has been assessed as unfit following their medicals and is pending re-evaluation.</p>${button(engagementLink(opts.engagementId), "View records")}`,
  };
}

// Reception's half of a conditional clearance: the conditions are theirs to
// manage, so the doctor's comments travel with the notice.
export function hospitalFitWithConditionsTemplate(opts: {
  personName: string;
  engagementId: string;
  doctorComments: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const doctorComments = escapeHtml(opts.doctorComments);

  return {
    subject: subject(
      `${opts.personName} passed the medical check with conditions`,
    ),
    html: `<p>${personName} has been assessed as fit with conditions following their medicals and is now due for induction.</p><p>Doctor's comments: ${doctorComments}</p>${button(engagementLink(opts.engagementId), "View hospital record")}`,
  };
}

export function accessActivatedTemplate(opts: {
  personName: string;
  accessCardNumber: string;
  accessCardExpiry: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const card = escapeHtml(opts.accessCardNumber);
  const expiry = escapeHtml(opts.accessCardExpiry);

  return {
    subject: subject(`${opts.personName} now has site access`),
    html: `<p>${personName} now has site access.</p><p>Access card number: ${card}<br>Valid until: ${expiry}</p>${button(engagementLink(opts.engagementId), "View records")}`,
  };
}

// To Security, who carry the revocation out.
export function terminationRequestedTemplate(opts: {
  personName: string;
  reason: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reason = escapeHtml(opts.reason);
  return {
    subject: subject("Access Revocation"),
    html: `<p>Reception has asked for ${personName}'s site access to be revoked.</p><p>Reason given: ${reason}</p>${button(`${baseUrl()}/dashboard/security?view=revocations`, "Go to dashboard")}`,
  };
}

// To Reception, once Security has switched the access off.
export function accessRevokedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`site access revoked for ${opts.personName}`),
    html: `<p>Security has revoked ${personName}'s site access.</p>${button(engagementLink(opts.engagementId), "Open the application")}`,
  };
}
