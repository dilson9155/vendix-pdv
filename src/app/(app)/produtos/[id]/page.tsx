import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { getProduct, listCatalogOptions } from "@/services/catalog.service";
import { listStockMovements } from "@/services/inventory.service";
import { formatDateTimeBR } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { ProductDialog } from "@/components/forms/product-form";

export const metadata: Metadata = { title: "Produto" };
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission("products.view");
  const { id } = await params;
  const product = await getProduct(ctx, id);
  if (!product) notFound();
  const [options, movements] = await Promise.all([
    listCatalogOptions(ctx),
    hasPermission(ctx, "stock.view")
      ? listStockMovements(ctx, { productId: id, pageSize: 15 })
      : Promise.resolve(null),
  ]);
  const canManage = hasPermission(ctx, "products.manage");
  const stockTotal = product.variants.length > 0
    ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Produto"
        title={product.name}
        description={`SKU ${product.sku} · ${product.unit} · ${product.hasVariants ? `${product.variants.length} variação(ões)` : "produto sem variações"}`}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/produtos">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
            {canManage && <ProductDialog product={product} options={options} />}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Preço atual" value={formatBRL(product.promoPrice ?? product.price)} hint={product.promoPrice !== null ? `Tabela ${formatBRL(product.price)}` : "Sem promoção"} />
        <StatCard label="Custo" value={formatBRL(product.cost)} hint={`Margem bruta ${product.price > 0 ? ((((product.promoPrice ?? product.price) - product.cost) / (product.promoPrice ?? product.price)) * 100).toFixed(1) : "0,0"}%`} />
        <StatCard label="Estoque mínimo" value={String(product.minStock)} hint={product.maxStock !== null ? `Máximo ${product.maxStock}` : "Sem estoque máximo definido"} />
        <StatCard label="Variações ativas" value={String(product.variants.filter((variant) => variant.active).length)} hint={stockTotal !== undefined ? `Estoque somado ${stockTotal}` : "Estoque no nível do produto"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 text-sm shadow-sm">
          <h2 className="text-sm font-semibold">Dados do produto</h2>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Código de barras</dt><dd>{product.barcode ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Categoria</dt><dd>{options.categories.find((c) => c.id === product.categoryId)?.name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Marca</dt><dd>{options.brands.find((b) => b.id === product.brandId)?.name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fornecedor</dt><dd>{options.suppliers.find((s) => s.id === product.supplierId)?.name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Promoção</dt><dd>{product.promoStart || product.promoEnd ? `${product.promoStart ?? "—"} a ${product.promoEnd ?? "—"}` : "Sem período"}</dd></div>
            <div><dt className="text-muted-foreground">Controla estoque</dt><dd>{product.trackStock ? "Sim" : "Não"}</dd></div>
            <div><dt className="text-muted-foreground">NCM / CEST</dt><dd>{[product.ncm, product.cest].filter(Boolean).join(" / ") || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Situação</dt><dd>{product.active ? "Ativo" : "Inativo"}</dd></div>
            {product.description && (
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Descrição</dt><dd className="whitespace-pre-line">{product.description}</dd></div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Variações</h2>
            <Link href="/estoque" className="text-xs font-medium text-primary hover:underline">Ajustar estoque</Link>
          </div>
          {product.variants.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Produto sem variações. O estoque é controlado no nível do produto (chave interna vazia), com preço e custo do cadastro principal.
            </p>
          ) : (
            <TableShell caption="Variações">
              <thead>
                <tr>
                  <th>Variação</th>
                  <th>SKU</th>
                  <th>Código</th>
                  <th className="num">Estoque</th>
                  <th className="num">Preço</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{[variant.color, variant.size].filter(Boolean).join(" / ") || variant.model || "Padrão"}</td>
                    <td>{variant.sku}</td>
                    <td>{variant.barcode ?? "—"}</td>
                    <td className="num">{variant.stock}</td>
                    <td className="num">{formatBRL(variant.price ?? product.promoPrice ?? product.price)}</td>
                    <td>{variant.active ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>
      </div>

      {movements && (
        <section className="mt-4 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Últimas movimentações de estoque</h2>
            <Link href="/estoque" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>
          </div>
          {movements.rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <TableShell caption="Movimentações do produto">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th className="num">Quantidade</th>
                  <th>Motivo</th>
                  <th>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {movements.rows.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDateTimeBR(movement.createdAt)}</td>
                    <td>{movement.type}</td>
                    <td>{movement.branch.name}</td>
                    <td className={`num ${Number(movement.quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {Number(movement.quantity) > 0 ? "+" : ""}{Number(movement.quantity)}
                    </td>
                    <td className="max-w-64 truncate">{movement.reason ?? "—"}</td>
                    <td>{movement.user?.name ?? "Sistema"}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>
      )}
    </div>
  );
}
