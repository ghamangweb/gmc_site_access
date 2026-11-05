import { mock } from "bun:test";

// Bun shares module mocks across files; report routes and workflow actions use one fixture.
export const requireWriteAccess = mock(async () => ({}));
export const requirePinConfirmed = mock();
export const exportTrainingRows = mock(async () => []);
export const exportSecurityRows = mock(async () => []);
export const exportReceptionRows = mock(async () => []);
export const exportHospitalRows = mock(async () => []);
export const exportApprovalsRows = mock(async () => []);
export const countEngagementsAwaitingApproval = mock(async () => 0);
export const countStakeholderApprovalsBy = mock(async () => 0);
export const applyStakeholderExemption = mock();
export const sendEmail = mock(async () => true);
export const revalidatePath = mock(() => undefined);

// The sheet names of a downloaded report workbook, in order.
export async function workbookSheetNames(bytes) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  return workbook.worksheets.map((sheet) => sheet.name);
}

mock.module("@/lib/auth/guards", () => ({
  requireWriteAccess,
  requirePinConfirmed,
}));
mock.module("@/lib/services/workflow-service", () => ({
  exportTrainingRows,
  exportSecurityRows,
  exportReceptionRows,
  exportHospitalRows,
  exportApprovalsRows,
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  applyStakeholderExemption,
  ...Object.fromEntries(
    [
      "activateAccess",
      "applyStakeholderApproval",
      "cancelEngagement",
      "createEngagement",
      "extendStay",
      "updateCardExpiry",
      "getActiveEngagementForPassport",
      "getEngagementDetail",
      "recordHospitalClearance",
      "recordHospitalReview",
      "recordInductionCompletion",
      "rejectStakeholderApproval",
      "requestDelegatedApproval",
      "requestTermination",
      "revokeAccess",
      "submitForStakeholderApproval",
      "updateReceptionData",
    ].map((name) => [
      name,
      mock(async () => {
        throw new Error(`Unexpected workflow call: ${name}`);
      }),
    ]),
  ),
}));
mock.module("next/cache", () => ({ revalidatePath }));
mock.module("@/lib/email/send", () => ({ sendEmail }));
mock.module("@/lib/services/person-registry-service", () => ({
  findPersonByPassport: mock(async () => {
    throw new Error("Unexpected passport lookup");
  }),
}));
mock.module("@/lib/services/registration-service", () =>
  Object.fromEntries(
    [
      "buildEngagementInput",
      "getRegistrationRequest",
      "linkRequestToEngagement",
    ].map((name) => [
      name,
      mock(async () => {
        throw new Error(`Unexpected registration call: ${name}`);
      }),
    ]),
  ),
);
