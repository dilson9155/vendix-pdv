import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, RefreshCw, Search } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listCharges, listTenants } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { InlineServerAction } from "@/components/forms/form-kit";
import { cancelChargeAction, runBillingEnforcementAction, settleChargeAction } from "@/app/actions/saas.actions";
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
  const status = params.status || undefined;

  const [charges, tenantsData] = await Promise.all([
    listCharges(ctx, { status, q: params.q }),
    listTenants(ctx, { page: 1 }),
  ]);
  const tenants = tenantsData.rows;

  const totalOpen = charges
    .filter((charge) => charge.status === "PENDENTE" || charge.status === "VENCIDA")
    .reduce((sum, charge) => sum + Number(charge.amount), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Cobranças"
        description="Mensalidades por loja com PIX (QR Code e copia e cola), boleto e link público de pagamento."
        actions={
          <div className="flex flex-wrap gap-2">
            <InlineServerAction
              action={runBillingEnforcementAction}
              label="Atualizar vencidas"
              variant="outline"
              icon={<RefreshCw className="size-3.5" />}
              confirmMessage="Atualizar cobranças vencidas e aplicar as suspensões automáticas configuradas?"
            />
            <Button asChild size="sm">
              <Link href="/admin/cobrancas/nova">
                <Plus className="size-4" /> Nova cobrança
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cobranças em aberto" value={formatBRL(totalOpen)} tone="warning" />
        <StatCard label="Pendentes" value={String(charges.filter((charge) => charge.status === "PENDENTE").length)} />
        <StatCard label="Vencidas" value={String(charges.filter((charge) => charge.status === "VENCIDA").length)} tone="danger" />
        <StatCard label="Pagas" value={String(charges.filter((charge) => charge.status === "PAGA").length)} tone="positive" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Descrição ou loja"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar cobrança"
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

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        {charges.length === 0 ? (
          <EmptyState
            title="Nenhuma cobrança encontrada"
            description="Emita uma mensalidade com PIX ou boleto para uma loja."
            action={
              <Button asChild size="sm">
                <Link href="/admin/cobrancas/nova">
                  <Plus className="size-4" /> Nova cobrança
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Cobranças">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Loja</th>
                  <th>Plano</th>
                  <th>Referência</th>
                  <th>Vencimento</th>
                  <th>Forma</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="font-medium">
                      <Link href={`/admin/cobrancas/${charge.id}`} className="hover:text-primary hover:underline">
                        {charge.description}
                      </Link>
                    </td>
                    <td>{charge.tenant?.name ?? "—"}</td>
                    <td>{charge.plan?.name ?? "—"}</td>
                    <td>{charge.referenceMonth}</td>
                    <td>{formatDateBR(charge.dueDate)}</td>
                    <td>{charge.method}</td>
                    <td className="num font-semibold">{formatBRL(charge.amount)}</td>
                    <td>
                      <StatusBadge status={charge.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/cobrancas/${charge.id}`}>
                            Abrir <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                        {(charge.status === "PENDENTE" || charge.status === "VENCIDA") && (
                          <InlineServerAction
                            action={settleChargeAction}
                            payload={charge.id}
                            label="Marcar paga"
                            confirmMessage="Confirmar o recebimento desta cobrança?"
                          />
                        )}
                        {charge.status !== "PAGA" && charge.status !== "CANCELADA" && (
                          <InlineServerAction
                            action={cancelChargeAction}
                            payload={charge.id}
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
          <span>{charges.length} cobrança(ões) recentes</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Voltar ao painel</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
