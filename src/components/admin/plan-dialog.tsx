"use client";

import { ActionForm, Field, inputClass, textareaClass } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { savePlanAction } from "@/app/actions/saas.actions";

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  trialDays: number;
  maxUsers: number | null;
  maxBranches: number | null;
  maxProducts: number | null;
  tenants: number;
};

export function PlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanRow | null;
}) {
  const editing = Boolean(plan);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>
            {editing ? `Atualize as condições comerciais do plano ${plan?.code}.` : "Defina código, preço e limites do plano."}
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={savePlanAction}
          onSuccess={() => onOpenChange(false)}
          submitLabel={editing ? "Salvar plano" : "Criar plano"}
          successMessage={editing ? "Plano atualizado." : "Plano criado."}
        >
          {plan && <input type="hidden" name="id" value={plan.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Código" htmlFor="plan-code" required>
              <input id="plan-code" name="code" className={inputClass} required maxLength={30} defaultValue={plan?.code ?? ""} />
            </Field>
            <Field label="Nome" htmlFor="plan-name" required>
              <input id="plan-name" name="name" className={inputClass} required maxLength={80} defaultValue={plan?.name ?? ""} />
            </Field>
          </div>
          <Field label="Descrição" htmlFor="plan-description" optional>
            <textarea id="plan-description" name="description" className={textareaClass} maxLength={300} defaultValue={plan?.description ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preço mensal (R$)" htmlFor="plan-price" required>
              <input id="plan-price" name="price" inputMode="decimal" className={inputClass} required defaultValue={String(plan?.price ?? 0)} />
            </Field>
            <Field label="Dias de trial" htmlFor="plan-trial" required>
              <input id="plan-trial" name="trialDays" type="number" min={0} max={365} className={inputClass} required defaultValue={String(plan?.trialDays ?? 14)} />
            </Field>
            <Field label="Limite de usuários" htmlFor="plan-users" optional hint="Vazio para ilimitado.">
              <input id="plan-users" name="maxUsers" type="number" min={1} className={inputClass} defaultValue={plan?.maxUsers ? String(plan.maxUsers) : ""} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Limite de unidades" htmlFor="plan-branches" optional hint="Vazio para ilimitado.">
              <input id="plan-branches" name="maxBranches" type="number" min={1} className={inputClass} defaultValue={plan?.maxBranches ? String(plan.maxBranches) : ""} />
            </Field>
            <Field label="Limite de produtos" htmlFor="plan-products" optional hint="Vazio para ilimitado.">
              <input id="plan-products" name="maxProducts" type="number" min={1} className={inputClass} defaultValue={plan?.maxProducts ? String(plan.maxProducts) : ""} />
            </Field>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
