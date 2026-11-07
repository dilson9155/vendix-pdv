"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { ActionForm, Field, FormMessage, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBRL } from "@/lib/money";
import { todayISO } from "@/lib/date";
import {
  cancelReceivableAction,
  receiveReceivableAction,
  reverseReceivableAction,
} from "@/app/actions/finance.actions";

export type AccountOption = { id: string; name: string; branchId: string | null };
export type ReceivablePaymentOption = { id: string; amount: number; date: string; reversedAt: string | null };

export function ReceivableActions({
  receivable,
  accounts,
  payments,
}: {
  receivable: { id: string; description: string; balance: number; status: string };
  accounts: AccountOption[];
  payments: ReceivablePaymentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, startTransition] = useTransition();

  const canReceive = (receivable.status === "ABERTO" || receivable.status === "PARCIAL") && receivable.balance > 0;
  const canCancel = receivable.status !== "CANCELADO";

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reversePaymentId, setReversePaymentId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const reversePayment = (paymentId: string) => {
    setReversePaymentId(paymentId);
    setReverseReason("");
    setReverseOpen(true);
  };

  const submitReverse = () => {
    if (!reversePaymentId || !reverseReason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await reverseReceivableAction({ paymentId: reversePaymentId, reason: reverseReason });
      if (!result.ok) setError(result.error);
      else {
        setReverseOpen(false);
        setReversePaymentId(null);
        setReverseReason("");
        router.refresh();
      }
    });
  };

  const cancelReceivable = () => {
    setCancelReason("");
    setCancelOpen(true);
  };

  const submitCancel = () => {
    if (!cancelReason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelReceivableAction({ id: receivable.id, reason: cancelReason });
      if (!result.ok) setError(result.error);
      else {
        setCancelOpen(false);
        setCancelReason("");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {canReceive && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <CheckCircle2 className="size-4" /> Receber
        </Button>
      )}
      {canCancel && (
        <Button type="button" size="sm" variant="destructive" onClick={cancelReceivable}>
          <Ban className="size-4" /> Cancelar conta
        </Button>
      )}
      {payments
        .filter((payment) => !payment.reversedAt)
        .map((payment) => (
          <Button
            key={payment.id}
            type="button"
            size="sm"
            variant="ghost"
            disabled={pendingId !== null}
            onClick={() => reversePayment(payment.id)}
          >
            {pendingId ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Estornar recebimento {formatBRL(payment.amount)}
          </Button>
        ))}
      {error && <span className="max-w-56 text-[10px] leading-tight text-red-600">{error}</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recebimento</DialogTitle>
            <DialogDescription>
              Registra o recebimento e gera o lançamento no livro caixa.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={receiveReceivableAction}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel="Confirmar recebimento"
            successMessage="Recebimento registrado."
          >
            <input type="hidden" name="id" value={receivable.id} />
            <Field label="Conta financeira" htmlFor="recv-account" required>
              <select id="recv-account" name="financialAccountId" className={selectClass} required defaultValue="">
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data do recebimento" htmlFor="recv-date" required>
              <input id="recv-date" name="date" type="date" className={inputClass} required defaultValue={todayISO()} />
            </Field>
            <Field label="Valor recebido" htmlFor="recv-amount" required hint={`Saldo em aberto: ${formatBRL(receivable.balance)}`}>
              <input id="recv-amount" name="amount" inputMode="decimal" className={inputClass} required defaultValue={receivable.balance.toFixed(2)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Juros" htmlFor="recv-interest" optional>
                <input id="recv-interest" name="interest" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
              <Field label="Multa" htmlFor="recv-penalty" optional>
                <input id="recv-penalty" name="penalty" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
              <Field label="Desconto" htmlFor="recv-discount" optional>
                <input id="recv-discount" name="discount" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
            </div>
            <Field label="Forma de pagamento" htmlFor="recv-method" optional>
              <input id="recv-method" name="method" className={inputClass} maxLength={40} placeholder="Pix, dinheiro, cartão..." />
            </Field>
            <Field label="Documento" htmlFor="recv-document" optional>
              <input id="recv-document" name="document" className={inputClass} maxLength={60} />
            </Field>
            <Field label="Observações" htmlFor="recv-notes" optional>
              <textarea id="recv-notes" name="notes" className={textareaClass} maxLength={300} />
            </Field>
            <FormMessage error={null} success={null} />
          </ActionForm>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!pendingId) setCancelOpen(next);
        }}
        title="Cancelar conta a receber"
        description={`Cancelar "${receivable.description}"? Os recebimentos precisam ser estornados antes.`}
        confirmLabel="Cancelar conta"
        tone="danger"
        pending={pendingId}
        confirmDisabled={!cancelReason.trim()}
        onConfirm={submitCancel}
      >
        <Field label="Motivo do cancelamento" htmlFor="recv-cancel-reason" required>
          <textarea
            id="recv-cancel-reason"
            className={textareaClass}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ex.: duplicidade de lançamento"
          />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={(next) => {
          if (!pendingId) setReverseOpen(next);
        }}
        title="Estornar recebimento"
        description="Informe o motivo do estorno do recebimento."
        confirmLabel="Estornar"
        tone="warning"
        pending={pendingId}
        confirmDisabled={!reverseReason.trim()}
        onConfirm={submitReverse}
      >
        <Field label="Motivo do estorno" htmlFor="recv-reverse-reason" required>
          <textarea
            id="recv-reverse-reason"
            className={textareaClass}
            value={reverseReason}
            onChange={(event) => setReverseReason(event.target.value)}
            placeholder="Ex.: recebimento lançado em duplicidade"
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
