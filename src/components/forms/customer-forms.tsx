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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionForm, Field, inputClass, textareaClass, InlineAction } from "@/components/forms/form-kit";
import {
  saveCustomerAction,
  saveSupplierAction,
  toggleCustomerAction,
  toggleSupplierAction,
} from "@/app/actions/catalog.actions";

type CustomerData = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  consent: boolean;
  active: boolean;
};

export function CustomerDialog({ customer }: { customer?: CustomerData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customer ? (
          <Button size="sm" variant="ghost" aria-label={`Editar ${customer.name}`}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Novo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            O cliente é usado no PDV, no crediário e no compartilhamento de comprovantes. Dados
            pessoais devem ser tratados conforme a LGPD.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={saveCustomerAction}
          hidden={{ id: customer?.id }}
          booleanFields={["active", "consent"]}
          submitLabel={customer ? "Salvar alterações" : "Cadastrar cliente"}
          successMessage="Cliente salvo."
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="customer-name" className="sm:col-span-2">
              <input id="customer-name" name="name" defaultValue={customer?.name} className={inputClass} required maxLength={160} autoFocus />
            </Field>
            <Field label="CPF/CNPJ" htmlFor="customer-document" optional>
              <input id="customer-document" name="document" defaultValue={customer?.document ?? ""} className={inputClass} inputMode="numeric" maxLength={18} />
            </Field>
            <Field label="Telefone" htmlFor="customer-phone" optional>
              <input id="customer-phone" name="phone" defaultValue={customer?.phone ?? ""} className={inputClass} inputMode="tel" maxLength={20} />
            </Field>
            <Field label="WhatsApp" htmlFor="customer-whatsapp" optional hint="Usado para enviar o link do comprovante.">
              <input id="customer-whatsapp" name="whatsapp" defaultValue={customer?.whatsapp ?? ""} className={inputClass} inputMode="tel" maxLength={20} />
            </Field>
            <Field label="E-mail" htmlFor="customer-email" optional>
              <input id="customer-email" name="email" type="email" defaultValue={customer?.email ?? ""} className={inputClass} maxLength={160} />
            </Field>
            <Field label="Data de nascimento" htmlFor="customer-birth" optional>
              <input id="customer-birth" name="birthDate" type="date" defaultValue={customer?.birthDate ?? ""} className={inputClass} />
            </Field>
            <Field label="Cidade" htmlFor="customer-city" optional>
              <input id="customer-city" name="city" defaultValue={customer?.city ?? ""} className={inputClass} maxLength={80} />
            </Field>
            <Field label="Endereço" htmlFor="customer-address" optional className="sm:col-span-2">
              <input id="customer-address" name="address" defaultValue={customer?.address ?? ""} className={inputClass} maxLength={300} />
            </Field>
            <Field label="Estado (UF)" htmlFor="customer-state" optional>
              <input id="customer-state" name="state" defaultValue={customer?.state ?? ""} className={inputClass} maxLength={2} />
            </Field>
            <Field label="CEP" htmlFor="customer-zip" optional>
              <input id="customer-zip" name="zipCode" defaultValue={customer?.zipCode ?? ""} className={inputClass} maxLength={9} />
            </Field>
            <Field label="Observações" htmlFor="customer-notes" optional className="sm:col-span-2">
              <textarea id="customer-notes" name="notes" defaultValue={customer?.notes ?? ""} className={textareaClass} maxLength={500} />
            </Field>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="active" defaultChecked={customer?.active ?? true} />
              Cliente ativo
            </label>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" name="consent" defaultChecked={customer?.consent ?? false} className="mt-0.5" />
              <span>
                Cliente autoriza o uso dos dados para atendimento, crediário e envio de comprovantes.
                O consentimento é registrado com data.
              </span>
            </label>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

type SupplierData = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
};

export function SupplierDialog({ supplier }: { supplier?: SupplierData }) {  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button size="sm" variant="ghost" aria-label={`Editar ${supplier.name}`}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            Fornecedores podem ser vinculados a produtos e a contas a pagar.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={saveSupplierAction}
          hidden={{ id: supplier?.id }}
          booleanFields={["active"]}
          submitLabel={supplier ? "Salvar alterações" : "Cadastrar fornecedor"}
          successMessage="Fornecedor salvo."
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome / razão social" htmlFor="supplier-name" className="sm:col-span-2">
              <input id="supplier-name" name="name" defaultValue={supplier?.name} className={inputClass} required maxLength={160} autoFocus />
            </Field>
            <Field label="CPF/CNPJ" htmlFor="supplier-document" optional>
              <input id="supplier-document" name="document" defaultValue={supplier?.document ?? ""} className={inputClass} inputMode="numeric" maxLength={18} />
            </Field>
            <Field label="Telefone" htmlFor="supplier-phone" optional>
              <input id="supplier-phone" name="phone" defaultValue={supplier?.phone ?? ""} className={inputClass} inputMode="tel" maxLength={20} />
            </Field>
            <Field label="E-mail" htmlFor="supplier-email" optional className="sm:col-span-2">
              <input id="supplier-email" name="email" type="email" defaultValue={supplier?.email ?? ""} className={inputClass} maxLength={160} />
            </Field>
            <Field label="Endereço" htmlFor="supplier-address" optional className="sm:col-span-2">
              <input id="supplier-address" name="address" defaultValue={supplier?.address ?? ""} className={inputClass} maxLength={300} />
            </Field>
            <Field label="Observações" htmlFor="supplier-notes" optional className="sm:col-span-2">
              <textarea id="supplier-notes" name="notes" defaultValue={supplier?.notes ?? ""} className={textareaClass} maxLength={500} />
            </Field>
          </div>
          <label className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <input type="checkbox" name="active" defaultChecked={supplier?.active ?? true} />
            Fornecedor ativo
          </label>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <InlineAction
      action={() => toggleCustomerAction(id, !active)}
      label={active ? "Inativar" : "Ativar"}
      variant={active ? "outline" : "secondary"}
      confirmMessage={active ? "Inativar este cliente? O histórico é preservado." : undefined}
      onDone={() => router.refresh()}
    />
  );
}

export function SupplierToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <InlineAction
      action={() => toggleSupplierAction(id, !active)}
      label={active ? "Inativar" : "Ativar"}
      variant={active ? "outline" : "secondary"}
      confirmMessage={active ? "Inativar este fornecedor? O histórico é preservado." : undefined}
      onDone={() => router.refresh()}
    />
  );
}
