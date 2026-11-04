import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound, QrCode, Receipt } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { platformChargeDefaults } from "@/services/saas.service";
import { currentMonthISO, todayISO } from "@/lib/date";
import { PageHeader } from "@/components/page-blocks";
import { ChargeForm } from "@/components/admin/charge-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nova cobrança" };
export const dynamic = "force-dynamic";

function nextDueDate(dueDay: number): string {
  const day = Math.min(Math.max(dueDay, 1), 28).toString().padStart(2, "0");
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const current = `${year}-${String(month).padStart(2, "0")}-${day}`;
  if (current >= today) return current;

  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${day}`;
}

export default async function NewChargePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePlatformAdmin();
  const params = await searchParams;
  const { tenants, config } = await platformChargeDefaults();
  const selectedTenant = tenants.some((tenant) => tenant.id === params.tenantId)
    ? params.tenantId
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma · Cobranças"
        title="Nova cobrança"
        description="Emita a mensalidade de uma loja com PIX automático ou boleto bancário."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={selectedTenant ? `/admin/empresas/${selectedTenant}` : "/admin/cobrancas"}>
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem] lg:items-start">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <ChargeForm
            mode="create"
            tenants={tenants.map((tenant) => ({
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
            }))}
            defaultTenantId={selectedTenant}
            defaultDueDate={nextDueDate(config.billingDueDay)}
            defaultReferenceMonth={currentMonthISO()}
            pixConfigured={Boolean(config.pixKey)}
          />
        </section>

        <aside className="space-y-3">
          {config.pixKey ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-semibold">
                <QrCode className="size-4" /> PIX configurado
              </p>
              <p className="mt-1 break-all text-xs">
                {config.pixKey}
                {config.pixBeneficiary ? ` · ${config.pixBeneficiary}` : ""}
              </p>
              <p className="mt-2 text-xs">
                O QR Code e o código copia e cola são gerados automaticamente na cobrança.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4" /> PIX não configurado
              </p>
              <p className="mt-1 text-xs">
                Cadastre a chave PIX da plataforma para emitir cobranças com QR Code.
              </p>
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/financeiro">Configurar recebimentos</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Receipt className="size-4 text-primary" /> Como funciona
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>• PIX: QR Code e copia e cola com o valor já preenchido.</li>
              <li>• Boleto: informe a linha digitável e/ou o PDF emitido pelo banco.</li>
              <li>• Cada cobrança recebe um link público exclusivo.</li>
              <li>• Ao marcar como paga, a loja suspensa é reativada quando não há outras pendências.</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="font-semibold">Régua de cobrança atual</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vencimento padrão: dia {config.billingDueDay}
              <br />
              Carência: {config.graceDays} dia(s)
              <br />
              Suspensão automática: {config.autoSuspend ? "ligada" : "desligada"}
            </p>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/financeiro">Editar régua</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
