"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FormMessage, inputClass, selectClass } from "@/components/forms/form-kit";
import {
  inventoryCountAction,
  stockMovementAction,
  transferStockAction,
} from "@/app/actions/inventory.actions";

type ItemOption = {
  productId: string;
  variantId: string | null;
  label: string;
  sku: string;
  unit: string;
  quantity: number;
};

type BranchOption = { id: string; name: string };

function ItemSelect({ items, id = "stock-item" }: { items: ItemOption[]; id?: string }) {
  return (
    <select id={id} name="item" className={selectClass} required defaultValue="">
      <option value="" disabled>
        Selecione um produto
      </option>
      {items.map((item) => (
        <option key={`${item.productId}-${item.variantId ?? ""}`} value={`${item.productId}::${item.variantId ?? ""}`}>
          {item.label} ({item.sku}) · saldo {item.quantity} {item.unit}
        </option>
      ))}
    </select>
  );
}

export function StockMovementDialog({
  items,
  branches,
  defaultBranchId,
}: {
  items: ItemOption[];
  branches: BranchOption[];
  defaultBranchId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState("ENTRADA");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Movimentar estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            Entradas, saídas e ajustes ficam registrados com motivo, documento e usuário. A
            movimentação é transacional.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const data = new FormData(event.currentTarget);
            const [productId, variantId] = String(data.get("item") ?? "").split("::");
            const value = (name: string) => {
              const raw = data.get(name);
              return typeof raw === "string" && raw.trim() !== "" ? raw : undefined;
            };
            startTransition(async () => {
              const result = await stockMovementAction({
                branchId: value("branchId") ?? defaultBranchId,
                productId,
                variantId: variantId || undefined,
                type,
                quantity: value("quantity"),
                unitCost: value("unitCost"),
                reason: value("reason"),
                document: value("document"),
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {branches.length > 1 ? (
            <Field label="Unidade" htmlFor="movement-branch">
              <select id="movement-branch" name="branchId" defaultValue={defaultBranchId ?? branches[0]?.id} className={selectClass} required>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <input type="hidden" name="branchId" value={defaultBranchId ?? branches[0]?.id ?? ""} />
          )}
          <Field label="Produto / variação" htmlFor="stock-item">
            <ItemSelect items={items} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="movement-type">
              <select id="movement-type" name="type" value={type} onChange={(event) => setType(event.target.value)} className={selectClass}>
                <option value="ENTRADA">Entrada (compra/devolução)</option>
                <option value="SAIDA">Saída (perda/uso)</option>
                <option value="AJUSTE">Ajuste (soma/subtrai)</option>
                <option value="INVENTARIO">Contagem (saldo final)</option>
              </select>
            </Field>
            <Field label={type === "INVENTARIO" ? "Saldo contado" : "Quantidade"} htmlFor="movement-quantity">
              <input id="movement-quantity" name="quantity" inputMode="decimal" className={inputClass} required />
            </Field>
            <Field label="Custo unitário" htmlFor="movement-cost" optional hint="Em entradas, atualiza o custo do produto para esta unidade.">
              <input id="movement-cost" name="unitCost" inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Documento" htmlFor="movement-document" optional>
              <input id="movement-document" name="document" className={inputClass} maxLength={60} placeholder="NF, pedido, etc." />
            </Field>
          </div>
          <Field label="Motivo" htmlFor="movement-reason">
            <input id="movement-reason" name="reason" className={inputClass} required maxLength={300} />
          </Field>
          <FormMessage error={error} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Registrando..." : "Registrar movimento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StockTransferDialog({
  items,
  branches,
  defaultBranchId,
}: {
  items: ItemOption[];
  branches: BranchOption[];
  defaultBranchId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowLeftRight className="size-4" /> Transferir entre unidades
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferência de estoque</DialogTitle>
          <DialogDescription>
            A baixa na origem e a entrada no destino acontecem na mesma transação. Não há receita
            ou despesa nesta operação.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const data = new FormData(event.currentTarget);
            const [productId, variantId] = String(data.get("item") ?? "").split("::");
            startTransition(async () => {
              const result = await transferStockAction({
                fromBranchId: data.get("fromBranchId"),
                toBranchId: data.get("toBranchId"),
                productId,
                variantId: variantId || undefined,
                quantity: data.get("quantity"),
                reason: data.get("reason") || undefined,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Unidade de origem" htmlFor="transfer-from">
              <select id="transfer-from" name="fromBranchId" defaultValue={defaultBranchId ?? branches[0]?.id} className={selectClass} required>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidade de destino" htmlFor="transfer-to">
              <select id="transfer-to" name="toBranchId" defaultValue={branches[1]?.id ?? branches[0]?.id} className={selectClass} required>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Produto / variação" htmlFor="transfer-item">
            <ItemSelect items={items} id="transfer-item" />
          </Field>
          <Field label="Quantidade" htmlFor="transfer-quantity">
            <input id="transfer-quantity" name="quantity" inputMode="decimal" className={inputClass} required />
          </Field>
          <Field label="Motivo" htmlFor="transfer-reason" optional>
            <input id="transfer-reason" name="reason" className={inputClass} maxLength={300} />
          </Field>
          <FormMessage error={error} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Transferindo..." : "Transferir"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryCountDialog({
  items,
  branches,
  defaultBranchId,
}: {
  items: ItemOption[];
  branches: BranchOption[];
  defaultBranchId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ClipboardList className="size-4" /> Contagem de inventário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contagem de inventário</DialogTitle>
          <DialogDescription>
            Informe o saldo físico contado. A diferença em relação ao saldo atual gera um ajuste
            registrado como inventário. Repita por item para contar vários produtos.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setFeedback(null);
            const data = new FormData(event.currentTarget);
            const [productId, variantId] = String(data.get("item") ?? "").split("::");
            startTransition(async () => {
              const result = await inventoryCountAction({
                branchId: data.get("branchId") ?? defaultBranchId,
                reason: data.get("reason") || "Inventário físico",
                items: [
                  {
                    productId,
                    variantId: variantId || undefined,
                    counted: data.get("counted"),
                  },
                ],
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setFeedback(
                result.data?.adjusted
                  ? "Contagem aplicada. O saldo foi ajustado."
                  : "Contagem aplicada. O saldo já era igual ao contado."
              );
              router.refresh();
            });
          }}
        >
          {branches.length > 1 ? (
            <Field label="Unidade" htmlFor="count-branch">
              <select id="count-branch" name="branchId" defaultValue={defaultBranchId ?? branches[0]?.id} className={selectClass} required>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <input type="hidden" name="branchId" value={defaultBranchId ?? branches[0]?.id ?? ""} />
          )}
          <Field label="Produto / variação" htmlFor="count-item">
            <ItemSelect items={items} id="count-item" />
          </Field>
          <Field label="Saldo físico contado" htmlFor="count-counted">
            <input id="count-counted" name="counted" inputMode="decimal" className={inputClass} required />
          </Field>
          <Field label="Observação" htmlFor="count-reason" optional>
            <input id="count-reason" name="reason" className={inputClass} maxLength={200} />
          </Field>
          <FormMessage error={error} success={feedback} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Aplicando..." : "Aplicar contagem"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
