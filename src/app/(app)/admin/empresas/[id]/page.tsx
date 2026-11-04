import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { getTenant, listPlans } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR, toDateISO } from "@/lib/date";
import { setTenantStatusAction } from "@/app/actions/saas.actions";
import { InlineServerAction } from "@/components/forms/form-kit";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { TenantForm } from "@/components/admin/tenant-form";
import { DeleteTenantButton } from "@/components/admin/delete-tenant-button";

export const metadata: Metadata = { title: "Gerenciar loja" };
export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requirePlatformAdmin();

  const tenant = await getTenant(ctx, id).catch(() => null);
  if (!tenant) notFound();
  const plans = await listPlans(false);

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma · Loja"
        title={tenant.name}
        description={tenant.legalName ?? "Cadastro, assinatura, cobranças e situação de acesso da loja."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/empresas">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/cobrancas/nova?tenantId=${tenant.id}`}>
                <Plus className="size-4" /> Nova cobrança
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Situação" value={tenant.status === "ATIVO" ? "Ativa" : tenant.status === "SUSPENSO" ? "Suspensa" : "Cancelada"} tone={tenant.status === "ATIVO" ? "positive" : tenant.status === "SUSPENSO" ? "warning" : "danger"} />
        <StatCard label="Plano" value={tenant.plan?.name ?? "—"} hint={tenant.plan ? `${formatBRL(tenant.plan.price)}/mês` : undefined} />
        <StatCard label="Assinatura" value={tenant.subscription?.status ?? "TRIAL"} hint={tenant.subscription?.currentPeriodEnd ? `Ciclo até ${formatDateBR(tenant.subscription.currentPeriodEnd)}` : undefined} />
        <StatCard label="Trial até" value={tenant.trialEndsAt ? formatDateBR(tenant.trialEndsAt) : "—"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 rounded-xl border bg-card p-3 shadow-sm">
        {tenant.status !== "ATIVO" ? (
          <InlineServerAction
            action={setTenantStatusAction}
            payload={{ tenantId: tenant.id, status: "ATIVO" }}
            label="Reativar acesso"
            variant="default"
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
            label="Suspender por falta de pagamento"
            variant="destructive"
            icon={<ShieldAlert className="size-3.5" />}
            confirmMessage="Suspender a loja por inadimplência? Usuários perdem o acesso até a regularização."
          />
        )}
        {tenant.status !== "CANCELADO" && (
          <InlineServerAction
            action={setTenantStatusAction}
            payload={{
              tenantId: tenant.id,
              status: "CANCELADO",
              reason: "Cancelamento manual no painel da plataforma",
            }}
            label="Cancelar assinatura"
            variant="outline"
            confirmMessage="Cancelar a assinatura desta loja? O histórico financeiro é preservado."
          />
        )}
        <div className="ml-auto">
          <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_22rem] xl:items-start">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Dados cadastrais</h2>
          </div>
          <TenantForm
            mode="edit"
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: formatBRL(plan.price),
              trialDays: plan.trialDays,
            }))}
            tenant={{
              id: tenant.id,
              name: tenant.name,
              legalName: tenant.legalName,
              document: tenant.document,
              email: tenant.email,
              phone: tenant.phone,
              address: tenant.address,
              city: tenant.city,
              state: tenant.state,
              zipCode: tenant.zipCode,
              planId: tenant.planId,
              status: tenant.status,
              trialEndsAt: tenant.trialEndsAt ? toDateISO(tenant.trialEndsAt) : null,
              notes: tenant.notes,
            }}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-primary" /> Contato
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-3.5 text-muted-foreground" />
                <span className="break-all">{tenant.email ?? "—"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-3.5 text-muted-foreground" />
                <span>{tenant.phone ?? "—"}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 text-muted-foreground" />
                <span>
                  {[tenant.address, tenant.city, tenant.state].filter(Boolean).join(", ") || "—"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-3.5 text-muted-foreground" />
                <span>Cadastrada em {formatDateBR(tenant.createdAt)}</span>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-primary" /> Estrutura
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-background px-2.5 py-2">
                <dt className="text-[11px] text-muted-foreground">Usuários</dt>
                <dd className="font-semibold">{tenant._count.users}</dd>
              </div>
              <div className="rounded-lg border bg-background px-2.5 py-2">
                <dt className="text-[11px] text-muted-foreground">Unidades</dt>
                <dd className="font-semibold">{tenant._count.branches}</dd>
              </div>
              <div className="rounded-lg border bg-background px-2.5 py-2">
                <dt className="text-[11px] text-muted-foreground">Produtos</dt>
                <dd className="font-semibold">{tenant._count.products}</dd>
              </div>
              <div className="rounded-lg border bg-background px-2.5 py-2">
                <dt className="text-[11px] text-muted-foreground">Vendas</dt>
                <dd className="font-semibold">{tenant._count.sales}</dd>
              </div>
            </dl>
            {tenant.branches.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {tenant.branches.map((branch) => (
                  <li key={branch.id}>
                    • {branch.name} {branch.isHeadquarters ? "(matriz)" : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="size-4 text-primary" /> Cobranças da loja
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/cobrancas/nova?tenantId=${tenant.id}`}>
              <Plus className="size-3.5" /> Emitir cobrança
            </Link>
          </Button>
        </div>

        {tenant.charges.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nenhuma cobrança"
              description="Emita a primeira mensalidade desta loja com PIX ou boleto."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Cobranças da loja">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Referência</th>
                  <th>Vencimento</th>
                  <th>Forma</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tenant.charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="font-medium">{charge.description}</td>
                    <td>{charge.referenceMonth}</td>
                    <td>{formatDateBR(charge.dueDate)}</td>
                    <td>{charge.method}</td>
                    <td className="num">{formatBRL(charge.amount)}</td>
                    <td>
                      <StatusBadge status={charge.status} />
                    </td>
                    <td>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/cobrancas/${charge.id}`}>
                          Abrir <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>
    </div>
  );
}
