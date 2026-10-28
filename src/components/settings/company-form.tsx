"use client";

import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveSettingsAction } from "@/app/actions/settings.actions";

export function CompanyForm() {
  return (
    <ActionForm
      action={saveSettingsAction}
      submitLabel="Salvar configurações"
      successMessage="Configurações salvas."
    >
      <Field label="Nome fantasia" htmlFor="cfg-trade" required>
        <input id="cfg-trade" name="tradeName" className={inputClass} required maxLength={120} />
      </Field>
      <Field label="Razão social" htmlFor="cfg-legal" optional>
        <input id="cfg-legal" name="legalName" className={inputClass} maxLength={160} />
      </Field>
      <Field label="CNPJ" htmlFor="cfg-document" required>
        <input id="cfg-document" name="document" className={inputClass} required maxLength={20} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Telefone" htmlFor="cfg-phone" required>
          <input id="cfg-phone" name="phone" className={inputClass} required maxLength={20} />
        </Field>
        <Field label="E-mail" htmlFor="cfg-email" optional>
          <input id="cfg-email" name="email" type="email" className={inputClass} maxLength={160} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Endereço" htmlFor="cfg-address" optional>
          <input id="cfg-address" name="address" className={inputClass} maxLength={300} />
        </Field>
        <Field label="CEP" htmlFor="cfg-zip" optional>
          <input id="cfg-zip" name="zipCode" className={inputClass} maxLength={9} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Cidade" htmlFor="cfg-city" optional>
          <input id="cfg-city" name="city" className={inputClass} maxLength={80} />
        </Field>
        <Field label="UF" htmlFor="cfg-state" optional>
          <input id="cfg-state" name="state" className={inputClass} maxLength={2} />
        </Field>
        <Field label="Rodapé do comprovante" htmlFor="cfg-footer" optional>
          <input id="cfg-footer" name="receiptFooter" className={inputClass} maxLength={300} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Formato do comprovante" htmlFor="cfg-width" required>
          <select id="cfg-width" name="receiptWidth" className={selectClass} defaultValue="80">
            <option value="58">58 mm</option>
            <option value="80">80 mm</option>
          </select>
        </Field>
        <Field label="Desconto máximo na venda" htmlFor="cfg-discount" required hint="Percentual máximo de desconto comercial.">
          <input id="cfg-discount" name="maxDiscountPercent" inputMode="decimal" className={inputClass} defaultValue="10" />
        </Field>
      </div>
      <label htmlFor="cfg-neg" className="flex items-center gap-2 text-sm">
        <input id="cfg-neg" type="checkbox" name="allowNegativeStock" defaultChecked={false} className="size-4 accent-primary" />
        Permitir estoque negativo
      </label>
      <label htmlFor="cfg-req" className="flex items-center gap-2 text-sm">
        <input id="cfg-req" type="checkbox" name="requireCustomerOnCredit" defaultChecked={true} className="size-4 accent-primary" />
        Exigir cliente para vendas a prazo
      </label>
      <p className="text-[11px] text-muted-foreground">Os valores salvos entram na configuração da empresa (chave por preferência).</p>
    </ActionForm>
  );
}
