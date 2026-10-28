import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { listSaleOptions, listSales } from "@/services/sales.service";
import { currentMonthISO, formatDateTimeBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Vendas" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todas as situações" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "DEVOLVIDA_PARCIAL", label: "Devolvida parcialmente" },
  { value: "DEVOLVIDA", label: "Devolvida" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "ABERTA", label: "Aberta" },
];

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("sales.view");
  const params = await searchParams;
  const from = params.from ?? `${currentMonthISO()}-01`;
  const to = params.to ?? todayISO();
  const page = Number(params.page ?? 1) || 1;

  const [data, options] = await Promise.all([
    listSales(ctx, {
      q: params.q,
      status: params.status || undefined,
      from,
      to,
      branchId: params.branchId || undefined,
      operatorId: params.operatorId || undefined,
      page,
      pageSize: 25,
    }),
    listSaleOptions(ctx),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);
  const pageHref = (next: number) => {
    const clone = new URLSearchParams(query);
    clone.set("page", String(next));
    return `/vendas?${clone.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Vendas"
        description="Consulta das vendas registradas, com filtros por período, unidade, operador e situação. Vendas canceladas continuam visíveis para rastreabilidade."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/api/export/vendas?${exportQuery.toString()}`} prefetch={false}>
                <Download className="size-4" /> Exportar CSV
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/pdv">Nova venda</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento no filtro" value={formatBRL(data.totals.revenue)} hint="Vendas concluídas e devolvidas parcialmente" />
        <StatCard label="Vendas" value={String(data.totals.count)} hint={`${data.total} registro(s) no filtro`} />
        <StatCard label="Ticket médio" value={formatBRL(data.totals.averageTicket)} hint={`Descontos: ${formatBRL(data.totals.discounts)}`} />
        <StatCard label="Canceladas" value={String(data.totals.canceled)} hint="Não compõem o faturamento" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nº do documento ou cliente"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar venda"
          />
        </div>
        <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Situação">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="branchId" defaultValue={params.branchId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Unidade">
          <option value="">Todas as unidades</option>
          {options.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select name="operatorId" defaultValue={params.operatorId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Operador">
          <option value="">Todos os operadores</option>
          {options.operators.map((operator) => (
            <option key={operator.id} value={operator.id}>
              {operator.name}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Data inicial" />
        <div className="flex gap-2">
          <input type="date" name="to" defaultValue={to} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" aria-label="Data final" />
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Ajuste o período ou registre uma venda no PDV."
            action={
              <Button asChild size="sm">
                <Link href="/pdv">Abrir PDV</Link>
              </Button>
            }
          />
        ) : (
          <>
            <TableShell caption="Vendas">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Operador</th>
                  <th>Unidade</th>
                  <th className="num">Itens</th>
                  <th className="num">Desconto</th>
                  <th className="num">Total</th>
                  <th>Pagamento</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-medium">{sale.documentNumber}</td>
                    <td>{formatDateTimeBR(sale.createdAt)}</td>
                    <td>{sale.customerName ?? "Consumidor final"}</td>
                    <td>{sale.operatorName}</td>
                    <td>{sale.branchName}</td>
                    <td className="num">{sale.items}</td>
                    <td className="num">{formatBRL(sale.discount)}</td>
                    <td className="num font-semibold">{formatBRL(sale.total)}</td>
                    <td className="max-w-40 truncate text-xs text-muted-foreground">
                      {sale.payments.map((payment) => payment.name).join(", ") || "—"}
                    </td>
                    <td>
                      <StatusBadge status={sale.status} />
                    </td>
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/vendas/${sale.id}`}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Página {data.page} de {totalPages} · {data.total} venda(s)
              </span>
              <div className="flex gap-2">
                {data.page > 1 && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={pageHref(data.page - 1)}>Anterior</Link>
                  </Button>
                )}
                {data.page < totalPages && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={pageHref(data.page + 1)}>Próxima</Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
