"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { ActionForm, Field, FormMessage, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBRL } from "@/lib/money";
import { todayISO } from "@/lib/date";
import {
  cancelPayableAction,
  payPayableAction,
  reversePayableAction,
} from "@/app/actions/finance.actions";

export type AccountOption = { id: string; name: string; branchId: string | null };
export type PayablePaymentOption = { id: string; amount: number; date: string; reversedAt: string | null };

export function PayableActions({
  payable,
  accounts,
  payments,
}: {
  payable: { id: string; description: string; balance: number; status: string };
  accounts: AccountOption[];
  payments: PayablePaymentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, startTransition] = useTransition();

  const canSettle = (payable.status === "ABERTO" || payable.status === "PARCIAL") && payable.balance > 0;
  const canCancel = payable.status !== "CANCELADO";

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
      const result = await reversePayableAction({ paymentId: reversePaymentId, reason: reverseReason });
      if (!result.ok) setError(result.error);
      else {
        setReverseOpen(false);
        setReversePaymentId(null);
        setReverseReason("");
        router.refresh();
      }
    });
  };

  const cancelPayable = () => {
    setCancelReason("");
    setCancelOpen(true);
  };

  const submitCancel = () => {
    if (!cancelReason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelPayableAction({ id: payable.id, reason: cancelReason });
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
      {canSettle && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Undo2 className="size-4" /> Pagar
        </Button>
      )}
      {canCancel && (
        <Button type="button" size="sm" variant="destructive" onClick={cancelPayable}>
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
            disabled={pendingId}
            onClick={() => reversePayment(payment.id)}
          >
            {pendingId ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Estornar pagamento {formatBRL(payment.amount)}
          </Button>
        ))}
      {error && <span className="max-w-56 text-[10px] leading-tight text-red-600">{error}</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagamento</DialogTitle>
            <DialogDescription>
              Liquida a obrigação registrando o pagamento no livro caixa. Gerador de estorno por lançamento
              vinculado.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={payPayableAction}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel="Confirmar pagamento"
            successMessage="Pagamento registrado."
          >
            <input type="hidden" name="id" value={payable.id} />
            <Field label="Conta financeira" htmlFor="pay-account" required>
              <select id="pay-account" name="financialAccountId" className={selectClass} required defaultValue="">
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data do pagamento" htmlFor="pay-date" required>
              <input id="pay-date" name="date" type="date" className={inputClass} required defaultValue={todayISO()} />
            </Field>
            <Field label="Valor do pagamento" htmlFor="pay-amount" required hint={`Saldo em aberto: ${formatBRL(payable.balance)}`}>
              <input id="pay-amount" name="amount" inputMode="decimal" className={inputClass} required defaultValue={payable.balance.toFixed(2)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Juros" htmlFor="pay-interest" optional>
                <input id="pay-interest" name="interest" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
              <Field label="Multa" htmlFor="pay-penalty" optional>
                <input id="pay-penalty" name="penalty" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
              <Field label="Desconto" htmlFor="pay-discount" optional>
                <input id="pay-discount" name="discount" inputMode="decimal" className={inputClass} defaultValue="0" />
              </Field>
            </div>
            <Field label="Forma de pagamento" htmlFor="pay-method" optional>
              <input id="pay-method" name="method" className={inputClass} maxLength={40} placeholder="Pix, dinheiro, cartão..." />
            </Field>
            <Field label="Documento" htmlFor="pay-document" optional>
              <input id="pay-document" name="document" className={inputClass} maxLength={60} />
            </Field>
            <Field label="Observações" htmlFor="pay-notes" optional>
              <textarea id="pay-notes" name="notes" className={textareaClass} maxLength={300} />
            </Field>
          </ActionForm>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!pendingId) setCancelOpen(next);
        }}
        title="Cancelar conta a pagar"
        description={`Cancelar "${payable.description}"? Os pagamentos precisam ser estornados antes.`}
        confirmLabel="Cancelar conta"
        tone="danger"
        pending={pendingId}
        confirmDisabled={!cancelReason.trim()}
        onConfirm={submitCancel}
      >
        <Field label="Motivo do cancelamento" htmlFor="payable-cancel-reason" required>
          <textarea
            id="payable-cancel-reason"
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
        title="Estornar pagamento"
        description="Informe o motivo do estorno do pagamento."
        confirmLabel="Estornar"
        tone="warning"
        pending={pendingId}
        confirmDisabled={!reverseReason.trim()}
        onConfirm={submitReverse}
      >
        <Field label="Motivo do estorno" htmlFor="payable-reverse-reason" required>
          <textarea
            id="payable-reverse-reason"
            className={textareaClass}
            value={reverseReason}
            onChange={(event) => setReverseReason(event.target.value)}
            placeholder="Ex.: pagamento lançado em duplicidade"
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
