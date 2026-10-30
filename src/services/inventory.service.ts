import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { getTenantPreferences } from "@/services/settings.service";
import { withSerializableTransaction } from "@/lib/transaction";
import { dec, money, qty } from "@/lib/money";
import { endOfBusinessDay, startOfBusinessDay } from "@/lib/date";
import { stockMovementSchema, stockTransferSchema } from "@/lib/validation";
import { findStockLevel, putStockLevel } from "@/services/stock-level.service";
import { z } from "zod";

export type StockFilters = {
  q?: string;
  branchId?: string;
  lowOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listStock(ctx: AuthContext, filters: StockFilters = {}) {
  assertPermission(ctx, "stock.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const where: Prisma.StockLevelWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    product: {
      active: true,
      ...(filters.q?.trim()
        ? {
            OR: [
              { name: { contains: filters.q.trim(), mode: "insensitive" } },
              { sku: { contains: filters.q.trim(), mode: "insensitive" } },
              { barcode: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [rows, total] = await Promise.all([
    prisma.stockLevel.findMany({
      where,
      orderBy: [{ product: { name: "asc" } }, { variantId: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            minStock: true,
            cost: true,
            price: true,
            unit: true,
            hasVariants: true,
          },
        },
        variant: { select: { id: true, sku: true, size: true, color: true, barcode: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.stockLevel.count({ where }),
  ]);

  const filtered = filters.lowOnly
    ? rows.filter((row) => Number(row.quantity) <= Number(row.product.minStock))
    : rows;

  return {
    rows: filtered.map((row) => ({
      id: row.id,
      branchId: row.branchId,
      branchName: row.branch.name,
      productId: row.productId,
      productName: row.product.name,
      sku: row.variant?.sku ?? row.product.sku,
      barcode: row.variant?.barcode ?? row.product.barcode,
      variantId: row.variantId || null,
      variantLabel: row.variant
        ? [row.variant.color, row.variant.size].filter(Boolean).join(" / ")
        : null,
      quantity: Number(row.quantity),
      minStock: Number(row.product.minStock),
      cost: Number(row.product.cost),
      price: Number(row.product.price),
      unit: row.product.unit,
      stockValue: Number(row.quantity) * Number(row.product.cost),
      low: Number(row.quantity) <= Number(row.product.minStock),
    })),
    total,
    page,
    pageSize,
  };
}

export type MovementFilters = {
  productId?: string;
  branchId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listStockMovements(ctx: AuthContext, filters: MovementFilters = {}) {
  assertPermission(ctx, "stock.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const where: Prisma.StockMovementWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.type ? { type: filters.type as never } : {}),
  };
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: startOfBusinessDay(filters.from) } : {}),
      ...(filters.to ? { lte: endOfBusinessDay(filters.to) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { color: true, size: true, sku: true } },
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

/** Opções de produto/variação para lançamentos de estoque. */
export async function listStockItemOptions(ctx: AuthContext, branchId?: string) {
  assertPermission(ctx, "stock.view");
  const branch = branchId ?? ctx.branchId ?? null;
  if (branch) assertBranchAccess(ctx, branch);
  const levels = await prisma.stockLevel.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(branch ? { branchId: branch } : {}),
      product: { active: true },
    },
    orderBy: [{ product: { name: "asc" } }],
    take: 2000,
    select: {
      productId: true,
      variantId: true,
      quantity: true,
      product: { select: { name: true, sku: true, unit: true } },
      variant: { select: { color: true, size: true, sku: true } },
    },
  });
  return levels.map((level) => ({
    productId: level.productId,
    variantId: level.variantId || null,
    label: `${level.product.name}${level.variant ? ` · ${[level.variant.color, level.variant.size].filter(Boolean).join(" / ")}` : ""}`,
    sku: level.variant?.sku ?? level.product.sku,
    unit: level.product.unit,
    quantity: Number(level.quantity),
  }));
}

export async function stockSummary(ctx: AuthContext, branchId?: string) {  assertPermission(ctx, "stock.view");
  const branch = branchId ?? ctx.branchId ?? null;
  if (branch) assertBranchAccess(ctx, branch);

  const levels = await prisma.stockLevel.findMany({
    where: { tenantId: ctx.tenantId, ...(branch ? { branchId: branch } : {}) },
    select: {
      quantity: true,
      product: { select: { cost: true, minStock: true, active: true } },
    },
  });

  let items = 0;
  let value = 0;
  let lowCount = 0;
  for (const level of levels) {
    if (!level.product.active) continue;
    items += 1;
    value += Number(level.quantity) * Number(level.product.cost);
    if (Number(level.quantity) <= Number(level.product.minStock)) lowCount += 1;
  }
  return { items, value, lowCount };
}

async function applyMovement(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    branchId: string;
    productId: string;
    variantId: string | null;
    type: "ENTRADA" | "SAIDA" | "AJUSTE" | "TRANSFERENCIA" | "VENDA" | "DEVOLUCAO" | "ESTORNO" | "INVENTARIO";
    delta: number;
    unitCost?: number | null;
    reason?: string | null;
    document?: string | null;
    saleId?: string | null;
    userId?: string | null;
    allowNegative: boolean;
  }
) {
  const variantKey = params.variantId ?? null;
  const level = await findStockLevel(tx, {
    branchId: params.branchId,
    productId: params.productId,
    variantId: variantKey,
  });

  const current = dec(level?.quantity ?? 0);
  const next = current.plus(dec(params.delta));

  if (!params.allowNegative && next.lessThan(0)) {
    throw new Error(
      `Estoque insuficiente: saldo atual ${qty(current)} e movimentação ${qty(params.delta)}.`
    );
  }

  const updated = await putStockLevel(tx, {
    tenantId: params.tenantId,
    branchId: params.branchId,
    productId: params.productId,
    variantId: variantKey,
    quantity: qty(next),
  });

  await tx.stockMovement.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      productId: params.productId,
      variantId: params.variantId,
      type: params.type,
      quantity: qty(params.delta),
      unitCost: params.unitCost !== undefined && params.unitCost !== null ? money(params.unitCost) : null,
      balanceAfter: updated.quantity,
      reason: params.reason ?? null,
      document: params.document ?? null,
      saleId: params.saleId ?? null,
      userId: params.userId ?? null,
    },
  });

  return updated;
}

async function assertProductInTenant(
  tenantId: string,
  productId: string,
  variantId?: string | null
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, hasVariants: true, name: true },
  });
  if (!product) throw new Error("Produto não encontrado.");
  if (variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, tenantId, productId },
      select: { id: true },
    });
    if (!variant) throw new Error("Variação não encontrada para este produto.");
  }
  return product;
}

export async function registerStockMovement(ctx: AuthContext, raw: unknown): Promise<void> {
  assertPermission(ctx, "stock.manage");
  const input = stockMovementSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!branch) throw new Error("Unidade inválida.");

  const product = await assertProductInTenant(ctx.tenantId, input.productId, input.variantId);
  if (product.hasVariants && !input.variantId) {
    throw new Error("Selecione a variação (cor/tamanho) para movimentar o estoque.");
  }
  if (!product.hasVariants && input.variantId) {
    throw new Error("Produto sem variações não aceita variação no movimento.");
  }

  const prefs = await getTenantPreferences(ctx.tenantId);
  let delta = input.quantity;
  if (input.type === "SAIDA" || input.type === "TRANSFERENCIA") {
    delta = -Math.abs(input.quantity);
  } else if (input.type === "ENTRADA") {
    delta = Math.abs(input.quantity);
  } else if (input.type === "INVENTARIO") {
    const level = await prisma.stockLevel.findFirst({
      where: {
        branchId: input.branchId,
        productId: input.productId,
        variantId: input.variantId ?? null,
      },
      select: { quantity: true },
    });
    delta = input.quantity - Number(level?.quantity ?? 0);
    if (delta === 0) throw new Error("A contagem informada é igual ao saldo atual.");
  }

  await withSerializableTransaction(async (tx) => {
    await applyMovement(tx, {
      tenantId: ctx.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      type: input.type === "INVENTARIO" ? "INVENTARIO" : input.type,
      delta,
      unitCost: input.unitCost ?? null,
      reason: input.reason,
      document: input.document ?? null,
      userId: ctx.userId,
      allowNegative: prefs.allowNegativeStock && input.type === "SAIDA",
    });

    if (input.type === "ENTRADA" && input.unitCost !== undefined && input.unitCost > 0) {
      if (input.variantId) {
        await tx.productVariant.update({
          where: { id: input.variantId },
          data: { cost: money(input.unitCost) },
        });
      } else {
        await tx.product.update({
          where: { id: input.productId },
          data: { cost: money(input.unitCost) },
        });
      }
    }
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "estoque",
    entity: "StockMovement",
    entityId: input.productId,
    description: `Movimento de estoque (${input.type}) de ${qty(delta)} em "${product.name}" — ${input.reason}`,
    newValues: { branchId: input.branchId, quantity: qty(delta), type: input.type },
  });
}

export async function transferStock(ctx: AuthContext, raw: unknown): Promise<void> {
  assertPermission(ctx, "stock.manage");
  const input = stockTransferSchema.parse(raw);
  if (input.fromBranchId === input.toBranchId) {
    throw new Error("A origem e o destino devem ser unidades diferentes.");
  }
  assertBranchAccess(ctx, input.fromBranchId);
  assertBranchAccess(ctx, input.toBranchId);

  const branches = await prisma.branch.findMany({
    where: { tenantId: ctx.tenantId, id: { in: [input.fromBranchId, input.toBranchId] } },
    select: { id: true },
  });
  if (branches.length !== 2) throw new Error("Unidade de origem ou destino inválida.");

  const product = await assertProductInTenant(ctx.tenantId, input.productId, input.variantId);
  if (product.hasVariants && !input.variantId) {
    throw new Error("Selecione a variação para transferir.");
  }

  const prefs = await getTenantPreferences(ctx.tenantId);

  await withSerializableTransaction(async (tx) => {
    await applyMovement(tx, {
      tenantId: ctx.tenantId,
      branchId: input.fromBranchId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      type: "TRANSFERENCIA",
      delta: -Math.abs(input.quantity),
      reason: input.reason || "Transferência entre unidades",
      userId: ctx.userId,
      allowNegative: false,
    });
    await applyMovement(tx, {
      tenantId: ctx.tenantId,
      branchId: input.toBranchId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      type: "TRANSFERENCIA",
      delta: Math.abs(input.quantity),
      reason: input.reason || "Transferência entre unidades",
      userId: ctx.userId,
      allowNegative: prefs.allowNegativeStock,
    });
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "estoque",
    entity: "StockTransfer",
    entityId: input.productId,
    description: `Transferência de ${qty(input.quantity)} de "${product.name}" entre unidades`,
    newValues: input,
  });
}

const inventorySchema = z.object({
  branchId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        counted: z.coerce.number().min(0),
      })
    )
    .min(1),
  reason: z.string().trim().max(200).optional(),
});

export async function applyInventoryCount(ctx: AuthContext, raw: unknown): Promise<{ adjusted: number }> {
  assertPermission(ctx, "stock.manage");
  const input = inventorySchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!branch) throw new Error("Unidade inválida.");

  let adjusted = 0;

  await withSerializableTransaction(async (tx) => {
    for (const item of input.items) {
      await assertProductInTenant(ctx.tenantId, item.productId, item.variantId);
      const level = await findStockLevel(tx, {
        branchId: input.branchId,
        productId: item.productId,
        variantId: item.variantId ?? null,
      });
      const current = Number(level?.quantity ?? 0);
      const delta = item.counted - current;
      if (delta === 0) continue;
      await applyMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: input.branchId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        type: "INVENTARIO",
        delta,
        reason: input.reason || "Inventário físico",
        userId: ctx.userId,
        allowNegative: true,
      });
      adjusted += 1;
    }
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "estoque",
    entity: "Inventory",
    entityId: input.branchId,
    description: `Inventário físico com ${adjusted} ajuste(s)`,
    newValues: { branchId: input.branchId, adjusted },
  });

  return { adjusted };
}

export async function listLowStock(ctx: AuthContext, branchId?: string, limit = 10) {
  assertPermission(ctx, "stock.view");
  const branch = branchId ?? ctx.branchId ?? null;
  const levels = await prisma.stockLevel.findMany({
    where: { tenantId: ctx.tenantId, ...(branch ? { branchId: branch } : {}) },
    include: {
      product: { select: { name: true, sku: true, minStock: true, active: true } },
      variant: { select: { color: true, size: true, sku: true } },
    },
    orderBy: { quantity: "asc" },
    take: 200,
  });
  return levels
    .filter((row) => row.product.active && Number(row.quantity) <= Number(row.product.minStock))
    .slice(0, limit)
    .map((row) => ({
      productId: row.productId,
      name: row.product.name,
      sku: row.variant?.sku ?? row.product.sku,
      variantLabel: row.variant ? [row.variant.color, row.variant.size].filter(Boolean).join(" / ") : null,
      quantity: Number(row.quantity),
      minStock: Number(row.product.minStock),
    }));
}
