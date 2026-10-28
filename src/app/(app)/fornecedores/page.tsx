import type { Metadata } from "next";
import { Search } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { listSuppliers } from "@/services/customers.service";
import { formatDocument } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { SupplierDialog, SupplierToggle } from "@/components/forms/customer-forms";

export const metadata: Metadata = { title: "Fornecedores" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("products.view");
  const params = await searchParams;
  const suppliers = await listSuppliers(ctx, {
    q: params.q,
    status: (params.status as "ATIVO" | "INATIVO" | "TODOS" | undefined) ?? "TODOS",
  });
  const canManage = hasPermission(ctx, "products.manage");
  const totalOpen = suppliers.reduce(
    (sum, supplier) => sum + supplier.payables.reduce((s, payable) => s + Number(payable.value), 0),
    0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Cadastros"
        title="Fornecedores"
        description="Fornecedores vinculados a produtos e contas a pagar. O valor em aberto é informativo e considera contas não canceladas."
        actions={canManage ? <SupplierDialog /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fornecedores" value={String(suppliers.length)} hint={`${suppliers.filter((s) => s.active).length} ativo(s)`} />
        <StatCard label="Produtos vinculados" value={String(suppliers.reduce((sum, s) => sum + s._count.products, 0))} />
        <StatCard label="Contas em aberto" value={formatBRL(totalOpen)} tone={totalOpen > 0 ? "warning" : "default"} hint="Soma das contas a pagar abertas" />
        <StatCard label="Com pendência" value={String(suppliers.filter((s) => s.payables.length > 0).length)} hint="Fornecedores com conta em aberto" />
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nome, documento ou e-mail"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar fornecedor"
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
        {suppliers.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Cadastre fornecedores para organizar compras e contas a pagar."
            action={canManage ? <SupplierDialog /> : undefined}
          />
        ) : (
          <TableShell caption="Fornecedores">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Endereço</th>
                <th className="num">Produtos</th>
                <th className="num">Contas abertas</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => {
                const open = supplier.payables.reduce((sum, payable) => sum + Number(payable.value), 0);
                return (
                  <tr key={supplier.id}>
                    <td className="font-medium">{supplier.name}</td>
                    <td>{formatDocument(supplier.document)}</td>
                    <td>
                      <p>{supplier.phone ?? "—"}</p>
                      {supplier.email && <p className="text-[11px] text-muted-foreground">{supplier.email}</p>}
                    </td>
                    <td className="max-w-56 truncate">{supplier.address ?? "—"}</td>
                    <td className="num">{supplier._count.products}</td>
                    <td className="num">{open > 0 ? formatBRL(open) : "—"}</td>
                    <td>
                      <span className={`text-xs font-medium ${supplier.active ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {supplier.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {canManage && <SupplierDialog supplier={supplier} />}
                        {canManage && <SupplierToggle id={supplier.id} active={supplier.active} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
