"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { createChargeAction, updateChargeAction } from "@/app/actions/saas.actions";

export type ChargeFormTenant = {
  id: string;
  name: string;
  status?: string;
};

export type ChargeFormData = {
  id: string;
  tenantId: string;
  description: string;
  referenceMonth: string;
  amount: string;
  dueDate: string;
  notes: string | null;
  method: "PIX" | "BOLETO" | "TRANSFERENCIA" | "OUTRO";
  boletoCode: string | null;
  boletoUrl: string | null;
  paymentUrl: string | null;
  instructions: string | null;
};

export function ChargeForm({
  mode,
  tenants,
  charge,
  defaultTenantId,
  defaultDueDate,
  defaultReferenceMonth,
  pixConfigured,
}: {
  mode: "create" | "edit";
  tenants: ChargeFormTenant[];
  charge?: ChargeFormData;
  defaultTenantId?: string;
  defaultDueDate: string;
  defaultReferenceMonth: string;
  pixConfigured: boolean;
}) {
  const router = useRouter();
  const editing = mode === "edit" && charge;

  return (
    <ActionForm
      action={editing ? updateChargeAction : createChargeAction}
      submitLabel={editing ? "Salvar cobrança" : "Emitir cobrança"}
      pendingLabel={editing ? "Salvando..." : "Emitindo..."}
      successMessage={editing ? "Cobrança atualizada." : "Cobrança emitida."}
      resetOnSuccess={!editing}
      onSuccess={(data) => {
        const payload = data as { id?: string } | undefined;
        if (!editing && payload?.id) {
          router.push(`/admin/cobrancas/${payload.id}`);
          return;
        }
        router.refresh();
      }}
    >
      {editing && <input type="hidden" name="id" value={charge.id} />}

      {!editing && (
        <Field label="Loja" htmlFor="charge-tenant" required>
          <select
            id="charge-tenant"
            name="tenantId"
            className={selectClass}
            required
            defaultValue={defaultTenantId ?? ""}
          >
            <option value="" disabled>
              Selecione a loja...
            </option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
                {tenant.status && tenant.status !== "ATIVO" ? ` (${tenant.status})` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Descrição" htmlFor="charge-description" required>
          <input
            id="charge-description"
            name="description"
            className={inputClass}
            required
            maxLength={160}
            defaultValue={charge?.description ?? "Mensalidade Vendix"}
          />
        </Field>
        <Field label="Valor (R$)" htmlFor="charge-amount" required>
          <input
            id="charge-amount"
            name="amount"
            inputMode="decimal"
            className={inputClass}
            required
            defaultValue={charge?.amount ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!editing ? (
          <Field label="Mês de referência" htmlFor="charge-month" required hint="Formato AAAA-MM.">
            <input
              id="charge-month"
              name="referenceMonth"
              className={inputClass}
              required
              maxLength={7}
              placeholder="2026-11"
              defaultValue={defaultReferenceMonth}
            />
          </Field>
        ) : (
          <div className="rounded-lg border bg-muted/40 px-2.5 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Mês de referência</p>
            <p className="font-medium">{charge.referenceMonth}</p>
          </div>
        )}
        <Field label="Vencimento" htmlFor="charge-due" required>
          <input
            id="charge-due"
            name="dueDate"
            className={inputClass}
            required
            type="date"
            defaultValue={charge?.dueDate ?? defaultDueDate}
          />
        </Field>
      </div>

      <Field
        label="Forma de pagamento"
        htmlFor="charge-method"
        required
        hint={
          pixConfigured
            ? "No PIX o QR Code e o copia e cola são gerados automaticamente."
            : "PIX ainda não configurado: cadastre a chave em Plataforma → Recebimentos."
        }
      >
        <select
          id="charge-method"
          name="method"
          className={selectClass}
          defaultValue={charge?.method ?? "PIX"}
        >
          <option value="PIX">PIX (QR Code + copia e cola)</option>
          <option value="BOLETO">Boleto bancário</option>
          <option value="TRANSFERENCIA">Transferência</option>
          <option value="OUTRO">Outro</option>
        </select>
      </Field>

      <fieldset className="rounded-xl border bg-background p-3">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">
          Boleto / link de pagamento (opcional)
        </legend>
        <div className="space-y-3">
          <Field
            label="Linha digitável / código de barras"
            htmlFor="charge-boleto-code"
            optional
            hint="Cole o código completo emitido pelo banco."
          >
            <textarea
              id="charge-boleto-code"
              name="boletoCode"
              className={textareaClass}
              maxLength={2000}
              defaultValue={charge?.boletoCode ?? ""}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link do boleto (PDF)" htmlFor="charge-boleto-url" optional>
              <input
                id="charge-boleto-url"
                name="boletoUrl"
                type="url"
                className={inputClass}
                placeholder="https://..."
                defaultValue={charge?.boletoUrl ?? ""}
              />
            </Field>
            <Field label="Outro link de pagamento" htmlFor="charge-payment-url" optional>
              <input
                id="charge-payment-url"
                name="paymentUrl"
                type="url"
                className={inputClass}
                placeholder="https://..."
                defaultValue={charge?.paymentUrl ?? ""}
              />
            </Field>
          </div>
          <Field
            label="Instruções para a loja"
            htmlFor="charge-instructions"
            optional
            hint="Ex.: envie o comprovante para o WhatsApp de suporte."
          >
            <textarea
              id="charge-instructions"
              name="instructions"
              className={textareaClass}
              maxLength={2000}
              defaultValue={charge?.instructions ?? ""}
            />
          </Field>
        </div>
      </fieldset>

      <Field label="Observações internas" htmlFor="charge-notes" optional>
        <input
          id="charge-notes"
          name="notes"
          className={inputClass}
          maxLength={300}
          defaultValue={charge?.notes ?? ""}
        />
      </Field>
    </ActionForm>
  );
}
