import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { getCompany } from "@/services/settings.service";
import { listPlans } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/page-blocks";

export const metadata: Metadata = { title: "Assinatura" };
export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const ctx = await requireTenant();
  const company = await getCompany(ctx.tenantId);
  const plans = await listPlans(false);

  const maxUsers = company.plan?.maxUsers ?? null;
  const maxBranches = company.plan?.maxBranches ?? null;
  const maxProducts = company.plan?.maxProducts ?? null;
  const subscription = company.subscription;

  return (
    <div>
      <PageHeader
        eyebrow="SaaS"
        title="Assinatura"
        description="Plano atual, ciclo de assinatura e limites da empresa."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plano" value={company.plan?.name ?? "—"} />
        <StatCard label="Status" value={subscription?.status ?? "TRIAL"} />
        <StatCard label="Trial" value={subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toISOString().slice(0, 10) : "—"} />
        <StatCard label="Valor" value={formatBRL(company.plan?.price ?? 0)} />
      </div>

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
