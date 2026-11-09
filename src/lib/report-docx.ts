import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type {
  ReportDocument,
  ReportStatisticGroup,
} from "@/lib/domain/report-document";
import {
  REPORT_DOCUMENT_PALETTE as PALETTE,
  REPORT_FOOTER,
  REPORT_ORGANISATION,
  type ReportLogo,
} from "@/lib/report-document-style";

const FONT = "Arial";

// docx sizes are half-points.
const BODY = 21;

const SMALL = 17;

function text(
  value: string,
  options: { bold?: boolean; size?: number; color?: string } = {},
): TextRun {
  return new TextRun({
    text: value,
    font: FONT,
    size: options.size ?? BODY,
    bold: options.bold,
    color: options.color ?? PALETTE.foreground,
  });
}

function body(value: string): Paragraph {
  return new Paragraph({
    children: [text(value)],
    spacing: { after: 120, line: 300 },
  });
}

function heading(value: string): Paragraph {
  return new Paragraph({
    children: [text(value, { bold: true, size: 26, color: PALETTE.primary })],
    spacing: { before: 320, after: 120 },
    keepNext: true,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: PALETTE.border,
        space: 4,
      },
    },
  });
}

const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: PALETTE.border,
};

// A4 width less the page margins, in twentieths of a point.
const CONTENT_WIDTH = 11906 - 2 * 1100;

const NUMBER_COLUMN = 1700;

function cell(
  value: string,
  width: number,
  options: {
    header?: boolean;
    shaded?: boolean;
    right?: boolean;
    keepNext?: boolean;
  },
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: options.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        keepNext: options.keepNext,
        children: [
          text(value, {
            size: 19,
            bold: options.header,
            color: options.header
              ? PALETTE.primaryForeground
              : PALETTE.foreground,
          }),
        ],
      }),
    ],
    shading: options.header
      ? { type: ShadingType.CLEAR, color: "auto", fill: PALETTE.primary }
      : options.shaded
        ? { type: ShadingType.CLEAR, color: "auto", fill: PALETTE.muted }
        : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
    },
  });
}

function statisticsTable(group: ReportStatisticGroup): Table {
  const headers = [
    "Metric",
    "This period",
    ...(group.showShare ? ["Share"] : []),
    ...(group.showPrevious ? ["Previous period"] : []),
  ];

  const widths = [
    CONTENT_WIDTH - (headers.length - 1) * NUMBER_COLUMN,
    ...headers.slice(1).map(() => NUMBER_COLUMN),
  ];

  const rows = group.rows.map((row) => [
    row.name,
    row.value,
    ...(group.showShare ? [row.share ?? "—"] : []),
    ...(group.showPrevious ? [row.previous ?? "—"] : []),
  ]);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((header, column) =>
          cell(header, widths[column], {
            header: true,
            right: column > 0,
            keepNext: true,
          }),
        ),
      }),
      ...rows.map(
        (values, index) =>
          new TableRow({
            cantSplit: true,
            children: values.map((value, column) =>
              cell(value, widths[column], {
                shaded: index % 2 === 1,
                right: column > 0,
                // Keeps short tables on one page, like the PDF.
                keepNext: index < rows.length - 1 && rows.length <= 12,
              }),
            ),
          }),
      ),
    ],
  });
}

function statistics(content: ReportDocument): (Paragraph | Table)[] {
  return [
    heading("Recorded statistics"),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        text(`${content.totalLabel}: `),
        text(content.total, { bold: true }),
        ...(content.previousTotal !== null
          ? [
              text(
                ` (previous period, ${content.previousPeriod}: ${content.previousTotal})`,
                { color: PALETTE.mutedForeground },
              ),
            ]
          : []),
      ],
    }),
    ...content.groups.flatMap((group) => [
      new Paragraph({
        keepNext: true,
        spacing: { before: 200, after: 40 },
        children: [
          text(group.title.toUpperCase(), { bold: true, size: SMALL }),
        ],
      }),
      new Paragraph({
        keepNext: true,
        spacing: { after: 100 },
        children: [
          text(group.note, { size: SMALL, color: PALETTE.mutedForeground }),
        ],
      }),
      statisticsTable(group),
    ]),
  ];
}

function header(content: ReportDocument, logo: ReportLogo | null): Paragraph[] {
  return [
    ...(logo
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new ImageRun({
                type: "png",
                data: logo.png,
                transformation: {
                  width: 150,
                  height: Math.round((logo.height / logo.width) * 150),
                },
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      children: [
        text(REPORT_ORGANISATION.toUpperCase(), {
          bold: true,
          size: SMALL,
          color: PALETTE.mutedForeground,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [text(content.title, { bold: true, size: 40 })],
    }),
    new Paragraph({
      children: [text(`Reporting period: ${content.period}`)],
    }),
    new Paragraph({
      children: [
        text(`Generated ${content.generated}`, {
          size: SMALL,
          color: PALETTE.mutedForeground,
        }),
      ],
    }),
    new Paragraph({
      children: [
        text(content.scope, { size: SMALL, color: PALETTE.mutedForeground }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: PALETTE.primary,
          space: 8,
        },
      },
      children: [],
    }),
  ];
}

export async function buildReportDocx(
  content: ReportDocument,
  logo: ReportLogo | null,
): Promise<Blob> {
  const document = new Document({
    creator: REPORT_ORGANISATION,
    title: content.title,
    description: `${content.title}, ${content.period}`,
    numbering: {
      config: [
        {
          reference: "actions",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 400 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    font: FONT,
                    size: 16,
                    color: PALETTE.mutedForeground,
                    children: [
                      `${REPORT_FOOTER} · Page `,
                      PageNumber.CURRENT,
                      " of ",
                      PageNumber.TOTAL_PAGES,
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...header(content, logo),
          heading("Executive summary"),
          body(content.executiveSummary),
          ...statistics(content),
          ...(content.findings.length > 0
            ? [
                heading("Key findings"),
                ...content.findings.map(
                  (finding) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 80, line: 300 },
                      children: [text(finding)],
                    }),
                ),
              ]
            : []),
          ...(content.workloadAnalysis
            ? [
                heading("Workload and outstanding work"),
                body(content.workloadAnalysis),
              ]
            : []),
          ...(content.recommendedActions.length > 0
            ? [
                heading("Recommended actions"),
                ...content.recommendedActions.flatMap((recommendation) => [
                  new Paragraph({
                    numbering: { reference: "actions", level: 0 },
                    keepNext: true,
                    spacing: { after: 40, line: 300 },
                    children: [text(recommendation.action, { bold: true })],
                  }),
                  new Paragraph({
                    indent: { left: 400 },
                    keepNext: true,
                    spacing: { after: 40, line: 300 },
                    children: [text(recommendation.observation)],
                  }),
                  new Paragraph({
                    indent: { left: 400 },
                    spacing: { after: 160 },
                    children: [
                      text(
                        `Responsible: ${recommendation.responsibleWorkflow}`,
                        {
                          size: SMALL,
                          color: PALETTE.mutedForeground,
                        },
                      ),
                    ],
                  }),
                ]),
              ]
            : []),
        ],
      },
    ],
  });

  return Packer.toBlob(document);
}
