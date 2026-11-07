import { requirePermission } from "@/lib/tenant";
import { listLedger } from "@/services/finance-core.service";
import { buildReportPdf, pdfFileName, pdfResponse, type PdfColumn } from "@/services/pdf.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";

type Row = Awaited<ReturnType<typeof listLedger>>["rows"][number];

const COLUMNS: Array<PdfColumn<Row>> = [
  { header: "Data", width: 58, value: (row) => formatDateBR(row.date) },
  { header: "Tipo", width: 46, value: (row) => (row.type === "ENTRADA" ? "Entrada" : "Saída") },
  { header: "Origem", width: 72, value: (row) => row.sourceType },
  { header: "Descrição", width: 180, value: (row) => row.description },
  { header: "Conta", width: 86, value: (row) => row.financialAccount?.name ?? "" },
  { header: "Valor", width: 66, align: "right", value: (row) => formatBRL(row.amount) },
];

export async function GET(request: Request) {
  const ctx = await requirePermission("finance.view");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();
  const branchId = url.searchParams.get("branchId") ?? undefined;

  const pageSize = 200;
  const rows: Row[] = [];
  let totals = { in: 0, out: 0, balance: 0 };
  let openingBalance = 0;

  for (let page = 1; page <= 50; page += 1) {
    const data = await listLedger(ctx, { from, to, branchId, page, pageSize });
    rows.push(...data.rows);
    totals = data.totals;
    openingBalance = data.openingBalance;
    if (data.rows.length < pageSize) break;
  }

  const bytes = await buildReportPdf({
    company: ctx.tenantName,
    logoUrl: ctx.tenantLogoUrl,
    title: "Livro caixa",
    subtitle: `${rows.length} lançamento(s)`,
    period: `Período: ${formatDateBR(from)} a ${formatDateBR(to)}`,
    columns: COLUMNS,
    rows,
    summary: [
      { label: "Saldo anterior", value: formatBRL(openingBalance) },
      { label: "Entradas", value: formatBRL(totals.in) },
      { label: "Saídas", value: formatBRL(totals.out) },
      { label: "Saldo do período", value: formatBRL(totals.balance), strong: true },
    ],
    footerNote: "Vendix · livro caixa · lançamentos sem estornos excluídos",
  });

  return pdfResponse(bytes, pdfFileName("livro-caixa", from, to));
}
