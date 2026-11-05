import {
  type AccessState,
  getEffectiveAccessState,
  type WorkflowState,
} from "@/lib/domain/types";

// What a record's status column shows. While a record is moving through the
// workflow that is its stage; once it is Completed with a card issued, the
// stage stops saying anything useful and the card's state is what matters —
// Active, Expired, Revocation Requested, Revoked. A Familiarization Visit
// completes with no card at all (access stays Pending), so it still reads
// Completed.
export type RecordStatus =
  | { kind: "stage"; state: WorkflowState }
  | { kind: "access"; state: AccessState };

export function recordStatus(record: {
  workflowState: WorkflowState;
  accessState: AccessState;
  // The current card's expiry, so a lapsed card reads Expired even before
  // the stored state has caught up.
  cardExpiry: string | undefined;
}): RecordStatus {
  if (
    record.workflowState === "Completed" &&
    record.accessState !== "Pending"
  ) {
    return {
      kind: "access",
      state: getEffectiveAccessState(record.accessState, record.cardExpiry),
    };
  }

  return { kind: "stage", state: record.workflowState };
}
