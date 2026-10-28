import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getCashFlow } from "@/services/finance-core.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Fluxo de caixa" };
export const dynamic = "force-dynamic";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("finance.reports");
  const params = await searchParams;
  const from = params.from ?? `${currentMonthISO()}-01`;
  const to = params.to ?? todayISO();

  const data = await getCashFlow(ctx, {
    from,
    to,
    accountId: params.accountId || undefined,
    branchId: params.branchId || undefined,
    groupBy: params.groupBy === "month" ? "month" : "day",
  });

  const groupBy = params.groupBy === "month" ? "month" : "day";

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);

  const seriesTotal = data.series.reduce((sum, bucket) => sum + bucket.balance, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Fluxo de caixa"
        description="Entradas e saídas do livro caixa por dia (ou mês), com saldo acumulado e projeção de contas em aberto."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/export/financeiro?${exportQuery.toString()}`} prefetch={false}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo inicial" value={formatBRL(data.openingBalance)} />
        <StatCard label="Entradas" value={formatBRL(data.totalIn)} tone="positive" />
        <StatCard label="Saídas" value={formatBRL(data.totalOut)} tone="danger" />
        <StatCard label="Saldo final" value={formatBRL(data.closingBalance)} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Série temporal</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="vx-table">
            <thead>
              <tr>
                <th>{groupBy === "month" ? "Mês" : "Data"}</th>
                <th className="num">Entradas</th>
                <th className="num">Saídas</th>
                <th className="num">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {data.series.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="Sem movimentos no período" description="Registre vendas, pagamentos ou lançamentos." />
                  </td>
                </tr>
              ) : (
                data.series.map((bucket) => (
                  <tr key={bucket.key}>
                    <td className="font-medium">{bucket.key}</td>
                    <td className="num text-emerald-700">{formatBRL(bucket.in)}</td>
                    <td className="num text-red-700">{formatBRL(bucket.out)}</td>
                    <td className="num font-semibold">{formatBRL(bucket.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Soma dos saldos: {formatBRL(seriesTotal)}</p>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Entradas e saídas ({data.entries.length} registro(s))</h2>
        {data.entries.length === 0 ? (
          <EmptyState title="Nenhum lançamento encontrado" />
        ) : (
          <div className="mt-3 max-h-96 overflow-y-auto">
            <TableShell caption="Lançamentos do período">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Conta</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr key={`${entry.date}-${index}`}>
                    <td>{formatDateBR(entry.date)}</td>
                    <td>{entry.type === "ENTRADA" ? "Entrada" : "Saída"}</td>
                    <td>{entry.description}</td>
                    <td>{entry.account}</td>
                    <td className="num font-semibold">{formatBRL(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Projeção de contas em aberto</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Soma dos saldos em aberto previstos para vencimento no período (contas a pagar/receber).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="vx-table">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th className="num">Inflow previsto</th>
                <th className="num">Outflow previsto</th>
              </tr>
            </thead>
            <tbody>
              {data.projected.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyState title="Nenhuma projeção para o período" />
                  </td>
                </tr>
              ) : (
                data.projected.map((bucket) => (
                  <tr key={bucket.key}>
                    <td className="font-medium">{bucket.key}</td>
                    <td className="num text-emerald-700">{formatBRL(bucket.inflow)}</td>
                    <td className="num text-red-700">{formatBRL(bucket.outflow)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
