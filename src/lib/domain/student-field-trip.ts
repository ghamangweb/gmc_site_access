import { z } from "zod";

export const STUDENT_FIELD_TRIP = "Student Field Trip";

export const LOCAL_EMPLOYMENT_STATUSES = [
  "Visitor (Local)",
  "Third Party Contractor",
  STUDENT_FIELD_TRIP,
];

export const studentFieldTripSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(1, "Enter the school name")
    .max(200, "School name must be 200 characters or fewer"),
  studentCount: z
    .number({ error: "Enter a positive whole number of students" })
    .int("Enter a positive whole number of students")
    .min(1, "Enter a positive whole number of students")
    .max(2147483647, "Enter a positive whole number of students"),
});

export const STUDENT_LIST_ACCEPT = ".csv,.xls,.xlsx";

export const STUDENT_LIST_MAX_BYTES = 16 * 1024 * 1024;

export function getStudentListFileError(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (
    !/\.(csv|xlsx?)$/i.test(file.name) ||
    ![
      "",
      "text/csv",
      "text/plain",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ].includes(file.type)
  ) {
    return "Choose a CSV or Excel (.xls or .xlsx) student list";
  }

  if (file.size <= 0 || file.size > STUDENT_LIST_MAX_BYTES) {
    return "Choose a non-empty student list up to 16 MB";
  }

  return null;
}
