import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listPlans } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { PlansManager } from "@/components/admin/plans-manager";
import type { PlanRow } from "@/components/admin/plan-dialog";

export const metadata: Metadata = { title: "Planos" };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const ctx = await requirePlatformAdmin();
  const plans = await listPlans(false);
  const rows: PlanRow[] = plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    trialDays: plan.trialDays,
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    maxProducts: plan.maxProducts,
    tenants: plan._count?.tenants ?? 0,
  }));

  const monthlyRevenue = rows.reduce((sum, plan) => sum + plan.price, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Planos"
        description="Planos de assinatura comercializados na plataforma Vendix."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Planos ativos" value={String(rows.length)} />
        <StatCard label="Receita mensal (ativos)" value={formatBRL(monthlyRevenue)} />
        <StatCard label="Planos com trial" value={String(rows.filter((plan) => plan.trialDays > 0).length)} />
        <StatCard label="Preço médio" value={formatBRL(rows.length ? monthlyRevenue / rows.length : 0)} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <PlansManager plans={rows} />
      </section>
    </div>
  );
}
