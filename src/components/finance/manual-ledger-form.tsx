"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Field, inputClass, selectClass } from "@/components/forms/form-kit";
import { manualLedgerAction } from "@/app/actions/finance.actions";

export function ManualLedgerForm({ accounts }: { accounts: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  return (
    <ActionForm
      action={manualLedgerAction}
      onSuccess={() => router.refresh()}
      submitLabel="Registrar lançamento"
      successMessage="Lançamento registrado."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Conta financeira" htmlFor="ledger-account" required>
          <select id="ledger-account" name="financialAccountId" className={selectClass} required defaultValue="">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo" htmlFor="ledger-type" required>
          <select id="ledger-type" name="type" className={selectClass} defaultValue="SAIDA">
            <option value="SAIDA">Saída</option>
            <option value="ENTRADA">Entrada</option>
          </select>
        </Field>
        <Field label="Data" htmlFor="ledger-date" required>
          <input id="ledger-date" name="date" type="date" className={inputClass} required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Competência" htmlFor="ledger-competence" optional hint="Padrão: data do lançamento.">
          <input id="ledger-competence" name="competenceDate" type="date" className={inputClass} />
        </Field>
        <Field label="Valor" htmlFor="ledger-amount" required>
          <input id="ledger-amount" name="amount" inputMode="decimal" className={inputClass} required placeholder="0,00" />
        </Field>
        <Field label="Descrição" htmlFor="ledger-description" required>
          <input id="ledger-description" name="description" className={inputClass} required maxLength={200} />
        </Field>
        <Field label="Conta contábil" htmlFor="ledger-chart" optional hint="Apenas contas analíticas.">
          <select id="ledger-chart" name="chartAccountId" className={selectClass} defaultValue="">
            <option value="">—</option>
          </select>
        </Field>
        <Field label="Centro de custo" htmlFor="ledger-cost-center" optional>
          <select id="ledger-cost-center" name="costCenterId" className={selectClass} defaultValue="">
            <option value="">—</option>
          </select>
        </Field>
      </div>
      <Field label="Documento" htmlFor="ledger-document" optional>
        <input id="ledger-document" name="document" className={inputClass} maxLength={60} />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Origem padrão: despesa ou receita conforme o tipo. Use a transferência entre contas para movimentações entre
        caixas/bancos.
      </p>
    </ActionForm>
  );
}
