import { requirePermission } from "@/lib/tenant";
import { getStockReport } from "@/services/reports.service";
import { buildReportPdf, pdfFileName, pdfResponse, type PdfColumn } from "@/services/pdf.service";
import { formatDateBR, todayISO } from "@/lib/date";
import { formatBRL, formatQty } from "@/lib/money";

type Row = Awaited<ReturnType<typeof getStockReport>>["rows"][number];

const COLUMNS: Array<PdfColumn<Row>> = [
  { header: "Produto", width: 130, value: (row) => row.name },
  { header: "SKU", width: 70, value: (row) => row.sku },
  { header: "Variante", width: 72, value: (row) => row.variant },
  { header: "Categoria", width: 76, value: (row) => row.category },
  { header: "Unidade", width: 58, value: (row) => row.branch },
  { header: "Saldo", width: 40, align: "right", value: (row) => formatQty(row.quantity) },
  { header: "Mín.", width: 34, align: "right", value: (row) => formatQty(row.minStock) },
  { header: "Custo", width: 56, align: "right", value: (row) => formatBRL(row.cost) },
  { header: "Venda", width: 56, align: "right", value: (row) => formatBRL(row.price) },
  { header: "Valor custo", width: 62, align: "right", value: (row) => formatBRL(row.costValue) },
];

export async function GET(request: Request) {
  const ctx = await requirePermission("reports.view");
  const url = new URL(request.url);
  const onlyLow = url.searchParams.get("onlyLow") === "1";

  const data = await getStockReport(ctx, {
    branchId: url.searchParams.get("branchId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    onlyLow,
  });

  const bytes = await buildReportPdf({
    company: ctx.tenantName,
    title: onlyLow ? "Posição de estoque — abaixo do mínimo" : "Posição de estoque",
    subtitle: `${data.totals.items} item(ns) · ${data.totals.belowMin} abaixo do mínimo`,
    period: `Emitido em ${formatDateBR(todayISO())}`,
    columns: COLUMNS,
    rows: data.rows,
    landscape: true,
    summary: [
      { label: "Itens", value: String(data.totals.items) },
      { label: "Quantidade total", value: formatQty(data.totals.quantity) },
      { label: "Valor de custo", value: formatBRL(data.totals.costValue) },
      { label: "Valor de venda", value: formatBRL(data.totals.priceValue), strong: true },
      { label: "Abaixo do mínimo", value: String(data.totals.belowMin) },
    ],
    footerNote: "Vendix · posição de estoque · valores de custo e venda do cadastro",
  });

  return pdfResponse(bytes, pdfFileName("estoque", todayISO(), todayISO()));
}
