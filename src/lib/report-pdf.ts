import type { PdfDocumentDefinition } from "pdfmake/build/pdfmake";

import type {
  ReportDocument,
  ReportStatisticGroup,
} from "@/lib/domain/report-document";
import {
  REPORT_DOCUMENT_PALETTE,
  REPORT_FOOTER,
  REPORT_ORGANISATION,
  type ReportLogo,
} from "@/lib/report-document-style";

// Cell text options used by the statistics tables.
type CellStyle = { style?: "tableHeader"; color?: string };

const COLOR = {
  primary: `#${REPORT_DOCUMENT_PALETTE.primary}`,
  foreground: `#${REPORT_DOCUMENT_PALETTE.foreground}`,
  mutedForeground: `#${REPORT_DOCUMENT_PALETTE.mutedForeground}`,
  border: `#${REPORT_DOCUMENT_PALETTE.border}`,
  muted: `#${REPORT_DOCUMENT_PALETTE.muted}`,
  primaryForeground: `#${REPORT_DOCUMENT_PALETTE.primaryForeground}`,
};

const PAGE_WIDTH = 595.28 - 2 * 50;

function heading(value: string) {
  return [
    { text: value, style: "heading" },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: PAGE_WIDTH,
          y2: 0,
          lineWidth: 0.75,
          lineColor: COLOR.border,
        },
      ],
      margin: [0, 2, 0, 8],
    },
  ];
}

function statisticsTable(group: ReportStatisticGroup) {
  const right = (value: string, extra: CellStyle = {}) => ({
    text: value,
    alignment: "right",
    ...extra,
  });

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [
        "*",
        "auto",
        ...(group.showShare ? ["auto"] : []),
        ...(group.showPrevious ? ["auto"] : []),
      ],
      body: [
        [
          { text: "Metric", style: "tableHeader" },
          right("This period", { style: "tableHeader" }),
          ...(group.showShare
            ? [right("Share", { style: "tableHeader" })]
            : []),
          ...(group.showPrevious
            ? [right("Previous period", { style: "tableHeader" })]
            : []),
        ],
        ...group.rows.map((row) => [
          row.name,
          right(row.value),
          ...(group.showShare
            ? [right(row.share ?? "—", { color: COLOR.mutedForeground })]
            : []),
          ...(group.showPrevious
            ? [right(row.previous ?? "—", { color: COLOR.mutedForeground })]
            : []),
        ]),
      ],
    },
    layout: {
      fillColor: (row: number) =>
        row === 0 ? COLOR.primary : row % 2 === 0 ? COLOR.muted : null,
      hLineColor: () => COLOR.border,
      vLineColor: () => COLOR.border,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    fontSize: 9.5,
    margin: [0, 0, 0, 10],
  };
}

function definition(content: ReportDocument, logo: ReportLogo | null) {
  return {
    pageSize: "A4",
    pageMargins: [50, 50, 50, 56],
    info: {
      title: content.title,
      author: REPORT_ORGANISATION,
      subject: `${content.title}, ${content.period}`,
    },
    defaultStyle: {
      font: "Helvetica",
      fontSize: 10.5,
      lineHeight: 1.3,
      color: COLOR.foreground,
    },
    styles: {
      organisation: {
        fontSize: 8.5,
        bold: true,
        color: COLOR.mutedForeground,
        characterSpacing: 0.6,
      },
      title: { fontSize: 20, bold: true, margin: [0, 2, 0, 6] },
      muted: { fontSize: 8.5, color: COLOR.mutedForeground },
      heading: {
        fontSize: 13,
        bold: true,
        color: COLOR.primary,
        margin: [0, 16, 0, 0],
      },
      groupTitle: {
        fontSize: 8.5,
        bold: true,
        characterSpacing: 0.6,
        margin: [0, 8, 0, 1],
      },
      tableHeader: { bold: true, color: COLOR.primaryForeground },
    },
    footer: (page: number, pages: number) => ({
      text: `${REPORT_FOOTER} · Page ${page} of ${pages}`,
      alignment: "center",
      style: "muted",
      margin: [0, 20, 0, 0],
    }),
    content: [
      ...(logo
        ? [{ image: logo.jpegDataUrl, width: 110, margin: [0, 0, 0, 14] }]
        : []),
      { text: REPORT_ORGANISATION.toUpperCase(), style: "organisation" },
      { text: content.title, style: "title" },
      { text: `Reporting period: ${content.period}` },
      { text: `Generated ${content.generated}`, style: "muted" },
      { text: content.scope, style: "muted", margin: [0, 2, 0, 0] },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: PAGE_WIDTH,
            y2: 0,
            lineWidth: 1.5,
            lineColor: COLOR.primary,
          },
        ],
      },

      ...heading("Executive summary"),
      { text: content.executiveSummary },

      ...heading("Recorded statistics"),
      {
        text: [
          `${content.totalLabel}: `,
          { text: content.total, bold: true },
          ...(content.previousTotal !== null
            ? [
                {
                  text: ` (previous period, ${content.previousPeriod}: ${content.previousTotal})`,
                  color: COLOR.mutedForeground,
                },
              ]
            : []),
        ],
        margin: [0, 0, 0, 4],
      },
      ...content.groups.map((group) => ({
        // Keeps a group's title with its table across page breaks.
        unbreakable: group.rows.length <= 12,
        stack: [
          { text: group.title.toUpperCase(), style: "groupTitle" },
          { text: group.note, style: "muted", margin: [0, 0, 0, 4] },
          statisticsTable(group),
        ],
      })),

      ...(content.findings.length > 0
        ? [
            ...heading("Key findings"),
            { ul: content.findings, margin: [0, 0, 0, 0] },
          ]
        : []),

      ...(content.workloadAnalysis
        ? [
            ...heading("Workload and outstanding work"),
            { text: content.workloadAnalysis },
          ]
        : []),

      ...(content.recommendedActions.length > 0
        ? [
            ...heading("Recommended actions"),
            {
              ol: content.recommendedActions.map((recommendation) => ({
                stack: [
                  { text: recommendation.action, bold: true },
                  { text: recommendation.observation },
                  {
                    text: `Responsible: ${recommendation.responsibleWorkflow}`,
                    style: "muted",
                    margin: [0, 0, 0, 8],
                  },
                ],
              })),
            },
          ]
        : []),
    ],
  } satisfies PdfDocumentDefinition;
}

export async function buildReportPdf(
  content: ReportDocument,
  logo: ReportLogo | null,
): Promise<Blob> {
  const [{ default: pdfMake }, { default: helvetica }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/standard-fonts/Helvetica"),
  ]);

  // The built-in PDF Helvetica avoids shipping a font file with the bundle.
  pdfMake.addFontContainer(helvetica);

  return pdfMake.createPdf(definition(content, logo)).getBlob();
}
