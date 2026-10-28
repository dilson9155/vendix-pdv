"use client";

import { ActionForm, Field, inputClass } from "@/components/forms/form-kit";
import { saveBranchAction } from "@/app/actions/settings.actions";

export function BranchForm({ branchId }: { branchId?: string }) {
  return (
    <ActionForm
      action={saveBranchAction}
      submitLabel={branchId ? "Salvar unidade" : "Criar unidade"}
      successMessage="Unidade salva."
    >
      {branchId && <input type="hidden" name="id" value={branchId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Código" htmlFor="branch-code" required>
          <input id="branch-code" name="code" className={inputClass} required maxLength={20} />
        </Field>
        <Field label="Nome" htmlFor="branch-name" required>
          <input id="branch-name" name="name" className={inputClass} required maxLength={80} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Documento" htmlFor="branch-document" optional>
          <input id="branch-document" name="document" className={inputClass} maxLength={20} />
        </Field>
        <Field label="Telefone" htmlFor="branch-phone" optional>
          <input id="branch-phone" name="phone" className={inputClass} maxLength={20} />
        </Field>
      </div>
      <Field label="Endereço" htmlFor="branch-address" optional>
        <input id="branch-address" name="address" className={inputClass} maxLength={200} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Cidade" htmlFor="branch-city" optional>
          <input id="branch-city" name="city" className={inputClass} maxLength={80} />
        </Field>
        <Field label="UF" htmlFor="branch-state" optional>
          <input id="branch-state" name="state" className={inputClass} maxLength={2} />
        </Field>
        <Field label="CEP" htmlFor="branch-zip" optional>
          <input id="branch-zip" name="zipCode" className={inputClass} maxLength={9} />
        </Field>
      </div>
      <label htmlFor="branch-active" className="flex items-center gap-2 text-sm">
        <input id="branch-active" type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
        Unidade ativa
      </label>
    </ActionForm>
  );
}
