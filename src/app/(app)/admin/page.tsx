import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/tenant";
import { getPlatformOverview, listCharges, listNotices, listPlatformAudit, listPlans, listTenants } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";

export const metadata: Metadata = { title: "Plataforma SaaS" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ctx = await requirePlatformAdmin();
  const [overview, tenants, plans, charges, notices, audit] = await Promise.all([
    getPlatformOverview(ctx),
    listTenants(ctx, {}),
    listPlans(false),
    listCharges(ctx, {}),
    listNotices(ctx),
    listPlatformAudit(ctx, 50),
  ]);

  const recentTenantRows = tenants.rows.slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Administração SaaS"
        description="Empresas, planos, cobranças, avisos e auditoria da plataforma Vendix."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empresas" value={String(overview.tenants)} hint={`${overview.activeTenants} ativa(s)`} />
        <StatCard label="Trials ativos" value={String(overview.trialTenants)} />
        <StatCard label="MRR" value={formatBRL(overview.mrr)} />
        <StatCard label="Cobranças" value={formatBRL(overview.overdueCharges + overview.pendingCharges)} hint={`${formatBRL(overview.overdueCharges)} vencida(s)`} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Empresas recentes</h2>
        <div className="mt-3 overflow-x-auto">
          <TableShell caption="Empresas">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Assinatura</th>
                <th>Cadastrada</th>
              </tr>
            </thead>
            <tbody>
              {recentTenantRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="Nenhuma empresa" />
                  </td>
                </tr>
              ) : (
                recentTenantRows.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="font-medium">{tenant.name}</td>
                    <td>{tenant.plan?.name ?? "—"}</td>
                    <td>
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td>{tenant.subscription?.status ?? "TRIAL"}</td>
                    <td>{formatDateBR(tenant.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </div>
      </section>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Planos</h2>
          </div>
          <div className="mt-3 space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between text-sm">
                <span>
                  {plan.name} <span className="text-muted-foreground">· {plan.maxBranches} unidade(s)</span>
                </span>
                <span className="font-semibold">{formatBRL(plan.price)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Cobranças em aberto</h2>
          </div>
          <div className="mt-3 space-y-2">
            {charges.filter((charge) => charge.status !== "PAGA").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma cobrança aberta.</p>
            ) : (
              charges
                .filter((charge) => charge.status !== "PAGA")
                .slice(0, 8)
                .map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-sm">
                    <span>
                      {charge.description} <span className="text-muted-foreground">· {charge.tenant?.name}</span>
                    </span>
                    <span className="tabular-nums font-semibold">{formatBRL(Number(charge.amount))}</span>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Avisos ativos</h2>
          {notices.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum aviso publicado.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {notices.slice(0, 5).map((notice) => (
                <li key={notice.id} className="rounded-lg border bg-background px-3 py-2 text-sm">
                  <span className="font-semibold">{notice.title}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{notice.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Auditoria recente</h2>
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Auditoria">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Módulo</th>
                  <th>Entidade</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="Sem registros" />
                    </td>
                  </tr>
                ) : (
                  audit.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateBR(entry.createdAt)}</td>
                      <td>{entry.user?.name ?? "—"}</td>
                      <td>{entry.action}</td>
                      <td>{entry.module}</td>
                      <td>{entry.entity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableShell>
          </div>
        </section>
      </div>
    </div>
  );
}
