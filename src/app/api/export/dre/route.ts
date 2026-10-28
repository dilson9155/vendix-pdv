import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { getDre } from "@/services/dre.service";
import { toCsv } from "@/services/reports.service";
import { currentMonthISO, todayISO } from "@/lib/date";

export async function GET(request: Request) {
  const ctx = await requirePermission("finance.reports");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();

  const data = await getDre(ctx, { from, to });

  const rows = [
    ["Receita bruta", data.grossRevenue],
    ["Deduções (devoluções)", data.returns],
    ["Receita líquida", data.netRevenue],
    ["CMV", data.cogs],
    ["Lucro bruto", data.grossProfit],
    ["Despesas operacionais", data.totalExpenses],
    ["Resultado operacional", data.operatingResult],
    ["Outras receitas", data.otherRevenues],
    ["Resultado líquido", data.netResult],
    ["Ponto de equilíbrio", data.breakEvenRevenue],
  ];

  const csv = toCsv(["Conta", "Valor"], rows);

  return new NextResponse(new Blob([csv], { type: "text/csv;charset=utf-8" }), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dre-${from}-a-${to}.csv"`,
    },
  });
}
