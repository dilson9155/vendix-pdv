import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { listLedger } from "@/services/finance-core.service";
import { toCsv, csvFileName } from "@/services/reports.service";
import { formatBRL } from "@/lib/money";
import { currentMonthISO, todayISO } from "@/lib/date";

export async function GET(request: Request) {
  const ctx = await requirePermission("finance.view");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();

  const data = await listLedger(ctx, { from, to, page: 1, pageSize: 500 });

  const rows = data.rows.map((row) => [
    row.date.toISOString().slice(0, 10),
    row.type === "ENTRADA" ? "Entrada" : "Saída",
    row.sourceType,
    row.description,
    row.financialAccount?.name ?? "",
    Number(row.amount.toFixed(2)),
  ]);

  const csv = toCsv(["Data", "Tipo", "Origem", "Descrição", "Conta", "Valor"], rows);

  return new NextResponse(new Blob([csv], { type: "text/csv;charset=utf-8" }), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvFileName("livro-caixa", from, to)}"`,
    },
  });
}
