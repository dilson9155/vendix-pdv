"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  deleteChartAccountAction,
  deleteCostCenterAction,
  saveChartAccountAction,
  saveCostCenterAction,
} from "@/app/actions/finance.actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ChartAccountOption = {
  id: string;
  code: string;
  name: string;
  nature: string;
  parentId: string | null;
  isAnalytic: boolean;
  active: boolean;
};

export type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
};

const NATURES: Array<{ value: string; label: string }> = [
  { value: "RECEITA", label: "Receita" },
  { value: "DESPESA", label: "Despesa" },
  { value: "CUSTO", label: "Custo" },
  { value: "ATIVO", label: "Ativo" },
  { value: "PASSIVO", label: "Passivo" },
  { value: "PATRIMONIO", label: "Patrimônio" },
];

export function ChartAccountDialog({
  mode,
  account,
  accounts,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  mode: "create" | "edit";
  account?: ChartAccountOption;
  accounts: ChartAccountOption[];
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon" | "icon-sm" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit";
  const label = triggerLabel ?? (isEdit ? "Editar" : "Nova conta contábil");

  const parentOptions = accounts.filter((item) => item.id !== account?.id);

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar conta contábil" : "Nova conta contábil"}
            </DialogTitle>
            <DialogDescription>
              Contas analíticas recebem lançamentos. Contas sintéticas organizam o plano.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={saveChartAccountAction}
            hidden={isEdit && account?.id ? { id: account.id } : {}}
            booleanFields={["isAnalytic", "active"]}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Criar conta"}
            successMessage={isEdit ? "Conta atualizada." : "Conta criada."}
            resetOnSuccess={!isEdit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código" htmlFor="chart-code" required>
                <input
                  id="chart-code"
                  name="code"
                  className={inputClass}
                  required
                  maxLength={20}
                  defaultValue={account?.code ?? ""}
                  placeholder="1.1.01"
                />
              </Field>
              <Field label="Natureza" htmlFor="chart-nature" required>
                <select
                  id="chart-nature"
                  name="nature"
                  className={selectClass}
                  required
                  defaultValue={account?.nature ?? "DESPESA"}
                >
                  {NATURES.map((nature) => (
                    <option key={nature.value} value={nature.value}>
                      {nature.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Nome"
                htmlFor="chart-name"
                required
                className="sm:col-span-2"
              >
                <input
                  id="chart-name"
                  name="name"
                  className={inputClass}
                  required
                  maxLength={120}
                  defaultValue={account?.name ?? ""}
                />
              </Field>
              <Field label="Conta superior" htmlFor="chart-parent" optional>
                <select
                  id="chart-parent"
                  name="parentId"
                  className={selectClass}
                  defaultValue={account?.parentId ?? ""}
                >
                  <option value="">—</option>
                  {parentOptions.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.code} — {parent.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Analítica" htmlFor="chart-analytic">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="chart-analytic"
                    name="isAnalytic"
                    type="checkbox"
                    defaultChecked={account?.isAnalytic ?? true}
                  />
                  Recebe lançamentos
                </label>
              </Field>
              <Field label="Ativa" htmlFor="chart-active">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="chart-active"
                    name="active"
                    type="checkbox"
                    defaultChecked={account?.active ?? true}
                  />
                  Conta ativa
                </label>
              </Field>
            </div>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CostCenterDialog({
  mode,
  center,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  mode: "create" | "edit";
  center?: CostCenterOption;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon" | "icon-sm" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit";
  const label = triggerLabel ?? (isEdit ? "Editar" : "Novo centro de custo");

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar centro de custo" : "Novo centro de custo"}
            </DialogTitle>
            <DialogDescription>
              Agrupa receitas e despesas por área ou projeto.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={saveCostCenterAction}
            hidden={isEdit && center?.id ? { id: center.id } : {}}
            booleanFields={["active"]}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Criar centro"}
            successMessage={isEdit ? "Centro atualizado." : "Centro criado."}
            resetOnSuccess={!isEdit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código" htmlFor="cc-code" required>
                <input
                  id="cc-code"
                  name="code"
                  className={inputClass}
                  required
                  maxLength={20}
                  defaultValue={center?.code ?? ""}
                />
              </Field>
              <Field label="Nome" htmlFor="cc-name" required>
                <input
                  id="cc-name"
                  name="name"
                  className={inputClass}
                  required
                  maxLength={80}
                  defaultValue={center?.name ?? ""}
                />
              </Field>
              <Field
                label="Descrição"
                htmlFor="cc-description"
                optional
                className="sm:col-span-2"
              >
                <textarea
                  id="cc-description"
                  name="description"
                  className={textareaClass}
                  maxLength={300}
                  defaultValue={center?.description ?? ""}
                />
              </Field>
              <Field label="Ativo" htmlFor="cc-active">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="cc-active"
                    name="active"
                    type="checkbox"
                    defaultChecked={center?.active ?? true}
                  />
                  Centro ativo
                </label>
              </Field>
            </div>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteChartAccountButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" /> Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir conta contábil"
        description={`Excluir "${label}"? A operação falha se houver lançamentos ou contas vinculadas.`}
        confirmLabel="Excluir"
        tone="danger"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteChartAccountAction({ id });
            if (result.ok) {
              setOpen(false);
              router.refresh();
            } else {
              window.alert(result.error);
            }
          });
        }}
      />
    </>
  );
}

export function DeleteCostCenterButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" /> Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir centro de custo"
        description={`Excluir "${label}"? A operação falha se houver lançamentos ou contas vinculadas.`}
        confirmLabel="Excluir"
        tone="danger"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteCostCenterAction({ id });
            if (result.ok) {
              setOpen(false);
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}
