import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant";
import { getCompany } from "@/services/settings.service";
import { listPlans } from "@/services/saas.service";
import { getBillingConfig, listTenantCharges } from "@/services/billing.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assinatura" };
export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const ctx = await requireTenantAccess();
  const [company, plans, charges, config] = await Promise.all([
    getCompany(ctx.tenantId),
    listPlans(false),
    listTenantCharges(ctx.tenantId),
    getBillingConfig(),
  ]);

  const maxUsers = company.plan?.maxUsers ?? null;
  const maxBranches = company.plan?.maxBranches ?? null;
  const maxProducts = company.plan?.maxProducts ?? null;
  const subscription = company.subscription;

  const openCharges = charges.filter(
    (charge) => charge.status === "PENDENTE" || charge.status === "VENCIDA"
  );
  const openTotal = openCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const hasOverdue = openCharges.some((charge) => charge.status === "VENCIDA");

  return (
    <div>
      <PageHeader
        eyebrow="SaaS"
        title="Assinatura"
        description="Plano atual, ciclo de assinatura, limites da empresa e mensalidades."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plano" value={company.plan?.name ?? "—"} />
        <StatCard label="Status" value={subscription?.status ?? "TRIAL"} />
        <StatCard label="Trial" value={subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toISOString().slice(0, 10) : "—"} />
        <StatCard
          label="Em aberto"
          value={formatBRL(openTotal)}
          hint={`${openCharges.length} cobrança(s)`}
          tone={hasOverdue ? "danger" : "default"}
        />
      </div>

      {hasOverdue && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Existe mensalidade vencida. Regularize para evitar a suspensão automática do acesso.
            O bloqueio ocorre após {config.graceDays} dia(s) de carência.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Mensalidades</h2>
          <p className="text-xs text-muted-foreground">Vencimento padrão: dia {config.billingDueDay}</p>
        </div>
        {charges.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhuma mensalidade emitida" description="As cobranças aparecem aqui assim que a plataforma emitir." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Mensalidades">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Referência</th>
                  <th>Vencimento</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="font-medium">{charge.description}</td>
                    <td>{charge.referenceMonth}</td>
                    <td>{formatDateBR(charge.dueDate)}</td>
                    <td className="num">{formatBRL(charge.amount)}</td>
                    <td>
                      <StatusBadge status={charge.status} />
                    </td>
                    <td>
                      {charge.status === "PENDENTE" || charge.status === "VENCIDA" ? (
                        <Button asChild size="sm">
                          <Link href={`/pagamento/${charge.publicToken}`}>Pagar</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/pagamento/${charge.publicToken}`}>Ver</Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Limites do plano</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Usuários</dt>
            <dd className="mt-0.5 font-semibold">{maxUsers ?? "Ilimitado"}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Unidades</dt>
            <dd className="mt-0.5 font-semibold">{maxBranches ?? "Ilimitado"}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Produtos</dt>
            <dd className="mt-0.5 font-semibold">{maxProducts ?? "Ilimitado"}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Ciclo da assinatura</dt>
            <dd className="mt-0.5 font-semibold">
              {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().slice(0, 10) : "—"}
            </dd>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Planos disponíveis</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border bg-background px-3 py-3 text-sm">
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{plan.description}</p>
              <p className="mt-2 font-semibold">{formatBRL(plan.price)}/mês</p>
              <p className="text-xs text-muted-foreground">
                {plan.maxUsers ? `${plan.maxUsers} usuário(s)` : "Ilimitado"} · {plan.maxBranches ? `${plan.maxBranches} unidade(s)` : "Ilimitado"} ·{" "}
                {plan.maxProducts ? `${plan.maxProducts} produto(s)` : "Ilimitado"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
