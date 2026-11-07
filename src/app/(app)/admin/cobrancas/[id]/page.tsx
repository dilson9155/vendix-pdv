import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Receipt, XCircle } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { getCharge } from "@/services/saas.service";
import { getBillingConfig, pixForCharge } from "@/services/billing.service";
import { publicChargeUrl } from "@/lib/app-url";
import { cancelChargeAction, settleChargeAction } from "@/app/actions/saas.actions";
import { formatBRL } from "@/lib/money";
import { formatDateBR, toDateISO } from "@/lib/date";
import { InlineServerAction } from "@/components/forms/form-kit";
import { PageHeader, StatusBadge } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/billing/copy-button";
import { ChargePaymentPanel } from "@/components/billing/charge-payment-panel";
import { ChargeForm } from "@/components/admin/charge-form";

export const metadata: Metadata = { title: "Cobrança" };
export const dynamic = "force-dynamic";

export default async function ChargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requirePlatformAdmin();
  const charge = await getCharge(ctx, id).catch(() => null);
  if (!charge) notFound();

  const config = await getBillingConfig();
  const pix = charge.method === "PIX" ? pixForCharge(charge, config) : null;
  const paymentUrl = publicChargeUrl(charge.publicToken);

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma · Cobrança"
        title={charge.description}
        description={`${charge.tenant.name} · referência ${charge.referenceMonth} · ${formatBRL(charge.amount)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/cobrancas">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
            {(charge.status === "PENDENTE" || charge.status === "VENCIDA") && (
              <InlineServerAction
                action={settleChargeAction}
                payload={charge.id}
                label="Marcar como paga"
                variant="default"
                icon={<CheckCircle2 className="size-3.5" />}
                confirmTitle="Confirmar recebimento"
                confirmMessage="Confirmar o recebimento desta cobrança? A loja pode ser reativada automaticamente."
              />
            )}
            {charge.status !== "PAGA" && charge.status !== "CANCELADA" && (
              <InlineServerAction
                action={cancelChargeAction}
                payload={charge.id}
                label="Cancelar cobrança"
                variant="destructive"
                icon={<XCircle className="size-3.5" />}
                confirmMessage="Cancelar esta cobrança?"
              />
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-sm shadow-sm">
        <StatusBadge status={charge.status} />
        <span className="text-muted-foreground">Vencimento {formatDateBR(charge.dueDate)}</span>
        <span className="text-muted-foreground">Forma {charge.method}</span>
        {charge.paidAt && <span className="text-emerald-700">Pago em {formatDateBR(charge.paidAt)}</span>}
        <div className="ml-auto">
          <CopyButton value={paymentUrl} label="Copiar link de pagamento" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ChargePaymentPanel
          charge={charge}
          config={config}
          pix={pix}
          paymentUrl={paymentUrl}
          admin
        />

        <aside className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="size-4 text-primary" /> Editar cobrança
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cobranças pagas ou canceladas ficam disponíveis apenas para consulta.
          </p>
          <div className="mt-3">
            {charge.status === "PAGA" || charge.status === "CANCELADA" ? (
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Esta cobrança não pode mais ser alterada.
              </p>
            ) : (
              <ChargeForm
                mode="edit"
                tenants={[{ id: charge.tenant.id, name: charge.tenant.name }]}
                charge={{
                  id: charge.id,
                  tenantId: charge.tenantId,
                  description: charge.description,
                  referenceMonth: charge.referenceMonth,
                  amount: charge.amount.toString(),
                  dueDate: toDateISO(charge.dueDate),
                  notes: charge.notes,
                  method: charge.method,
                  boletoCode: charge.boletoCode,
                  boletoUrl: charge.boletoUrl,
                  paymentUrl: charge.paymentUrl,
                  instructions: charge.instructions,
                }}
                defaultDueDate={toDateISO(charge.dueDate)}
                defaultReferenceMonth={charge.referenceMonth}
                pixConfigured={Boolean(config.pixKey)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
