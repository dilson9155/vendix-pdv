"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ActionForm,
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-kit";
import { savePayableAction } from "@/app/actions/finance.actions";
import { todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";

export type PayableOptions = {
  accounts: Array<{ id: string; name: string; branchId: string | null }>;
  chartAccounts: Array<{ id: string; code: string; name: string }>;
  costCenters: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
};

export type PayableDialogData = {
  id?: string;
  branchId: string;
  supplierId: string | null;
  description: string;
  document: string | null;
  chartAccountId: string | null;
  costCenterId: string | null;
  issueDate: string;
  competenceDate: string;
  dueDate: string;
  value: number;
  notes: string | null;
};

export function PayableDialog({
  mode,
  options,
  payable,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  mode: "create" | "edit";
  options: PayableOptions;
  payable?: PayableDialogData;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon" | "icon-sm" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isEdit = mode === "edit";
  const label = triggerLabel ?? (isEdit ? "Editar" : "Nova conta a pagar");

  return (
    <>
      <Button
        type="button"
        size={triggerSize}
        variant={triggerVariant}
        onClick={() => setOpen(true)}
      >
        {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar conta a pagar" : "Nova conta a pagar"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualiza a obrigação enquanto não houver pagamentos registrados."
                : "Registra uma obrigação com fornecedor. Gera parcelas automaticamente quando informado."}
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={savePayableAction}
            hidden={isEdit && payable?.id ? { id: payable.id } : {}}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Criar conta"}
            successMessage={isEdit ? "Conta atualizada." : "Conta criada."}
            resetOnSuccess={!isEdit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Unidade" htmlFor="payable-branch" required>
                <select
                  id="payable-branch"
                  name="branchId"
                  className={selectClass}
                  required
                  defaultValue={payable?.branchId ?? options.branches[0]?.id ?? ""}
                >
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fornecedor" htmlFor="payable-supplier" optional>
                <select
                  id="payable-supplier"
                  name="supplierId"
                  className={selectClass}
                  defaultValue={payable?.supplierId ?? ""}
                >
                  <option value="">—</option>
                  {options.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Descrição"
                htmlFor="payable-description"
                required
                className="sm:col-span-2"
              >
                <input
                  id="payable-description"
                  name="description"
                  className={inputClass}
                  required
                  maxLength={200}
                  defaultValue={payable?.description ?? ""}
                />
              </Field>
              <Field label="Documento" htmlFor="payable-document" optional>
                <input
                  id="payable-document"
                  name="document"
                  className={inputClass}
                  maxLength={60}
                  defaultValue={payable?.document ?? ""}
                />
              </Field>
              <Field label="Conta contábil" htmlFor="payable-chart" optional hint="Padrão: despesa.">
                <select
                  id="payable-chart"
                  name="chartAccountId"
                  className={selectClass}
                  defaultValue={payable?.chartAccountId ?? ""}
                >
                  <option value="">Padrão</option>
                  {options.chartAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} — {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centro de custo" htmlFor="payable-cost-center" optional>
                <select
                  id="payable-cost-center"
                  name="costCenterId"
                  className={selectClass}
                  defaultValue={payable?.costCenterId ?? ""}
                >
                  <option value="">—</option>
                  {options.costCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data de emissão" htmlFor="payable-issue" required>
                <input
                  id="payable-issue"
                  name="issueDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={payable?.issueDate ?? todayISO()}
                />
              </Field>
              <Field label="Competência" htmlFor="payable-competence" required>
                <input
                  id="payable-competence"
                  name="competenceDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={payable?.competenceDate ?? todayISO()}
                />
              </Field>
              <Field label="Vencimento" htmlFor="payable-due" required>
                <input
                  id="payable-due"
                  name="dueDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={payable?.dueDate ?? todayISO()}
                />
              </Field>
              <Field label="Valor" htmlFor="payable-value" required>
                <input
                  id="payable-value"
                  name="value"
                  inputMode="decimal"
                  className={inputClass}
                  required
                  defaultValue={payable ? payable.value.toFixed(2) : ""}
                  placeholder="0,00"
                />
              </Field>
              {!isEdit && (
                <>
                  <Field
                    label="Valor informado"
                    htmlFor="payable-value-mode"
                    optional
                    hint="Total é rateado entre as parcelas; por parcela mantém o valor em cada uma."
                  >
                    <select
                      id="payable-value-mode"
                      name="valueMode"
                      className={selectClass}
                      defaultValue="TOTAL"
                    >
                      <option value="TOTAL">Valor total (rateado)</option>
                      <option value="INSTALLMENT">Valor de cada parcela</option>
                    </select>
                  </Field>
                  <Field label="Parcelas" htmlFor="payable-installments" optional hint="Até 36.">
                    <input
                      id="payable-installments"
                      name="installments"
                      type="number"
                      min={1}
                      max={36}
                      className={inputClass}
                      defaultValue={1}
                    />
                  </Field>
                </>
              )}
            </div>
            <Field label="Observações" htmlFor="payable-notes" optional>
              <textarea
                id="payable-notes"
                name="notes"
                className={textareaClass}
                maxLength={500}
                defaultValue={payable?.notes ?? ""}
              />
            </Field>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
