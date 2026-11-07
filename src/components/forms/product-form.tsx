"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Pencil, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
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
import { checkBarcodeAction, saveProductAction, toggleProductAction } from "@/app/actions/catalog.actions";
import { InlineAction } from "@/components/forms/form-kit";
import { validateBarcode } from "@/lib/barcode";
import type { ScanOutcome } from "@/components/barcode/barcode-scanner";
import type { ProductDetail } from "@/services/catalog.service";
import { cn } from "@/lib/utils";

// Leitor de câmera carregado sob demanda (só ao clicar em "Escanear").
const BarcodeScanner = dynamic(
  () => import("@/components/barcode/barcode-scanner").then((module) => module.BarcodeScanner),
  { ssr: false }
);

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

type BarcodeNotice = {
  kind: "error" | "info" | "success";
  message: string;
  /** Produto que já usa o código lido (oferece o link de visualização). */
  productId?: string;
};

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeNotice, setBarcodeNotice] = useState<BarcodeNotice | null>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Processa o código lido pela câmera: valida o dígito verificador e consulta
   * se o código já existe na empresa antes de preencher o campo.
   */
  async function handleBarcodeScan(code: string): Promise<ScanOutcome> {
    const validation = validateBarcode(code);
    if (!validation.ok) {
      setBarcodeNotice({
        kind: "error",
        message: validation.message ?? "Código de barras inválido. Verifique o número lido.",
      });
      return { ok: false, message: "Código inválido — tente ler novamente.", close: false };
    }

    const result = await checkBarcodeAction(code);
    if (!result.ok || !result.data) {
      const message = result.ok ? "Não foi possível verificar o código." : result.error;
      setBarcodeNotice({ kind: "error", message });
      return { ok: false, message, close: true };
    }

    if (barcodeInput.current) barcodeInput.current.value = code;

    if (result.data.exists) {
      setBarcodeNotice({
        kind: "info",
        message: `O código ${code} já está cadastrado no produto "${result.data.name}".`,
        productId: result.data.productId,
      });
      return { ok: false, message: "Código já cadastrado", close: true };
    }

    setBarcodeNotice({
      kind: "success",
      message: `Código ${code} lido. Conclua o preenchimento do cadastro.`,
    });
    return { ok: true, message: "Código lido", close: true };
  }

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
            preço promocional vale no período informado. SKUs em branco são gerados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" htmlFor="product-name" className="sm:col-span-2">
              <input id="product-name" name="name" defaultValue={product?.name} className={inputClass} required maxLength={160} autoFocus />
            </Field>
            <Field
              label="SKU"
              htmlFor="product-sku"
              optional
              hint={
                product
                  ? "Identificador interno único. Deixe em branco para manter o atual."
                  : "Deixe em branco e o sistema gera um código único automaticamente."
              }
            >
              <input
                id="product-sku"
                name="sku"
                defaultValue={product?.sku}
                className={inputClass}
                maxLength={60}
                placeholder={product ? undefined : "Automático"}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Código de barras" htmlFor="product-barcode" optional hint="Para produtos com variações, prefira o código por variação.">
              <div className="flex gap-2">
                <input
                  ref={barcodeInput}
                  id="product-barcode"
                  name="barcode"
                  defaultValue={product?.barcode ?? ""}
                  className={inputClass}
                  maxLength={60}
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBarcodeNotice(null);
                    setScannerOpen(true);
                  }}
                  aria-label="Escanear código de barras com a câmera"
                  className="h-10 shrink-0"
                >
                  <Camera className="size-4" /> <span className="hidden sm:inline">Escanear</span>
                </Button>
              </div>
              {barcodeNotice && (
                <p
                  role="status"
                  className={cn(
                    "mt-1.5 text-xs",
                    barcodeNotice.kind === "error" && "text-destructive",
                    barcodeNotice.kind === "info" && "text-amber-600 dark:text-amber-400",
                    barcodeNotice.kind === "success" && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {barcodeNotice.message}{" "}
                  {barcodeNotice.productId && (
                    <Link
                      href={`/produtos/${barcodeNotice.productId}`}
                      className="font-medium underline underline-offset-2"
                    >
                      Ver produto
                    </Link>
                  )}
                </p>
              )}
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
                    Estoque, preço e código de barras são controlados por variação. SKU em branco
                    é gerado a partir do código do produto.
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
                        <input value={variant.sku} onChange={(event) => updateVariant(variant.key, { sku: event.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-xs" maxLength={60} placeholder="Automático" autoCapitalize="off" spellCheck={false} aria-label={`SKU da variação ${index + 1}`} />
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

        {/* Leitor de câmera (carregado sob demanda ao clicar em "Escanear"). */}
        {scannerOpen && (
          <BarcodeScanner
            open
            onClose={() => setScannerOpen(false)}
            onDetect={handleBarcodeScan}
            title="Escanear código de barras"
            hideModeToggle
          />
        )}
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
