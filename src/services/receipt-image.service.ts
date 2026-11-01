import "server-only";
import sharp from "sharp";
import type { ReceiptData } from "@/services/sales.service";
import { formatBRL, formatQty } from "@/lib/money";
import { formatDateTimeBR, formatDocument } from "@/lib/date";

// ---------------------------------------------------------------------------
// Cupom em JPEG para WhatsApp.
//
// O layout é gerado como SVG e rasterizado pelo sharp (libvips/librsvg), que já
// é dependência do projeto. Evitamos o Satori (`next/og`) de propósito: ele
// carrega uma cópia própria do sharp, o que quebra em alguns ambientes.
// ---------------------------------------------------------------------------

const WIDTH = 760;
const PADDING = 44;
const RIGHT = WIDTH - PADDING;
const TOTAL_RIGHT = RIGHT;
const UNIT_RIGHT = RIGHT - 120;
const QTY_RIGHT = UNIT_RIGHT - 100;
const FONT_FAMILY = "DejaVu Sans, Arial, Helvetica, sans-serif";
const INK = "#111827";
const MUTED = "#4b5563";
const SOFT = "#6b7280";
const DASH = "#9ca3af";

type TextOptions = {
  size: number;
  weight?: 400 | 500 | 700;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  x?: number;
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fit(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function text(value: unknown, y: number, options: TextOptions): string {
  const x = options.x ?? PADDING;
  const anchor = options.anchor ?? "start";
  const weight = options.weight ?? 400;
  const fill = options.fill ?? INK;
  return `<text x="${x}" y="${y}" font-size="${options.size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
}

function dashed(y: number): string {
  return `<line x1="${PADDING}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="${DASH}" stroke-width="2" stroke-dasharray="7 6"/>`;
}

function solid(y: number, width = 2): string {
  return `<line x1="${PADDING}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="${INK}" stroke-width="${width}"/>`;
}

/**
 * Renderiza o cupom como JPEG (WhatsApp não aceita SVG/HTML).
 */
export async function renderReceiptJpeg(receipt: ReceiptData): Promise<Buffer> {
  const parts: string[] = [];
  let y = 54;

  const row = (
    label: string,
    value: string,
    options: { strong?: boolean; size?: number; valueColor?: string } = {}
  ) => {
    const size = options.size ?? 18;
    parts.push(text(label, y, { size, fill: MUTED, weight: options.strong ? 700 : 400 }));
    parts.push(
      text(value, y, {
        size,
        anchor: "end",
        x: RIGHT,
        fill: options.valueColor ?? INK,
        weight: options.strong ? 700 : 500,
      })
    );
    y += size + 7;
  };

  // Cabeçalho da empresa
  parts.push(text(fit(receipt.company.name, 34), y, { size: 30, weight: 700, anchor: "middle", x: WIDTH / 2 }));
  y += 34;
  if (receipt.company.legalName && receipt.company.legalName !== receipt.company.name) {
    parts.push(text(fit(receipt.company.legalName, 52), y, { size: 17, fill: MUTED, anchor: "middle", x: WIDTH / 2 }));
    y += 22;
  }
  if (receipt.company.document) {
    parts.push(
      text(`CNPJ/CPF: ${formatDocument(receipt.company.document)}`, y, {
        size: 17,
        fill: MUTED,
        anchor: "middle",
        x: WIDTH / 2,
      })
    );
    y += 22;
  }
  if (receipt.company.address) {
    parts.push(text(fit(receipt.company.address, 70), y, { size: 16, fill: MUTED, anchor: "middle", x: WIDTH / 2 }));
    y += 21;
  }
  if (receipt.company.phone) {
    parts.push(
      text(`Tel.: ${receipt.company.phone}`, y, { size: 16, fill: MUTED, anchor: "middle", x: WIDTH / 2 })
    );
    y += 21;
  }
  parts.push(
    text(
      `${receipt.company.branchName}${
        receipt.company.branchDocument ? ` · ${formatDocument(receipt.company.branchDocument)}` : ""
      }`,
      y,
      { size: 17, fill: "#374151", anchor: "middle", x: WIDTH / 2 }
    )
  );
  y += 26;

  // Faixa de comprovante não fiscal
  parts.push(dashed(y));
  y += 26;
  parts.push(
    text("COMPROVANTE NÃO FISCAL · SEM VALOR FISCAL", y, {
      size: 16,
      weight: 700,
      fill: "#374151",
      anchor: "middle",
      x: WIDTH / 2,
    })
  );
  y += 28;

  // Dados da venda
  row("Documento", receipt.documentNumber, { strong: true, size: 19 });
  row("Data", formatDateTimeBR(receipt.createdAt));
  row(
    "Cliente",
    fit(
      `${receipt.customerName ?? "Consumidor final"}${
        receipt.customerDocument ? ` · ${formatDocument(receipt.customerDocument)}` : ""
      }`,
      46
    )
  );
  row("Operador", fit(receipt.operatorName, 46));

  // Itens
  parts.push(dashed(y));
  y += 24;
  parts.push(text("ITEM", y, { size: 14, weight: 700, fill: SOFT }));
  parts.push(text("QTD", y, { size: 14, weight: 700, fill: SOFT, anchor: "end", x: QTY_RIGHT }));
  parts.push(text("VL.", y, { size: 14, weight: 700, fill: SOFT, anchor: "end", x: UNIT_RIGHT }));
  parts.push(text("TOTAL", y, { size: 14, weight: 700, fill: SOFT, anchor: "end", x: TOTAL_RIGHT }));
  y += 20;

  for (const item of receipt.items) {
    parts.push(text(fit(item.description, 40), y, { size: 17 }));
    parts.push(text(formatQty(item.quantity), y, { size: 17, anchor: "end", x: QTY_RIGHT }));
    parts.push(text(formatBRL(item.unitPrice), y, { size: 17, anchor: "end", x: UNIT_RIGHT }));
    parts.push(text(formatBRL(item.total), y, { size: 17, weight: 700, anchor: "end", x: TOTAL_RIGHT }));
    y += 22;

    const details = [item.details, item.discount > 0 ? `desconto ${formatBRL(item.discount)}` : ""]
      .filter(Boolean)
      .join(" · ");
    if (details) {
      parts.push(text(fit(details, 54), y, { size: 14, fill: SOFT }));
      y += 18;
    }
    y += 4;
  }

  // Totais
  parts.push(dashed(y));
  y += 24;
  row("Subtotal", formatBRL(receipt.subtotal));
  if (receipt.discount > 0) {
    row("Desconto", `- ${formatBRL(receipt.discount)}`);
  }
  parts.push(solid(y - 6));
  y += 22;
  parts.push(text("TOTAL", y, { size: 24, weight: 700 }));
  parts.push(text(formatBRL(receipt.total), y, { size: 24, weight: 700, anchor: "end", x: RIGHT }));
  y += 32;

  for (const payment of receipt.payments) {
    row(
      `${payment.name}${payment.installments > 1 ? ` (${payment.installments}x)` : ""}`,
      formatBRL(payment.amount)
    );
  }
  if (receipt.change > 0) {
    row("Troco", formatBRL(receipt.change), { strong: true });
  }

  // Selo de demonstração
  if (receipt.isDemo) {
    y += 6;
    parts.push(
      `<rect x="${PADDING}" y="${y - 22}" width="${RIGHT - PADDING}" height="34" fill="none" stroke="${INK}" stroke-width="2" rx="4"/>`
    );
    parts.push(
      text("EMPRESA DE DEMONSTRAÇÃO", y, {
        size: 15,
        weight: 700,
        anchor: "middle",
        x: WIDTH / 2,
      })
    );
    y += 34;
  }

  // Rodapé
  y += 10;
  parts.push(dashed(y));
  y += 26;
  parts.push(text(fit(receipt.footer, 66), y, { size: 16, fill: "#374151", anchor: "middle", x: WIDTH / 2 }));
  y += 22;
  parts.push(
    text("Documento gerado pelo Vendix · não substitui documento fiscal", y, {
      size: 13,
      fill: SOFT,
      anchor: "middle",
      x: WIDTH / 2,
    })
  );
  y += 30;

  const height = Math.ceil(y);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}"><rect width="${WIDTH}" height="${height}" fill="#ffffff"/><g font-family="${FONT_FAMILY}">${parts.join("")}</g></svg>`;

  return sharp(Buffer.from(svg, "utf8"))
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

/** Texto curto que acompanha a imagem no WhatsApp. */
export function receiptWhatsAppCaption(receipt: ReceiptData): string {
  return [
    `*${receipt.company.name}*`,
    `Comprovante ${receipt.documentNumber}`,
    `Data: ${formatDateTimeBR(receipt.createdAt)}`,
    `Total: ${formatBRL(receipt.total)}`,
    receipt.isDemo ? "Documento de demonstração — não é documento fiscal." : "",
  ]
    .filter(Boolean)
    .join("\n");
}
