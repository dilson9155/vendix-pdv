import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, hasPermission, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { withSerializableTransaction } from "@/lib/transaction";
import {
  getDefaultCashAccount,
  getDefaultRevenueChartAccount,
  postLedgerEntry,
  reverseLedgerEntry,
} from "@/services/finance-core.service";
import { addRefundCashMovement, addSaleCashMovement, getOpenCashSession } from "@/services/cash.service";
import { getTenantPreferences } from "@/services/settings.service";
import { dec, money, round2, splitInstallments, sumValues } from "@/lib/money";
import {
  addMonths,
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
  todayISO,
} from "@/lib/date";
import { saleSchema, type SaleInput } from "@/lib/validation";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const EPSILON = 0.005;

type NormalizedItem = {
  key: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  discount: number;
};

export async function createSale(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "sales.create");
  const input: SaleInput = saleSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  // Idempotência: retry do cliente devolve a mesma venda.
  const previous = await prisma.sale.findFirst({
    where: { tenantId: ctx.tenantId, idempotencyKey: input.idempotencyKey },
    select: { id: true, documentNumber: true, total: true, status: true },
  });
  if (previous) {
    return {
      id: previous.id,
      documentNumber: previous.documentNumber,
      total: Number(previous.total),
      status: previous.status,
      duplicate: true,
    };
  }

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId, status: "ATIVO" },
    select: { id: true, code: true, name: true },
  });
  if (!branch) throw new Error("Unidade inválida ou inativa.");

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: ctx.tenantId },
      select: { id: true, name: true },
    });
    if (!customer) throw new Error("Cliente inválido.");
  }

  let session: { id: string; branchId: string; status: string } | null = null;
  if (input.cashSessionId) {
    session = await prisma.cashSession.findFirst({
      where: { id: input.cashSessionId, tenantId: ctx.tenantId },
      select: { id: true, branchId: true, status: true },
    });
    if (!session) throw new Error("Sessão de caixa inválida.");
    if (session.branchId !== input.branchId) {
      throw new Error("A sessão de caixa pertence a outra unidade.");
    }
    if (session.status !== "ABERTO") throw new Error("O caixa está fechado.");
  }

  const prefs = await getTenantPreferences(ctx.tenantId);
  const canDiscount = hasPermission(ctx, "sales.discount");

  // Consolida itens repetidos e carrega preços do servidor.
  const normalized = new Map<string, NormalizedItem>();
  for (const item of input.items) {
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = normalized.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.discount += item.discount;
    } else {
      normalized.set(key, {
        key,
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        discount: item.discount,
      });
    }
  }

  const methodIds = [...new Set(input.payments.map((p) => p.paymentMethodId))];
  const methods = await prisma.paymentMethod.findMany({
    where: { tenantId: ctx.tenantId, id: { in: methodIds }, active: true },
    include: { financialAccount: { select: { id: true, branchId: true } } },
  });
  const methodMap = new Map(methods.map((m) => [m.id, m]));
  if (methodIds.length !== methods.length) {
    throw new Error("Forma de pagamento inválida ou inativa.");
  }

  // Monta linhas com preço e custo atuais do banco.
  const lines = await Promise.all(
    [...normalized.values()].map(async (item) => {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenantId: ctx.tenantId, active: true },
        include: { variants: { where: { active: true } } },
      });
      if (!product) throw new Error("Produto não encontrado ou inativo.");
      if (product.hasVariants && !item.variantId) {
        throw new Error(`Selecione a variação de "${product.name}".`);
      }
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;
      if (item.variantId && !variant) {
        throw new Error(`Variação inválida para "${product.name}".`);
      }

      const promoActive =
        product.promoPrice !== null &&
        (!product.promoStart || product.promoStart.getTime() <= Date.now()) &&
        (!product.promoEnd || product.promoEnd.getTime() >= Date.now());
      const price = dec(
        variant?.price ?? (promoActive ? product.promoPrice : product.price)
      );
      const cost = dec(variant?.cost ?? product.cost);
      const gross = round2(price.times(item.quantity));

      if (item.quantity <= 0) throw new Error(`Quantidade inválida em "${product.name}".`);
      if (dec(item.discount).greaterThan(gross)) {
        throw new Error(`Desconto maior que o valor do item "${product.name}".`);
      }

      const lineTotal = round2(gross.minus(item.discount));
      return {
        productId: product.id,
        variantId: item.variantId,
        name: product.name,
        sku: variant?.sku ?? product.sku,
        unitPrice: price,
        unitCost: cost,
        quantity: item.quantity,
        discount: round2(item.discount),
        total: lineTotal,
        stockKey: { productId: product.id, variantId: item.variantId },
      };
    })
  );

  const subtotal = round2(sumValues(lines.map((l) => l.total)));
  const globalDiscount = round2(input.discount);
  if (globalDiscount.greaterThan(subtotal)) {
    throw new Error("O desconto não pode ser maior que o subtotal.");
  }
  const total = round2(subtotal.minus(globalDiscount));

  // Regra de desconto: acima do limite configurado exige permissão específica.
  const discountPercent = subtotal.isZero()
    ? 0
    : subtotal.minus(total).dividedBy(subtotal).times(100).toNumber();
  if (discountPercent > prefs.maxDiscountPercent + 0.001 && !canDiscount) {
    throw new Error(
      `O desconto máximo permitido é ${prefs.maxDiscountPercent}%. Solicite autorização.`
    );
  }

  if (input.payments.length === 0) {
    throw new Error("Informe ao menos uma forma de pagamento.");
  }

  let applied = round2(sumValues(input.payments.map((p) => p.amount)));
  if (applied.lessThan(total.minus(EPSILON))) {
    throw new Error(
      `Pagamento insuficiente. Total ${total.toFixed(2)} e pago ${applied.toFixed(2)}.`
    );
  }

  const excess = applied.minus(total);
  let change = round2(0);
  if (excess.greaterThan(EPSILON)) {
    const cashTotal = round2(
      sumValues(
        input.payments
          .filter((p) => methodMap.get(p.paymentMethodId)?.kind === "DINHEIRO")
          .map((p) => p.amount)
      )
    );
    if (cashTotal.lessThan(excess)) {
      throw new Error("O valor pago excede o total e não há dinheiro suficiente para o troco.");
    }
    change = round2(excess);
  }

  const creditPayments = input.payments.filter(
    (p) => methodMap.get(p.paymentMethodId)?.kind === "CREDITO_LOJA"
  );
  const creditTotal = round2(sumValues(creditPayments.map((p) => p.amount)));
  if (creditTotal.greaterThan(0) && prefs.requireCustomerOnCredit && !input.customerId) {
    throw new Error("Vendas no crediário exigem cliente identificado.");
  }

  // Ajusta o troco na primeira forma em dinheiro.
  let remainingChange = change;
  const payments = input.payments.map((payment) => {
    const method = methodMap.get(payment.paymentMethodId)!;
    let amount = round2(payment.amount);
    if (method.kind === "DINHEIRO" && remainingChange.greaterThan(0)) {
      const absorb = round2(DecimalMin(amount, remainingChange));
      amount = round2(amount.minus(absorb));
      remainingChange = round2(remainingChange.minus(absorb));
    }
    return { ...payment, method, appliedAmount: amount };
  });

  const cashNet = round2(
    sumValues(
      payments
        .filter((p) => p.method.kind === "DINHEIRO")
        .map((p) => p.appliedAmount)
    )
  );

  const [cashAccount, revenueAccount] = await Promise.all([
    getDefaultCashAccount(ctx.tenantId, branch.id),
    getDefaultRevenueChartAccount(ctx.tenantId),
  ]);

  const saleId = await withSerializableTransaction(async (tx) => {
    // Numeração sequencial por filial.
    const counter = await tx.documentCounter.upsert({
      where: { branchId_scope: { branchId: branch.id, scope: "SALE" } },
      update: { value: { increment: 1 } },
      create: { tenantId: ctx.tenantId, branchId: branch.id, scope: "SALE", value: 1 },
    });
    const documentNumber = `${branch.code}-${String(counter.value).padStart(6, "0")}`;

    const sale = await tx.sale.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        number: counter.value,
        documentNumber,
        status: "CONCLUIDA",
        customerId: input.customerId || null,
        operatorId: ctx.userId,
        cashSessionId: session?.id ?? null,
        subtotal: money(subtotal),
        discount: money(globalDiscount),
        total: money(total),
        paidTotal: money(
          sumValues(
            payments.filter((p) => p.method.kind !== "CREDITO_LOJA").map((p) => p.appliedAmount)
          )
        ),
        changeAmount: money(change),
        notes: input.notes ?? null,
        idempotencyKey: input.idempotencyKey,
        stockApplied: true,
        confirmedAt: new Date(),
      },
    });

    for (const line of lines) {
      const created = await tx.saleItem.create({
        data: {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          productId: line.productId,
          variantId: line.variantId,
          description: line.name,
          sku: line.sku,
          quantity: line.quantity.toFixed(3),
          unitPrice: money(line.unitPrice),
          unitCost: money(line.unitCost),
          discount: money(line.discount),
          total: money(line.total),
        },
      });
      void created;

      // Estoque com controle de concorrência (transação serializável).
      const variantKey = line.variantId ?? "";
      const level = await tx.stockLevel.findUnique({
        where: {
          branchId_productId_variantId: {
            branchId: branch.id,
            productId: line.productId,
            variantId: variantKey,
          },
        },
      });
      const current = dec(level?.quantity ?? 0);
      const next = round2(current.minus(line.quantity));
      if (next.lessThan(0) && !prefs.allowNegativeStock) {
        throw new Error(`Estoque insuficiente para "${line.name}". Saldo: ${current.toFixed(3)}.`);
      }
      await tx.stockLevel.upsert({
        where: {
          branchId_productId_variantId: {
            branchId: branch.id,
            productId: line.productId,
            variantId: variantKey,
          },
        },
        update: { quantity: next.toFixed(3) },
        create: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: line.productId,
          variantId: variantKey,
          quantity: next.toFixed(3),
        },
      });
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: line.productId,
          variantId: line.variantId,
          type: "VENDA",
          quantity: (-line.quantity).toFixed(3),
          unitCost: money(line.unitCost),
          balanceAfter: next.toFixed(3),
          reason: `Venda ${documentNumber}`,
          document: documentNumber,
          saleId: sale.id,
          userId: ctx.userId,
        },
      });
    }

    for (const payment of payments) {
      const fee = round2(
        payment.method.feePercent.times(payment.appliedAmount).dividedBy(100)
      );
      await tx.salePayment.create({
        data: {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          paymentMethodId: payment.method.id,
          methodKind: payment.method.kind,
          methodName: payment.method.name,
          amount: money(payment.appliedAmount),
          feeAmount: money(fee),
          installments: payment.installments,
          financialAccountId: payment.method.financialAccountId,
          notes: payment.notes ?? null,
          status: "CONFIRMADO",
        },
      });

      if (payment.method.kind === "CREDITO_LOJA") {
        // Crediário: gera contas a receber (não entra como dinheiro no caixa).
        const installments = Math.max(1, payment.installments);
        const parts = splitInstallments(payment.appliedAmount, installments);
        const groupId = installments > 1 ? randomUUID() : null;
        const today = new Date();
        for (let index = 0; index < parts.length; index += 1) {
          await tx.receivable.create({
            data: {
              tenantId: ctx.tenantId,
              branchId: branch.id,
              customerId: input.customerId || null,
              saleId: sale.id,
              description:
                installments > 1
                  ? `Venda ${documentNumber} (${index + 1}/${installments})`
                  : `Venda ${documentNumber}`,
              document: documentNumber,
              chartAccountId: revenueAccount?.id ?? null,
              issueDate: today,
              competenceDate: today,
              dueDate: addMonths(today, index),
              value: money(parts[index]),
              createdById: ctx.userId,
              installmentGroupId: groupId,
              installmentNumber: installments > 1 ? index + 1 : null,
              installmentTotal: installments > 1 ? installments : null,
            },
          });
        }
      } else if (payment.appliedAmount.greaterThan(0)) {
        const accountId =
          payment.method.financialAccountId ?? cashAccount.id;
        await postLedgerEntry(tx, {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          financialAccountId: accountId,
          chartAccountId: revenueAccount?.id ?? null,
          date: new Date(),
          type: "ENTRADA",
          amount: money(payment.appliedAmount),
          description: `Venda ${documentNumber} — ${payment.method.name}`,
          document: documentNumber,
          sourceType: "VENDA",
          sourceId: sale.id,
          saleId: sale.id,
          createdById: ctx.userId,
        });
      }
    }

    if (session?.id && cashNet.greaterThan(0)) {
      await addSaleCashMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        sessionId: session.id,
        amount: cashNet.toNumber(),
        userId: ctx.userId,
        saleId: sale.id,
      });
    }

    return sale.id;
  });

  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    select: { id: true, documentNumber: true, total: true, status: true, createdAt: true },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "vendas",
    entity: "Sale",
    entityId: sale.id,
    description: `Venda ${sale.documentNumber} concluída — ${money(total)}`,
    newValues: {
      total: money(total),
      discount: money(globalDiscount),
      items: lines.length,
      change: money(change),
      credit: money(creditTotal),
    },
  });

  return {
    id: sale.id,
    documentNumber: sale.documentNumber,
    total: Number(sale.total),
    status: sale.status,
    change: change.toNumber(),
    credit: creditTotal.toNumber(),
    duplicate: false,
  };
}

function DecimalMin(a: ReturnType<typeof round2>, b: ReturnType<typeof round2>) {
  return a.lessThan(b) ? a : b;
}

// ---------------------------------------------------------------------------
// Consulta de vendas
// ---------------------------------------------------------------------------

export type SaleFilters = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  branchId?: string;
  operatorId?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
};

export async function listSales(ctx: AuthContext, filters: SaleFilters = {}) {
  assertPermission(ctx, "sales.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));

  const where: Prisma.SaleWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.operatorId ? { operatorId: filters.operatorId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: startOfBusinessDay(filters.from) } : {}),
      ...(filters.to ? { lte: endOfBusinessDay(filters.to) } : {}),
    };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { documentNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total, aggregate, completedCount, canceledCount] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { name: true } },
        operator: { select: { name: true } },
        branch: { select: { name: true } },
        payments: { select: { methodName: true, methodKind: true, amount: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: { ...where, status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] } },
      _sum: { total: true, discount: true },
      _avg: { total: true },
    }),
    prisma.sale.count({
      where: { ...where, status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] } },
    }),
    prisma.sale.count({ where: { ...where, status: "CANCELADA" } }),
  ]);

  return {
    rows: rows.map((sale) => ({
      id: sale.id,
      documentNumber: sale.documentNumber,
      createdAt: sale.createdAt,
      customerName: sale.customer?.name ?? null,
      operatorName: sale.operator.name,
      branchName: sale.branch.name,
      status: sale.status,
      total: Number(sale.total),
      discount: Number(sale.discount),
      items: sale._count.items,
      payments: sale.payments.map((p) => ({ name: p.methodName, kind: p.methodKind, amount: Number(p.amount) })),
    })),
    total,
    page,
    pageSize,
    totals: {
      revenue: Number(aggregate._sum.total ?? 0),
      discount: Number(aggregate._sum.discount ?? 0),
      average: Number(aggregate._avg.total ?? 0),
      count: completedCount,
      discounts: Number(aggregate._sum.discount ?? 0),
      averageTicket: Number(aggregate._avg.total ?? 0),
      canceled: canceledCount,
    },
  };
}

export async function getSale(ctx: AuthContext, id: string) {
  assertPermission(ctx, "sales.view");
  const sale = await prisma.sale.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      items: { include: { variant: { select: { color: true, size: true } } } },
      payments: { include: { paymentMethod: true, financialAccount: { select: { name: true } } } },
      customer: true,
      operator: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true, code: true } },
      returns: { include: { items: { include: { saleItem: true } }, user: { select: { name: true } } } },
      receivables: {
        include: { payments: { where: { reversedAt: null }, select: { amount: true } } },
      },
    },
  });
  if (!sale) return null;
  assertBranchAccess(ctx, sale.branchId);
  return sale;
}

// ---------------------------------------------------------------------------
// Cancelamento
// ---------------------------------------------------------------------------

export async function cancelSale(
  ctx: AuthContext,
  saleId: string,
  reason: string
) {
  assertPermission(ctx, "sales.cancel");
  if (!reason.trim()) throw new Error("Informe o motivo do cancelamento.");

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: ctx.tenantId },
    include: {
      items: true,
      payments: true,
      receivables: { include: { payments: { where: { reversedAt: null }, select: { id: true } } } },
      returns: { include: { items: true } },
      cashSession: { select: { id: true, status: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  if (!sale) throw new Error("Venda não encontrada.");
  assertBranchAccess(ctx, sale.branchId);
  if (sale.status === "CANCELADA") throw new Error("Esta venda já está cancelada.");

  const paidReceivables = sale.receivables.filter(
    (receivable) => receivable.status !== "CANCELADO" && receivable.payments.length > 0
  );
  if (paidReceivables.length > 0) {
    throw new Error(
      "Existem recebimentos vinculados a esta venda. Estorne-os antes de cancelar."
    );
  }

  const returnedByItem = new Map<string, number>();
  for (const saleReturn of sale.returns) {
    for (const item of saleReturn.items) {
      returnedByItem.set(
        item.saleItemId,
        (returnedByItem.get(item.saleItemId) ?? 0) + Number(item.quantity)
      );
    }
  }

  const cashRefund = round2(
    sumValues(
      sale.payments
        .filter((p) => p.methodKind === "DINHEIRO" && p.status === "CONFIRMADO")
        .map((p) => p.amount)
    )
  );

  await withSerializableTransaction(async (tx) => {
    // Devolve ao estoque o que ainda não foi devolvido.
    if (sale.stockApplied) {
      for (const item of sale.items) {
        const returned = returnedByItem.get(item.id) ?? 0;
        const remaining = round2(dec(item.quantity).minus(returned));
        if (remaining.lessThanOrEqualTo(0)) continue;
        const variantKey = item.variantId ?? "";
        const level = await tx.stockLevel.findUnique({
          where: {
            branchId_productId_variantId: {
              branchId: sale.branchId,
              productId: item.productId,
              variantId: variantKey,
            },
          },
        });
        const current = dec(level?.quantity ?? 0);
        const next = round2(current.plus(remaining));
        await tx.stockLevel.upsert({
          where: {
            branchId_productId_variantId: {
              branchId: sale.branchId,
              productId: item.productId,
              variantId: variantKey,
            },
          },
          update: { quantity: next.toFixed(3) },
          create: {
            tenantId: ctx.tenantId,
            branchId: sale.branchId,
            productId: item.productId,
            variantId: variantKey,
            quantity: next.toFixed(3),
          },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: sale.branchId,
            productId: item.productId,
            variantId: item.variantId,
            type: "ESTORNO",
            quantity: remaining.toFixed(3),
            balanceAfter: next.toFixed(3),
            reason: `Cancelamento da venda ${sale.documentNumber}`,
            document: sale.documentNumber,
            saleId: sale.id,
            userId: ctx.userId,
          },
        });
      }
    }

    // Reverte lançamentos financeiros da venda (perna inversa vinculada).
    const entries = await tx.ledgerEntry.findMany({
      where: { tenantId: ctx.tenantId, saleId: sale.id, reversalOfId: null },
      select: { id: true },
    });
    for (const entry of entries) {
      const already = await tx.ledgerEntry.findFirst({ where: { reversalOfId: entry.id } });
      if (!already) {
        await reverseLedgerEntry(tx, entry.id, `Cancelamento da venda ${sale.documentNumber}`, ctx.userId);
      }
    }

    await tx.salePayment.updateMany({
      where: { saleId: sale.id, status: "CONFIRMADO" },
      data: { status: "ESTORNADO", reversedAt: new Date(), reversedReason: reason },
    });

    await tx.receivable.updateMany({
      where: { saleId: sale.id, status: { in: ["ABERTO", "PARCIAL"] } },
      data: { status: "CANCELADO", canceledAt: new Date(), canceledReason: reason },
    });

    if (sale.cashSession?.status === "ABERTO" && cashRefund.greaterThan(0)) {
      await addRefundCashMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: sale.branchId,
        sessionId: sale.cashSession.id,
        amount: cashRefund.toNumber(),
        userId: ctx.userId,
      });
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "CANCELADA",
        canceledAt: new Date(),
        canceledById: ctx.userId,
        cancelReason: reason,
      },
    });
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CANCEL",
    module: "vendas",
    entity: "Sale",
    entityId: sale.id,
    description: `Venda ${sale.documentNumber} cancelada: ${reason}`,
    oldValues: { status: sale.status, total: sale.total.toString() },
  });
}

// ---------------------------------------------------------------------------
// Devolução
// ---------------------------------------------------------------------------

const returnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().trim().min(1, "Informe o motivo da devolução."),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1),
        quantity: z.coerce.number().positive("Quantidade inválida."),
        restock: z.boolean().default(true),
      })
    )
    .min(1, "Selecione ao menos um item."),
  financialAccountId: z.string().optional(),
});

export async function createSaleReturn(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "sales.return");
  const input = returnSchema.parse(raw);

  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, tenantId: ctx.tenantId },
    include: {
      items: true,
      returns: { include: { items: true } },
      cashSession: { select: { id: true, status: true } },
    },
  });
  if (!sale) throw new Error("Venda não encontrada.");
  assertBranchAccess(ctx, sale.branchId);
  if (sale.status === "CANCELADA") throw new Error("Venda cancelada não aceita devolução.");
  if (sale.status === "ABERTA") throw new Error("Venda não concluída.");

  const returned = new Map<string, number>();
  for (const saleReturn of sale.returns) {
    for (const item of saleReturn.items) {
      returned.set(item.saleItemId, (returned.get(item.saleItemId) ?? 0) + Number(item.quantity));
    }
  }

  let refundTotal = round2(0);
  const validated: Array<{
    saleItemId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    quantity: number;
    unitPrice: ReturnType<typeof round2>;
    total: ReturnType<typeof round2>;
    restock: boolean;
    unitCost: ReturnType<typeof round2>;
  }> = [];

  for (const inputItem of input.items) {
    const saleItem = sale.items.find((item) => item.id === inputItem.saleItemId);
    if (!saleItem) throw new Error("Item da venda não encontrado.");
    const available = round2(
      dec(saleItem.quantity).minus(returned.get(saleItem.id) ?? 0)
    );
    if (inputItem.quantity > available.toNumber() + EPSILON) {
      throw new Error(
        `Quantidade de devolução maior que a disponível para "${saleItem.description}" (${available.toString()}).`
      );
    }
    const netUnit = round2(dec(saleItem.total).dividedBy(saleItem.quantity));
    const total = round2(netUnit.times(inputItem.quantity));
    refundTotal = round2(refundTotal.plus(total));
    validated.push({
      saleItemId: saleItem.id,
      productId: saleItem.productId,
      variantId: saleItem.variantId,
      sku: saleItem.sku,
      quantity: inputItem.quantity,
      unitPrice: netUnit,
      total,
      restock: inputItem.restock,
      unitCost: round2(saleItem.unitCost),
    });
  }

  if (refundTotal.lessThanOrEqualTo(0)) throw new Error("Valor de devolução inválido.");

  const cashAccount = await getDefaultCashAccount(ctx.tenantId, sale.branchId);

  await withSerializableTransaction(async (tx) => {
    const saleReturn = await tx.saleReturn.create({
      data: {
        tenantId: ctx.tenantId,
        saleId: sale.id,
        userId: ctx.userId,
        reason: input.reason,
        total: money(refundTotal),
        stockApplied: true,
      },
    });

    for (const item of validated) {
      await tx.saleReturnItem.create({
        data: {
          saleReturnId: saleReturn.id,
          saleItemId: item.saleItemId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity.toFixed(3),
          unitPrice: money(item.unitPrice),
          total: money(item.total),
          restock: item.restock,
        },
      });

      if (item.restock) {
        const variantKey = item.variantId ?? "";
        const level = await tx.stockLevel.findUnique({
          where: {
            branchId_productId_variantId: {
              branchId: sale.branchId,
              productId: item.productId,
              variantId: variantKey,
            },
          },
        });
        const current = dec(level?.quantity ?? 0);
        const next = round2(current.plus(item.quantity));
        await tx.stockLevel.upsert({
          where: {
            branchId_productId_variantId: {
              branchId: sale.branchId,
              productId: item.productId,
              variantId: variantKey,
            },
          },
          update: { quantity: next.toFixed(3) },
          create: {
            tenantId: ctx.tenantId,
            branchId: sale.branchId,
            productId: item.productId,
            variantId: variantKey,
            quantity: next.toFixed(3),
          },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: sale.branchId,
            productId: item.productId,
            variantId: item.variantId,
            type: "DEVOLUCAO",
            quantity: item.quantity.toFixed(3),
            unitCost: money(item.unitCost),
            balanceAfter: next.toFixed(3),
            reason: `Devolução da venda ${sale.documentNumber}`,
            document: sale.documentNumber,
            saleId: sale.id,
            userId: ctx.userId,
          },
        });
      }
    }

    await postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: sale.branchId,
      financialAccountId: input.financialAccountId || cashAccount.id,
      date: new Date(),
      type: "SAIDA",
      amount: refundTotal.toNumber(),
      description: `Devolução da venda ${sale.documentNumber}: ${input.reason}`,
      document: sale.documentNumber,
      sourceType: "ESTORNO",
      sourceId: saleReturn.id,
      saleId: sale.id,
      createdById: ctx.userId,
    });

    if (sale.cashSession?.status === "ABERTO") {
      await addRefundCashMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: sale.branchId,
        sessionId: sale.cashSession.id,
        amount: refundTotal.toNumber(),
        userId: ctx.userId,
      });
    }

    const allItems = await tx.saleItem.findMany({ where: { saleId: sale.id }, select: { id: true, quantity: true } });
    const allReturns = await tx.saleReturnItem.groupBy({
      by: ["saleItemId"],
      where: { saleReturn: { saleId: sale.id } },
      _sum: { quantity: true },
    });
    const returnMap = new Map(allReturns.map((row) => [row.saleItemId, Number(row._sum.quantity ?? 0)]));
    const fullyReturned = allItems.every(
      (item) => (returnMap.get(item.id) ?? 0) >= Number(item.quantity) - EPSILON
    );
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: fullyReturned ? "DEVOLVIDA" : "DEVOLVIDA_PARCIAL" },
    });
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "REVERT",
    module: "vendas",
    entity: "SaleReturn",
    entityId: sale.id,
    description: `Devolução de ${money(refundTotal)} na venda ${sale.documentNumber}: ${input.reason}`,
    newValues: { total: money(refundTotal), items: validated.length },
  });

  return { total: refundTotal.toNumber() };
}

// ---------------------------------------------------------------------------
// Comprovante e token público
// ---------------------------------------------------------------------------

export async function getReceiptData(ctx: AuthContext, saleId: string) {
  assertPermission(ctx, "sales.view");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: ctx.tenantId },
    include: {
      items: { include: { variant: { select: { color: true, size: true } } } },
      payments: true,
      customer: { select: { name: true, document: true, phone: true } },
      operator: { select: { name: true } },
      branch: { select: { name: true, document: true, address: true, city: true, state: true, phone: true } },
      tenant: true,
    },
  });
  if (!sale) return null;
  assertBranchAccess(ctx, sale.branchId);
  const prefs = await getTenantPreferences(ctx.tenantId);
  return buildReceipt(sale, prefs.receiptFooter, prefs.isDemo);
}

export type ReceiptData = ReturnType<typeof buildReceipt>;

function buildReceipt(
  sale: {
    documentNumber: string;
    createdAt: Date;
    total: unknown;
    subtotal: unknown;
    discount: unknown;
    changeAmount: unknown;
    customer: { name: string; document: string | null } | null;
    operator: { name: string };
    branch: { name: string; document: string | null; address: string | null; city: string | null; state: string | null; phone: string | null };
    tenant: { name: string; legalName: string | null; document: string | null; address: string | null; city: string | null; state: string | null; phone: string | null };
    items: Array<{ description: string; sku: string; quantity: unknown; unitPrice: unknown; discount: unknown; total: unknown; variant: { color: string | null; size: string | null } | null }>;
    payments: Array<{ methodName: string; amount: unknown; installments: number }>;
  },
  footer: string,
  isDemo: boolean
) {
  return {
    documentNumber: sale.documentNumber,
    createdAt: sale.createdAt,
    company: {
      name: sale.tenant.name,
      legalName: sale.tenant.legalName,
      document: sale.tenant.document,
      address: [sale.tenant.address, sale.tenant.city, sale.tenant.state].filter(Boolean).join(", "),
      phone: sale.tenant.phone,
      branchName: sale.branch.name,
      branchDocument: sale.branch.document,
      branchPhone: sale.branch.phone,
    },
    customerName: sale.customer?.name ?? null,
    customerDocument: sale.customer?.document ?? null,
    operatorName: sale.operator.name,
    items: sale.items.map((item) => ({
      description: item.description,
      details: [item.variant?.color, item.variant?.size].filter(Boolean).join(" / "),
      sku: item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      total: Number(item.total),
    })),
    payments: sale.payments.map((payment) => ({
      name: payment.methodName,
      amount: Number(payment.amount),
      installments: payment.installments,
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    change: Number(sale.changeAmount),
    footer,
    isDemo,
  };
}

export async function createReceiptToken(ctx: AuthContext, saleId: string, days = 7) {
  assertPermission(ctx, "sales.view");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: ctx.tenantId },
    select: { id: true, branchId: true },
  });
  if (!sale) throw new Error("Venda não encontrada.");
  assertBranchAccess(ctx, sale.branchId);

  const token = randomUUID().replace(/-/g, "");
  await prisma.receiptToken.create({
    data: {
      tenantId: ctx.tenantId,
      saleId,
      token,
      expiresAt: new Date(Date.now() + days * 86_400_000),
    },
  });
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return { token, url: `${base}/comprovante/${token}` };
}

export async function getPublicReceipt(token: string) {
  const record = await prisma.receiptToken.findUnique({
    where: { token },
    include: {
      sale: {
        include: {
          items: { include: { variant: { select: { color: true, size: true } } } },
          payments: true,
          customer: { select: { name: true, document: true } },
          operator: { select: { name: true } },
          branch: { select: { name: true, document: true, address: true, city: true, state: true, phone: true } },
          tenant: true,
        },
      },
    },
  });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  if (record.sale.status === "CANCELADA") return null;

  const prefs = await getTenantPreferences(record.tenantId);
  return {
    receipt: buildReceipt(record.sale, prefs.receiptFooter, prefs.isDemo),
    expiresAt: record.expiresAt,
  };
}

/** Dados necessários para abrir o terminal de PDV. */
export async function getPosContext(ctx: AuthContext) {
  assertPermission(ctx, "pdv.operate");
  const [branches, methods, session] = await Promise.all([
    prisma.branch.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "ATIVO",
        ...(ctx.branchId ? { id: ctx.branchId } : {}),
      },
      orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.paymentMethod.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true, requiresCustomer: true },
    }),
    getOpenCashSession(ctx, ctx.branchId ?? undefined),
  ]);

  return {
    branches,
    methods,
    session: session
      ? {
          id: session.id,
          terminalName: session.terminalName,
          branchId: session.branchId,
          branchName: session.branch.name,
        }
      : null,
  };
}

export async function listSaleOptions(ctx: AuthContext) {
  assertPermission(ctx, "sales.view");
  const [branches, operators, customers] = await Promise.all([
    prisma.branch.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(ctx.branchId ? { id: ctx.branchId } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
  ]);
  return { branches, operators, customers };
}

export async function salesKpis(ctx: AuthContext, from: string, to: string, branchId?: string) {
  assertPermission(ctx, "sales.view");
  const branch = branchId ?? ctx.branchId ?? null;
  if (branch) assertBranchAccess(ctx, branch);
  const where: Prisma.SaleWhereInput = {
    tenantId: ctx.tenantId,
    status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
    ...(branch ? { branchId: branch } : {}),
    createdAt: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
  };
  const [aggregate, count, returns] = await Promise.all([
    prisma.sale.aggregate({ where, _sum: { total: true, discount: true } }),
    prisma.sale.count({ where }),
    prisma.saleReturn.aggregate({
      where: {
        tenantId: ctx.tenantId,
        ...(branch ? { sale: { branchId: branch } } : {}),
        createdAt: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
      },
      _sum: { total: true },
    }),
  ]);
  const revenue = Number(aggregate._sum.total ?? 0);
  return {
    revenue,
    count,
    average: count > 0 ? revenue / count : 0,
    discount: Number(aggregate._sum.discount ?? 0),
    returns: Number(returns._sum.total ?? 0),
  };
}

export function saleDateISO(value: Date): string {
  return todayISO() && value.toISOString().slice(0, 10);
}

export type { SaleInput };
export { parseBusinessDate };
