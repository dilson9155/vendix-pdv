import type { Prisma } from "@prisma/client";

export type StockLevelKey = {
  branchId: string;
  productId: string;
  variantId: string | null;
};

/**
 * Busca o saldo de estoque de (filial, produto, variação).
 * Produtos sem variação usam `variantId = null`; o índice funcional do banco
 * garante que exista apenas um registro com esse par.
 */
export function findStockLevel(tx: Prisma.TransactionClient, key: StockLevelKey) {
  return tx.stockLevel.findFirst({ where: key });
}

/** Garante que exista um registro de saldo (sem alterar a quantidade existente). */
export async function ensureStockLevel(
  tx: Prisma.TransactionClient,
  params: StockLevelKey & { tenantId: string }
) {
  const { tenantId, ...key } = params;
  const existing = await tx.stockLevel.findFirst({ where: key, select: { id: true } });

  if (existing) {
    return existing;
  }

  return tx.stockLevel.create({ data: { tenantId, ...key } });
}

/** Cria ou atualiza o saldo de estoque de (filial, produto, variação). */
export async function putStockLevel(
  tx: Prisma.TransactionClient,
  params: StockLevelKey & {
    tenantId: string;
    quantity: Prisma.Decimal | Prisma.Decimal.Value;
  }
) {
  const { tenantId, quantity, ...key } = params;
  const existing = await tx.stockLevel.findFirst({ where: key, select: { id: true } });

  if (existing) {
    return tx.stockLevel.update({ where: { id: existing.id }, data: { quantity } });
  }

  return tx.stockLevel.create({ data: { tenantId, ...key, quantity } });
}
