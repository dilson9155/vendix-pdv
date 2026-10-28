import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getFinanceReport } from "@/services/reports.service";
import { currentMonthISO, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Relatório financeiro" };
export const dynamic = "force-dynamic";

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("finance.reports");
  const params = await searchParams;
  const from = params.from ?? `${currentMonthISO()}-01`;
  const to = params.to ?? todayISO();

  const data = await getFinanceReport(ctx, { from, to, branchId: params.branchId || undefined });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);

  const cashFlow = data.cashFlow;

  return (
    <div>
      <PageHeader
        eyebrow="Relatórios"
        title="Relatório financeiro"
        description="Fluxo de caixa, contas a pagar/receber em aberto, vencidas e pagamentos/recebimentos do período."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/export/financeiro?${exportQuery.toString()}`} prefetch={false}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fluxo de caixa" value={formatBRL(cashFlow.totalIn - cashFlow.totalOut)} hint={`Saldo ${formatBRL(cashFlow.closingBalance)}`} />
        <StatCard label="Contas a pagar abertas" value={formatBRL(data.payables.open)} hint={`${formatBRL(data.payables.overdue)} vencidas`} tone={data.payables.overdue > 0 ? "warning" : "default"} />
        <StatCard label="Contas a receber abertas" value={formatBRL(data.receivables.open)} hint={`${formatBRL(data.receivables.overdue)} vencidas`} tone={data.receivables.overdue > 0 ? "warning" : "default"} />
        <StatCard label="Pagamentos/recebimentos" value={formatBRL((data.payables.settled ?? 0) + (data.receivables.settled ?? 0))} hint={`${data.payables.settledCount ?? 0} baixa(s) de contas a pagar`} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Contas a pagar</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Em aberto</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.payables.open)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Vencidas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.payables.overdue)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Quitadas no período</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.payables.settled ?? 0)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Juros/repassas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {formatBRL((data.payables.interest ?? 0) + (data.payables.penalty ?? 0) - (data.payables.discount ?? 0))}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Contas a receber</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Em aberto</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.receivables.open)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Vencidas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.receivables.overdue)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Recebidas no período</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.receivables.settled ?? 0)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Juros/multas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {formatBRL((data.receivables.interest ?? 0) + (data.receivables.penalty ?? 0) - (data.receivables.discount ?? 0))}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
