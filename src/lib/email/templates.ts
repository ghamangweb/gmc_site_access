import {
  type RequestableRole,
  ROLE_LABELS,
  SYSTEM_ROLE_LABELS,
  type SystemRole,
  WORKFLOW_EXEMPTION_STAGE_LABELS,
  type WorkflowRole,
} from "@/lib/domain/types";
import {
  type WorkflowExemptionMessage,
  workflowExemptionNextStageLabel,
} from "@/lib/domain/workflow-exemptions";

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

const HELLO = "<p>Hello,</p>";

// Sent to every stage but Hospital (2026-11-05); `audience` picks a link
// that reader can open.
export function stakeholderExemptionApprovedTemplate(
  opts: WorkflowExemptionMessage,
  audience: MedicalAudience = "Receptionist",
): MessageTemplate {
  const stages = opts.stages
    .map((stage) => WORKFLOW_EXEMPTION_STAGE_LABELS[stage])
    .join(", ");

  const comment = escapeHtml(opts.reason).replace(/\r\n|\r|\n/g, "<br>");

  return {
    subject: subject(`Workflow Exemption Approved - ${opts.personName}`),
    html: `${HELLO}<p>An approval with exemption has been granted for the following visitor:</p><p><strong>Visitor:</strong> ${escapeHtml(opts.personName)}<br><strong>Passport/ID:</strong> ${escapeHtml(opts.passportNo)}<br><strong>Exempted stages:</strong> ${escapeHtml(stages)}<br><strong>Approved by:</strong> ${escapeHtml(opts.approverName)} (${escapeHtml(opts.approverRole)})<br><strong>Approved at (UTC):</strong> ${opts.approvedAt.toISOString()}</p><p><strong>Stakeholder's comment:</strong><br>${comment}</p><p>The engagement has moved to <strong>${escapeHtml(workflowExemptionNextStageLabel(opts.nextState))}</strong> for processing.</p>${button(medicalAudienceLink(audience, encodeURIComponent(opts.engagementId)), "View Engagement")}`,
  };
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
    ? `<br>Department: ${escapeHtml(opts.department)}`
    : "";
  return {
    subject: subject(`New Staff Account Request - ${opts.requesterName}`),
    html: `${HELLO}<p>A new staff account request has been submitted with the following details:</p><p>Name: ${requesterName}<br>Email Address: ${requesterEmail}<br>Requested Role: ${requestedRole}${departmentLine}</p><p>Please review the request and take the appropriate action regarding account approval.</p>${button(`${baseUrl()}/dashboard/system-admin/users`, "Review Account Request")}`,
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
    subject: subject("Your Account Has Been Approved"),
    html: `<p>Hi ${recipientName},</p><p>Your GMC Site Access account has been approved. Your account details are as follows:</p><p>Your role: ${roles}${departmentLine}</p><p>To get started, sign in to the system and follow the instructions to create your PIN.</p>${button(baseUrl(), "Sign In to GMC Site Access")}<p>If you experience any difficulty accessing your account, please contact your System Administrator.</p>`,
  };
}

export function pinResetTemplate(opts: {
  recipientName: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: subject("PIN Reset Notification"),
    html: `<p>Hi ${recipientName},</p><p>Your GMC Site Access PIN has been reset by the System Administrator. You will be prompted to create a new PIN the next time you sign in.</p>${button(baseUrl(), "Sign In to GMC Site Access")}<p>If you did not expect this change, please contact your System Administrator promptly.</p>`,
  };
}

export function departmentInvitationTemplate(opts: {
  token: string;
}): MessageTemplate {
  const link = `${baseUrl()}/register?token=${encodeURIComponent(opts.token)}`;
  return {
    subject: subject("Invitation to Register for a Site Visit"),
    html: `${HELLO}<p>Ghana Manganese Company (GMC) has invited you to register for a site visit.</p><p>Please use the link below to complete your registration.</p>${button(link, "Complete Your Registration")}<p>For information about how your personal information is collected and used, please review our <a href="${baseUrl()}/privacy-policy">Privacy Policy</a>.</p><p>If you were not expecting this invitation, you may disregard this email.</p>`,
  };
}

export function registrationRejectedTemplate(opts: {
  department: string;
  reason: string;
}): MessageTemplate {
  const department = escapeHtml(opts.department);
  const reason = escapeHtml(opts.reason).replace(/\r?\n/g, "<br>");

  return {
    subject: subject("Registration Not Approved"),
    html: `${HELLO}<p>Your site-access registration for Ghana Manganese Company (GMC) has been declined by the ${department} department.</p><p>Reason provided: ${reason}</p><p>Please contact the department that invited you if you need further information. A new invitation is required to submit another registration.</p>`,
  };
}

export function registrationSubmittedTemplate(opts: {
  visitorName?: string;
  companyName?: string;
  // The Department Head is mailed on submission, to approve or reject it;
  // Reception only once the Head has approved it.
  audience: "DepartmentHead" | "Receptionist";
}): MessageTemplate {
  const visitorName = opts.visitorName ?? "A visitor";
  const visitor = escapeHtml(visitorName);

  if (opts.audience === "DepartmentHead") {
    return {
      subject: subject(`Registration Approval Required - ${visitorName}`),
      html: `${HELLO}<p>${visitor} has submitted their registration form for site access at Ghana Manganese Company (GMC).</p><p>Please review the submission on the Site Access dashboard and approve or reject it before it proceeds to Reception.</p>${button(`${baseUrl()}/dashboard/department`, "Review Registration")}`,
    };
  }

  const company = opts.companyName
    ? ` from ${escapeHtml(opts.companyName)}`
    : "";
  return {
    subject: subject("New Visitor Registration"),
    html: `${HELLO}<p>A new site-access registration has been submitted by ${visitor}${company}.</p><p>Please access the Site Access dashboard to review the registration and proceed with the necessary processing.</p>${button(`${baseUrl()}/dashboard/reception`, "Go To Dashboard")}`,
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

function hospitalReviewLink(engagementId: string, clearanceId: string): string {
  return `${baseUrl()}/dashboard/hospital/${engagementId}?review=${clearanceId}`;
}

// Who hears about a medical outcome besides Hospital itself. Each gets a link
// it can open: Reception the record, the HOD its department dashboard (it
// cannot open a Reception record), Training / Security their own queue (the
// record may not be at their stage), HSE the Site Access Records overview.
export type MedicalAudience =
  | "Receptionist"
  | "DepartmentHead"
  | "TrainingStaff"
  | "SecurityStaff"
  | "HSE";

function medicalAudienceLink(
  audience: MedicalAudience,
  engagementId: string,
): string {
  switch (audience) {
    case "Receptionist":
      return engagementLink(engagementId);
    case "DepartmentHead":
      return `${baseUrl()}/dashboard/department`;
    case "TrainingStaff":
      return `${baseUrl()}/dashboard/training`;
    case "SecurityStaff":
      return `${baseUrl()}/dashboard/security`;
    case "HSE":
      return `${baseUrl()}/dashboard/overview`;
  }
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
    subject: subject(`Management Approval Required - ${opts.personName}`),
    html: `${HELLO}<p>Reception has submitted ${personName}'s site-access application for your review and approval.</p><p>Please review the application details on the Site Access dashboard and record your decision.</p>${button(approvalsEngagementLink(opts.engagementId), "Review Application")}`,
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
    subject: subject(`Induction Required - ${opts.personName}`),
    html: `${HELLO}<p>${personName} is now due for the required induction.</p><p>Please arrange the induction as applicable and update the induction status on the application once it has been completed.</p>${button(trainingEngagementLink(opts.engagementId), "Record Induction Status")}`,
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
    subject: subject(`Medical Assessment Required - ${opts.personName}`),
    html: `${HELLO}<p>Management has approved ${personName}'s site-access application, and the individual is now due for a medical assessment.</p><p>Please carry out the required assessment and update the medical status on the application once the assessment has been completed.</p>${button(hospitalEngagementLink(opts.engagementId), "Record Medical Status")}`,
  };
}

// Reception can open the application; the Department Head cannot open a
// Reception record, so theirs goes to their dashboard, where the
// notification sits.
export function stakeholderApprovalRejectedTemplate(opts: {
  personName: string;
  engagementId: string;
  rejectedBy: string;
  approverRole: string;
  reason: string;
  audience: "Receptionist" | "DepartmentHead";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const rejectedBy = escapeHtml(opts.rejectedBy);
  const approverRole = escapeHtml(roleLabel(opts.approverRole));
  const reason = escapeHtml(opts.reason);
  const link =
    opts.audience === "Receptionist"
      ? engagementLink(opts.engagementId)
      : `${baseUrl()}/dashboard/department`;

  return {
    subject: subject(`Application Not Approved - ${opts.personName}`),
    html: `${HELLO}<p>The site-access application for ${personName} has been declined by ${rejectedBy}, ${approverRole}.</p><p>Reason provided: ${reason}</p><p>Please review the application and the decision details on the Site Access dashboard.</p>${button(link, "View Application")}`,
  };
}

export function delegatedApprovalRequestedTemplate(opts: {
  personName: string;
  receptionistName: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const receptionistName = escapeHtml(opts.receptionistName);
  return {
    subject: subject(`Delegated Approval Request - ${opts.personName}`),
    html: `${HELLO}<p>${receptionistName} is requesting a delegated approval for ${personName}'s site access application.</p>${button(`${baseUrl()}/dashboard/system-admin/delegations`, "Review request")}`,
  };
}

export function delegatedApprovalGrantedTemplate(opts: {
  recipientName: string;
  engagementId: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: subject("you can now approve this application"),
    html: `<p>Hi ${recipientName},</p><p>Your request for delegated approval has been granted. You are now authorised to approve the specified engagement on a one-time basis through the GMC Site Access System.</p><p>Please use the link below to complete the approval process.</p>${button(engagementLink(opts.engagementId), "Complete Approval")}`,
  };
}

export function hospitalClearedTemplate(opts: {
  personName: string;
  engagementId: string;
  nextRole?: "TrainingStaff" | "SecurityStaff";
}): MessageTemplate {
  if (opts.nextRole === "SecurityStaff") {
    const personName = escapeHtml(opts.personName);

    return {
      subject: subject(`Medical Clearance Completed - ${opts.personName}`),
      html: `${HELLO}<p>${personName} has completed medical clearance and is ready for Security processing.</p><p>Please review the individual's records and complete the necessary actions.</p>${button(securityEngagementLink(opts.engagementId), "Review Records")}`,
    };
  }

  return dueForInductionTemplate(opts);
}

export function inductionCompletedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);

  return {
    subject: subject(`Induction Completed - ${opts.personName}`),
    html: `${HELLO}<p>${personName} has successfully completed the required induction and is ready for biometric registration and access-card issuance, as applicable.</p><p>Please review the individual's records and complete the necessary actions.</p>${button(securityEngagementLink(opts.engagementId), "Review Records")}`,
  };
}

// Reception's wording, also sent to the record's Department Head with a link
// to their own dashboard.
export function hospitalUnfitTemplate(opts: {
  personName: string;
  engagementId: string;
  audience?: "Receptionist" | "DepartmentHead";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const link = medicalAudienceLink(
    opts.audience ?? "Receptionist",
    opts.engagementId,
  );
  return {
    subject: subject(`Medical Assessment Update - ${opts.personName}`),
    html: `${HELLO}<p>The medical assessment for ${personName} has been recorded as Unfit. The application is currently pending re-evaluation.</p><p>Please review the application for the latest status and any further action required.</p>${button(link, "View Application Records")}`,
  };
}

// A review, not a clearance: the record has not been moved back to Hospital,
// so this must not say it is "pending re-evaluation" like the Unfit template.
// Unfit asks the reader to act; Fit and Fit with Conditions are for their
// information.
export function hospitalReviewTemplate(opts: {
  personName: string;
  engagementId: string;
  outcomeLabel: string;
  unfit: boolean;
  audience: MedicalAudience;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const outcome = escapeHtml(opts.outcomeLabel);
  const next = opts.unfit
    ? "<p>Please review the application and decide on any further action required.</p>"
    : "<p>This notification is for your information.</p>";

  return {
    subject: subject(`Medical Review Update - ${opts.personName}`),
    html: `${HELLO}<p>A follow-up medical review for ${personName} has been recorded as ${outcome}. Their workflow stage has not been changed.</p>${next}${button(medicalAudienceLink(opts.audience, opts.engagementId), "View Application Records")}`,
  };
}

// From the daily review-reminder job: a day ahead, then on the day. Hospital's
// links straight to the review form for that clearance; everyone else is told
// for information, with a link to a dashboard they can open.
export function hospitalReviewReminderTemplate(opts: {
  personName: string;
  engagementId: string;
  clearanceId: string;
  /** Already formatted for display. */
  reviewDate: string;
  dueToday: boolean;
  audience: "HospitalStaff" | MedicalAudience;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reviewDate = escapeHtml(opts.reviewDate);
  const when = opts.dueToday ? "is due today" : "is due tomorrow";
  const reviewSubject = subject(
    `Medical Review ${opts.dueToday ? "Due Today" : "Due Tomorrow"} - ${opts.personName}`,
  );
  const due = `<p>The follow-up medical review for ${personName}, who was cleared Fit with Conditions, ${when} (${reviewDate}).</p>`;

  if (opts.audience === "HospitalStaff") {
    return {
      subject: reviewSubject,
      html: `${HELLO}${due}<p>Please carry out the review and record the outcome.</p>${button(hospitalReviewLink(opts.engagementId, opts.clearanceId), "Record Review")}`,
    };
  }

  return {
    subject: reviewSubject,
    html: `${HELLO}${due}<p>Hospital will record the outcome. This notification is for your information.</p>${button(medicalAudienceLink(opts.audience, opts.engagementId), "Go To Dashboard")}`,
  };
}

export function hospitalFitWithConditionsTemplate(opts: {
  personName: string;
  engagementId: string;
  nextRole?: "TrainingStaff" | "SecurityStaff";
  audience?: "Receptionist" | "DepartmentHead";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);

  const destination =
    opts.nextRole === "SecurityStaff"
      ? "ready for Security processing"
      : "now due for induction";

  return {
    subject: subject(`Medical Assessment Update - ${opts.personName}`),
    html: `${HELLO}<p>The medical assessment for ${personName} has been recorded as Fit with Conditions. The individual is ${destination}.</p><p>Please review the application and take any necessary follow-up action.</p>${button(medicalAudienceLink(opts.audience ?? "Receptionist", opts.engagementId), "View Hospital Record")}`,
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
    subject: subject(`Access Activated - ${opts.personName}`),
    html: `${HELLO}<p>This is to confirm that site access has been successfully activated for ${personName}.</p><p>The access details are as follows:</p><p>Access Card Number: ${card}<br>Valid Until: ${expiry}</p><p>Please refer to the application for the complete access record.</p>${button(engagementLink(opts.engagementId), "View Application Records")}`,
  };
}

// HSE follows every record without acting on any, so its emails say what
// happened and link to the Site Access Records overview — HSE has no record
// pages to open. No health or card details: those stay on the layers' screens.
export function hseRecordUpdateTemplate(opts: {
  personName: string;
  event:
    | "MedicalClearance"
    | "MedicalReview"
    | "InductionCompleted"
    | "AccessActivated";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const dashboard = button(
    `${baseUrl()}/dashboard/overview`,
    "Go To Dashboard",
  );
  const viewStatus =
    "<p>Please access the Site Access dashboard to view the record's current status.</p>";

  if (opts.event === "MedicalClearance") {
    return {
      subject: subject(`Medical Clearance Recorded - ${opts.personName}`),
      html: `${HELLO}<p>Hospital has recorded the medical clearance for ${personName}.</p>${viewStatus}${dashboard}`,
    };
  }

  if (opts.event === "MedicalReview") {
    return {
      subject: subject(`Medical Review Recorded - ${opts.personName}`),
      html: `${HELLO}<p>Hospital has recorded a follow-up medical review for ${personName}.</p>${viewStatus}${dashboard}`,
    };
  }

  if (opts.event === "InductionCompleted") {
    return {
      subject: subject(`Induction Completed - ${opts.personName}`),
      html: `${HELLO}<p>Training School has recorded ${personName}'s induction as completed, and the record has moved to Security for access activation.</p>${viewStatus}${dashboard}`,
    };
  }

  return {
    subject: subject(`Site Access Activated - ${opts.personName}`),
    html: `${HELLO}<p>Security has activated site access for ${personName}.</p>${viewStatus}${dashboard}`,
  };
}

// A stakeholder moved the departure date. Security is asked to update the
// card; everyone else is told for information.
export function stayExtendedTemplate(opts: {
  personName: string;
  engagementId: string;
  previousDepartureDate: string;
  newDepartureDate: string;
  extendedBy: string;
  extendedByRole: string;
  audience: "SecurityStaff" | "Receptionist" | "DepartmentHead" | "HSE";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const extendedBy = escapeHtml(opts.extendedBy);
  const role = escapeHtml(roleLabel(opts.extendedByRole));
  const from = escapeHtml(opts.previousDepartureDate);
  const to = escapeHtml(opts.newDepartureDate);
  const next =
    opts.audience === "SecurityStaff"
      ? "<p>Please update the access card validity as required.</p>"
      : "<p>This notification is for your information.</p>";
  const link =
    opts.audience === "SecurityStaff"
      ? securityEngagementLink(opts.engagementId)
      : medicalAudienceLink(opts.audience, opts.engagementId);

  return {
    subject: subject(`Stay Extended - ${opts.personName}`),
    html: `${HELLO}<p>${personName}'s stay has been extended by ${extendedBy}, ${role}. The departure date has moved from ${from} to ${to}.</p>${next}${button(link, "View Application Records")}`,
  };
}

// Security re-dated an issued card. Reception and HSE are told, as they are
// when access is first activated.
export function cardExpiryUpdatedTemplate(opts: {
  personName: string;
  engagementId: string;
  previousExpiry: string;
  newExpiry: string;
  audience: "Receptionist" | "HSE";
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const from = escapeHtml(opts.previousExpiry);
  const to = escapeHtml(opts.newExpiry);

  return {
    subject: subject(`Access Card Updated - ${opts.personName}`),
    html: `${HELLO}<p>Security has updated the access card for ${personName}. The card is now valid until ${to} (previously ${from}).</p><p>This notification is for your information.</p>${button(medicalAudienceLink(opts.audience, opts.engagementId), "View Application Records")}`,
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
    // Exactly as agreed: this subject has no "GMC Site Access:" prefix.
    subject: `Revocation Request - ${opts.personName}`,
    html: `${HELLO}<p>Reception has submitted a request to revoke ${personName}'s site access.</p><p>Reason for revocation: ${reason}</p><p>Please review the request and proceed with the revocation through the GMC Site Access Management System.</p>${button(`${baseUrl()}/dashboard/security?view=revocations`, "Review Revocation Request")}`,
  };
}

// To Reception, once Security has switched the access off.
export function accessRevokedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: subject(`Access Revoked - ${opts.personName}`),
    html: `${HELLO}<p>This is to confirm that ${personName}'s site access has been successfully revoked by Security.</p><p>Please refer to the application for the updated access status and related records.</p>${button(engagementLink(opts.engagementId), "Open Application")}`,
  };
}
