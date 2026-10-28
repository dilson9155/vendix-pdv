import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { listPayables, listPayableOptions } from "@/services/payables.service";
import { PayableActions } from "@/components/finance/payable-actions";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { formatBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Contas a pagar" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todas as situações" },
  { value: "ABERTO", label: "Em aberto" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "VENCIDOS", label: "Vencidas" },
  { value: "PAGO", label: "Pago" },
  { value: "CANCELADO", label: "Cancelado" },
];

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("finance.view");
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;

  const [data, options] = await Promise.all([
    listPayables(ctx, {
      q: params.q,
      status: (params.status as "TODOS" | "ABERTO" | "PARCIAL" | "VENCIDOS" | "PAGO" | "CANCELADO") || undefined,
      supplierId: params.supplierId || undefined,
      branchId: params.branchId || undefined,
      costCenterId: params.costCenterId || undefined,
      chartAccountId: params.chartAccountId || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      page,
      pageSize: 25,
    }),
    listPayableOptions(ctx),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  const exportQuery = new URLSearchParams(query);
  const pageHref = (next: number) => {
    const clone = new URLSearchParams(query);
    clone.set("page", String(next));
    return `/financeiro/contas-a-pagar?${clone.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const statusFilter = params.status ?? "";

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a pagar"
        description="Obrigações com fornecedores, parcelas, juros, multas e descontos. Pagamentos geram lançamento no livro caixa."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/api/export/financeiro?${exportQuery.toString()}`} prefetch={false}>
                <Download className="size-4" /> Exportar CSV
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/fornecedores">Gerenciar fornecedores</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Em aberto" value={formatBRL(data.totals.open)} hint={`${data.totals.count} conta(s) com saldo`} />
        <StatCard
          label="Vencidas"
          value={formatBRL(data.totals.overdue)}
          hint="Saldo de contas vencidas sem recebimento"
          tone={data.totals.overdue > 0 ? "danger" : "default"}
        />
        <StatCard label="Pagamentos no período" value={formatBRL(data.totals.paidPeriod)} hint="Baixas registradas" />
        <StatCard label="Total no filtro" value={formatBRL(data.totals.open)} hint="Soma das linhas filtradas" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Descrição ou documento"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar conta a pagar"
          />
        </div>
        <select name="status" defaultValue={statusFilter} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Situação">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="supplierId" defaultValue={params.supplierId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Fornecedor">
          <option value="">Todos os fornecedores</option>
          {options.suppliers.map((supplier: { id: string; name: string }) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <select name="branchId" defaultValue={params.branchId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Unidade">
          <option value="">Todas as unidades</option>
          {options.branches.map((branch: { id: string; name: string }) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
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
          <EmptyState title="Nenhuma conta a pagar encontrada" description="Ajuste os filtros ou registre uma obrigação." />
        ) : (
          <TableShell caption="Contas a pagar">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Competência</th>
                <th>Vencimento</th>
                <th className="num">Valor</th>
                <th className="num">Pago</th>
                <th className="num">Saldo</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-56">
                    <p className="truncate font-medium">{row.description}</p>
                    {row.document && <p className="text-[11px] text-muted-foreground">Doc. {row.document}</p>}
                  </td>
                  <td>{row.supplierName ?? "—"}</td>
                  <td>{row.competenceDate}</td>
                  <td>{row.dueDate}</td>
                  <td className="num font-semibold">{formatBRL(row.value)}</td>
                  <td className="num">{formatBRL(row.paid)}</td>
                  <td className="num font-semibold">{formatBRL(row.balance)}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <PayableActions
                      payable={{
                        id: row.id,
                        description: row.description,
                        balance: row.balance,
                        status: row.status,
                      }}
                      accounts={options.accounts}
                      payments={row.payments.map((payment) => ({
                        id: payment.id,
                        amount: payment.amount,
                        date: payment.date,
                        reversedAt: payment.reversedAt,
                      }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.total} conta(s)
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
