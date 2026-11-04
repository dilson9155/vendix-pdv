import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "@/components/billing/copy-button";
import { formatBRL, type Numeric } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { pixForCharge, type BillingConfig } from "@/services/billing.service";

type OpenCharge = {
  description: string;
  referenceMonth: string;
  amount: Exclude<Numeric, null | undefined>;
  dueDate: Date | string;
  status: string;
  publicToken: string;
  boletoCode: string | null;
  boletoUrl: string | null;
  pixKey: string | null;
  pixBeneficiary: string | null;
  pixCity: string | null;
};

type NoticeItem = {
  id: string;
  title: string;
  message: string;
  level: string;
};

const MOTIVATIONAL_PHRASES = [
  "Grandes resultados começam com pequenas atitudes diárias. Bom trabalho!",
  "Cada venda é a prova de que o seu esforço está dando resultado. Continue!",
  "Organização hoje, tranquilidade amanhã. Sua gestão está no caminho certo.",
  "Foco no cliente, cuidado no detalhe e consistência todos os dias.",
  "Uma meta por vez, um passo de cada vez. O progresso é construído assim.",
  "Seu negócio cresce quando você cuida dos detalhes. E você está cuidando.",
  "Dia de hoje é oportunidade de superar o ontem. Vamos em frente!",
  "Atendimento gentil e gestão atenta são a combinação do sucesso.",
];

const LEVEL_STYLES: Record<string, { box: string; badge: string; label: string }> = {
  INFO: {
    box: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    label: "Info",
  },
  ALERTA: {
    box: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    label: "Alerta",
  },
  URGENTE: {
    box: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700",
    label: "Urgente",
  },
};

export function BillingNoticeBox({
  charges,
  config,
  notices,
}: {
  charges: OpenCharge[];
  config: BillingConfig;
  notices: NoticeItem[];
}) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const mostUrgent = charges[0];
  const pix = mostUrgent ? pixForCharge(mostUrgent, config) : null;
  const overdue = charges.some((charge) => charge.status === "VENCIDA");
  const phrase = MOTIVATIONAL_PHRASES[new Date().getDate() % MOTIVATIONAL_PHRASES.length];

  return (
    <div className="mb-4 space-y-3">
      {mostUrgent && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="rounded-xl bg-red-600 p-2 text-white shadow-sm">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  {overdue ? "Mensalidade vencida" : "Mensalidade em aberto"}
                  {charges.length > 1 ? ` · +${charges.length - 1} cobrança(s)` : ""}
                </p>
                <p className="text-xs text-red-700">
                  Total em aberto <strong>{formatBRL(total)}</strong> · vencimento mais próximo em{" "}
                  <strong>{formatDateBR(mostUrgent.dueDate)}</strong>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {mostUrgent.description} · ref. {mostUrgent.referenceMonth}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pix && <CopyButton value={pix.key} label="Copiar chave PIX" />}
              <a
                href={mostUrgent.boletoUrl || `/api/boleto/${mostUrgent.publicToken}`}
                download={mostUrgent.boletoUrl ? undefined : true}
                target={mostUrgent.boletoUrl ? "_blank" : undefined}
                rel={mostUrgent.boletoUrl ? "noreferrer" : undefined}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                <Download className="size-3.5" /> Boleto
              </a>
              <Link
                href="/assinatura"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Pagar agora <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          {pix && (
            <div className="border-t border-red-100 bg-white/60 px-4 py-2">
              <p className="truncate text-[11px] text-muted-foreground">
                Chave PIX ({pix.keyType}): <span className="font-medium text-foreground">{pix.key}</span>
              </p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="size-4 text-primary" /> Avisos da plataforma
          </h2>
          {notices.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{notices.length} aviso(s)</span>
          )}
        </div>

        {notices.length === 0 ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50 p-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">{phrase}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                <CheckCircle2 className="size-3" /> Nenhum aviso pendente. Tudo em ordem por aqui.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {notices.map((notice) => {
              const style = LEVEL_STYLES[notice.level] ?? LEVEL_STYLES.INFO;
              return (
                <li key={notice.id} className={`rounded-lg border p-2.5 ${style.box}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style.badge}`}>
                      {style.label}
                    </span>
                    <p className="text-xs font-semibold">{notice.title}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {notice.message}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
