import { CalendarDays, ExternalLink, FileText, MessageCircle, QrCode, Store } from "lucide-react";
import { CopyButton } from "@/components/billing/copy-button";
import { PixQr } from "@/components/billing/pix-qr";
import { PIX_KEY_TYPE_LABELS } from "@/lib/pix";
import { formatBRL, type Numeric } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import type { BillingConfig, PixChargeData } from "@/services/billing.service";

export type PaymentCharge = {
  description: string;
  referenceMonth: string;
  amount: Numeric;
  dueDate: Date | string;
  status: string;
  paidAt?: Date | string | null;
  method: string;
  publicToken: string;
  boletoCode: string | null;
  boletoUrl: string | null;
  paymentUrl: string | null;
  instructions: string | null;
  pixKey: string | null;
  pixBeneficiary: string | null;
  pixCity: string | null;
  tenant?: { name: string } | null;
  plan?: { name: string } | null;
};

const METHOD_LABELS: Record<string, string> = {
  PIX: "PIX",
  BOLETO: "Boleto bancário",
  TRANSFERENCIA: "Transferência",
  OUTRO: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  VENCIDA: "Vencida",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

function supportLink(config: BillingConfig, charge: PaymentCharge): string | null {
  if (!config.supportWhatsapp) return null;
  const digits = config.supportWhatsapp.replace(/\D/g, "");
  if (!digits) return null;
  const message = [
    `Olá! Enviei o comprovante da mensalidade ${charge.referenceMonth}.`,
    `Loja: ${charge.tenant?.name ?? "—"}`,
    `Valor: ${formatBRL(charge.amount)}`,
    `Referência: ${charge.publicToken}`,
  ].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export async function ChargePaymentPanel({
  charge,
  config,
  pix,
  paymentUrl,
  admin = false,
}: {
  charge: PaymentCharge;
  config: BillingConfig;
  pix: PixChargeData | null;
  paymentUrl: string;
  admin?: boolean;
}) {
  const whatsapp = supportLink(config, charge);
  const paid = charge.status === "PAGA";
  const canceled = charge.status === "CANCELADA";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
            <h2 className="text-lg font-semibold">{charge.description}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Referência {charge.referenceMonth}
              {charge.plan?.name ? ` · Plano ${charge.plan.name}` : ""}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
              paid
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : canceled
                  ? "border-gray-200 bg-gray-100 text-gray-600"
                  : charge.status === "VENCIDA"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {STATUS_LABELS[charge.status] ?? charge.status}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Valor</p>
            <p className="text-xl font-semibold tabular-nums">{formatBRL(charge.amount)}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3" /> Vencimento
            </p>
            <p className="mt-0.5 font-semibold">{formatDateBR(charge.dueDate)}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Store className="size-3" /> Loja
            </p>
            <p className="mt-0.5 truncate font-semibold">{charge.tenant?.name ?? "—"}</p>
          </div>
        </div>
      </section>

      {!paid && !canceled && (
        <>
          {charge.method === "PIX" && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <QrCode className="size-4 text-primary" /> Pagar com PIX
              </h3>
              {pix ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                  <div className="mx-auto rounded-xl border bg-white p-2 shadow-sm sm:mx-0">
                    <PixQr value={pix.payload} size={196} />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Abra o aplicativo do seu banco, escolha <strong>PIX</strong> e escaneie o QR
                      Code. Também é possível usar o código copia e cola.
                    </p>
                    <div className="rounded-lg border bg-background p-2">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                        PIX copia e cola
                      </p>
                      <p className="max-h-24 overflow-y-auto break-all font-mono text-[10px] leading-relaxed">
                        {pix.payload}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyButton value={pix.payload} label="Copiar código PIX" />
                      <CopyButton value={pix.key} label="Copiar chave PIX" variant="secondary" />
                    </div>
                    <dl className="grid gap-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Chave ({PIX_KEY_TYPE_LABELS[pix.keyType]})</dt>
                        <dd className="break-all font-medium">{pix.key}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Beneficiário</dt>
                        <dd className="font-medium">{pix.beneficiary}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  A chave PIX ainda não foi configurada pela plataforma. Fale com o suporte para
                  receber os dados de pagamento.
                </p>
              )}
            </section>
          )}

          {(charge.method === "BOLETO" || charge.boletoCode || charge.boletoUrl) && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" /> Boleto bancário
              </h3>
              <div className="mt-3 space-y-3">
                {charge.boletoCode && (
                  <div className="rounded-lg border bg-background p-2">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Linha digitável
                    </p>
                    <p className="break-all font-mono text-xs leading-relaxed">{charge.boletoCode}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {charge.boletoCode && (
                    <CopyButton value={charge.boletoCode} label="Copiar linha digitável" />
                  )}
                  {charge.boletoUrl && (
                    <a
                      href={charge.boletoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
                    >
                      <ExternalLink className="size-3.5" /> Abrir boleto (PDF)
                    </a>
                  )}
                </div>
                {!charge.boletoCode && !charge.boletoUrl && (
                  <p className="text-xs text-muted-foreground">
                    O boleto será disponibilizado em breve. Consulte o suporte.
                  </p>
                )}
              </div>
            </section>
          )}

          {charge.paymentUrl && charge.method !== "BOLETO" && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <a
                href={charge.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-4" /> Abrir link de pagamento
              </a>
            </section>
          )}

          {charge.instructions && (
            <section className="rounded-xl border bg-card p-4 text-sm shadow-sm">
              <h3 className="text-sm font-semibold">Instruções</h3>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {charge.instructions}
              </p>
            </section>
          )}

          <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="font-semibold">Já pagou?</p>
            <p className="mt-1 text-xs leading-relaxed">
              Envie o comprovante para a plataforma. A liberação é feita pelo administrador e,
              quando a última cobrança em aberto é quitada, a loja volta a operar automaticamente.
            </p>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="size-3.5" /> Enviar comprovante no WhatsApp
              </a>
            )}
          </section>
        </>
      )}

      {paid && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Mensalidade paga</p>
          <p className="mt-1 text-xs">
            Pagamento confirmado em {formatDateBR(charge.paidAt)}.
            Obrigado!
          </p>
        </section>
      )}

      {canceled && (
        <section className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          Esta cobrança foi cancelada pela plataforma.
        </section>
      )}

      {admin && (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Link público de pagamento</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Envie este link para a loja por WhatsApp ou e-mail.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-lg border bg-background px-2 py-1.5 text-[11px]">
              {paymentUrl}
            </code>
            <CopyButton value={paymentUrl} label="Copiar link" />
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                <MessageCircle className="size-3.5" /> Cobrar no WhatsApp
              </a>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Forma: {METHOD_LABELS[charge.method] ?? charge.method}
          </p>
        </section>
      )}
    </div>
  );
}
