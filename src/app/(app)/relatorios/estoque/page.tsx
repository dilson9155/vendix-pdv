import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getStockReport, listReportOptions } from "@/services/reports.service";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Relatório de estoque" };
export const dynamic = "force-dynamic";

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("reports.view");
  const params = await searchParams;

  const [data, options] = await Promise.all([
    getStockReport(ctx, {
      branchId: params.branchId || undefined,
      q: params.q,
      categoryId: params.categoryId || undefined,
      onlyLow: params.onlyLow === "1",
    }),
    listReportOptions(ctx),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);

  const lowStock = data.rows.filter((row) => row.belowMin);

  return (
    <div>
      <PageHeader
        eyebrow="Relatórios"
        title="Relatório de estoque"
        description="Saldos por unidade, variantes, valor de custo e valor de venda, com alerta de estoque mínimo."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/export/estoque?${exportQuery.toString()}`} prefetch={false}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
        }
      />

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nome ou SKU"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar produto"
          />
        </div>
        <select name="branchId" defaultValue={params.branchId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Unidade">
          <option value="">Todas as unidades</option>
          {options.branches.map((branch: { id: string; name: string }) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select name="categoryId" defaultValue={params.categoryId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {options.categories.map((category: { id: string; name: string }) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="flex items-end">
          <label className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2 text-sm">
            <input type="checkbox" name="onlyLow" value="1" defaultChecked={params.onlyLow === "1"} className="size-4 accent-primary" />
            Apenas em alerta
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Linhas de estoque" value={String(data.totals.items)} hint="Produtos com saldo na unidade filtrada" />
        <StatCard label="Quantidade" value={String(data.totals.quantity)} />
        <StatCard label="Valor de custo" value={formatBRL(data.totals.costValue)} />
        <StatCard label="Valor de venda" value={formatBRL(data.totals.priceValue)} />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Estoque mínimo: {lowStock.length} item(ns) abaixo do mínimo.</p>
          <p className="mt-1 text-xs">
            {lowStock.slice(0, 10).map((row) => `${row.name} (${row.sku})`).join(", ")}
            {lowStock.length > 10 ? "…" : ""}
          </p>
        </div>
      )}

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="overflow-x-auto">
          <TableShell caption="Saldos de estoque">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th className="num">Saldo</th>
                <th className="num">Mínimo</th>
                <th className="num">Custo</th>
                <th className="num">Valor de custo</th>
                <th className="num">Preço</th>
                <th className="num">Valor de venda</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState title="Nenhum saldo encontrado" description="Cadastre produtos e movimente o estoque." />
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={`${row.branch}-${row.productId}-${row.sku}`}>
                    <td className="font-medium">{row.name}</td>
                    <td>{row.sku}</td>
                    <td>{row.category}</td>
                    <td>{row.branch}</td>
                    <td className="num font-semibold">{row.quantity}</td>
                    <td className="num">{row.minStock}</td>
                    <td className="num">{formatBRL(row.cost)}</td>
                    <td className="num">{formatBRL(row.costValue)}</td>
                    <td className="num">{formatBRL(row.price)}</td>
                    <td className="num">{formatBRL(row.priceValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </div>
      </section>
    </div>
  );
}
