import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { withSerializableTransaction } from "@/lib/transaction";
import {
  getDefaultCashAccount,
  postLedgerEntry,
} from "@/services/finance-core.service";
import { dec, money, round2, sumValues } from "@/lib/money";
import {
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
} from "@/lib/date";
import { cashCloseSchema, cashMovementSchema, cashOpenSchema } from "@/lib/validation";

export async function getOpenCashSession(
  ctx: AuthContext,
  branchId?: string,
  terminalName?: string
) {
  assertPermission(ctx, "pdv.operate");
  const branch = branchId ?? ctx.branchId ?? null;
  return prisma.cashSession.findFirst({
    where: {
      tenantId: ctx.tenantId,
      status: "ABERTO",
      ...(branch ? { branchId: branch } : {}),
      ...(terminalName ? { terminalName } : {}),
    },
    orderBy: { openedAt: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      operator: { select: { id: true, name: true } },
    },
  });
}

export async function listCashSessions(
  ctx: AuthContext,
  filters: { branchId?: string; from?: string; to?: string; status?: "ABERTO" | "FECHADO" | "TODOS" } = {}
) {
  assertPermission(ctx, "pdv.operate");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  return prisma.cashSession.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(filters.status && filters.status !== "TODOS" ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            openedAt: {
              ...(filters.from ? { gte: startOfBusinessDay(filters.from) } : {}),
              ...(filters.to ? { lte: endOfBusinessDay(filters.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { openedAt: "desc" },
    take: 100,
    include: {
      branch: { select: { name: true } },
      operator: { select: { name: true } },
      _count: { select: { sales: true } },
    },
  });
}

export async function openCashSession(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "pdv.operate");
  const input = cashOpenSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId, status: "ATIVO" },
    select: { id: true, name: true },
  });
  if (!branch) throw new Error("Unidade inválida.");

  const existing = await prisma.cashSession.findFirst({
    where: {
      tenantId: ctx.tenantId,
      branchId: input.branchId,
      terminalName: input.terminalName,
      status: "ABERTO",
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error(
      `Já existe um caixa aberto no terminal "${input.terminalName}". Feche-o antes de abrir outro.`
    );
  }

  const session = await prisma.cashSession.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: input.branchId,
      terminalName: input.terminalName,
      operatorId: ctx.userId,
      openingAmount: money(input.openingAmount),
      notes: input.notes ?? null,
    },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "OPEN",
    module: "caixa",
    entity: "CashSession",
    entityId: session.id,
    description: `Caixa aberto em ${branch.name} (${input.terminalName}) com ${money(input.openingAmount)}`,
  });

  return { id: session.id };
}

export async function registerCashMovement(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "pdv.operate");
  const input = cashMovementSchema.parse(raw);

  const session = await prisma.cashSession.findFirst({
    where: { id: input.sessionId, tenantId: ctx.tenantId },
    include: { branch: { select: { id: true, name: true } } },
  });
  if (!session) throw new Error("Caixa não encontrado.");
  assertBranchAccess(ctx, session.branchId);
  if (session.status !== "ABERTO") throw new Error("O caixa está fechado.");

  const cashAccount = await getDefaultCashAccount(ctx.tenantId, session.branchId);

  const movement = await withSerializableTransaction(async (tx) => {
    const created = await tx.cashMovement.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: session.branchId,
        sessionId: session.id,
        type: input.type,
        amount: money(input.amount),
        reason: input.reason,
        userId: ctx.userId,
      },
    });

    await postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: session.branchId,
      financialAccountId: cashAccount.id,
      date: new Date(),
      type: input.type === "SUPRIMENTO" ? "ENTRADA" : "SAIDA",
      amount: input.amount,
      description: `${input.type === "SUPRIMENTO" ? "Suprimento" : "Sangria"} (${session.terminalName}): ${input.reason}`,
      sourceType: input.type,
      sourceId: created.id,
      createdById: ctx.userId,
    });

    return created;
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "caixa",
    entity: "CashMovement",
    entityId: movement.id,
    description: `${input.type} de ${money(input.amount)} — ${input.reason}`,
  });

  return { id: movement.id };
}

export type SessionSummary = {
  id: string;
  status: string;
  terminalName: string;
  branchName: string;
  operatorName: string;
  openedAt: Date;
  closedAt: Date | null;
  openingAmount: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  salesCount: number;
  salesTotal: number;
  cashSales: number;
  changeTotal: number;
  supplies: number;
  withdrawals: number;
  refunds: number;
  byMethod: Array<{ name: string; kind: string; amount: number }>;
  movements: Array<{ id: string; type: string; amount: number; reason: string; createdAt: Date; userName: string }>;
  sales: Array<{ id: string; documentNumber: string; total: number; status: string; createdAt: Date }>;
};

export async function getSessionSummary(ctx: AuthContext, sessionId: string): Promise<SessionSummary> {
  assertPermission(ctx, "pdv.operate");
  const session = await prisma.cashSession.findFirst({
    where: { id: sessionId, tenantId: ctx.tenantId },
    include: {
      branch: { select: { name: true } },
      operator: { select: { name: true } },
      closedBy: { select: { name: true } },
      movements: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
      sales: {
        orderBy: { createdAt: "asc" },
        include: {
          payments: { where: { status: "CONFIRMADO" } },
        },
      },
    },
  });
  if (!session) throw new Error("Caixa não encontrado.");
  assertBranchAccess(ctx, session.branchId);

  const confirmedSales = session.sales.filter((sale) => sale.status !== "CANCELADA");
  const salesTotal = confirmedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const changeTotal = confirmedSales.reduce((sum, sale) => sum + Number(sale.changeAmount), 0);

  const methodMap = new Map<string, { name: string; kind: string; amount: number }>();
  let cashSales = 0;
  for (const sale of confirmedSales) {
    for (const payment of sale.payments) {
      const key = payment.methodName;
      const row = methodMap.get(key) ?? { name: key, kind: payment.methodKind, amount: 0 };
      row.amount += Number(payment.amount);
      methodMap.set(key, row);
      if (payment.methodKind === "DINHEIRO") cashSales += Number(payment.amount);
    }
  }

  const supplies = session.movements
    .filter((m) => m.type === "SUPRIMENTO")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const withdrawals = session.movements
    .filter((m) => m.type === "SANGRIA")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const refunds = session.movements
    .filter((m) => m.type === "ESTORNO")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const expectedCash =
    Number(session.openingAmount) + cashSales + supplies - withdrawals - refunds;

  return {
    id: session.id,
    status: session.status,
    terminalName: session.terminalName,
    branchName: session.branch.name,
    operatorName: session.operator.name,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openingAmount: Number(session.openingAmount),
    expectedCash: round2(expectedCash).toNumber(),
    countedCash: session.countedCash ? Number(session.countedCash) : null,
    difference: session.difference ? Number(session.difference) : null,
    salesCount: confirmedSales.length,
    salesTotal: round2(salesTotal).toNumber(),
    cashSales: round2(cashSales).toNumber(),
    changeTotal: round2(changeTotal).toNumber(),
    supplies: round2(supplies).toNumber(),
    withdrawals: round2(withdrawals).toNumber(),
    refunds: round2(refunds).toNumber(),
    byMethod: [...methodMap.values()].sort((a, b) => b.amount - a.amount),
    movements: session.movements.map((m) => ({
      id: m.id,
      type: m.type,
      amount: Number(m.amount),
      reason: m.reason,
      createdAt: m.createdAt,
      userName: m.user.name,
    })),
    sales: session.sales.map((sale) => ({
      id: sale.id,
      documentNumber: sale.documentNumber,
      total: Number(sale.total),
      status: sale.status,
      createdAt: sale.createdAt,
    })),
  };
}

export async function closeCashSession(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "pdv.operate");
  const input = cashCloseSchema.parse(raw);
  const summary = await getSessionSummary(ctx, input.sessionId);

  if (summary.status !== "ABERTO") throw new Error("Este caixa já está fechado.");

  const difference = round2(dec(input.countedCash).minus(summary.expectedCash));

  await prisma.cashSession.update({
    where: { id: summary.id },
    data: {
      status: "FECHADO",
      closedAt: new Date(),
      closedById: ctx.userId,
      expectedCash: money(summary.expectedCash),
      countedCash: money(input.countedCash),
      difference: money(difference),
      notes: input.notes ?? null,
    },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CLOSE",
    module: "caixa",
    entity: "CashSession",
    entityId: summary.id,
    description: `Caixa ${summary.terminalName} fechado. Esperado ${money(summary.expectedCash)}, contado ${money(input.countedCash)}, diferença ${money(difference)}`,
    newValues: {
      expected: money(summary.expectedCash),
      counted: money(input.countedCash),
      difference: money(difference),
    },
  });

  return { expected: summary.expectedCash, counted: input.countedCash, difference: difference.toNumber() };
}

/** Registro interno de venda em dinheiro no caixa (usado pelo serviço de vendas). */
export async function addSaleCashMovement(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    branchId: string;
    sessionId: string;
    amount: number;
    userId: string;
    saleId: string;
  }
) {
  return tx.cashMovement.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      sessionId: params.sessionId,
      type: "VENDA",
      amount: money(params.amount),
      reason: "Venda no PDV",
      userId: params.userId,
      saleId: params.saleId,
    },
  });
}

export async function addRefundCashMovement(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    branchId: string;
    sessionId: string;
    amount: number;
    userId: string;
  }
) {
  return tx.cashMovement.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      sessionId: params.sessionId,
      type: "ESTORNO",
      amount: money(params.amount),
      reason: "Devolução/cancelamento no PDV",
      userId: params.userId,
    },
  });
}

export function sumPaymentsByKind(
  payments: Array<{ methodKind: string; amount: unknown }>
) {
  const totals = new Map<string, number>();
  for (const payment of payments) {
    totals.set(
      payment.methodKind,
      (totals.get(payment.methodKind) ?? 0) + Number(payment.amount)
    );
  }
  return totals;
}

export async function cashSessionReport(
  ctx: AuthContext,
  filters: { from?: string; to?: string; branchId?: string }
) {
  const sessions = await listCashSessions(ctx, { ...filters, status: "FECHADO" });
  return sessions.map((session) => ({
    id: session.id,
    terminal: session.terminalName,
    branch: session.branch.name,
    operator: session.operator.name,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    opening: Number(session.openingAmount),
    expected: Number(session.expectedCash ?? 0),
    counted: Number(session.countedCash ?? 0),
    difference: Number(session.difference ?? 0),
    sales: session._count.sales,
  }));
}
