"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionForm, Field, inputClass, selectClass } from "@/components/forms/form-kit";
import { saveBrandAction, saveCategoryAction } from "@/app/actions/catalog.actions";

export function CategoryDialog({
  category,
  parents,
}: {
  category?: { id: string; name: string; parentId: string | null; active: boolean };
  parents: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button size="sm" variant="ghost">
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Categorias organizam o catálogo e os relatórios de estoque.</DialogDescription>
        </DialogHeader>
        <ActionForm
          action={saveCategoryAction}
          hidden={{ id: category?.id }}
          booleanFields={["active"]}
          submitLabel="Salvar"
          successMessage="Categoria salva."
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        >
          <Field label="Nome" htmlFor="category-name">
            <input id="category-name" name="name" defaultValue={category?.name} className={inputClass} required maxLength={80} autoFocus />
          </Field>
          <Field label="Categoria superior" htmlFor="category-parent" optional>
            <select id="category-parent" name="parentId" defaultValue={category?.parentId ?? ""} className={selectClass}>
              <option value="">Nenhuma</option>
              {parents.filter((parent) => parent.id !== category?.id).map((parent) => (
                <option key={parent.id} value={parent.id}>{parent.name}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="active" defaultChecked={category?.active ?? true} />
            Categoria ativa
          </label>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function BrandDialog({
  brand,
}: {
  brand?: { id: string; name: string; active: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {brand ? (
          <Button size="sm" variant="ghost">
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Nova marca
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{brand ? "Editar marca" : "Nova marca"}</DialogTitle>
          <DialogDescription>Marcas ajudam a filtrar produtos e relatórios.</DialogDescription>
        </DialogHeader>
        <ActionForm
          action={saveBrandAction}
          hidden={{ id: brand?.id }}
          booleanFields={["active"]}
          submitLabel="Salvar"
          successMessage="Marca salva."
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        >
          <Field label="Nome" htmlFor="brand-name">
            <input id="brand-name" name="name" defaultValue={brand?.name} className={inputClass} required maxLength={80} autoFocus />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="active" defaultChecked={brand?.active ?? true} />
            Marca ativa
          </label>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
