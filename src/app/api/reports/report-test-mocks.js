import { mock } from "bun:test";

// Bun shares module mocks across files; report routes and workflow actions use one fixture.
export const requireWriteAccess = mock(async () => ({}));
export const requirePinConfirmed = mock();
export const exportTrainingCsv = mock(async () => '\uFEFF"Name"\r\n');
export const exportSecurityCsv = mock(async () => '\uFEFF"Name"\r\n');
export const applyStakeholderExemption = mock();
export const sendEmail = mock(async () => true);
export const revalidatePath = mock(() => undefined);

mock.module("@/lib/auth/guards", () => ({
  requireWriteAccess,
  requirePinConfirmed,
}));
mock.module("@/lib/services/workflow-service", () => ({
  exportTrainingCsv,
  exportSecurityCsv,
  applyStakeholderExemption,
  ...Object.fromEntries(
    [
      "activateAccess",
      "applyStakeholderApproval",
      "cancelEngagement",
      "createEngagement",
      "extendStay",
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
