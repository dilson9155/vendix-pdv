import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { money, qty, dec } from "@/lib/money";
import {
  brandSchema,
  categorySchema,
  productSchema,
  type ProductInput,
} from "@/lib/validation";
import { ensureStockLevel } from "@/services/stock-level.service";
import { z } from "zod";

export type ProductListFilters = {
  q?: string;
  categoryId?: string;
  brandId?: string;
  status?: "ATIVO" | "INATIVO" | "TODOS";
  branchId?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryName: string | null;
  brandName: string | null;
  cost: number;
  price: number;
  promoPrice: number | null;
  minStock: number;
  active: boolean;
  hasVariants: boolean;
  unit: string;
  stock: number;
  variants: number;
};

function pagination(page?: number, pageSize?: number) {
  const size = Math.min(100, Math.max(5, pageSize ?? 20));
  const current = Math.max(1, page ?? 1);
  return { skip: (current - 1) * size, take: size, page: current, pageSize: size };
}

async function productStockMap(
  tenantId: string,
  branchId: string | null,
  productIds: string[]
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.stockLevel.findMany({
    where: {
      tenantId,
      productId: { in: productIds },
      ...(branchId ? { branchId } : {}),
    },
    select: { productId: true, quantity: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.productId, (map.get(row.productId) ?? 0) + Number(row.quantity));
  }
  return map;
}

export async function listProducts(
  ctx: AuthContext,
  filters: ProductListFilters = {}
): Promise<{ rows: ProductRow[]; total: number; page: number; pageSize: number }> {
  assertPermission(ctx, "products.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const { skip, take, page, pageSize } = pagination(filters.page, filters.pageSize);
  const where: Prisma.ProductWhereInput = { tenantId: ctx.tenantId };

  if (filters.status && filters.status !== "TODOS") {
    where.active = filters.status === "ATIVO";
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { variants: { some: { OR: [{ sku: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }] } } },
      { barcodes: { some: { code: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const stockMap = await productStockMap(
    ctx.tenantId,
    branchId,
    products.map((p) => p.id)
  );

  let rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryName: product.category?.name ?? null,
    brandName: product.brand?.name ?? null,
    cost: Number(product.cost),
    price: Number(product.price),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    minStock: Number(product.minStock),
    active: product.active,
    hasVariants: product.hasVariants,
    unit: product.unit,
    stock: stockMap.get(product.id) ?? 0,
    variants: product._count.variants,
  }));

  if (filters.lowStock) {
    rows = rows.filter((row) => row.stock <= row.minStock);
  }

  return { rows, total, page, pageSize };
}

export type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  brandId: string | null;
  supplierId: string | null;
  unit: string;
  cost: number;
  price: number;
  promoPrice: number | null;
  promoStart: string | null;
  promoEnd: string | null;
  minStock: number;
  maxStock: number | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  trackStock: boolean;
  hasVariants: boolean;
  imageUrl: string | null;
  active: boolean;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    size: string | null;
    color: string | null;
    model: string | null;
    cost: number | null;
    price: number | null;
    active: boolean;
    stock: number;
  }>;
};

export async function getProduct(ctx: AuthContext, id: string): Promise<ProductDetail | null> {
  assertPermission(ctx, "products.view");
  const product = await prisma.product.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
  });
  if (!product) return null;

  const stocks = await prisma.stockLevel.findMany({
    where: {
      tenantId: ctx.tenantId,
      productId: product.id,
      ...(ctx.branchId ? { branchId: ctx.branchId } : {}),
    },
    select: { variantId: true, quantity: true },
  });
  const stockByVariant = new Map<string, number>();
  for (const row of stocks) {
    const key = row.variantId ?? "";
    stockByVariant.set(key, (stockByVariant.get(key) ?? 0) + Number(row.quantity));
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    brandId: product.brandId,
    supplierId: product.supplierId,
    unit: product.unit,
    cost: Number(product.cost),
    price: Number(product.price),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    promoStart: product.promoStart ? product.promoStart.toISOString().slice(0, 10) : null,
    promoEnd: product.promoEnd ? product.promoEnd.toISOString().slice(0, 10) : null,
    minStock: Number(product.minStock),
    maxStock: product.maxStock ? Number(product.maxStock) : null,
    ncm: product.ncm,
    cest: product.cest,
    origin: product.origin,
    trackStock: product.trackStock,
    hasVariants: product.hasVariants,
    imageUrl: product.imageUrl,
    active: product.active,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      size: variant.size,
      color: variant.color,
      model: variant.model,
      cost: variant.cost ? Number(variant.cost) : null,
      price: variant.price ? Number(variant.price) : null,
      active: variant.active,
      stock: stockByVariant.get(variant.id) ?? 0,
    })),
  };
}

const AUTO_SKU_PREFIX = "SKU-";
const AUTO_SKU_START = 1001;

function formatAutoSku(value: number): string {
  return `${AUTO_SKU_PREFIX}${String(value).padStart(6, "0")}`;
}

/** Próximo número sequencial de SKU, olhando produtos e variações da empresa. */
async function nextAutoSkuNumber(tenantId: string): Promise<number> {
  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, sku: { startsWith: AUTO_SKU_PREFIX } },
      select: { sku: true },
    }),
    prisma.productVariant.findMany({
      where: { tenantId, sku: { startsWith: AUTO_SKU_PREFIX } },
      select: { sku: true },
    }),
  ]);
  let max = AUTO_SKU_START - 1;
  for (const row of [...products, ...variants]) {
    const match = /^SKU-(\d+)$/.exec(row.sku.toUpperCase());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

/** Gera um SKU de produto único (ex.: SKU-001001), evitando os já reservados. */
async function generateProductSku(tenantId: string, reserved: Set<string>): Promise<string> {
  let next = await nextAutoSkuNumber(tenantId);
  while (reserved.has(formatAutoSku(next))) next += 1;
  return formatAutoSku(next);
}

/**
 * Resolve o SKU de cada variação: mantém o código atual de variações
 * existentes e gera códigos derivados do produto (ex.: SKU-001001-01) para as
 * novas. Assim o cadastro funciona sem o usuário digitar nada.
 */
async function resolveVariantSkus(
  tenantId: string,
  productSku: string,
  variants: ProductInput["variants"],
  existingVariants: Array<{ id: string; sku: string }> | undefined,
  reserved: Set<string>
): Promise<string[]> {
  const prefix = `${productSku.slice(0, 54)}-`;
  const [productRows, variantRows] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, sku: { startsWith: prefix } },
      select: { sku: true },
    }),
    prisma.productVariant.findMany({
      where: { tenantId, sku: { startsWith: prefix } },
      select: { sku: true },
    }),
  ]);

  const taken = new Set(reserved);
  for (const row of [...productRows, ...variantRows]) taken.add(row.sku.toUpperCase());

  let counter = 1;
  return variants.map((variant) => {
    if (variant.sku) return variant.sku;

    const current = variant.id
      ? existingVariants?.find((item) => item.id === variant.id)
      : undefined;
    if (current) {
      taken.add(current.sku.toUpperCase());
      return current.sku;
    }

    let candidate = `${prefix}${String(counter).padStart(2, "0")}`;
    while (taken.has(candidate.toUpperCase())) {
      counter += 1;
      candidate = `${prefix}${String(counter).padStart(2, "0")}`;
    }
    counter += 1;
    taken.add(candidate.toUpperCase());
    return candidate;
  });
}

async function assertUniqueProductKeys(
  tenantId: string,
  sku: string,
  barcode: string | null | undefined,
  variants: Array<{ sku: string; barcode?: string }>,
  ignoreProductId?: string,
  ignoreVariantIds: string[] = []
) {
  const allSkus = new Set<string>();
  const allBarcodes = new Set<string>();

  const register = (s: string, b?: string | null) => {
    const skuKey = s.toUpperCase();
    if (allSkus.has(skuKey)) throw new Error(`SKU repetido na lista: ${s}.`);
    allSkus.add(skuKey);
    if (b) {
      const code = b.trim();
      if (allBarcodes.has(code)) throw new Error(`Código de barras repetido na lista: ${code}.`);
      allBarcodes.add(code);
    }
  };

  register(sku, barcode);
  for (const variant of variants) register(variant.sku, variant.barcode);

  const or: Prisma.ProductWhereInput[] = [{ sku: { in: [...allSkus] } }];
  if (barcode) or.push({ barcode });
  const productHit = await prisma.product.findFirst({
    where: {
      tenantId,
      OR: or,
      ...(ignoreProductId ? { id: { not: ignoreProductId } } : {}),
    },
    select: { id: true, sku: true, barcode: true },
  });
  if (productHit) {
    throw new Error(
      `Já existe um produto com este SKU ou código de barras (${productHit.sku}).`
    );
  }

  const variantOr: Prisma.ProductVariantWhereInput[] = [{ sku: { in: [...allSkus] } }];
  if (barcode) variantOr.push({ barcode });
  const variantHit = await prisma.productVariant.findFirst({
    where: {
      tenantId,
      OR: variantOr,
      ...(ignoreVariantIds.length ? { id: { notIn: ignoreVariantIds } } : {}),
    },
    select: { id: true, sku: true, barcode: true },
  });
  if (variantHit) {
    throw new Error(
      `Já existe uma variação com este SKU ou código de barras (${variantHit.sku}).`
    );
  }

  const codes = barcode ? [barcode, ...variants.map((v) => v.barcode).filter(Boolean) as string[]] : [];
  if (codes.length) {
    const barcodeHit = await prisma.productBarcode.findFirst({
      where: { tenantId, code: { in: codes } },
      select: { code: true },
    });
    if (barcodeHit) {
      throw new Error(`O código ${barcodeHit.code} já está cadastrado como código alternativo.`);
    }
  }
}

export async function saveProduct(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "products.manage");
  const input: ProductInput = productSchema.parse(raw);

  if (input.hasVariants && input.variants.length === 0) {
    throw new Error("Cadastre ao menos uma variação (tamanho/cor) ou desative a opção de variações.");
  }

  const existing = input.id
    ? await prisma.product.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: { variants: true },
      })
    : null;
  if (input.id && !existing) throw new Error("Produto não encontrado.");

  if (!existing) {
    const [count, tenant] = await Promise.all([
      prisma.product.count({ where: { tenantId: ctx.tenantId } }),
      prisma.tenant.findUnique({ where: { id: ctx.tenantId }, include: { plan: true } }),
    ]);
    const max = tenant?.plan?.maxProducts ?? null;
    if (max !== null && count >= max) {
      throw new Error(`Seu plano permite até ${max} produtos. Fale com o suporte para ampliar.`);
    }
  }

  // SKUs digitados manualmente têm prioridade na resolução dos automáticos.
  const reservedSkus = new Set<string>();
  for (const variant of input.variants) {
    if (variant.sku) reservedSkus.add(variant.sku.toUpperCase());
  }
  if (input.sku) reservedSkus.add(input.sku.toUpperCase());

  const productSku = input.sku
    ? input.sku.toUpperCase()
    : existing
      ? existing.sku
      : await generateProductSku(ctx.tenantId, reservedSkus);
  reservedSkus.add(productSku.toUpperCase());

  const variantSkus = await resolveVariantSkus(
    ctx.tenantId,
    productSku,
    input.variants,
    existing?.variants,
    reservedSkus
  );
  const variantsWithSku = input.variants.map((variant, index) => ({
    ...variant,
    sku: variantSkus[index] ?? productSku,
  }));

  await assertUniqueProductKeys(
    ctx.tenantId,
    productSku,
    input.barcode,
    variantsWithSku,
    existing?.id,
    existing?.variants.map((v) => v.id) ?? []
  );

  const branches = await prisma.branch.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const data = {
      tenantId: ctx.tenantId,
      name: input.name,
      description: input.description ?? null,
      sku: productSku,
      barcode: input.barcode?.trim() || null,
      categoryId: input.categoryId || null,
      brandId: input.brandId || null,
      supplierId: input.supplierId || null,
      unit: input.unit,
      cost: money(input.cost),
      price: money(input.price),
      promoPrice: input.promoPrice ? money(input.promoPrice) : null,
      promoStart: input.promoStart ? new Date(`${input.promoStart}T12:00:00-03:00`) : null,
      promoEnd: input.promoEnd ? new Date(`${input.promoEnd}T23:59:59-03:00`) : null,
      minStock: qty(input.minStock),
      maxStock: input.maxStock !== undefined ? qty(input.maxStock) : null,
      ncm: input.ncm || null,
      cest: input.cest || null,
      origin: input.origin || null,
      trackStock: input.trackStock,
      hasVariants: input.hasVariants,
      imageUrl: input.imageUrl || null,
      active: input.active,
    };

    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data });

    const keptVariantIds: string[] = [];

    for (const variant of input.hasVariants ? variantsWithSku : []) {
      const variantData = {
        tenantId: ctx.tenantId,
        productId: product.id,
        sku: variant.sku.toUpperCase(),
        barcode: variant.barcode?.trim() || null,
        size: variant.size?.trim() || null,
        color: variant.color?.trim() || null,
        model: variant.model?.trim() || null,
        cost: variant.cost !== undefined ? money(variant.cost) : null,
        price: variant.price !== undefined ? money(variant.price) : null,
        active: variant.active,
      };
      const existingVariant = variant.id
        ? existing?.variants.find((item) => item.id === variant.id)
        : undefined;
      const saved = existingVariant
        ? await tx.productVariant.update({ where: { id: existingVariant.id }, data: variantData })
        : await tx.productVariant.create({ data: variantData });
      keptVariantIds.push(saved.id);

      for (const branch of branches) {
        await ensureStockLevel(tx, {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: product.id,
          variantId: saved.id,
        });
      }
    }

    // Produto sem variações (ou que deixou de ter): garante nível de estoque "padrão".
    if (!input.hasVariants) {
      for (const branch of branches) {
        await ensureStockLevel(tx, {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: product.id,
          variantId: null,
        });
      }
    }

    // Desativa variações removidas (nunca apaga histórico de vendas).
    if (existing) {
      const removed = existing.variants.filter((v) => !keptVariantIds.includes(v.id));
      if (removed.length) {
        await tx.productVariant.updateMany({
          where: { id: { in: removed.map((v) => v.id) } },
          data: { active: false },
        });
      }
    }

    return product;
    // Variações x filiais podem gerar várias escritas em conexão remota.
  }, { maxWait: 10_000, timeout: 30_000 });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "produtos",
    entity: "Product",
    entityId: result.id,
    description: `Produto "${result.name}" ${existing ? "atualizado" : "criado"}`,
    oldValues: existing ? { price: existing.price.toString(), cost: existing.cost.toString() } : undefined,
    newValues: { price: money(input.price), cost: money(input.cost), active: input.active },
  });

  return { id: result.id };
}

export async function setProductActive(
  ctx: AuthContext,
  id: string,
  active: boolean
): Promise<void> {
  assertPermission(ctx, "products.manage");
  const product = await prisma.product.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!product) throw new Error("Produto não encontrado.");
  await prisma.product.update({ where: { id }, data: { active } });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "produtos",
    entity: "Product",
    entityId: id,
    description: `Produto "${product.name}" ${active ? "ativado" : "inativado"}`,
  });
}

// ---------------------------------------------------------------------------
// Categorias e marcas
// ---------------------------------------------------------------------------

export async function listCategories(ctx: AuthContext) {
  assertPermission(ctx, "products.view");
  return prisma.productCategory.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function saveCategory(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "catalog.manage");
  const input = categorySchema.parse(raw);
  const existing = input.id
    ? await prisma.productCategory.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Categoria não encontrada.");
  if (input.parentId === input.id && input.id) {
    throw new Error("Uma categoria não pode ser pai dela mesma.");
  }
  if (input.parentId) {
    const parent = await prisma.productCategory.findFirst({
      where: { id: input.parentId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!parent) throw new Error("Categoria superior inválida.");
  }

  const data = {
    tenantId: ctx.tenantId,
    name: input.name,
    parentId: input.parentId || null,
    active: input.active,
  };
  const saved = existing
    ? await prisma.productCategory.update({ where: { id: existing.id }, data })
    : await prisma.productCategory.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "categorias",
    entity: "ProductCategory",
    entityId: saved.id,
    description: `Categoria "${saved.name}" ${existing ? "atualizada" : "criada"}`,
  });
  return { id: saved.id };
}

export async function listBrands(ctx: AuthContext) {
  assertPermission(ctx, "products.view");
  return prisma.brand.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function saveBrand(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "catalog.manage");
  const input = brandSchema.parse(raw);
  const existing = input.id
    ? await prisma.brand.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Marca não encontrada.");
  const data = { tenantId: ctx.tenantId, name: input.name, active: input.active };
  const saved = existing
    ? await prisma.brand.update({ where: { id: existing.id }, data })
    : await prisma.brand.create({ data });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "marcas",
    entity: "Brand",
    entityId: saved.id,
    description: `Marca "${saved.name}" ${existing ? "atualizada" : "criada"}`,
  });
  return { id: saved.id };
}

// ---------------------------------------------------------------------------
// Busca por código de barras / PDV
// ---------------------------------------------------------------------------

export type PosProduct = {
  productId: string;
  variantId: string | null;
  name: string;
  description: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  unit: string;
  hasVariants: boolean;
  variantLabel: string | null;
};

export type BarcodeLookupResult =
  | { exists: false }
  | { exists: true; productId: string; name: string; active: boolean };

/**
 * Verifica se um código já está cadastrado na empresa (produto, variação ou
 * código alternativo). Usado pelo formulário de produtos após leitura por câmera.
 */
export async function lookupBarcode(
  ctx: AuthContext,
  rawCode: string
): Promise<BarcodeLookupResult> {
  assertPermission(ctx, "products.view");
  const code = rawCode.trim();
  if (!code) return { exists: false };

  const [product, variant, alt] = await Promise.all([
    prisma.product.findFirst({
      where: { tenantId: ctx.tenantId, barcode: code },
      select: { id: true, name: true, active: true },
    }),
    prisma.productVariant.findFirst({
      where: { tenantId: ctx.tenantId, barcode: code },
      select: { product: { select: { id: true, name: true, active: true } } },
    }),
    prisma.productBarcode.findFirst({
      where: { tenantId: ctx.tenantId, code },
      select: {
        product: { select: { id: true, name: true, active: true } },
        variant: { select: { product: { select: { id: true, name: true, active: true } } } },
      },
    }),
  ]);

  const hit = product ?? variant?.product ?? alt?.product ?? alt?.variant?.product ?? null;
  if (!hit) return { exists: false };
  return { exists: true, productId: hit.id, name: hit.name, active: hit.active };
}

export async function findByBarcode(
  ctx: AuthContext,
  code: string,
  branchId?: string
): Promise<PosProduct | null> {
  assertPermission(ctx, "pdv.operate");
  const trimmed = code.trim();
  if (!trimmed) return null;
  const branch = branchId || ctx.branchId || null;
  if (branch) assertBranchAccess(ctx, branch);

  const [alt, productByCode, variantByCode] = await Promise.all([
    prisma.productBarcode.findFirst({
      where: { tenantId: ctx.tenantId, code: trimmed },
      select: { productId: true, variantId: true },
    }),
    prisma.product.findFirst({
      where: {
        tenantId: ctx.tenantId,
        active: true,
        OR: [{ barcode: trimmed }, { sku: trimmed }],
      },
      include: { variants: { where: { active: true } } },
    }),
    prisma.productVariant.findFirst({
      where: {
        tenantId: ctx.tenantId,
        active: true,
        OR: [{ barcode: trimmed }, { sku: trimmed }],
      },
      include: { product: true },
    }),
  ]);

  // Resolve o código alternativo apenas quando o direto não achou nada.
  let product = productByCode;
  let variantHit = variantByCode;
  if (!product && alt?.productId) {
    product = await prisma.product.findFirst({
      where: { id: alt.productId, tenantId: ctx.tenantId, active: true },
      include: { variants: { where: { active: true } } },
    });
  }
  if (!product && !variantHit && alt?.variantId) {
    variantHit = await prisma.productVariant.findFirst({
      where: { id: alt.variantId, tenantId: ctx.tenantId, active: true },
      include: { product: true },
    });
  }

  if (product) {
    if (product.hasVariants) {
      const variantId = alt?.variantId ?? null;
      if (!variantId) {
        throw new Error(
          `O produto "${product.name}" possui variações. Selecione a cor/tamanho.`
        );
      }
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) return null;
      const stock = await getStock(ctx.tenantId, branch, product.id, variant.id);
      return {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        description: [variant.color, variant.size].filter(Boolean).join(" • ") || "Variação",
        sku: variant.sku,
        barcode: variant.barcode,
        price: Number(variant.price ?? product.promoPrice ?? product.price),
        stock,
        unit: product.unit,
        hasVariants: true,
        variantLabel: [variant.color, variant.size].filter(Boolean).join(" / ") || null,
      };
    }
    const stock = await getStock(ctx.tenantId, branch, product.id, null);
    return {
      productId: product.id,
      variantId: null,
      name: product.name,
      description: product.description ?? "",
      sku: product.sku,
      barcode: product.barcode,
      price: Number(product.promoPrice ?? product.price),
      stock,
      unit: product.unit,
      hasVariants: false,
      variantLabel: null,
    };
  }

  const variant = variantHit;
  if (variant && variant.product.active) {
    const stock = await getStock(ctx.tenantId, branch, variant.productId, variant.id);
    return {
      productId: variant.productId,
      variantId: variant.id,
      name: variant.product.name,
      description: [variant.color, variant.size].filter(Boolean).join(" • ") || "Variação",
      sku: variant.sku,
      barcode: variant.barcode,
      price: Number(variant.price ?? variant.product.promoPrice ?? variant.product.price),
      stock,
      unit: variant.product.unit,
      hasVariants: true,
      variantLabel: [variant.color, variant.size].filter(Boolean).join(" / ") || null,
    };
  }

  return null;
}

async function getStock(
  tenantId: string,
  branchId: string | null,
  productId: string,
  variantId: string | null
): Promise<number> {
  if (!branchId) return 0;
  const row = await prisma.stockLevel.findFirst({
    where: { branchId, productId, variantId },
    select: { quantity: true },
  });
  return row ? Number(row.quantity) : 0;
}

type StockKey = { productId: string; variantId: string | null };

function stockMapKey(key: StockKey) {
  return `${key.productId}:${key.variantId ?? ""}`;
}

/** Carrega os saldos de vários itens em uma única consulta (evita N+1). */
async function getStockMap(
  tenantId: string,
  branchId: string | null,
  keys: StockKey[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!branchId || keys.length === 0) return map;
  const rows = await prisma.stockLevel.findMany({
    where: {
      tenantId,
      branchId,
      OR: keys.map((key) => ({ productId: key.productId, variantId: key.variantId })),
    },
    select: { productId: true, variantId: true, quantity: true },
  });
  for (const row of rows) {
    map.set(stockMapKey({ productId: row.productId, variantId: row.variantId }), Number(row.quantity));
  }
  return map;
}

export async function searchPosProducts(
  ctx: AuthContext,
  term: string,
  branchId?: string,
  limit = 20
): Promise<PosProduct[]> {
  assertPermission(ctx, "pdv.operate");
  const q = term.trim();
  if (q.length < 2) return [];
  const branch = branchId || ctx.branchId || null;

  const products = await prisma.product.findMany({
    where: {
      tenantId: ctx.tenantId,
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { variants: { some: { active: true, OR: [{ sku: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }] } } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
    include: { variants: { where: { active: true }, take: 20 } },
  });

  const entries: Array<Omit<PosProduct, "stock"> & { stockKey: StockKey }> = [];
  const lowered = q.toLowerCase();
  for (const product of products) {
    if (product.hasVariants) {
      for (const variant of product.variants) {
        const match =
          variant.sku.toLowerCase().includes(lowered) ||
          (variant.barcode ?? "").toLowerCase().includes(lowered) ||
          product.name.toLowerCase().includes(lowered);
        if (!match) continue;
        entries.push({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          description: [variant.color, variant.size].filter(Boolean).join(" • ") || "Variação",
          sku: variant.sku,
          barcode: variant.barcode,
          price: variant.price ? Number(variant.price) : effectivePrice(product),
          unit: product.unit,
          hasVariants: true,
          variantLabel: [variant.color, variant.size].filter(Boolean).join(" / ") || null,
          stockKey: { productId: product.id, variantId: variant.id },
        });
      }
    } else {
      entries.push({
        productId: product.id,
        variantId: null,
        name: product.name,
        description: product.description ?? "",
        sku: product.sku,
        barcode: product.barcode,
        price: effectivePrice(product),
        unit: product.unit,
        hasVariants: false,
        variantLabel: null,
        stockKey: { productId: product.id, variantId: null },
      });
    }
    if (entries.length >= limit) break;
  }

  const selected = entries.slice(0, limit);
  // Uma única consulta de estoque para todos os resultados (antes: uma por item).
  const stock = await getStockMap(
    ctx.tenantId,
    branch,
    selected.map((entry) => entry.stockKey)
  );

  return selected.map(({ stockKey, ...entry }) => ({
    ...entry,
    stock: stock.get(stockMapKey(stockKey)) ?? 0,
  }));
}

export async function listCatalogOptions(ctx: AuthContext) {
  const [categories, brands, suppliers] = await Promise.all([
    prisma.productCategory.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, brands, suppliers };
}

/** Preço efetivo considerando promoção vigente. */
export function effectivePrice(product: {
  price: unknown;
  promoPrice: unknown;
  promoStart: Date | null;
  promoEnd: Date | null;
}): number {
  const now = Date.now();
  const promo = dec(product.promoPrice as never);
  if (promo.isZero()) return Number(product.price);
  const startOk = !product.promoStart || product.promoStart.getTime() <= now;
  const endOk = !product.promoEnd || product.promoEnd.getTime() >= now;
  return startOk && endOk ? promo.toNumber() : Number(product.price);
}
