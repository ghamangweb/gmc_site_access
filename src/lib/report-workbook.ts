import ExcelJS from "exceljs";

import type { ReportSheet } from "@/lib/domain/report-sheets";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_COLUMN_WIDTH = 60;
// Excel refuses longer sheet names.
const MAX_SHEET_NAME = 31;

// One sheet per entry, in order. Cells are written as plain strings, which
// exceljs stores as text — a value starting with "=" stays text and is never
// evaluated as a formula, unlike in a CSV.
export async function buildReportWorkbook(
  sheets: readonly ReportSheet[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(
      sheet.name.slice(0, MAX_SHEET_NAME),
      // The header row stays in view while scrolling.
      { views: [{ state: "frozen", ySplit: 1 }] },
    );

    worksheet.columns = sheet.columns.map((header, index) => ({
      header,
      key: String(index),
      width: Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(
          header.length,
          ...sheet.rows.map((row) => (row[index] ?? "").length),
        ) + 2,
      ),
    }));

    worksheet.getRow(1).font = { bold: true };

    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
