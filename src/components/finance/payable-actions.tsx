"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { ActionForm, Field, FormMessage, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const reversePayment = (paymentId: string) => {
    const reason = window.prompt("Motivo do estorno do pagamento:");
    if (!reason || !reason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await reversePayableAction({ paymentId, reason });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  const cancelPayable = () => {
    const reason = window.prompt(`Motivo do cancelamento de "${payable.description}":`);
    if (!reason || !reason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelPayableAction({ id: payable.id, reason });
      if (!result.ok) setError(result.error);
      else router.refresh();
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
            disabled={pendingId !== null}
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
    </div>
  );
}
