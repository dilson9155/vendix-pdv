"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Copy, Link2, Loader2, MessageCircle, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/forms/form-kit";
import { formatBRL } from "@/lib/money";
import {
  cancelSaleAction,
  createReceiptLinkAction,
  createSaleReturnAction,
  shareReceiptAction,
} from "@/app/actions/sales.actions";

type ReturnItem = {
  id: string;
  description: string;
  sku: string;
  available: number;
  unitPrice: number;
};

export function ShareReceiptBox({
  saleId,
  defaultPhone,
}: {
  saleId: string;
  defaultPhone: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="size-4 text-primary" /> Compartilhar comprovante
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Gera um link tokenizado com validade de 7 dias. Sem a WhatsApp Cloud API configurada, o
        Vendix abre o WhatsApp com a mensagem pronta — o envio é confirmado por você.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          className="h-9"
          aria-label="WhatsApp do cliente"
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !phone.trim()}
          onClick={() => {
            setError(null);
            setFeedback(null);
            startTransition(async () => {
              const result = await shareReceiptAction({ saleId, phone });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              if (result.data?.mode === "manual" && result.data.url) {
                window.open(result.data.url, "_blank", "noopener,noreferrer");
                setFeedback(
                  "WhatsApp aberto em nova aba. Confirme o envio da mensagem no aplicativo."
                );
              } else {
                setFeedback("Comprovante enviado pela WhatsApp Cloud API.");
              }
            });
          }}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Enviar
        </Button>
      </div>
      <FormMessage error={error} success={feedback} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await createReceiptLinkAction(saleId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setLink(result.data?.url ?? null);
              if (result.data?.url) await navigator.clipboard?.writeText(result.data.url).catch(() => null);
            });
          }}
        >
          <Link2 className="size-4" /> Gerar link
        </Button>
        {link && (
          <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="size-3.5 text-emerald-600" />
            <span className="truncate">{link}</span>
            <button
              type="button"
              className="shrink-0 text-primary hover:underline"
              onClick={() => navigator.clipboard?.writeText(link).catch(() => null)}
            >
              <Copy className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

export function SaleActions({
  saleId,
  status,
  canCancel,
  canReturn,
  items,
}: {
  saleId: string;
  status: string;
  canCancel: boolean;
  canReturn: boolean;
  items: ReturnItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.id, true]))
  );
  const [pending, startTransition] = useTransition();

  const returnable = items.filter((item) => item.available > 0);
  const refundPreview = returnable.reduce((sum, item) => {
    const quantity = Number((quantities[item.id] ?? "").replace(",", ".")) || 0;
    return sum + Math.min(quantity, item.available) * item.unitPrice;
  }, 0);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Printer className="size-4 text-primary" /> Ações da venda
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`/vendas/${saleId}/comprovante?print=1`} target="_blank" rel="noreferrer">
            <Printer className="size-4" /> Imprimir comprovante
          </a>
        </Button>
        {canReturn && returnable.length > 0 && status !== "CANCELADA" && status !== "DEVOLVIDA" && (
          <Button type="button" size="sm" variant="outline" onClick={() => setReturnOpen((v) => !v)}>
            <RotateCcw className="size-4" /> Registrar devolução
          </Button>
        )}
        {canCancel && status !== "CANCELADA" && status !== "DEVOLVIDA" && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Cancelar esta venda? O estoque será devolvido, o caixa estornado e a venda ficará marcada como cancelada."
                )
              )
                return;
              const value = window.prompt("Informe o motivo do cancelamento:");
              if (!value || !value.trim()) return;
              setError(null);
              startTransition(async () => {
                const result = await cancelSaleAction({ saleId, reason: value });
                if (!result.ok) setError(result.error);
                else router.refresh();
              });
            }}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            Cancelar venda
          </Button>
        )}
      </div>
      <FormMessage error={error} />

      {returnOpen && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-3">
          <h3 className="text-xs font-semibold">Devolução</h3>
          <p className="text-[11px] text-muted-foreground">
            Informe as quantidades. A devolução gera estorno financeiro e, se marcado, repõe o
            estoque. O histórico permanece vinculado à venda original.
          </p>
          <div className="mt-3 space-y-2">
            {returnable.map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.sku} · disponível {item.available} · {formatBRL(item.unitPrice)}/un.
                    </p>
                  </div>
                  <input
                    inputMode="decimal"
                    value={quantities[item.id] ?? ""}
                    onChange={(event) =>
                      setQuantities((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    className="h-8 w-16 rounded-md border bg-background px-2 text-right text-xs"
                    placeholder="0"
                    aria-label={`Quantidade a devolver de ${item.description}`}
                  />
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={restock[item.id] ?? true}
                    onChange={(event) =>
                      setRestock((current) => ({ ...current, [item.id]: event.target.checked }))
                    }
                  />
                  Repor no estoque
                </label>
              </div>
            ))}
          </div>
          <Field label="Motivo da devolução" htmlFor="return-reason" className="mt-3">
            <input
              id="return-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
              maxLength={300}
            />
          </Field>
          <p className="mt-2 text-xs">
            Valor estimado do estorno: <strong>{formatBRL(refundPreview)}</strong>
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={pending || refundPreview <= 0 || !reason.trim()}
            onClick={() => {
              const payloadItems = returnable
                .map((item) => ({
                  saleItemId: item.id,
                  quantity: Math.min(
                    Number((quantities[item.id] ?? "").replace(",", ".")) || 0,
                    item.available
                  ),
                  restock: restock[item.id] ?? true,
                }))
                .filter((item) => item.quantity > 0);
              if (!payloadItems.length) {
                setError("Informe ao menos uma quantidade para devolver.");
                return;
              }
              setError(null);
              startTransition(async () => {
                const result = await createSaleReturnAction({
                  saleId,
                  reason,
                  items: payloadItems,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setReturnOpen(false);
                setQuantities({});
                setReason("");
                router.refresh();
              });
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Confirmar devolução
          </Button>
        </div>
      )}
    </div>
  );
}
