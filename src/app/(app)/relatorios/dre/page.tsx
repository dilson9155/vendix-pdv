import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getDre } from "@/services/dre.service";
import { currentMonthISO, todayISO } from "@/lib/date";
import { formatBRL, formatPercent } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "DRE gerencial" };
export const dynamic = "force-dynamic";

export default async function DreReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("finance.reports");
  const params = await searchParams;
  const from = params.from ?? `${currentMonthISO()}-01`;
  const to = params.to ?? todayISO();

  const data = await getDre(ctx, { from, to, branchId: params.branchId || undefined });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);

  return (
    <div>
      <PageHeader
        eyebrow="Relatórios"
        title="DRE gerencial"
        description="Demonstração do resultado operacional: receita, deduções, CMV, despesas, resultado e ponto de equilíbrio."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/export/dre?${exportQuery.toString()}`} prefetch={false}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita bruta" value={formatBRL(data.grossRevenue)} />
        <StatCard label="Deduções (devoluções)" value={formatBRL(data.returns)} />
        <StatCard label="Receita líquida" value={formatBRL(data.netRevenue)} />
        <StatCard label="CMV" value={formatBRL(data.cogs)} tone="danger" />
        <StatCard label="Lucro bruto" value={formatBRL(data.grossProfit)} hint={`${formatPercent(data.grossMargin)} de margem`} />
        <StatCard label="Despesas operacionais" value={formatBRL(data.totalExpenses)} tone="danger" />
        <StatCard label="Resultado operacional" value={formatBRL(data.operatingResult)} />
        <StatCard label="Resultado líquido" value={formatBRL(data.netResult)} hint={`${formatPercent(data.netMargin)} de margem`} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Despesas por conta</h2>
          {data.expenses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma despesa registrada no período.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.expenses.map((expense) => (
                <div key={`${expense.code}-${expense.name}`} className="flex items-center justify-between text-sm">
                  <span>
                    {expense.code} · {expense.name}
                  </span>
                  <span className="tabular-nums font-semibold">{formatBRL(expense.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Outras receitas</h2>
          <p className="mt-3 text-sm">
            Resultado operacional + outras receitas (lançamentos manuais de receita):{" "}
            <strong>{formatBRL(data.netResult)}</strong>
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Outras receitas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.otherRevenues)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Ponto de equilíbrio</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(data.breakEvenRevenue)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Observações</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
