export function csvRow(values: readonly string[]): string {
  return `${values
    .map((value) => {
      // Quoting alone does not prevent spreadsheets from evaluating formulas.
      const safe = /^[\t\r\n]|^\s*[=+@-]/u.test(value) ? `'${value}` : value;

      return `"${safe.replaceAll('"', '""')}"`;
    })
    .join(",")}\r\n`;
}
