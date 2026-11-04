import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Receipt, Search } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listTenants } from "@/services/saas.service";
import { formatDateBR } from "@/lib/date";
import { InlineServerAction } from "@/components/forms/form-kit";
import { setTenantStatusAction } from "@/app/actions/saas.actions";
import { StatusBadge, TableShell, EmptyState, PageHeader, StatCard } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Lojas" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todas as situações" },
  { value: "ATIVO", label: "Ativa" },
  { value: "SUSPENSO", label: "Suspensa" },
  { value: "CANCELADO", label: "Cancelada" },
];

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePlatformAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const status =
    params.status === "ATIVO" || params.status === "SUSPENSO" || params.status === "CANCELADO"
      ? params.status
      : undefined;

  const { rows, total, pages } = await listTenants(ctx, { q: params.q, status, page });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const pageHref = (next: number) => {
    const clone = new URLSearchParams(query);
    clone.set("page", String(next));
    const qs = clone.toString();
    return qs ? `/admin/empresas?${qs}` : "/admin/empresas";
  };

  const activeCount = rows.filter((tenant) => tenant.status === "ATIVO").length;
  const suspendedCount = rows.filter((tenant) => tenant.status === "SUSPENSO").length;
  const canceledCount = rows.filter((tenant) => tenant.status === "CANCELADO").length;

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Lojas"
        description="Cadastre, edite, suspenda por inadimplência e exclua as lojas da plataforma Vendix."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/cobrancas">
                <Receipt className="size-4" /> Cobranças
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/empresas/nova">
                <Plus className="size-4" /> Nova loja
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lojas listadas" value={String(rows.length)} hint={`${total} no total`} />
        <StatCard label="Ativas" value={String(activeCount)} tone="positive" />
        <StatCard label="Suspensas" value={String(suspendedCount)} tone="warning" />
        <StatCard label="Canceladas" value={String(canceledCount)} tone="danger" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nome, documento ou e-mail"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar loja"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
          aria-label="Situação"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            title="Nenhuma loja encontrada"
            description="Ajuste os filtros ou cadastre a primeira loja da plataforma."
            action={
              <Button asChild size="sm">
                <Link href="/admin/empresas/nova">
                  <Plus className="size-4" /> Cadastrar loja
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Lojas">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Plano</th>
                  <th>Assinatura</th>
                  <th>Status</th>
                  <th>Cadastrada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="font-medium">
                      <Link href={`/admin/empresas/${tenant.id}`} className="hover:text-primary hover:underline">
                        {tenant.name}
                      </Link>
                    </td>
                    <td>{tenant.document ?? "—"}</td>
                    <td>
                      <div>{tenant.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{tenant.phone ?? ""}</div>
                    </td>
                    <td>{tenant.plan?.name ?? "—"}</td>
                    <td>{tenant.subscription?.status ?? "TRIAL"}</td>
                    <td>
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td>{formatDateBR(tenant.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/empresas/${tenant.id}`}>
                            Gerenciar <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                        {tenant.status !== "ATIVO" ? (
                          <InlineServerAction
                            action={setTenantStatusAction}
                            payload={{ tenantId: tenant.id, status: "ATIVO" }}
                            label="Reativar"
                            variant="secondary"
                            confirmMessage="Reativar o acesso desta loja?"
                          />
                        ) : (
                          <InlineServerAction
                            action={setTenantStatusAction}
                            payload={{
                              tenantId: tenant.id,
                              status: "SUSPENSO",
                              reason: "Inadimplência",
                            }}
                            label="Suspender"
                            variant="destructive"
                            confirmMessage="Suspender esta loja por falta de pagamento? O acesso será bloqueado."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {page} de {pages} · {total} loja(s)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild size="sm" variant="outline">
                <Link href={pageHref(page - 1)}>Anterior</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild size="sm" variant="outline">
                <Link href={pageHref(page + 1)}>Próxima</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
