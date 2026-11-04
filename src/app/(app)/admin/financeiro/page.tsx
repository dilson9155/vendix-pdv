import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, KeyRound, QrCode, RefreshCw, ShieldAlert } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { getBillingConfig } from "@/services/billing.service";
import { listCharges } from "@/services/saas.service";
import { runBillingEnforcementAction } from "@/app/actions/saas.actions";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { InlineServerAction } from "@/components/forms/form-kit";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { BillingSettingsForm } from "@/components/admin/billing-settings-form";

export const metadata: Metadata = { title: "Recebimentos da plataforma" };
export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const ctx = await requirePlatformAdmin();
  const [config, charges] = await Promise.all([getBillingConfig(), listCharges(ctx, {})]);
  const open = charges.filter((charge) => charge.status === "PENDENTE" || charge.status === "VENCIDA");

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma · Financeiro"
        title="Recebimentos e cobrança"
        description="Chave PIX, QR Code das mensalidades, instruções de boleto e régua de suspensão por inadimplência."
        actions={
          <div className="flex flex-wrap gap-2">
            <InlineServerAction
              action={runBillingEnforcementAction}
              label="Rodar cobrança agora"
              variant="outline"
              icon={<RefreshCw className="size-3.5" />}
              confirmMessage="Atualizar vencidas e aplicar suspensões automáticas configuradas?"
            />
            <Button asChild size="sm">
              <Link href="/admin/cobrancas">Ver cobranças</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chave PIX"
          value={config.pixKey ? "Configurada" : "Não configurada"}
          tone={config.pixKey ? "positive" : "danger"}
          icon={<QrCode className="size-4" />}
        />
        <StatCard
          label="Vencimento padrão"
          value={`Dia ${config.billingDueDay}`}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard label="Carência" value={`${config.graceDays} dia(s)`} />
        <StatCard
          label="Suspensão automática"
          value={config.autoSuspend ? "Ligada" : "Desligada"}
          tone={config.autoSuspend ? "warning" : "default"}
          icon={<ShieldAlert className="size-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Dados de recebimento</h2>
          </div>
          <BillingSettingsForm config={config} />
        </section>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="font-semibold">Como o PIX é gerado</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A plataforma monta o BR Code (padrão do Banco Central) com a chave, o valor da
              mensalidade e o nome/cidade do beneficiário. O QR Code e o copia e cola aparecem
              automaticamente no link público de cada cobrança.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="font-semibold">Boleto</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              O Vendix não emite boleto registrado sozinho: informe a linha digitável e o link do
              PDF gerados pelo seu banco ao criar a cobrança. O link público exibe o boleto para a
              loja.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="font-semibold">Rotina diária</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Um cron da Vercel chama <code>/api/cron/billing</code> todos os dias. Ele marca
              vencidas e, se a suspensão automática estiver ligada, bloqueia lojas inadimplentes
              após a carência.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Cobranças em aberto</h2>
        {open.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhuma cobrança em aberto" description="Tudo em dia com as lojas." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Cobranças em aberto">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {open.slice(0, 12).map((charge) => (
                  <tr key={charge.id}>
                    <td className="font-medium">{charge.tenant?.name ?? "—"}</td>
                    <td>{charge.description}</td>
                    <td>{formatDateBR(charge.dueDate)}</td>
                    <td className="num">{formatBRL(charge.amount)}</td>
                    <td>
                      <StatusBadge status={charge.status} />
                    </td>
                    <td>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/cobrancas/${charge.id}`}>Abrir</Link>
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
