import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt, ShieldCheck } from "lucide-react";
import { getPublicCharge } from "@/services/billing.service";
import { publicChargeUrl } from "@/lib/app-url";
import { ChargePaymentPanel } from "@/components/billing/charge-payment-panel";
import { VendixMark } from "@/components/brand/vendix-mark";

export const metadata: Metadata = {
  title: "Pagamento da mensalidade",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicChargePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicCharge(token).catch(() => null);
  if (!data) notFound();

  const { charge, config, pix } = data;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <VendixMark className="size-9 shadow-md shadow-slate-900/15" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Vendix</span>
              <span className="block text-[10px] text-muted-foreground">Pagamento seguro</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="size-3.5" /> Link exclusivo
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-start gap-2 rounded-xl border bg-white p-3 text-xs text-muted-foreground">
          <Receipt className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Você está pagando a mensalidade da loja <strong>{charge.tenant.name}</strong> para a
            plataforma Vendix. Guarde o comprovante após o pagamento.
          </p>
        </div>

        <ChargePaymentPanel
          charge={charge}
          config={config}
          pix={pix}
          paymentUrl={publicChargeUrl(charge.publicToken)}
        />

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Este link é pessoal e exclusivo desta cobrança. Em caso de dúvidas, fale com o suporte da
          plataforma.
        </p>
      </main>
    </div>
  );
}
