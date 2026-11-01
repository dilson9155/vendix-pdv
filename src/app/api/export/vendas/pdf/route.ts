import { requirePermission } from "@/lib/tenant";
import { getSalesReport } from "@/services/reports.service";
import { buildReportPdf, pdfFileName, pdfResponse, type PdfColumn } from "@/services/pdf.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";

type Row = Awaited<ReturnType<typeof getSalesReport>>["rows"][number];

const COLUMNS: Array<PdfColumn<Row>> = [
  { header: "Documento", width: 62, value: (row) => row.documentNumber },
  { header: "Data", width: 52, value: (row) => formatDateBR(row.date) },
  { header: "Cliente", width: 128, value: (row) => row.customer },
  { header: "Operador", width: 86, value: (row) => row.operator },
  { header: "Unidade", width: 72, value: (row) => row.branch },
  { header: "Status", width: 62, value: (row) => row.status },
  { header: "Itens", width: 32, align: "right", value: (row) => String(row.items) },
  { header: "Total", width: 64, align: "right", value: (row) => formatBRL(row.total) },
];

export async function GET(request: Request) {
  const ctx = await requirePermission("reports.view");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();

  const data = await getSalesReport(ctx, {
    from,
    to,
    branchId: url.searchParams.get("branchId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    operatorId: url.searchParams.get("operatorId") ?? undefined,
  });

  const bytes = await buildReportPdf({
    company: ctx.tenantName,
    title: "Relatório de vendas",
    subtitle: `${data.totals.count} venda(s) concluída(s) · ${data.rows.length} linha(s)`,
    period: `Período: ${formatDateBR(from)} a ${formatDateBR(to)}`,
    columns: COLUMNS,
    rows: data.rows,
    landscape: true,
    summary: [
      { label: "Faturamento", value: formatBRL(data.totals.revenue), strong: true },
      { label: "Vendas", value: String(data.totals.count) },
      { label: "Ticket médio", value: formatBRL(data.totals.averageTicket) },
      { label: "Descontos", value: formatBRL(data.totals.discounts) },
      { label: "Canceladas", value: String(data.totals.canceled) },
    ],
    footerNote: "Vendix · relatório de vendas · documento sem valor fiscal",
  });

  return pdfResponse(bytes, pdfFileName("vendas", from, to));
}
