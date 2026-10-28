"use client";

import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { createChargeAction } from "@/app/actions/saas.actions";

export function CreateChargeForm({ tenants }: { tenants: Array<{ id: string; name: string }> }) {
  return (
    <ActionForm action={createChargeAction} submitLabel="Criar cobrança" successMessage="Cobrança criada.">
      <Field label="Empresa" htmlFor="charge-tenant" required>
        <select id="charge-tenant" name="tenantId" className={selectClass} required defaultValue="">
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição" htmlFor="charge-description" required>
        <input id="charge-description" name="description" className={inputClass} required maxLength={160} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mês de referência" htmlFor="charge-month" required>
          <input id="charge-month" name="referenceMonth" className={inputClass} required maxLength={7} placeholder="2026-10" />
        </Field>
        <Field label="Valor (R$)" htmlFor="charge-amount" required>
          <input id="charge-amount" name="amount" inputMode="decimal" className={inputClass} required />
        </Field>
      </div>
      <Field label="Data de vencimento" htmlFor="charge-due" required>
        <input id="charge-due" name="dueDate" className={inputClass} required type="date" />
      </Field>
      <Field label="Observações" htmlFor="charge-notes" optional>
        <textarea id="charge-notes" name="notes" className={textareaClass} maxLength={300} />
      </Field>
    </ActionForm>
  );
}
