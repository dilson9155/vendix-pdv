import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { listLedger } from "@/services/finance-core.service";
import { listFinancialAccounts } from "@/services/finance-core.service";
import { currentMonthISO, formatDateBR, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { ManualLedgerForm } from "@/components/finance/manual-ledger-form";
import { InlineReconcile } from "@/components/finance/inline-reconcile";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Livro caixa" };
export const dynamic = "force-dynamic";

const SOURCE_TYPES = [
  { value: "", label: "Todas as origens" },
  { value: "VENDA", label: "Venda" },
  { value: "RECEBIMENTO", label: "Recebimento" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "SUPRIMENTO", label: "Suprimento" },
  { value: "SANGRIA", label: "Sangria" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "DESPESA", label: "Despesa" },
  { value: "RECEITA", label: "Receita" },
  { value: "ESTORNO", label: "Estorno" },
];

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("finance.view");
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;

  const [data, accounts] = await Promise.all([
    listLedger(ctx, {
      from: params.from || undefined,
      to: params.to || undefined,
      accountId: params.accountId || undefined,
      type: (params.type as "ENTRADA" | "SAIDA" | "TODOS" | undefined) ?? undefined,
      sourceType: params.sourceType || undefined,
      costCenterId: params.costCenterId || undefined,
      branchId: params.branchId || undefined,
      q: params.q,
      page,
      pageSize: 50,
    }),
    listFinancialAccounts(ctx, true),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  const pageHref = (next: number) => {
    const clone = new URLSearchParams(query);
    clone.set("page", String(next));
    return `/financeiro/livro-caixa?${clone.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const sourceOptions = SOURCE_TYPES;

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Livro caixa"
        description="Lançamentos com origem (venda, recebimento, pagamento, transferência, estorno) e conciliação por lançamento."
        actions={
          <ManualLedgerForm accounts={accounts.map((account) => ({ id: account.id, name: account.name }))} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entradas" value={formatBRL(data.totals.in)} tone="positive" />
        <StatCard label="Saídas" value={formatBRL(data.totals.out)} tone="danger" />
        <StatCard label="Saldo do período" value={formatBRL(data.totals.balance)} />
        <StatCard label="A abrir" value={formatBRL(data.openingBalance)} hint="Saldo anterior ao período filtrado" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Descrição ou documento"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar lançamento"
          />
        </div>
        <select name="sourceType" defaultValue={params.sourceType ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Origem">
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={params.type ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Tipo">
          <option value="">Entrada e saída</option>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Data inicial" />
        <div className="flex gap-2">
          <input type="date" name="to" defaultValue={params.to ?? ""} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" aria-label="Data final" />
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState title="Nenhum lançamento encontrado" description="Registre lançamentos manuais ou gere a partir de vendas e caixa." />
        ) : (
          <TableShell caption="Lançamentos">
            <thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Descrição</th>
                <th>Conta</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateBR(row.date)}</td>
                  <td>{row.sourceType}</td>
                  <td className="max-w-72">
                    <p className="truncate font-medium">{row.description}</p>
                    {row.document && <p className="text-[11px] text-muted-foreground">Doc. {row.document}</p>}
                  </td>
                  <td>{row.financialAccount?.name ?? "—"}</td>
                  <td className="num font-semibold">{formatBRL(row.amount)}</td>
                  <td>
                    <StatusBadge status={row.reconciledAt ? "PAGO" : "PENDENTE"} />
                  </td>
                  <td>
                    <InlineReconcile entryId={row.id} reconciled={Boolean(row.reconciledAt)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.total} registro(s)
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
      </div>
    </div>
  );
}
