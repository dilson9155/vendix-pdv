"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PlanDialog, type PlanRow } from "@/components/admin/plan-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { formatBRL } from "@/lib/money";

export function PlansManager({ plans }: { plans: PlanRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (plan: PlanRow) => {
    setEditing(plan);
    setDialogOpen(true);
  };

  const monthlyRevenue = plans.reduce((sum, plan) => sum + plan.price, 0);

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Planos"
        description="Planos de assinatura comercializados na plataforma Vendix."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Novo plano
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Planos ativos" value={String(plans.length)} />
        <StatCard label="Receita mensal" value={formatBRL(monthlyRevenue)} />
        <StatCard label="Com trial" value={String(plans.filter((plan) => plan.trialDays > 0).length)} />
        <StatCard label="Preço médio" value={formatBRL(plans.length ? monthlyRevenue / plans.length : 0)} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        {plans.length === 0 ? (
          <EmptyState title="Nenhum plano encontrado" description="Crie o primeiro plano de assinatura." />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Planos">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th className="num">Preço</th>
                  <th className="num">Trial (dias)</th>
                  <th className="num">Usuários</th>
                  <th className="num">Unidades</th>
                  <th className="num">Produtos</th>
                  <th>Empresas</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="font-medium">{plan.code}</td>
                    <td>{plan.name}</td>
                    <td className="num font-semibold">{formatBRL(plan.price)}</td>
                    <td className="num">{plan.trialDays}</td>
                    <td className="num">{plan.maxUsers ?? "∞"}</td>
                    <td className="num">{plan.maxBranches ?? "∞"}</td>
                    <td className="num">{plan.maxProducts ?? "∞"}</td>
                    <td className="num">{plan.tenants}</td>
                    <td>
                      <StatusBadge status="ATIVO" />
                    </td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <PlanDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editing} />
    </>
  );
}
