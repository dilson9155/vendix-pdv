import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download, Search } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import {
  listStock,
  listStockItemOptions,
  listStockMovements,
  stockSummary,
} from "@/services/inventory.service";
import { listBranches } from "@/services/settings.service";
import { formatDateTimeBR } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import {
  InventoryCountDialog,
  StockMovementDialog,
  StockTransferDialog,
} from "@/components/forms/inventory-forms";

export const metadata: Metadata = { title: "Estoque" };
export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("stock.view");
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const branchId = params.branchId || ctx.branchId || undefined;
  const [stock, movements, summary, branches, items] = await Promise.all([
    listStock(ctx, { q: params.q, branchId, lowOnly: params.lowOnly === "1", page, pageSize: 25 }),
    listStockMovements(ctx, { branchId, pageSize: 12 }),
    stockSummary(ctx, branchId),
    listBranches(ctx.tenantId),
    listStockItemOptions(ctx, branchId),
  ]);
  const canManage = hasPermission(ctx, "stock.manage");
  const activeBranches = branches
    .filter((branch) => branch.status === "ATIVO" && (!ctx.branchId || branch.id === ctx.branchId))
    .map((branch) => ({ id: branch.id, name: branch.name }));
  const totalPages = Math.max(1, Math.ceil(stock.total / stock.pageSize));
  const baseQuery = { ...params };
  delete baseQuery.page;
  const href = (next: number) => {
    const query = new URLSearchParams(baseQuery as Record<string, string>);
    query.set("page", String(next));
    return `/estoque?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cadastros"
        title="Estoque"
        description="Saldos por unidade e variação, com histórico de movimentações. Toda alteração passa por transação serializável e auditoria."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/api/export/estoque?${new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(params.q ? { q: params.q } : {}) }).toString()}`} prefetch={false}>
                <Download className="size-4" /> Exportar CSV
              </Link>
            </Button>
            {canManage && (
              <>
                <InventoryCountDialog items={items} branches={activeBranches} defaultBranchId={ctx.branchId ?? branchId ?? null} />
                <StockTransferDialog items={items} branches={activeBranches} defaultBranchId={ctx.branchId ?? branchId ?? null} />
                <StockMovementDialog items={items} branches={activeBranches} defaultBranchId={ctx.branchId ?? branchId ?? null} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Itens em estoque" value={String(summary.items)} hint="Registros ativos no escopo" />
        <StatCard label="Valor a custo" value={formatBRL(summary.value)} hint="Quantidade × custo cadastrado" />
        <StatCard label="Abaixo do mínimo" value={String(summary.lowCount)} tone={summary.lowCount > 0 ? "warning" : "positive"} icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Posições listadas" value={String(stock.total)} hint="Com os filtros atuais" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={params.q} placeholder="Produto ou SKU" className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm" aria-label="Buscar no estoque" />
        </div>
        {activeBranches.length > 1 && (
          <select name="branchId" defaultValue={branchId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Unidade">
            <option value="">Todas as unidades</option>
            {activeBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
        <label className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-2 text-xs">
          <input type="checkbox" name="lowOnly" value="1" defaultChecked={params.lowOnly === "1"} />
          Somente abaixo do mínimo
        </label>
        <Button type="submit" size="sm">Filtrar</Button>
      </form>

      <div className="mt-4">
        {stock.rows.length === 0 ? (
          <EmptyState
            title="Nenhum saldo encontrado"
            description="Cadastre produtos e registre uma entrada de estoque para começar."
            action={<Button asChild size="sm"><Link href="/produtos">Ir para produtos</Link></Button>}
          />
        ) : (
          <>
            <TableShell caption="Saldos de estoque">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Variação</th>
                  <th>Unidade</th>
                  <th className="num">Saldo</th>
                  <th className="num">Mínimo</th>
                  <th className="num">Custo</th>
                  <th className="num">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stock.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/produtos/${row.productId}`} className="font-medium text-primary hover:underline">
                        {row.productName}
                      </Link>
                    </td>
                    <td>{row.sku}</td>
                    <td>{row.variantLabel ?? "—"}</td>
                    <td>{row.branchName}</td>
                    <td className="num">
                      <span className={row.low ? "font-semibold text-amber-700" : "font-medium"}>
                        {row.quantity} {row.unit}
                      </span>
                    </td>
                    <td className="num">{row.minStock}</td>
                    <td className="num">{formatBRL(row.cost)}</td>
                    <td className="num">{formatBRL(row.stockValue)}</td>
                    <td>
                      {row.low && <span className="text-[10px] font-semibold text-amber-700">Repor</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Página {stock.page} de {totalPages} · {stock.total} posição(ões)</span>
              <div className="flex gap-2">
                {stock.page > 1 && <Button asChild size="sm" variant="outline"><Link href={href(stock.page - 1)}>Anterior</Link></Button>}
                {stock.page < totalPages && <Button asChild size="sm" variant="outline"><Link href={href(stock.page + 1)}>Próxima</Link></Button>}
              </div>
            </div>
          </>
        )}
      </div>

      <section className="mt-4 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Últimas movimentações</h2>
            <p className="text-xs text-muted-foreground">Entradas, saídas, vendas, devoluções, transferências e inventários.</p>
          </div>
          <Link href="/relatorios/estoque" className="text-xs font-medium text-primary hover:underline">Relatório</Link>
        </div>
        {movements.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        ) : (
          <TableShell caption="Movimentações de estoque">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Unidade</th>
                <th className="num">Qtd.</th>
                <th>Motivo</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {movements.rows.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatDateTimeBR(movement.createdAt)}</td>
                  <td>
                    <p className="font-medium">{movement.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {movement.variant ? (movement.variant.sku ?? "") : movement.product.sku}
                    </p>
                  </td>
                  <td>{movement.type}</td>
                  <td>{movement.branch.name}</td>
                  <td className={`num ${Number(movement.quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {Number(movement.quantity) > 0 ? "+" : ""}{Number(movement.quantity)}
                  </td>
                  <td className="max-w-56 truncate">{movement.reason ?? "—"}</td>
                  <td>{movement.user?.name ?? "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>
    </div>
  );
}
