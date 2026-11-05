import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { buildReportWorkbook } from "./report-workbook";

// SAFETY: exceljs types `load` against an older Node Buffer type; the bytes
// are the same Buffer `buildReportWorkbook` returned.
async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<ExcelJS.Xlsx["load"]>[0],
  );
  return workbook;
}

test("writes one sheet per entry with a bold, frozen header row", async () => {
  const buffer = await buildReportWorkbook([
    { name: "All Records", columns: ["Name", "Card"], rows: [["Ama", "C-1"]] },
    { name: "Revocations", columns: ["Name"], rows: [] },
  ]);

  const workbook = await loadWorkbook(buffer);

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["All Records", "Revocations"],
  );

  const sheet = workbook.getWorksheet("All Records");
  // exceljs row values are 1-based, so index 0 is an empty slot.
  assert.deepEqual((sheet?.getRow(1).values as unknown[]).slice(1), [
    "Name",
    "Card",
  ]);
  assert.deepEqual((sheet?.getRow(2).values as unknown[]).slice(1), [
    "Ama",
    "C-1",
  ]);
  assert.equal(sheet?.getRow(1).font?.bold, true);
  assert.equal(sheet?.views[0]?.state, "frozen");
});

test("a value that looks like a formula stays plain text", async () => {
  const buffer = await buildReportWorkbook([
    { name: "All Records", columns: ["Name"], rows: [['=HYPERLINK("x")']] },
  ]);

  const workbook = await loadWorkbook(buffer);
  const cell = workbook.getWorksheet("All Records")?.getCell("A2");

  assert.equal(cell?.type, ExcelJS.ValueType.String);
  assert.equal(cell?.value, '=HYPERLINK("x")');
});

test("sheet names are cut to Excel's 31-character limit", async () => {
  const buffer = await buildReportWorkbook([
    {
      name: "A sheet name far longer than Excel allows",
      columns: ["Name"],
      rows: [],
    },
  ]);

  const workbook = await loadWorkbook(buffer);

  assert.equal(workbook.worksheets[0]?.name.length, 31);
});
