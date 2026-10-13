import type { SystemRole, WorkflowRole } from "@/lib/domain/types";

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

export function accessRequestedTemplate(opts: {
  requesterName: string;
  requesterEmail: string;
  requestedRole: string;
  department?: string;
}): MessageTemplate {
  const requesterName = escapeHtml(opts.requesterName);
  const requesterEmail = escapeHtml(opts.requesterEmail);
  const requestedRole = escapeHtml(opts.requestedRole);
  const departmentLine = opts.department
    ? `<p>Department: ${escapeHtml(opts.department)}</p>`
    : "";
  return {
    subject: "GMC Site Access — new access request",
    html: `<p>${requesterName} (${requesterEmail}) has requested the role "${requestedRole}".</p>${departmentLine}<p><a href="${baseUrl()}/dashboard/system-admin/users">Review and provision this request</a>.</p>`,
  };
}

export function accessApprovedTemplate(opts: {
  recipientName: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  department?: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  const systemRole = escapeHtml(opts.systemRole);
  const workflowRoles = opts.workflowRoles.map(escapeHtml).join(", ") || "None";
  const departmentLine = opts.department
    ? `<p>Department: ${escapeHtml(opts.department)}</p>`
    : "";
  return {
    subject: "GMC Site Access — access approved",
    html: `<p>Hi ${recipientName}, your access has been approved.</p><p>System role: ${systemRole}</p><p>Workflow roles: ${workflowRoles}</p>${departmentLine}<p><a href="${baseUrl()}">Go to your dashboard</a> and set up your PIN to continue.</p>`,
  };
}

export function pinResetTemplate(opts: {
  recipientName: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: "GMC Site Access — PIN reset",
    html: `<p>Hi ${recipientName}, your PIN has been reset by a System Administrator.</p><p>Sign in and create a new PIN to continue.</p>`,
  };
}

export function departmentInvitationTemplate(opts: {
  token: string;
  department: string;
}): MessageTemplate {
  const department = escapeHtml(opts.department);
  const link = `${baseUrl()}/register?token=${encodeURIComponent(opts.token)}`;
  return {
    subject: "GMC Site Access — registration invitation",
    html: `<p>You have been invited to register for a site visit to Ghana Manganese Company (${department}).</p><p><a href="${link}">Start your registration</a>.</p>`,
  };
}

export function registrationSubmittedTemplate(opts: {
  department: string;
  visitorName?: string;
  // Department Heads review it in their invitation console; Reception acts on
  // it in their own queue, so the same event links to two different places.
  audience: "DepartmentHead" | "Receptionist";
}): MessageTemplate {
  const department = escapeHtml(opts.department);
  const visitor = opts.visitorName ? escapeHtml(opts.visitorName) : undefined;
  const who = visitor ? `${visitor} has` : "A visitor has";

  const { path, cta } =
    opts.audience === "Receptionist"
      ? { path: "/dashboard/reception", cta: "Create the engagement" }
      : { path: "/dashboard/department", cta: "Review it" };

  return {
    subject: "GMC Site Access — new registration submission",
    html: `<p>${who} submitted a registration form for ${department}.</p><p><a href="${baseUrl()}${path}">${cta}</a>.</p>`,
  };
}

function engagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/reception/${engagementId}`;
}

function hospitalEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/hospital/${engagementId}`;
}

function securityEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/security/${engagementId}`;
}

function itEngagementLink(engagementId: string): string {
  return `${baseUrl()}/dashboard/it/${engagementId}`;
}

export function stakeholderApprovalRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: "GMC Site Access — stakeholder approval requested",
    html: `<p>Stakeholder approval is requested for ${personName}'s Reception record.</p><p>Approval from any one of HCM, GMM, or DMD is sufficient.</p><p><a href="${engagementLink(opts.engagementId)}">Review and approve</a>.</p>`,
  };
}

export function stakeholderApprovalReceivedTemplate(opts: {
  personName: string;
  engagementId: string;
  nextRole: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const nextRole = escapeHtml(opts.nextRole);
  return {
    subject: "GMC Site Access — record routed to your queue",
    html: `<p>${personName}'s Reception record has been approved and routed to ${nextRole}.</p><p><a href="${engagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function delegatedApprovalRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
  reason: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reason = escapeHtml(opts.reason);
  return {
    subject: "GMC Site Access — delegated approval requested",
    html: `<p>HCM, GMM, and DMD are unavailable to approve ${personName}'s Reception record.</p><p>Reason: ${reason}</p><p>A System Administrator may grant the Receptionist a one-off delegated approval.</p><p><a href="${engagementLink(opts.engagementId)}">Review the record</a>.</p>`,
  };
}

export function delegatedApprovalGrantedTemplate(opts: {
  recipientName: string;
  engagementId: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: "GMC Site Access — delegated approval granted",
    html: `<p>Hi ${recipientName}, you've been granted a one-off delegated approval privilege for this engagement.</p><p><a href="${engagementLink(opts.engagementId)}">Complete the approval</a>.</p>`,
  };
}

export function hospitalClearedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: "GMC Site Access — hospital clearance recorded",
    html: `<p>${personName} has been cleared by Hospital and routed to Training School.</p><p><a href="${hospitalEngagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function inductionCompletedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);

  return {
    subject: "GMC Site Access — induction completed",
    html: `<p>${personName} has completed induction at Training School and the record has been forwarded to Security.</p><p><a href="${securityEngagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function hospitalUnfitTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: "GMC Site Access — hospital marked record Unfit",
    html: `<p>${personName} was marked Unfit at Hospital and remains at Hospital pending re-evaluation.</p><p><a href="${hospitalEngagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function forwardedToITTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);

  return {
    subject: "GMC Site Access — record cleared by Security",
    html: `<p>Security has cleared ${personName}. The record is ready for biometric enrollment and access-card setup.</p><p><a href="${itEngagementLink(opts.engagementId)}">Set up access</a>.</p>`,
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
    subject: "GMC Site Access — access activated",
    html: `<p>Site access is now active for ${personName}.</p><p>Access card ${card}, valid until ${expiry}.</p><p><a href="${engagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function terminationRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
  reason: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reason = escapeHtml(opts.reason);
  return {
    subject: "GMC Site Access — access termination requested",
    html: `<p>Access termination has been requested for ${personName}.</p><p>Reason: ${reason}</p><p><a href="${engagementLink(opts.engagementId)}">Review the request</a>.</p>`,
  };
}
