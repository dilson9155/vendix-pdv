import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { listBrands, listCategories } from "@/services/catalog.service";
import { PageHeader, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { BrandDialog, CategoryDialog } from "@/components/forms/catalog-forms";

export const metadata: Metadata = { title: "Categorias e marcas" };
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const ctx = await requirePermission("products.view");
  const [categories, brands] = await Promise.all([listCategories(ctx), listBrands(ctx)]);
  const canManage = hasPermission(ctx, "catalog.manage");
  const parentName = (id: string | null) =>
    id ? categories.find((category) => category.id === id)?.name ?? "—" : "—";

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Categorias e marcas"
        description="Estrutura auxiliar do catálogo. Categorias podem ter hierarquia; marcas são opcionais no produto."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/produtos">
              <ArrowLeft className="size-4" /> Voltar aos produtos
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Categorias</h2>
              <p className="text-xs text-muted-foreground">{categories.length} cadastrada(s)</p>
            </div>
            {canManage && <CategoryDialog parents={categories.map(({ id, name }) => ({ id, name }))} />}
          </div>
          <TableShell caption="Categorias">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Superior</th>
                <th className="num">Produtos</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="font-medium">{category.name}</td>
                  <td>{parentName(category.parentId)}</td>
                  <td className="num">{category._count.products}</td>
                  <td>{category.active ? "Ativa" : "Inativa"}</td>
                  <td>
                    {canManage && (
                      <CategoryDialog
                        category={{ id: category.id, name: category.name, parentId: category.parentId, active: category.active }}
                        parents={categories.map(({ id, name }) => ({ id, name }))}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground">Nenhuma categoria cadastrada.</td>
                </tr>
              )}
            </tbody>
          </TableShell>
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Marcas</h2>
              <p className="text-xs text-muted-foreground">{brands.length} cadastrada(s)</p>
            </div>
            {canManage && <BrandDialog />}
          </div>
          <TableShell caption="Marcas">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="num">Produtos</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td className="font-medium">{brand.name}</td>
                  <td className="num">{brand._count.products}</td>
                  <td>{brand.active ? "Ativa" : "Inativa"}</td>
                  <td>
                    {canManage && (
                      <BrandDialog brand={{ id: brand.id, name: brand.name, active: brand.active }} />
                    )}
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground">Nenhuma marca cadastrada.</td>
                </tr>
              )}
            </tbody>
          </TableShell>
        </section>
      </div>
    </div>
  );
}
