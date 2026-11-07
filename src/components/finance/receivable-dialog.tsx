"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
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
import { saveReceivableAction } from "@/app/actions/finance.actions";
import { todayISO } from "@/lib/date";

export type ReceivableOptions = {
  accounts: Array<{ id: string; name: string; branchId: string | null }>;
  chartAccounts: Array<{ id: string; code: string; name: string }>;
  costCenters: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
};

export type ReceivableDialogData = {
  id?: string;
  branchId: string;
  customerId: string | null;
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

export function ReceivableDialog({
  mode,
  options,
  receivable,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  mode: "create" | "edit";
  options: ReceivableOptions;
  receivable?: ReceivableDialogData;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon" | "icon-sm" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isEdit = mode === "edit";
  const label = triggerLabel ?? (isEdit ? "Editar" : "Nova conta a receber");

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
              {isEdit ? "Editar conta a receber" : "Nova conta a receber"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualiza o recebimento enquanto não houver baixas registradas."
                : "Registra um recebimento de cliente. Gera parcelas automaticamente quando informado."}
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={saveReceivableAction}
            hidden={isEdit && receivable?.id ? { id: receivable.id } : {}}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Criar conta"}
            successMessage={isEdit ? "Conta atualizada." : "Conta criada."}
            resetOnSuccess={!isEdit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Unidade" htmlFor="recv-branch" required>
                <select
                  id="recv-branch"
                  name="branchId"
                  className={selectClass}
                  required
                  defaultValue={receivable?.branchId ?? options.branches[0]?.id ?? ""}
                >
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cliente" htmlFor="recv-customer" optional>
                <select
                  id="recv-customer"
                  name="customerId"
                  className={selectClass}
                  defaultValue={receivable?.customerId ?? ""}
                >
                  <option value="">—</option>
                  {options.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Descrição"
                htmlFor="recv-description"
                required
                className="sm:col-span-2"
              >
                <input
                  id="recv-description"
                  name="description"
                  className={inputClass}
                  required
                  maxLength={200}
                  defaultValue={receivable?.description ?? ""}
                />
              </Field>
              <Field label="Documento" htmlFor="recv-document" optional>
                <input
                  id="recv-document"
                  name="document"
                  className={inputClass}
                  maxLength={60}
                  defaultValue={receivable?.document ?? ""}
                />
              </Field>
              <Field label="Conta contábil" htmlFor="recv-chart" optional hint="Padrão: receita.">
                <select
                  id="recv-chart"
                  name="chartAccountId"
                  className={selectClass}
                  defaultValue={receivable?.chartAccountId ?? ""}
                >
                  <option value="">Padrão</option>
                  {options.chartAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} — {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centro de custo" htmlFor="recv-cost-center" optional>
                <select
                  id="recv-cost-center"
                  name="costCenterId"
                  className={selectClass}
                  defaultValue={receivable?.costCenterId ?? ""}
                >
                  <option value="">—</option>
                  {options.costCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data de emissão" htmlFor="recv-issue" required>
                <input
                  id="recv-issue"
                  name="issueDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={receivable?.issueDate ?? todayISO()}
                />
              </Field>
              <Field label="Competência" htmlFor="recv-competence" required>
                <input
                  id="recv-competence"
                  name="competenceDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={receivable?.competenceDate ?? todayISO()}
                />
              </Field>
              <Field label="Vencimento" htmlFor="recv-due" required>
                <input
                  id="recv-due"
                  name="dueDate"
                  type="date"
                  className={inputClass}
                  required
                  defaultValue={receivable?.dueDate ?? todayISO()}
                />
              </Field>
              <Field label="Valor" htmlFor="recv-value" required>
                <input
                  id="recv-value"
                  name="value"
                  inputMode="decimal"
                  className={inputClass}
                  required
                  defaultValue={receivable ? receivable.value.toFixed(2) : ""}
                  placeholder="0,00"
                />
              </Field>
              {!isEdit && (
                <Field label="Parcelas" htmlFor="recv-installments" optional hint="Até 36.">
                  <input
                    id="recv-installments"
                    name="installments"
                    type="number"
                    min={1}
                    max={36}
                    className={inputClass}
                    defaultValue={1}
                  />
                </Field>
              )}
            </div>
            <Field label="Observações" htmlFor="recv-notes" optional>
              <textarea
                id="recv-notes"
                name="notes"
                className={textareaClass}
                maxLength={500}
                defaultValue={receivable?.notes ?? ""}
              />
            </Field>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
