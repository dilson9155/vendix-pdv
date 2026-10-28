import type { Metadata } from "next";
import Link from "next/link";
import { Search, Tags } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { listCatalogOptions, listProducts } from "@/services/catalog.service";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { ProductDialog, ProductToggle } from "@/components/forms/product-form";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("products.view");
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const [data, options] = await Promise.all([
    listProducts(ctx, {
      q: params.q,
      categoryId: params.categoryId || undefined,
      brandId: params.brandId || undefined,
      status: (params.status as "ATIVO" | "INATIVO" | "TODOS" | undefined) ?? "TODOS",
      lowStock: params.lowStock === "1",
      page,
      pageSize: 25,
    }),
    listCatalogOptions(ctx),
  ]);
  const canManage = hasPermission(ctx, "products.manage");
  const lowStock = data.rows.filter((row) => row.stock <= row.minStock).length;
  const stockValue = data.rows.reduce((sum, row) => sum + row.stock * row.cost, 0);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseQuery = { ...params };
  delete baseQuery.page;
  const href = (next: number) => {
    const query = new URLSearchParams(baseQuery as Record<string, string>);
    query.set("page", String(next));
    return `/produtos?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cadastros"
        title="Produtos"
        description="Catálogo com SKU único, preço, promoção, custo, estoque mínimo e variações. Produtos inativos deixam de aparecer no PDV."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/produtos/categorias">
                <Tags className="size-4" /> Categorias e marcas
              </Link>
            </Button>
            {canManage && <ProductDialog options={options} />}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos no filtro" value={String(data.total)} hint={`${data.rows.length} nesta página`} />
        <StatCard label="Abaixo do mínimo" value={String(lowStock)} tone={lowStock > 0 ? "warning" : "positive"} hint="Na página atual" />
        <StatCard label="Valor do estoque a custo" value={formatBRL(stockValue)} hint="Produtos listados" />
        <StatCard label="Variações" value={String(data.rows.reduce((sum, row) => sum + row.variants, 0))} hint="Na página atual" />
      </div>

      <form method="get" className="mt-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-6">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nome, SKU ou código de barras"
            className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm"
            aria-label="Buscar produto"
          />
        </div>
        <select name="categoryId" defaultValue={params.categoryId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select name="brandId" defaultValue={params.brandId ?? ""} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Marca">
          <option value="">Todas as marcas</option>
          {options.brands.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? "TODOS"} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Situação">
          <option value="TODOS">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <div className="flex gap-2">
          <label className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-2 text-xs">
            <input type="checkbox" name="lowStock" value="1" defaultChecked={params.lowStock === "1"} />
            Só baixos
          </label>
          <Button type="submit" size="sm">Filtrar</Button>
        </div>
      </form>

      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Cadastre produtos para começar a vender no PDV e controlar o estoque."
            action={canManage ? <ProductDialog options={options} /> : undefined}
          />
        ) : (
          <>
            <TableShell caption="Produtos">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Categoria / marca</th>
                  <th className="num">Custo</th>
                  <th className="num">Preço</th>
                  <th className="num">Estoque</th>
                  <th className="num">Mín.</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/produtos/${product.id}`} className="font-medium text-primary hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {product.hasVariants ? `${product.variants} variação(ões)` : product.unit}
                        {product.promoPrice !== null ? " · promoção ativa" : ""}
                      </p>
                    </td>
                    <td>{product.sku}</td>
                    <td>
                      <p>{product.categoryName ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{product.brandName ?? "Sem marca"}</p>
                    </td>
                    <td className="num">{formatBRL(product.cost)}</td>
                    <td className="num">
                      <span className="font-medium">{formatBRL(product.promoPrice ?? product.price)}</span>
                      {product.promoPrice !== null && (
                        <span className="ml-1 text-[10px] text-muted-foreground line-through">{formatBRL(product.price)}</span>
                      )}
                    </td>
                    <td className="num">
                      <span className={product.stock <= product.minStock ? "font-semibold text-amber-700" : ""}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="num">{product.minStock}</td>
                    <td>
                      <span className={`text-xs font-medium ${product.active ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/produtos/${product.id}`}>Editar</Link>
                        </Button>
                        {canManage && <ProductToggle id={product.id} active={product.active} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Página {data.page} de {totalPages} · {data.total} produto(s)</span>
              <div className="flex gap-2">
                {data.page > 1 && <Button asChild size="sm" variant="outline"><Link href={href(data.page - 1)}>Anterior</Link></Button>}
                {data.page < totalPages && <Button asChild size="sm" variant="outline"><Link href={href(data.page + 1)}>Próxima</Link></Button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
