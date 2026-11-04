import Link from "next/link";
import { AlertTriangle, CalendarDays, Download, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/billing/copy-button";
import { PixQr } from "@/components/billing/pix-qr";
import { PIX_KEY_TYPE_LABELS } from "@/lib/pix";
import { formatBRL, type Numeric } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import type { PixChargeData } from "@/services/billing.service";

export type OpenChargeData = {
  description: string;
  referenceMonth: string;
  amount: Exclude<Numeric, null | undefined>;
  dueDate: Date | string;
  status: string;
  publicToken: string;
  boletoCode: string | null;
  boletoUrl: string | null;
  instructions: string | null;
};

/**
 * Cartão de mensalidade em aberto exibido dentro da área da loja.
 * Reúne os dados de pagamento (PIX e boleto) sem exigir abrir outra página.
 */
export function OpenChargeCard({
  charge,
  pix,
  showQr = false,
}: {
  charge: OpenChargeData;
  pix: PixChargeData | null;
  showQr?: boolean;
}) {
  const overdue = charge.status === "VENCIDA";
  const hasBoleto = Boolean(charge.boletoCode || charge.boletoUrl);
  const boletoHref = charge.boletoUrl || `/api/boleto/${charge.publicToken}`;

  return (
    <article
      className={`rounded-xl border p-4 shadow-sm ${
        overdue ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
              overdue ? "text-red-700" : "text-amber-700"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            {overdue ? "Mensalidade vencida" : "Mensalidade em aberto"}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold">{charge.description}</h3>
          <p className="text-xs text-muted-foreground">
            Referência {charge.referenceMonth} · vence em {formatDateBR(charge.dueDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums">{formatBRL(charge.amount)}</p>
          <Link
            href={`/pagamento/${charge.publicToken}`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Abrir página de pagamento <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {pix ? (
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold">PIX</p>
              <dl className="mt-1.5 space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <dt className="text-muted-foreground">
                    Chave ({PIX_KEY_TYPE_LABELS[pix.keyType]}):
                  </dt>
                  <dd className="break-all font-medium">{pix.key}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <dt className="text-muted-foreground">Beneficiário:</dt>
                  <dd className="font-medium">{pix.beneficiary}</dd>
                </div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={pix.key} label="Copiar chave PIX" />
                <CopyButton value={pix.payload} label="Copiar código PIX" variant="secondary" />
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              A chave PIX ainda não foi configurada pela plataforma. Fale com o suporte para receber
              os dados de pagamento.
            </p>
          )}

          <div className="rounded-lg border bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <FileText className="size-3.5 text-primary" /> Boleto
            </p>
            {charge.boletoCode ? (
              <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed">
                {charge.boletoCode}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {hasBoleto
                  ? "Use o botão abaixo para abrir o boleto."
                  : "Nenhuma linha digitável foi anexada. Baixe o documento de cobrança com os dados de PIX."}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {charge.boletoCode && (
                <CopyButton value={charge.boletoCode} label="Copiar linha digitável" />
              )}
              <a
                href={boletoHref}
                download={charge.boletoUrl ? undefined : true}
                target={charge.boletoUrl ? "_blank" : undefined}
                rel={charge.boletoUrl ? "noreferrer" : undefined}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                <Download className="size-3.5" />
                {hasBoleto ? "Baixar boleto (PDF)" : "Baixar documento (PDF)"}
              </a>
            </div>
          </div>
        </div>

        {showQr && pix && (
          <div className="mx-auto rounded-xl border bg-white p-2 shadow-sm lg:mx-0">
            <PixQr value={pix.payload} size={172} />
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              Escaneie no app do banco
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" /> Vencimento {formatDateBR(charge.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3" /> Pagamento seguro · a liberação é automática após a
          confirmação
        </span>
      </div>
    </article>
  );
}
