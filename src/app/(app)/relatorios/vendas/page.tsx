import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getSalesReport, listReportOptions } from "@/services/reports.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Relatório de vendas" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todas as situações" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "DEVOLVIDA_PARCIAL", label: "Devolvida parcialmente" },
  { value: "DEVOLVIDA", label: "Devolvida" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "ABERTA", label: "Aberta" },
];

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("reports.view");
  const params = await searchParams;
  const from = params.from ?? `${currentMonthISO()}-01`;
  const to = params.to ?? todayISO();

  const [data, options] = await Promise.all([
    getSalesReport(ctx, {
      from,
      to,
      branchId: params.branchId || undefined,
      status: params.status || undefined,
      operatorId: params.operatorId || undefined,
    }),
    listReportOptions(ctx),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);

  return (
    <div>
      <PageHeader
        eyebrow="Relatórios"
        title="Relatório de vendas"
        description="Faturamento, ticket médio, pagamento e operador por período."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/export/vendas?${exportQuery.toString()}`} prefetch={false}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
        }
      />

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <input type="date" name="from" defaultValue={from} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Data inicial" />
        <input type="date" name="to" defaultValue={to} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Data final" />
        <select name="branchId" defaultValue={params.branchId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Unidade">
          <option value="">Todas as unidades</option>
          {options.branches.map((branch: { id: string; name: string }) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Situação">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="operatorId" defaultValue={params.operatorId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Operador">
          <option value="">Todos os operadores</option>
          {options.operators.map((operator: { id: string; name: string }) => (
            <option key={operator.id} value={operator.id}>
              {operator.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento" value={formatBRL(data.totals.revenue)} hint="Vendas concluídas e devolvidas parcialmente" />
        <StatCard label="Vendas" value={String(data.totals.count)} hint={`${data.rows.length} linha(s) exibida(s) · truncado: ${data.truncated}`} />
        <StatCard label="Ticket médio" value={formatBRL(data.totals.averageTicket)} hint={`Descontos: ${formatBRL(data.totals.discounts)}`} />
        <StatCard label="Canceladas" value={String(data.totals.canceled)} hint="Não compõem o faturamento" />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Por forma de pagamento</h2>
          {data.byPayment.length === 0 ? (
            <EmptyState title="Sem pagamentos" />
          ) : (
            <div className="mt-3 space-y-2">
              {data.byPayment.map((row) => (
                <div key={row.method} className="flex items-center justify-between text-sm">
                  <span>{row.method}</span>
                  <span className="tabular-nums">
                    {formatBRL(row.amount)} · {row.count} venda(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Por operador</h2>
          {data.byOperator.length === 0 ? (
            <EmptyState title="Sem operadores" />
          ) : (
            <div className="mt-3 space-y-2">
              {data.byOperator.map((row) => (
                <div key={row.operator} className="flex items-center justify-between text-sm">
                  <span>{row.operator}</span>
                  <span className="tabular-nums">
                    {formatBRL(row.revenue)} · {row.count} venda(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Série diária</h2>
        {data.daily.length === 0 ? (
          <EmptyState title="Sem vendas no período" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Série diária">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="num">Faturamento</th>
                  <th className="num">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((day) => (
                  <tr key={day.date}>
                    <td className="font-medium">{formatDateBR(day.date)}</td>
                    <td className="num font-semibold">{formatBRL(day.revenue)}</td>
                    <td className="num">{day.count}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Detalhamento de vendas</h2>
        {data.rows.length === 0 ? (
          <EmptyState title="Nenhuma venda encontrada" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Vendas do período">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Operador</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.documentNumber}</td>
                    <td>{formatDateBR(row.date)}</td>
                    <td>{row.customer}</td>
                    <td>{row.operator}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="num font-semibold">{formatBRL(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>
    </div>
  );
}
