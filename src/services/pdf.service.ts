import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { formatDateTimeBR } from "@/lib/date";

// ---------------------------------------------------------------------------
// Geração de PDF dos relatórios (pdf-lib + fontes padrão WinAnsi/Helvetica).
// As fontes padrão cobrem acentuação do português (á, ã, ç, é, í, ó, ú, â, ê...).
// ---------------------------------------------------------------------------

const MARGIN = 36;
const FONT_SIZE = 8;
const LINE_HEIGHT = 9.5;
const ROW_PADDING = 4;
const HEADER_HEIGHT = 17;
const FOOTER_SPACE = 34;
const INK = rgb(0.09, 0.11, 0.15);
const MUTED = rgb(0.42, 0.46, 0.52);
const LINE = rgb(0.86, 0.88, 0.91);
const HEADER_FILL = rgb(0.95, 0.96, 0.98);
const TOTAL_FILL = rgb(0.96, 0.97, 0.99);

export type PdfColumn<T> = {
  header: string;
  /** Largura relativa; as colunas são normalizadas para a largura da página. */
  width: number;
  align?: "left" | "right" | "center";
  value: (row: T) => string;
};

export type PdfSummaryItem = { label: string; value: string; strong?: boolean };

export type ReportPdfInput<T> = {
  company: string;
  title: string;
  subtitle?: string;
  period?: string;
  columns: Array<PdfColumn<T>>;
  rows: T[];
  summary?: PdfSummaryItem[];
  footerNote?: string;
  landscape?: boolean;
};

/**
 * Remove caracteres que a fonte WinAnsi não representa (emoji, símbolos
 * exóticos). Evita que um nome de produto derrube a geração do relatório.
 */
function sanitize(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(
      /[^\t\n\r\x20-\x7E\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/g,
      "?"
    );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      return;
    }
    // Palavra maior que a coluna: quebra caractere por caractere.
    let chunk = "";
    for (const char of word) {
      if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      pushWord(word);
    }
  }
  if (current) lines.push(current);
  return lines;
}

function ellipsize(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function drawAligned(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    align?: "left" | "right" | "center";
    color?: ReturnType<typeof rgb>;
  }
): void {
  const value = sanitize(text);
  const textWidth = options.font.widthOfTextAtSize(value, options.size);
  const align = options.align ?? "left";
  const x =
    align === "right"
      ? options.x + options.width - textWidth
      : align === "center"
        ? options.x + (options.width - textWidth) / 2
        : options.x;
  page.drawText(value, {
    x,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color ?? INK,
  });
}

export async function buildReportPdf<T>(input: ReportPdfInput<T>): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = input.landscape ? 841.89 : 595.28;
  const pageHeight = input.landscape ? 595.28 : 841.89;
  const contentWidth = pageWidth - MARGIN * 2;

  const totalWeight = input.columns.reduce((sum, column) => sum + Math.max(1, column.width), 0);
  const widths = input.columns.map((column) => (Math.max(1, column.width) / totalWeight) * contentWidth);

  const generatedAt = formatDateTimeBR(new Date());

  const drawPageHeader = (page: PDFPage, first: boolean): number => {
    let y = pageHeight - MARGIN;

    drawAligned(page, input.company, {
      x: MARGIN,
      y: y - 12,
      width: contentWidth * 0.7,
      font: bold,
      size: 13,
    });
    drawAligned(page, `Gerado em ${generatedAt}`, {
      x: MARGIN + contentWidth * 0.7,
      y: y - 11,
      width: contentWidth * 0.3,
      font,
      size: 8,
      align: "right",
      color: MUTED,
    });
    y -= 26;

    drawAligned(page, first ? input.title : `${input.title} (continuação)`, {
      x: MARGIN,
      y: y - 14,
      width: contentWidth,
      font: bold,
      size: 15,
    });
    y -= 24;

    const meta = [input.period, input.subtitle].filter(Boolean).join("  ·  ");
    if (meta) {
      drawAligned(page, meta, {
        x: MARGIN,
        y: y - 9,
        width: contentWidth,
        font,
        size: 9,
        color: MUTED,
      });
      y -= 16;
    }

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: pageWidth - MARGIN, y },
      thickness: 0.8,
      color: LINE,
    });
    return y - 10;
  };

  const drawTableHeader = (page: PDFPage, y: number): number => {
    page.drawRectangle({
      x: MARGIN,
      y: y - HEADER_HEIGHT,
      width: contentWidth,
      height: HEADER_HEIGHT,
      color: HEADER_FILL,
    });
    let x = MARGIN;
    input.columns.forEach((column, index) => {
      drawAligned(page, column.header, {
        x: x + 3,
        y: y - 12,
        width: widths[index] - 6,
        font: bold,
        size: FONT_SIZE,
        align: column.align,
      });
      x += widths[index];
    });
    return y - HEADER_HEIGHT;
  };

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = drawPageHeader(page, true);
  y = drawTableHeader(page, y);

  if (input.rows.length === 0) {
    drawAligned(page, "Nenhum registro encontrado para o período selecionado.", {
      x: MARGIN,
      y: y - 18,
      width: contentWidth,
      font,
      size: 9,
      color: MUTED,
    });
    y -= 30;
  }

  for (const row of input.rows) {
    const cells = input.columns.map((column, index) =>
      wrap(column.value(row), font, FONT_SIZE, widths[index] - 6)
    );
    const lineCount = Math.max(1, ...cells.map((lines) => Math.min(lines.length, 2)));
    const rowHeight = lineCount * LINE_HEIGHT + ROW_PADDING * 2;

    if (y - rowHeight < MARGIN + FOOTER_SPACE) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = drawPageHeader(page, false);
      y = drawTableHeader(page, y);
    }

    let x = MARGIN;
    cells.forEach((lines, index) => {
      const shown = lines.slice(0, 2);
      if (lines.length > 2) {
        shown[1] = ellipsize(`${shown[1]}…`, font, FONT_SIZE, widths[index] - 6);
      }
      shown.forEach((line, lineIndex) => {
        drawAligned(page, line, {
          x: x + 3,
          y: y - ROW_PADDING - FONT_SIZE - lineIndex * LINE_HEIGHT,
          width: widths[index] - 6,
          font,
          size: FONT_SIZE,
          align: input.columns[index].align,
        });
      });
      x += widths[index];
    });

    y -= rowHeight;
    page.drawLine({
      start: { x: MARGIN, y: y + 2 },
      end: { x: pageWidth - MARGIN, y: y + 2 },
      thickness: 0.4,
      color: LINE,
    });
  }

  if (input.summary?.length) {
    const boxWidth = Math.min(300, contentWidth);
    const boxHeight = input.summary.length * 16 + 16;
    if (y - boxHeight < MARGIN + FOOTER_SPACE) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = drawPageHeader(page, false);
    }
    const boxX = pageWidth - MARGIN - boxWidth;
    const boxY = y - boxHeight - 6;
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: TOTAL_FILL,
      borderColor: LINE,
      borderWidth: 0.6,
    });

    let lineY = y - 22;
    for (const item of input.summary) {
      drawAligned(page, item.label, {
        x: boxX + 10,
        y: lineY,
        width: boxWidth * 0.55,
        font: item.strong ? bold : font,
        size: 9,
        color: MUTED,
      });
      drawAligned(page, item.value, {
        x: boxX + boxWidth * 0.55,
        y: lineY,
        width: boxWidth * 0.45 - 10,
        font: item.strong ? bold : font,
        size: 9,
        align: "right",
      });
      lineY -= 16;
    }
    y = boxY - 8;
  }

  // Rodapé com nota e numeração em todas as páginas.
  const pages = doc.getPages();
  const note = input.footerNote ?? "Documento gerado pelo Vendix";
  pages.forEach((currentPage, index) => {
    drawAligned(currentPage, note, {
      x: MARGIN,
      y: MARGIN - 14,
      width: contentWidth * 0.75,
      font,
      size: 7.5,
      color: MUTED,
    });
    drawAligned(currentPage, `Página ${index + 1} de ${pages.length}`, {
      x: MARGIN + contentWidth * 0.75,
      y: MARGIN - 14,
      width: contentWidth * 0.25,
      font,
      size: 7.5,
      align: "right",
      color: MUTED,
    });
  });

  return doc.save();
}

export function pdfFileName(prefix: string, from: string, to: string): string {
  return `${prefix}-${from}-a-${to}.pdf`;
}

export type ChargePdfInput = {
  tenantName: string;
  description: string;
  referenceMonth: string;
  amount: string;
  dueDate: string;
  status: string;
  boletoCode?: string | null;
  boletoUrl?: string | null;
  pixKey?: string | null;
  pixBeneficiary?: string | null;
  pixPayload?: string | null;
  instructions?: string | null;
  paymentUrl: string;
};

/**
 * PDF de cobrança da mensalidade. Quando a cobrança possui linha digitável o
 * documento funciona como boleto; caso contrário reúne os dados de pagamento
 * por PIX (QR Code, chave e copia e cola).
 */
export async function buildChargePdf(input: ChargePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - MARGIN * 2;
  const page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - MARGIN;

  drawAligned(page, "VENDIX", {
    x: MARGIN,
    y: y - 16,
    width: contentWidth * 0.7,
    font: bold,
    size: 18,
  });
  drawAligned(page, `Emitido em ${formatDateTimeBR(new Date())}`, {
    x: MARGIN + contentWidth * 0.7,
    y: y - 12,
    width: contentWidth * 0.3,
    font,
    size: 8,
    align: "right",
    color: MUTED,
  });
  y -= 36;

  drawAligned(page, input.boletoCode ? "Boleto de cobrança" : "Documento de cobrança", {
    x: MARGIN,
    y: y - 15,
    width: contentWidth,
    font: bold,
    size: 15,
  });
  y -= 28;

  page.drawRectangle({
    x: MARGIN,
    y: y - 102,
    width: contentWidth,
    height: 102,
    color: HEADER_FILL,
    borderColor: LINE,
    borderWidth: 0.6,
  });

  const infoRows: Array<[string, string]> = [
    ["Loja", input.tenantName],
    ["Mensalidade", `${input.description} · ${input.referenceMonth}`],
    ["Vencimento", input.dueDate],
    ["Status", input.status],
  ];
  let infoY = y - 18;
  for (const [label, value] of infoRows) {
    drawAligned(page, label, {
      x: MARGIN + 10,
      y: infoY,
      width: 90,
      font,
      size: 9,
      color: MUTED,
    });
    drawAligned(page, value, {
      x: MARGIN + 104,
      y: infoY,
      width: contentWidth - 114,
      font: bold,
      size: 9,
    });
    infoY -= 18;
  }
  drawAligned(page, "Valor", {
    x: MARGIN + 10,
    y: infoY,
    width: 90,
    font,
    size: 9,
    color: MUTED,
  });
  drawAligned(page, input.amount, {
    x: MARGIN + 104,
    y: infoY,
    width: contentWidth - 114,
    font: bold,
    size: 13,
  });
  y -= 120;

  if (input.boletoCode) {
    drawAligned(page, "Linha digitável", {
      x: MARGIN,
      y,
      width: contentWidth,
      font: bold,
      size: 10,
    });
    y -= 8;
    page.drawRectangle({
      x: MARGIN,
      y: y - 34,
      width: contentWidth,
      height: 30,
      color: TOTAL_FILL,
      borderColor: LINE,
      borderWidth: 0.6,
    });
    drawAligned(page, input.boletoCode, {
      x: MARGIN + 8,
      y: y - 23,
      width: contentWidth - 16,
      font: monoBold,
      size: 9.5,
    });
    y -= 50;
  }

  if (input.pixPayload) {
    const qrPng = await QRCode.toBuffer(input.pixPayload, {
      type: "png",
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const qr = await doc.embedPng(new Uint8Array(qrPng));
    const qrSize = 118;

    drawAligned(page, "Pagamento via PIX", {
      x: MARGIN,
      y,
      width: contentWidth,
      font: bold,
      size: 10,
    });
    y -= 8;

    const textWidth = contentWidth - qrSize - 20;
    let textY = y - 10;
    const lines: Array<[string, string]> = [
      ["Chave PIX", input.pixKey ?? "—"],
      ["Beneficiário", input.pixBeneficiary ?? "—"],
    ];
    for (const [label, value] of lines) {
      drawAligned(page, label, {
        x: MARGIN,
        y: textY,
        width: textWidth,
        font,
        size: 8,
        color: MUTED,
      });
      textY -= 11;
      for (const line of wrap(value, bold, 9, textWidth)) {
        drawAligned(page, line, { x: MARGIN, y: textY, width: textWidth, font: bold, size: 9 });
        textY -= 11;
      }
      textY -= 4;
    }

    drawAligned(page, "PIX copia e cola", {
      x: MARGIN,
      y: textY,
      width: textWidth,
      font,
      size: 8,
      color: MUTED,
    });
    textY -= 11;
    for (const line of wrap(input.pixPayload, mono, 7, textWidth).slice(0, 8)) {
      drawAligned(page, line, { x: MARGIN, y: textY, width: textWidth, font: mono, size: 7 });
      textY -= 9;
    }

    page.drawImage(qr, {
      x: pageWidth - MARGIN - qrSize,
      y: y - qrSize - 6,
      width: qrSize,
      height: qrSize,
    });
    y -= Math.max(qrSize + 16, y - textY + 8);
  }

  if (input.instructions) {
    drawAligned(page, "Instruções", {
      x: MARGIN,
      y,
      width: contentWidth,
      font: bold,
      size: 10,
    });
    y -= 14;
    for (const line of wrap(input.instructions, font, 9, contentWidth).slice(0, 14)) {
      drawAligned(page, line, { x: MARGIN, y, width: contentWidth, font, size: 9, color: MUTED });
      y -= 12;
    }
    y -= 6;
  }

  drawAligned(page, "Pague também pelo link:", {
    x: MARGIN,
    y,
    width: contentWidth,
    font: bold,
    size: 9,
  });
  y -= 12;
  for (const line of wrap(input.paymentUrl, mono, 8, contentWidth)) {
    drawAligned(page, line, { x: MARGIN, y, width: contentWidth, font: mono, size: 8 });
    y -= 10;
  }

  drawAligned(page, "Documento gerado pelo Vendix. Guarde o comprovante após o pagamento.", {
    x: MARGIN,
    y: MARGIN - 14,
    width: contentWidth,
    font,
    size: 7.5,
    color: MUTED,
  });

  return doc.save();
}

export function pdfResponse(bytes: Uint8Array, fileName: string): Response {
  return new Response(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store, max-age=0",
    },
  });
}
