"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FormMessage, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveProductAction, toggleProductAction } from "@/app/actions/catalog.actions";
import { InlineAction } from "@/components/forms/form-kit";
import type { ProductDetail } from "@/services/catalog.service";

type Option = { id: string; name: string };
type VariantRow = {
  key: string;
  id?: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  model: string;
  cost: string;
  price: string;
  active: boolean;
};

const UNIT_OPTIONS = ["UN", "KG", "LT", "MT", "CX", "PCT"];

function newVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    sku: "",
    barcode: "",
    size: "",
    color: "",
    model: "",
    cost: "",
    price: "",
    active: true,
  };
}

export function ProductDialog({
  product,
  options,
}: {
  product?: ProductDetail;
  options: { categories: Option[]; brands: Option[]; suppliers: Option[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((variant) => ({
      key: variant.id,
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      size: variant.size ?? "",
      color: variant.color ?? "",
      model: variant.model ?? "",
      cost: variant.cost !== null ? String(variant.cost) : "",
      price: variant.price !== null ? String(variant.price) : "",
      active: variant.active,
    })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);

    if (hasVariants && variants.length === 0) {
      setError("Cadastre ao menos uma variação ou desative a opção de variações.");
      return;
    }
    if (hasVariants && variants.some((variant) => !variant.sku.trim())) {
      setError("Toda variação precisa de um SKU.");
      return;
    }

    const value = (name: string) => {
      const raw = data.get(name);
      return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined;
    };

    const raw = {
      id: product?.id,
      name: value("name"),
      description: value("description"),
      sku: value("sku"),
      barcode: value("barcode"),
      categoryId: value("categoryId"),
      brandId: value("brandId"),
      supplierId: value("supplierId"),
      unit: value("unit") ?? "UN",
      cost: value("cost") ?? "0",
      price: value("price") ?? "0",
      promoPrice: value("promoPrice"),
      promoStart: value("promoStart"),
      promoEnd: value("promoEnd"),
      minStock: value("minStock") ?? "0",
      maxStock: value("maxStock"),
      ncm: value("ncm"),
      cest: value("cest"),
      origin: value("origin"),
      trackStock: data.has("trackStock"),
      hasVariants,
      imageUrl: value("imageUrl"),
      active: data.has("active"),
      variants: hasVariants
        ? variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode || undefined,
            size: variant.size || undefined,
            color: variant.color || undefined,
            model: variant.model || undefined,
            cost: variant.cost !== "" ? variant.cost : undefined,
            price: variant.price !== "" ? variant.price : undefined,
            active: variant.active,
          }))
        : [],
    };

    startTransition(async () => {
      const result = await saveProductAction(raw);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button size="sm" variant="ghost" aria-label={`Editar ${product.name}`}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Novo produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Produtos com variações (cor/tamanho) têm estoque e código de barras por variação. O
            preço promocional vale no período informado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" htmlFor="product-name" className="sm:col-span-2">
              <input id="product-name" name="name" defaultValue={product?.name} className={inputClass} required maxLength={160} autoFocus />
            </Field>
            <Field label="SKU" htmlFor="product-sku" hint="Identificador interno único.">
              <input id="product-sku" name="sku" defaultValue={product?.sku} className={inputClass} required maxLength={60} />
            </Field>
            <Field label="Código de barras" htmlFor="product-barcode" optional hint="Para produtos com variações, prefira o código por variação.">
              <input id="product-barcode" name="barcode" defaultValue={product?.barcode ?? ""} className={inputClass} maxLength={60} />
            </Field>
            <Field label="Categoria" htmlFor="product-category" optional>
              <select id="product-category" name="categoryId" defaultValue={product?.categoryId ?? ""} className={selectClass}>
                <option value="">Sem categoria</option>
                {options.categories.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Marca" htmlFor="product-brand" optional>
              <select id="product-brand" name="brandId" defaultValue={product?.brandId ?? ""} className={selectClass}>
                <option value="">Sem marca</option>
                {options.brands.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Fornecedor" htmlFor="product-supplier" optional>
              <select id="product-supplier" name="supplierId" defaultValue={product?.supplierId ?? ""} className={selectClass}>
                <option value="">Sem fornecedor</option>
                {options.suppliers.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidade" htmlFor="product-unit">
              <select id="product-unit" name="unit" defaultValue={product?.unit ?? "UN"} className={selectClass}>
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </Field>
            <Field label="Custo" htmlFor="product-cost">
              <input id="product-cost" name="cost" inputMode="decimal" defaultValue={product ? String(product.cost) : "0,00"} className={inputClass} required />
            </Field>
            <Field label="Preço de venda" htmlFor="product-price">
              <input id="product-price" name="price" inputMode="decimal" defaultValue={product ? String(product.price) : "0,00"} className={inputClass} required />
            </Field>
            <Field label="Preço promocional" htmlFor="product-promo" optional>
              <input id="product-promo" name="promoPrice" inputMode="decimal" defaultValue={product?.promoPrice !== null && product?.promoPrice !== undefined ? String(product.promoPrice) : ""} className={inputClass} />
            </Field>
            <Field label="Início da promoção" htmlFor="product-promo-start" optional>
              <input id="product-promo-start" name="promoStart" type="date" defaultValue={product?.promoStart ?? ""} className={inputClass} />
            </Field>
            <Field label="Fim da promoção" htmlFor="product-promo-end" optional>
              <input id="product-promo-end" name="promoEnd" type="date" defaultValue={product?.promoEnd ?? ""} className={inputClass} />
            </Field>
            <Field label="Estoque mínimo" htmlFor="product-min" hint="Usado nos alertas de reposição.">
              <input id="product-min" name="minStock" inputMode="decimal" defaultValue={product ? String(product.minStock) : "0"} className={inputClass} />
            </Field>
            <Field label="Estoque máximo" htmlFor="product-max" optional>
              <input id="product-max" name="maxStock" inputMode="decimal" defaultValue={product?.maxStock !== null && product?.maxStock !== undefined ? String(product.maxStock) : ""} className={inputClass} />
            </Field>
            <Field label="NCM" htmlFor="product-ncm" optional hint="Campo informativo; o Vendix não emite documento fiscal.">
              <input id="product-ncm" name="ncm" defaultValue={product?.ncm ?? ""} className={inputClass} maxLength={10} />
            </Field>
            <Field label="CEST" htmlFor="product-cest" optional>
              <input id="product-cest" name="cest" defaultValue={product?.cest ?? ""} className={inputClass} maxLength={10} />
            </Field>
            <Field label="Origem" htmlFor="product-origin" optional>
              <input id="product-origin" name="origin" defaultValue={product?.origin ?? ""} className={inputClass} maxLength={10} />
            </Field>
            <Field label="URL da imagem" htmlFor="product-image" optional hint="Link público de imagem. Upload de arquivo não faz parte desta entrega.">
              <input id="product-image" name="imageUrl" defaultValue={product?.imageUrl ?? ""} className={inputClass} maxLength={500} />
            </Field>
            <Field label="Descrição" htmlFor="product-description" optional className="sm:col-span-2">
              <textarea id="product-description" name="description" defaultValue={product?.description ?? ""} className={textareaClass} maxLength={500} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={product?.active ?? true} />
              Produto ativo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="trackStock" defaultChecked={product?.trackStock ?? true} />
              Controlar estoque
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setHasVariants(checked);
                  if (checked && variants.length === 0) setVariants([newVariant()]);
                }}
              />
              Possui variações (cor/tamanho)
            </label>
          </div>

          {hasVariants && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold">Variações</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Estoque, preço e código de barras são controlados por variação.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setVariants((current) => [...current, newVariant()])}>
                  <Plus className="size-3.5" /> Adicionar
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {variants.map((variant, index) => (
                  <div key={variant.key} className="rounded-lg border bg-background p-2">
                    <div className="grid gap-2 sm:grid-cols-8">
                      <div className="sm:col-span-2">
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">SKU</label>
                        <input value={variant.sku} onChange={(event) => updateVariant(variant.key, { sku: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" required maxLength={60} aria-label={`SKU da variação ${index + 1}`} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">Código de barras</label>
                        <input value={variant.barcode} onChange={(event) => updateVariant(variant.key, { barcode: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" maxLength={60} />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">Cor</label>
                        <input value={variant.color} onChange={(event) => updateVariant(variant.key, { color: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" maxLength={40} />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">Tamanho</label>
                        <input value={variant.size} onChange={(event) => updateVariant(variant.key, { size: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" maxLength={30} />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">Custo</label>
                        <input value={variant.cost} onChange={(event) => updateVariant(variant.key, { cost: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted-foreground">Preço</label>
                        <input value={variant.price} onChange={(event) => updateVariant(variant.key, { price: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" inputMode="decimal" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <label className="flex items-center gap-1 text-[10px]">
                        <input type="checkbox" checked={variant.active} onChange={(event) => updateVariant(variant.key, { active: event.target.checked })} />
                        Ativa
                      </label>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[10px] text-destructive hover:underline"
                        onClick={() => setVariants((current) => current.filter((row) => row.key !== variant.key))}
                      >
                        <Trash2 className="size-3" /> Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <FormMessage error={error} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar produto"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <InlineAction
      action={() => toggleProductAction(id, !active)}
      label={active ? "Inativar" : "Ativar"}
      variant={active ? "outline" : "secondary"}
      confirmMessage={active ? "Inativar este produto? Ele deixa de aparecer no PDV, mas o histórico é preservado." : undefined}
      onDone={() => router.refresh()}
    />
  );
}
