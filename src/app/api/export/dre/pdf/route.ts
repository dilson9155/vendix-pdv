import { requirePermission } from "@/lib/tenant";
import { getDre } from "@/services/dre.service";
import { buildReportPdf, pdfFileName, pdfResponse, type PdfColumn } from "@/services/pdf.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL, formatPercent } from "@/lib/money";

type Row = { label: string; value: number; percent?: number; strong?: boolean; indent?: boolean };

const COLUMNS: Array<PdfColumn<Row>> = [
  {
    header: "Conta",
    width: 300,
    value: (row) => `${row.indent ? "   " : ""}${row.label}`,
  },
  { header: "Valor", width: 100, align: "right", value: (row) => formatBRL(row.value) },
  {
    header: "% da receita",
    width: 80,
    align: "right",
    value: (row) => (row.percent === undefined ? "—" : formatPercent(row.percent)),
  },
];

export async function GET(request: Request) {
  const ctx = await requirePermission("finance.reports");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();
  const branchId = url.searchParams.get("branchId") ?? undefined;

  const data = await getDre(ctx, { from, to, branchId });

  const percentOfRevenue = (value: number): number | undefined => {
    if (!data.grossRevenue) return undefined;
    return (value / data.grossRevenue) * 100;
  };
  const row = (
    label: string,
    value: number,
    options: { strong?: boolean; indent?: boolean; percent?: boolean } = {}
  ): Row => ({
    label,
    value,
    strong: options.strong,
    indent: options.indent,
    percent: options.percent === false ? undefined : percentOfRevenue(value),
  });

  const rows: Row[] = [
    row("Receita bruta", data.grossRevenue, { strong: true }),
    row("(-) Deduções (devoluções)", data.returns),
    row("= Receita líquida", data.netRevenue, { strong: true }),
    row("(-) CMV", data.cogs),
    row("= Lucro bruto", data.grossProfit, { strong: true }),
    row("(-) Despesas operacionais", data.totalExpenses),
    ...data.expenses.map((expense) =>
      row(`${expense.code} · ${expense.name}`, expense.amount, { indent: true })
    ),
    row("= Resultado operacional", data.operatingResult, { strong: true }),
    row("(+) Outras receitas", data.otherRevenues),
    row("= Resultado líquido", data.netResult, { strong: true }),
    row("Ponto de equilíbrio", data.breakEvenRevenue, { percent: false }),
  ];

  const bytes = await buildReportPdf({
    company: ctx.tenantName,
    title: "DRE gerencial",
    subtitle: `${data.counts.sales} venda(s) · ${data.counts.expensePayables} despesa(s) · ${data.counts.manualEntries} lançamento(s) manual(is)`,
    period: `Período: ${formatDateBR(from)} a ${formatDateBR(to)}`,
    columns: COLUMNS,
    rows,
    summary: [
      { label: "Receita líquida", value: formatBRL(data.netRevenue) },
      { label: "Margem bruta", value: formatPercent(data.grossMargin) },
      { label: "Margem líquida", value: formatPercent(data.netMargin) },
      { label: "Resultado líquido", value: formatBRL(data.netResult), strong: true },
    ],
    footerNote: "Vendix · DRE gerencial · documento sem valor fiscal",
  });

  return pdfResponse(bytes, pdfFileName("dre", from, to));
}
