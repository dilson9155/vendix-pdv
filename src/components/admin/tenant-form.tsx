"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Field, inputClass, selectClass } from "@/components/forms/form-kit";
import { createTenantAction, updateTenantAction } from "@/app/actions/saas.actions";

export type TenantFormPlan = {
  id: string;
  name: string;
  price: string;
  trialDays: number;
};

export type TenantFormData = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  planId: string | null;
  status: "ATIVO" | "SUSPENSO" | "CANCELADO";
  trialEndsAt: string | null;
  notes: string | null;
};

export function TenantForm({
  mode,
  plans,
  tenant,
}: {
  mode: "create" | "edit";
  plans: TenantFormPlan[];
  tenant?: TenantFormData;
}) {
  const router = useRouter();
  const editing = mode === "edit" && tenant;

  return (
    <ActionForm
      action={
        editing
          ? updateTenantAction
          : createTenantAction
      }
      submitLabel={editing ? "Salvar alterações" : "Cadastrar loja"}
      pendingLabel={editing ? "Salvando..." : "Cadastrando..."}
      successMessage={editing ? "Dados da loja atualizados." : "Loja cadastrada com sucesso."}
      resetOnSuccess={!editing}
      onSuccess={(data) => {
        const payload = data as { tenantId?: string; id?: string } | undefined;
        if (!editing && payload?.tenantId) {
          router.push(`/admin/empresas/${payload.tenantId}`);
          return;
        }
        router.refresh();
      }}
      footerClassName="sticky bottom-0 bg-card py-3"
    >
      {editing && <input type="hidden" name="id" value={tenant.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da loja" htmlFor="tenant-name" required>
          <input
            id="tenant-name"
            name="name"
            className={inputClass}
            required
            maxLength={120}
            defaultValue={tenant?.name ?? ""}
            placeholder="Ex.: Bella Moda Centro"
          />
        </Field>
        <Field label="Razão social" htmlFor="tenant-legal" optional>
          <input
            id="tenant-legal"
            name="legalName"
            className={inputClass}
            maxLength={160}
            defaultValue={tenant?.legalName ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="CPF/CNPJ" htmlFor="tenant-document" optional>
          <input
            id="tenant-document"
            name="document"
            className={inputClass}
            inputMode="numeric"
            maxLength={18}
            defaultValue={tenant?.document ?? ""}
          />
        </Field>
        <Field label="Telefone/WhatsApp" htmlFor="tenant-phone" optional>
          <input
            id="tenant-phone"
            name="phone"
            className={inputClass}
            inputMode="tel"
            maxLength={20}
            defaultValue={tenant?.phone ?? ""}
            placeholder="(11) 99999-9999"
          />
        </Field>
      </div>

      <Field label="E-mail de contato" htmlFor="tenant-email" optional>
        <input
          id="tenant-email"
          name="email"
          type="email"
          className={inputClass}
          maxLength={160}
          defaultValue={tenant?.email ?? ""}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Endereço" htmlFor="tenant-address" optional>
          <input
            id="tenant-address"
            name="address"
            className={inputClass}
            maxLength={300}
            defaultValue={tenant?.address ?? ""}
          />
        </Field>
        <Field label="Cidade" htmlFor="tenant-city" optional>
          <input
            id="tenant-city"
            name="city"
            className={inputClass}
            maxLength={80}
            defaultValue={tenant?.city ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="UF" htmlFor="tenant-state" optional>
          <input
            id="tenant-state"
            name="state"
            className={inputClass}
            maxLength={2}
            defaultValue={tenant?.state ?? ""}
            placeholder="SP"
          />
        </Field>
        <Field label="CEP" htmlFor="tenant-zip" optional>
          <input
            id="tenant-zip"
            name="zipCode"
            className={inputClass}
            maxLength={9}
            defaultValue={tenant?.zipCode ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plano" htmlFor="tenant-plan" required>
          <select
            id="tenant-plan"
            name="planId"
            className={selectClass}
            required
            defaultValue={tenant?.planId ?? ""}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.price}/mês
              </option>
            ))}
          </select>
        </Field>
        {editing ? (
          <Field label="Situação" htmlFor="tenant-status" required>
            <select
              id="tenant-status"
              name="status"
              className={selectClass}
              defaultValue={tenant.status}
            >
              <option value="ATIVO">Ativa</option>
              <option value="SUSPENSO">Suspensa (sem acesso)</option>
              <option value="CANCELADO">Cancelada</option>
            </select>
          </Field>
        ) : (
          <Field
            label="Dias de trial"
            htmlFor="tenant-trial"
            required
            hint="0 inicia direto como assinatura ativa."
          >
            <input
              id="tenant-trial"
              name="trialDays"
              type="number"
              min={0}
              max={90}
              className={inputClass}
              defaultValue={String(plans[0]?.trialDays ?? 14)}
            />
          </Field>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fim do trial" htmlFor="tenant-trial-end" optional>
              <input
                id="tenant-trial-end"
                name="trialEndsAt"
                type="date"
                className={inputClass}
                defaultValue={tenant.trialEndsAt ?? ""}
              />
            </Field>
            <Field label="Observações internas" htmlFor="tenant-notes" optional>
              <input
                id="tenant-notes"
                name="notes"
                className={inputClass}
                maxLength={4000}
                defaultValue={tenant.notes ?? ""}
              />
            </Field>
          </div>
        </>
      ) : (
        <fieldset className="rounded-xl border bg-background p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            Usuário administrador da loja
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do responsável" htmlFor="tenant-admin-name" required>
              <input id="tenant-admin-name" name="adminName" className={inputClass} required maxLength={120} />
            </Field>
            <Field label="E-mail de acesso" htmlFor="tenant-admin-email" required>
              <input
                id="tenant-admin-email"
                name="adminEmail"
                type="email"
                className={inputClass}
                required
                maxLength={160}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field
              label="Senha inicial"
              htmlFor="tenant-admin-password"
              required
              hint="Mínimo de 8 caracteres. O responsável pode alterar depois em Configurações."
            >
              <input
                id="tenant-admin-password"
                name="adminPassword"
                type="password"
                className={inputClass}
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </fieldset>
      )}
    </ActionForm>
  );
}
