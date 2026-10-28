import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { getStockReport, toCsv } from "@/services/reports.service";
import { todayISO } from "@/lib/date";

export async function GET(request: Request) {
  const ctx = await requirePermission("reports.view");
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const onlyLow = url.searchParams.get("onlyLow") === "1";

  const data = await getStockReport(ctx, { branchId, q, categoryId, onlyLow });

  const rows = data.rows.map((row) => [
    row.name,
    row.sku,
    row.variant,
    row.category,
    row.branch,
    row.quantity,
    row.minStock,
    Number(row.cost.toFixed(2)),
    Number(row.price.toFixed(2)),
    Number(row.costValue.toFixed(2)),
    Number(row.priceValue.toFixed(2)),
  ]);

  const csv = toCsv(
    ["Produto", "SKU", "Variante", "Categoria", "Unidade", "Saldo", "Minimo", "Custo", "Preco", "Valor de custo", "Valor de venda"],
    rows
  );

  return new NextResponse(new Blob([csv], { type: "text/csv;charset=utf-8" }), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="estoque-${todayISO()}.csv"`,
    },
  });
}
