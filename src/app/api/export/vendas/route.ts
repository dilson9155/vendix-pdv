import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { getSalesReport, toCsv, csvFileName } from "@/services/reports.service";
import { currentMonthISO, todayISO } from "@/lib/date";

export async function GET(request: Request) {
  const ctx = await requirePermission("reports.view");
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? `${currentMonthISO()}-01`;
  const to = url.searchParams.get("to") ?? todayISO();

  const data = await getSalesReport(ctx, { from, to });

  const rows = data.rows.map((row) => [
    row.documentNumber,
    row.date.toISOString().slice(0, 10),
    row.customer,
    row.operator,
    row.branch,
    row.status,
    row.items,
    Number(row.subtotal.toFixed(2)),
    Number(row.discount.toFixed(2)),
    Number(row.total.toFixed(2)),
    row.payments,
  ]);

  const csv = toCsv(
    ["Documento", "Data", "Cliente", "Operador", "Unidade", "Status", "Itens", "Subtotal", "Desconto", "Total", "Pagamento"],
    rows
  );

  return new NextResponse(new Blob([csv], { type: "text/csv;charset=utf-8" }), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvFileName("vendas", from, to)}"`,
    },
  });
}
