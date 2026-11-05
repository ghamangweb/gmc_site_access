// The dropdown filters beside each queue's search box. Values live in the URL
// like the search term (see pagination.ts), so each page reads them from its
// searchParams and narrows them here before they reach a query.
//
// Filters work on fixed-value fields only. Free text stays with the search
// box, which is name / passport only: almost everything else is encrypted.

import {
  ACCESS_PURPOSE_LABELS,
  ACCESS_STATE_LABELS,
  type AccessPurpose,
  type AccessState,
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";

export type QueueFilterOption = { value: string; label: string };

/** Engagement-level filters several queues share. */
export type EngagementFilters = {
  workflowState?: WorkflowState;
  /** Matched against the effective state, so a lapsed card reads Expired. */
  accessState?: AccessState;
  accessPurpose?: AccessPurpose;
};

export const REVIEW_DUE_VALUES = ["overdue", "today", "upcoming"] as const;

export type ReviewDue = (typeof REVIEW_DUE_VALUES)[number];

export const REVIEW_DUE_LABELS: Record<ReviewDue, string> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
};

// Anything not in the allowed list reads as "no filter" rather than an empty
// table, the same way Reception treats a typo'd `?type=`.
export function parseFilter<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// For filters on an id column (e.g. Cleared By): a malformed id would make
// Postgres reject the query outright, so it reads as "no filter" instead.
export function parseIdFilter(value: string | undefined): string | undefined {
  return value && UUID_PATTERN.test(value) ? value : undefined;
}

function optionsFrom<T extends string>(
  labels: Record<T, string>,
  values?: readonly T[],
): QueueFilterOption[] {
  return (values ?? (Object.keys(labels) as T[])).map((value) => ({
    value,
    label: labels[value],
  }));
}

export const WORKFLOW_STATES = Object.keys(
  WORKFLOW_STATE_LABELS,
) as WorkflowState[];
export const ACCESS_STATES = Object.keys(ACCESS_STATE_LABELS) as AccessState[];
export const ACCESS_PURPOSES = Object.keys(
  ACCESS_PURPOSE_LABELS,
) as AccessPurpose[];
export const HOSPITAL_CLEARANCE_STATUSES = Object.keys(
  HOSPITAL_CLEARANCE_LABELS,
) as HospitalClearanceStatus[];

export function workflowStateOptions(
  values?: readonly WorkflowState[],
): QueueFilterOption[] {
  return optionsFrom(WORKFLOW_STATE_LABELS, values);
}

export function accessStateOptions(
  values?: readonly AccessState[],
): QueueFilterOption[] {
  return optionsFrom(ACCESS_STATE_LABELS, values);
}

/** Pass the purposes a queue actually holds, e.g. a layer's list. */
export function accessPurposeOptions(
  values?: readonly AccessPurpose[],
): QueueFilterOption[] {
  return optionsFrom(ACCESS_PURPOSE_LABELS, values);
}

export function clearanceStatusOptions(): QueueFilterOption[] {
  return optionsFrom(HOSPITAL_CLEARANCE_LABELS);
}

export function reviewDueOptions(): QueueFilterOption[] {
  return optionsFrom(REVIEW_DUE_LABELS);
}
