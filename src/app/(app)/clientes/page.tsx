import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { listCustomers } from "@/services/customers.service";
import { formatDateBR, formatDocument } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { CustomerDialog, CustomerToggle } from "@/components/forms/customer-forms";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("customers.view");
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const data = await listCustomers(ctx, {
    q: params.q,
    status: (params.status as "ATIVO" | "INATIVO" | "TODOS" | undefined) ?? "TODOS",
    page,
    pageSize: 25,
  });
  const canManage = hasPermission(ctx, "customers.manage");

  const withBalance = data.rows.filter((row) => row.openBalance > 0);
  const openBalance = data.rows.reduce((sum, row) => sum + row.openBalance, 0);
  const totalPurchased = data.rows.reduce((sum, row) => sum + row.totalPurchased, 0);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        description="Cadastro usado no PDV e no crediário. O saldo em aberto considera apenas contas a receber não canceladas."
        actions={canManage ? <CustomerDialog /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes no filtro" value={String(data.total)} hint={`${data.rows.length} nesta página`} />
        <StatCard label="Com saldo em aberto" value={String(withBalance.length)} hint={`Total ${formatBRL(openBalance)}`} tone={openBalance > 0 ? "warning" : "default"} />
        <StatCard label="Compras dos listados" value={formatBRL(totalPurchased)} hint="Vendas concluídas no histórico" />
        <StatCard label="Ticket médio" value={
          data.rows.reduce((sum, row) => sum + row.purchases, 0) > 0
            ? formatBRL(totalPurchased / data.rows.reduce((sum, row) => sum + row.purchases, 0))
            : formatBRL(0)
        } hint="Média das vendas dos clientes listados" />
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nome, CPF/CNPJ, telefone ou e-mail"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar cliente"
          />
        </div>
        <select name="status" defaultValue={params.status ?? "TODOS"} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Situação">
          <option value="TODOS">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <Button type="submit" size="sm">Filtrar</Button>
      </form>

      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Cadastre um cliente para vincular vendas, crediário e comprovantes."
            action={canManage ? <CustomerDialog /> : undefined}
          />
        ) : (
          <>
            <TableShell caption="Clientes">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                  <th className="num">Compras</th>
                  <th className="num">Total comprado</th>
                  <th className="num">Em aberto</th>
                  <th>Última compra</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <p className="font-medium">{customer.name}</p>
                      {customer.notes && <p className="max-w-48 truncate text-[11px] text-muted-foreground">{customer.notes}</p>}
                    </td>
                    <td>{formatDocument(customer.document)}</td>
                    <td>
                      <p>{customer.phone ?? customer.whatsapp ?? "—"}</p>
                      {customer.email && <p className="text-[11px] text-muted-foreground">{customer.email}</p>}
                    </td>
                    <td>{customer.city ?? "—"}</td>
                    <td className="num">{customer.purchases}</td>
                    <td className="num">{formatBRL(customer.totalPurchased)}</td>
                    <td className="num">
                      <span className={customer.openBalance > 0 ? "font-semibold text-amber-700" : ""}>
                        {formatBRL(customer.openBalance)}
                      </span>
                    </td>
                    <td>{customer.lastPurchaseAt ? formatDateBR(customer.lastPurchaseAt) : "—"}</td>
                    <td>
                      <span className={`text-xs font-medium ${customer.active ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {customer.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {canManage && <CustomerDialog customer={customer} />}
                        {canManage && <CustomerToggle id={customer.id} active={customer.active} />}
                        {customer.openBalance > 0 && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/financeiro/contas-a-receber">Receber</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Página {data.page} de {totalPages} · {data.total} cliente(s)</span>
              <div className="flex gap-2">
                {data.page > 1 && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/clientes?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.status ? { status: params.status } : {}), page: String(data.page - 1) }).toString()}`}>
                      Anterior
                    </Link>
                  </Button>
                )}
                {data.page < totalPages && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/clientes?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.status ? { status: params.status } : {}), page: String(data.page + 1) }).toString()}`}>
                      Próxima
                    </Link>
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
