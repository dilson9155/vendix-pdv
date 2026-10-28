"use client";

import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { transferAction } from "@/app/actions/finance.actions";

export function TransferForm({ accounts }: { accounts: Array<{ id: string; name: string }> }) {
  return (
    <ActionForm
      action={transferAction}
      submitLabel="Criar transferência"
      successMessage="Transferência registrada."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Conta de origem" htmlFor="transfer-from" required>
          <select id="transfer-from" name="fromAccountId" className={selectClass} required defaultValue="">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conta de destino" htmlFor="transfer-to" required>
          <select id="transfer-to" name="toAccountId" className={selectClass} required defaultValue="">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valor" htmlFor="transfer-amount" required>
          <input id="transfer-amount" name="amount" inputMode="decimal" className={inputClass} required placeholder="0,00" />
        </Field>
        <Field label="Data" htmlFor="transfer-date" required>
          <input id="transfer-date" name="date" type="date" className={inputClass} required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>
      <Field label="Descrição" htmlFor="transfer-description" required>
        <textarea id="transfer-description" name="description" className={textareaClass} required maxLength={200} />
      </Field>
    </ActionForm>
  );
}
