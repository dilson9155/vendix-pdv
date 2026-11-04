"use client";

import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveBillingConfigAction } from "@/app/actions/saas.actions";
import type { BillingConfig } from "@/services/billing.service";

export function BillingSettingsForm({ config }: { config: BillingConfig }) {
  return (
    <ActionForm
      action={saveBillingConfigAction}
      submitLabel="Salvar configuração"
      pendingLabel="Salvando..."
      successMessage="Configuração de recebimento salva."
      resetOnSuccess={false}
    >
      <fieldset className="rounded-xl border bg-background p-3">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">
          PIX — recebimento das mensalidades
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Chave PIX"
            htmlFor="billing-pix-key"
            hint="CPF/CNPJ, e-mail, telefone (+5511999999999) ou chave aleatória."
          >
            <input
              id="billing-pix-key"
              name="pixKey"
              className={inputClass}
              maxLength={120}
              defaultValue={config.pixKey ?? ""}
              placeholder="cobranca@suaempresa.com"
            />
          </Field>
          <Field label="Tipo da chave" htmlFor="billing-pix-type" optional hint="Deixe em branco para detectar automaticamente.">
            <select
              id="billing-pix-type"
              name="pixKeyType"
              className={selectClass}
              defaultValue={config.pixKeyType ?? ""}
            >
              <option value="">Detectar automaticamente</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Chave aleatória</option>
            </select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Nome do beneficiário"
            htmlFor="billing-pix-name"
            hint="Até 25 caracteres no QR Code. Sem acentos."
          >
            <input
              id="billing-pix-name"
              name="pixBeneficiary"
              className={inputClass}
              maxLength={60}
              defaultValue={config.pixBeneficiary ?? ""}
              placeholder="VENDIX TECNOLOGIA"
            />
          </Field>
          <Field
            label="Cidade do beneficiário"
            htmlFor="billing-pix-city"
            hint="Até 15 caracteres no QR Code. Sem acentos."
          >
            <input
              id="billing-pix-city"
              name="pixCity"
              className={inputClass}
              maxLength={40}
              defaultValue={config.pixCity ?? ""}
              placeholder="SAO PAULO"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-3 rounded-xl border bg-background p-3">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">
          Boleto, suporte e régua de cobrança
        </legend>
        <Field
          label="Instruções padrão do boleto"
          htmlFor="billing-boleto-instructions"
          optional
          hint="Aparece no link público de pagamento e pode ser personalizada por cobrança."
        >
          <textarea
            id="billing-boleto-instructions"
            name="boletoInstructions"
            className={textareaClass}
            maxLength={2000}
            defaultValue={config.boletoInstructions ?? ""}
            placeholder="Após o pagamento, envie o comprovante para o nosso WhatsApp."
          />
        </Field>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field
            label="WhatsApp de suporte"
            htmlFor="billing-support-whatsapp"
            optional
            hint="Somente números, com DDI. Ex.: 5511999999999."
          >
            <input
              id="billing-support-whatsapp"
              name="supportWhatsapp"
              className={inputClass}
              maxLength={20}
              defaultValue={config.supportWhatsapp ?? ""}
              placeholder="5511999999999"
            />
          </Field>
          <Field label="Dia padrão de vencimento" htmlFor="billing-due-day" required>
            <input
              id="billing-due-day"
              name="billingDueDay"
              type="number"
              min={1}
              max={28}
              className={inputClass}
              required
              defaultValue={String(config.billingDueDay)}
            />
          </Field>
          <Field
            label="Carência (dias)"
            htmlFor="billing-grace"
            required
            hint="Dias após o vencimento antes da suspensão automática."
          >
            <input
              id="billing-grace"
              name="graceDays"
              type="number"
              min={0}
              max={120}
              className={inputClass}
              required
              defaultValue={String(config.graceDays)}
            />
          </Field>
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="autoSuspend"
            defaultChecked={config.autoSuspend}
            className="mt-0.5 size-4 rounded border"
          />
          <span>
            <span className="font-medium">Suspender lojas automaticamente por inadimplência</span>
            <span className="block text-xs text-muted-foreground">
              A rotina diária bloqueia o acesso de lojas com mensalidade vencida além da carência.
              Ao quitar a última cobrança em aberto, a loja é reativada.
            </span>
          </span>
        </label>
      </fieldset>
    </ActionForm>
  );
}
