// pdfmake 0.3 ships no type declarations; only the browser API we use is declared.
declare module "pdfmake/build/pdfmake" {
  import type { PdfFontContainer } from "pdfmake/build/standard-fonts/Helvetica";

  type PdfTextStyle = {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    characterSpacing?: number;
    margin?: readonly [number, number, number, number];
  };

  /** The document-definition keys the report uses. */
  export type PdfDocumentDefinition = {
    pageSize: "A4";
    pageMargins: readonly [number, number, number, number];
    info: { title: string; author: string; subject: string };
    defaultStyle: PdfTextStyle & { font: string; lineHeight: number };
    styles: Record<
      | "organisation"
      | "title"
      | "muted"
      | "heading"
      | "groupTitle"
      | "tableHeader",
      PdfTextStyle
    >;
    footer: (page: number, pages: number) => object;
    content: readonly object[];
  };

  type PdfMake = {
    addFontContainer(container: PdfFontContainer): void;
    createPdf(definition: PdfDocumentDefinition): {
      getBlob(): Promise<Blob>;
    };
  };

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module "pdfmake/build/standard-fonts/Helvetica" {
  export type PdfFontContainer = {
    fonts: { [family: string]: { [variant: string]: string } };
  };

  const container: PdfFontContainer;
  export default container;
}
