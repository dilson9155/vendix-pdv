import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listCharges, listTenants } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { InlineAction } from "@/components/forms/form-kit";
import { CreateChargeForm } from "@/components/admin/create-charge-form";
import { cancelChargeAction, settleChargeAction } from "@/app/actions/saas.actions";
import { StatusBadge, TableShell, EmptyState, PageHeader, StatCard } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cobranças" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todas as situações" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "VENCIDA", label: "Vencida" },
  { value: "PAGA", label: "Paga" },
  { value: "CANCELADA", label: "Cancelada" },
];

export default async function AdminChargesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePlatformAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const status = params.status || undefined;

  const [charges, tenantsData] = await Promise.all([
    listCharges(ctx, { status }),
    listTenants(ctx, { page: 1 }),
  ]);
  const tenants = tenantsData.rows;

  const totalOpen = charges
    .filter((charge) => charge.status === "PENDENTE" || charge.status === "VENCIDA")
    .reduce((sum, charge) => sum + Number(charge.amount), 0);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const pageHref = (next: number) => {
    const clone = new URLSearchParams(query);
    clone.set("page", String(next));
    const qs = clone.toString();
    return qs ? `/admin/cobrancas?${qs}` : "/admin/cobrancas";
  };

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Cobranças"
        description="Cobranças de assinatura e planos comerciais por empresa."
        actions={
          <CreateChargeForm tenants={tenants} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cobranças em aberto" value={formatBRL(totalOpen)} tone="warning" />
        <StatCard label="Pendentes" value={String(charges.filter((charge) => charge.status === "PENDENTE").length)} />
        <StatCard label="Vencidas" value={String(charges.filter((charge) => charge.status === "VENCIDA").length)} tone="danger" />
        <StatCard label="Pagas" value={String(charges.filter((charge) => charge.status === "PAGA").length)} tone="positive" />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        {charges.length === 0 ? (
          <EmptyState title="Nenhuma cobrança encontrada" description="Crie uma cobrança para uma empresa em trial ou inadimplente." />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Cobranças">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Empresa</th>
                  <th>Plano</th>
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
                    <td>{charge.tenant?.name ?? "—"}</td>
                    <td>{charge.plan?.name ?? "—"}</td>
                    <td>{charge.referenceMonth}</td>
                    <td>{formatDateBR(charge.dueDate)}</td>
                    <td className="num font-semibold">{formatBRL(Number(charge.amount))}</td>
                    <td>
                      <StatusBadge status={charge.status} />
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {(charge.status === "PENDENTE" || charge.status === "VENCIDA") && (
                          <InlineAction
                            action={async () => {
                              const result = await settleChargeAction(charge.id);
                              return result;
                            }}
                            label="Marcar paga"
                            confirmMessage="Marcar esta cobrança como paga?"
                          />
                        )}
                        {charge.status !== "PAGA" && charge.status !== "CANCELADA" && (
                          <InlineAction
                            action={async () => {
                              const result = await cancelChargeAction(charge.id);
                              return result;
                            }}
                            label="Cancelar"
                            variant="destructive"
                            confirmMessage="Cancelar esta cobrança?"
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
            Página {page} · {charges.length} cobrança(ões) recentes
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Voltar ao painel</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
