import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec, round2, toNumber } from "@/lib/money";
import {
  currentMonthISO,
  endOfBusinessDay,
  startOfBusinessDay,
  todayISO,
} from "@/lib/date";
import { hasPermission, type AuthContext } from "@/lib/tenant";

export type DashboardPeriod = { from: string; to: string };

export type DashboardData = {
  period: DashboardPeriod;
  sales: {
    revenue: number;
    count: number;
    averageTicket: number;
    discount: number;
    returns: number;
  };
  today: { revenue: number; count: number };
  previous: { revenue: number; count: number };
  dailySales: Array<{ date: string; revenue: number; count: number }>;
  paymentMix: Array<{ kind: string; label: string; amount: number; percent: number }>;
  topProducts: Array<{ name: string; sku: string; quantity: number; revenue: number }>;
  cash: {
    open: boolean;
    sessionId: string | null;
    terminalName: string | null;
    openingAmount: number;
    expectedCash: number;
    openedAt: Date | null;
  };
  finance: {
    payablesOpen: number;
    payablesDue: number;
    payablesOverdue: number;
    receivablesOpen: number;
    receivablesDue: number;
    receivablesOverdue: number;
    balance: number;
  } | null;
  stock: {
    items: number;
    value: number;
    lowCount: number;
    lowItems: Array<{ name: string; sku: string; quantity: number; minStock: number }>;
  } | null;
  alerts: Array<{ level: "info" | "warning" | "danger"; message: string; href?: string }>;
};

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferência",
  CREDITO_LOJA: "Crediário",
  OUTROS: "Outros",
};

function monthStart(period: DashboardPeriod): string {
  return `${period.from.slice(0, 7)}-01`;
}

/**
 * Indicadores da home. Cada bloco só é consultado quando o usuário possui a
 * permissão correspondente — o dashboard não é uma porta lateral de acesso.
 */
export async function getDashboard(
  ctx: AuthContext,
  filters: { from?: string; to?: string; branchId?: string } = {}
): Promise<DashboardData> {
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  const period: DashboardPeriod = {
    from:
      filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)
        ? filters.from
        : monthStart({ from: todayISO(), to: todayISO() }),
    to: filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : todayISO(),
  };
  if (period.from > period.to) {
    throw new Error("A data inicial não pode ser posterior à data final.");
  }

  const branchWhere: Prisma.SaleWhereInput = branchId ? { branchId } : {};
  const completed: Prisma.SaleWhereInput = {
    tenantId: ctx.tenantId,
    ...branchWhere,
    status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
    createdAt: { gte: startOfBusinessDay(period.from), lte: endOfBusinessDay(period.to) },
  };

  const [salesAgg, todayAgg, previous, returnsAgg, salesForDaily] = await Promise.all([
    prisma.sale.aggregate({ where: completed, _sum: { total: true, discount: true }, _count: true }),
    prisma.sale.aggregate({
      where: {
        tenantId: ctx.tenantId,
        ...branchWhere,
        status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
        createdAt: { gte: startOfBusinessDay(), lte: endOfBusinessDay() },
      },
      _sum: { total: true },
      _count: true,
    }),
    (async () => {
      const from = new Date(startOfBusinessDay(period.from).getTime() - 1);
      const previousFrom = new Date(from);
      previousFrom.setUTCDate(previousFrom.getUTCDate() - 29);
      return prisma.sale.aggregate({
        where: {
          tenantId: ctx.tenantId,
          ...branchWhere,
          status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
          createdAt: { gte: previousFrom, lte: from },
        },
        _sum: { total: true },
        _count: true,
      });
    })(),
    prisma.saleReturn.aggregate({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { sale: { branchId } } : {}),
        createdAt: { gte: startOfBusinessDay(period.from), lte: endOfBusinessDay(period.to) },
      },
      _sum: { total: true },
    }),
    prisma.sale.findMany({
      where: completed,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
  ]);

  const dailyMap = new Map<string, { revenue: number; count: number }>();
  for (const sale of salesForDaily) {
    const date = sale.createdAt.toISOString().slice(0, 10);
    const current = dailyMap.get(date) ?? { revenue: 0, count: 0 };
    current.revenue = round2(current.revenue + toNumber(sale.total)).toNumber();
    current.count += 1;
    dailyMap.set(date, current);
  }
  const dailySales = [...dailyMap.entries()].map(([date, values]) => ({ date, ...values }));

  const [paymentGroups, topItems, cash, finance, stock] = await Promise.all([
    prisma.salePayment.groupBy({
      by: ["methodKind"],
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { sale: { branchId } } : {}),
        status: "CONFIRMADO",
        receivedAt: { gte: startOfBusinessDay(period.from), lte: endOfBusinessDay(period.to) },
      },
      _sum: { amount: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        tenantId: ctx.tenantId,
        sale: {
          ...branchWhere,
          status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
          createdAt: { gte: startOfBusinessDay(period.from), lte: endOfBusinessDay(period.to) },
        },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    getCashBlock(ctx, branchId),
    hasPermission(ctx, "finance.view") ? getFinanceBlock(ctx, branchId) : Promise.resolve(null),
    hasPermission(ctx, "stock.view") ? getStockBlock(ctx, branchId) : Promise.resolve(null),
  ]);

  const paymentTotal = paymentGroups.reduce((acc, row) => acc + toNumber(row._sum.amount), 0);
  const paymentMix = paymentGroups
    .map((row) => {
      const amount = toNumber(row._sum.amount);
      return {
        kind: row.methodKind,
        label: PAYMENT_LABELS[row.methodKind] ?? row.methodKind,
        amount,
        percent: paymentTotal > 0 ? round2((amount / paymentTotal) * 100).toNumber() : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const productIds = topItems.map((row) => row.productId);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, tenantId: ctx.tenantId },
        select: { id: true, name: true, sku: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = topItems.map((row) => {
    const product = productMap.get(row.productId);
    return {
      name: product?.name ?? "Produto removido",
      sku: product?.sku ?? "—",
      quantity: toNumber(row._sum.quantity),
      revenue: toNumber(row._sum.total),
    };
  });

  const revenue = toNumber(salesAgg._sum.total);
  const previousRevenue = toNumber(previous._sum.total);
  const alerts: DashboardData["alerts"] = [];

  if (cash.open && cash.difference !== undefined && cash.difference < 0) {
    alerts.push({
      level: "warning",
      message: "O caixa aberto está com expectativa negativa. Verifique sangrias e pagamentos.",
      href: "/pdv/caixa",
    });
  }
  if (finance && finance.payablesOverdue > 0) {
    alerts.push({
      level: "danger",
      message: `${finance.payablesOverdue > 0 ? "Existem contas a pagar vencidas." : ""}`,
      href: "/financeiro/contas-a-pagar",
    });
  }
  if (stock && stock.lowCount > 0) {
    alerts.push({
      level: "warning",
      message: `${stock.lowCount} item(ns) no estoque mínimo ou abaixo.`,
      href: "/estoque",
    });
  }
  if (previousRevenue > 0 && revenue < previousRevenue) {
    alerts.push({
      level: "info",
      message: "O faturamento do período está abaixo do período anterior comparável.",
      href: "/relatorios/vendas",
    });
  }

  return {
    period,
    sales: {
      revenue,
      count: salesAgg._count,
      averageTicket: salesAgg._count > 0 ? round2(revenue / salesAgg._count).toNumber() : 0,
      discount: toNumber(salesAgg._sum.discount),
      returns: toNumber(returnsAgg._sum.total),
    },
    today: {
      revenue: toNumber(todayAgg._sum.total),
      count: todayAgg._count,
    },
    previous: { revenue: previousRevenue, count: previous._count },
    dailySales,
    paymentMix,
    topProducts,
    cash: {
      open: cash.open,
      sessionId: cash.sessionId,
      terminalName: cash.terminalName,
      openingAmount: cash.openingAmount,
      expectedCash: cash.expectedCash,
      openedAt: cash.openedAt,
    },
    finance,
    stock,
    alerts,
  };
}

async function getCashBlock(ctx: AuthContext, branchId: string | null) {
  if (!hasPermission(ctx, "pdv.operate") && !hasPermission(ctx, "finance.view")) {
    return {
      open: false,
      sessionId: null,
      terminalName: null,
      openingAmount: 0,
      expectedCash: 0,
      openedAt: null as Date | null,
      difference: undefined as number | undefined,
    };
  }
  const session = await prisma.cashSession.findFirst({
    where: {
      tenantId: ctx.tenantId,
      status: "ABERTO",
      ...(branchId
        ? { branchId }
        : ctx.branchId
          ? { branchId: ctx.branchId }
          : {}),
    },
    orderBy: { openedAt: "desc" },
    include: {
      movements: { where: { type: { in: ["SUPRIMENTO", "SANGRIA", "VENDA", "ESTORNO"] } } },
      sales: { where: { status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] } }, select: { id: true } },
    },
  });
  if (!session) {
    return {
      open: false,
      sessionId: null,
      terminalName: null,
      openingAmount: 0,
      expectedCash: 0,
      openedAt: null as Date | null,
      difference: undefined as number | undefined,
    };
  }

  let expected = dec(session.openingAmount);
  for (const movement of session.movements) {
    if (movement.type === "SUPRIMENTO" || movement.type === "VENDA") expected = expected.plus(movement.amount);
    if (movement.type === "SANGRIA" || movement.type === "ESTORNO") expected = expected.minus(movement.amount);
  }
  const cashSales = await prisma.salePayment.aggregate({
    where: {
      tenantId: ctx.tenantId,
      sale: { cashSessionId: session.id, status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] } },
      methodKind: "DINHEIRO",
      status: "CONFIRMADO",
    },
    _sum: { amount: true },
  });
  // Movimentos VENDA/ESTORNO já podem existir; usa o maior entre os dois para
  // não duplicar enquanto a base antiga não tiver os movimentos reconciliados.
  const fromMovements = session.movements
    .filter((m) => m.type === "VENDA" || m.type === "ESTORNO")
    .reduce((acc, m) => acc.plus(m.type === "VENDA" ? m.amount : dec(m.amount).negated()), dec(0));
  const fromPayments = dec(cashSales._sum.amount);
  const netCashSales = fromMovements.abs().greaterThan(0) ? fromMovements : fromPayments;
  const baseWithoutSales = session.movements
    .filter((m) => m.type === "SUPRIMENTO" || m.type === "SANGRIA")
    .reduce(
      (acc, m) => (m.type === "SUPRIMENTO" ? acc.plus(m.amount) : acc.minus(m.amount)),
      dec(session.openingAmount)
    );
  const expectedCash = baseWithoutSales.plus(netCashSales);

  return {
    open: true,
    sessionId: session.id,
    terminalName: session.terminalName,
    openingAmount: toNumber(session.openingAmount),
    expectedCash: toNumber(expectedCash),
    openedAt: session.openedAt,
    difference: toNumber(expectedCash.minus(session.openingAmount)),
  };
}

async function getFinanceBlock(ctx: AuthContext, branchId: string | null) {
  const base = { tenantId: ctx.tenantId, ...(branchId ? { branchId } : {}) };
  const today = endOfBusinessDay();
  const [payables, receivables, accounts] = await Promise.all([
    prisma.payable.findMany({
      where: { ...base, status: { in: ["ABERTO", "PARCIAL"] } },
      select: { value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true, interest: true, penalty: true, discount: true } } },
    }),
    prisma.receivable.findMany({
      where: { ...base, status: { in: ["ABERTO", "PARCIAL"] } },
      select: { value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true, interest: true, penalty: true, discount: true } } },
    }),
    prisma.financialAccount.findMany({
      where: { tenantId: ctx.tenantId, active: true, ...(branchId ? { branchId } : {}) },
      select: { initialBalance: true, ledgerEntries: { select: { type: true, amount: true, reversalOfId: true } } },
    }),
  ]);

  const openBalance = (
    rows: Array<{
      value: Prisma.Decimal;
      dueDate: Date;
      payments: Array<{ amount: Prisma.Decimal; interest: Prisma.Decimal; penalty: Prisma.Decimal; discount: Prisma.Decimal }>;
    }>
  ) => {
    let open = dec(0);
    let overdue = dec(0);
    let due = dec(0);
    for (const row of rows) {
      const paid = row.payments.reduce(
        (acc, p) => acc.plus(p.amount).plus(p.interest).plus(p.penalty).minus(p.discount),
        dec(0)
      );
      const remaining = dec(row.value).minus(paid);
      if (remaining.lessThanOrEqualTo(0)) continue;
      open = open.plus(remaining);
      if (row.dueDate.getTime() < startOfBusinessDay().getTime()) overdue = overdue.plus(remaining);
      if (row.dueDate.getTime() <= today.getTime()) due = due.plus(remaining);
    }
    return {
      open: toNumber(open),
      overdue: toNumber(overdue),
      due: toNumber(due),
    };
  };

  let balance = dec(0);
  for (const account of accounts) {
    balance = balance.plus(account.initialBalance);
    for (const entry of account.ledgerEntries) {
      balance = entry.type === "ENTRADA" ? balance.plus(entry.amount) : balance.minus(entry.amount);
    }
  }

  const p = openBalance(payables);
  const r = openBalance(receivables);
  return {
    payablesOpen: p.open,
    payablesDue: p.due,
    payablesOverdue: p.overdue,
    receivablesOpen: r.open,
    receivablesDue: r.due,
    receivablesOverdue: r.overdue,
    balance: toNumber(balance),
  };
}

async function getStockBlock(ctx: AuthContext, branchId: string | null) {
  const levels = await prisma.stockLevel.findMany({
    where: { tenantId: ctx.tenantId, ...(branchId ? { branchId } : {}) },
    select: {
      quantity: true,
      product: { select: { name: true, sku: true, cost: true, minStock: true, active: true } },
      variant: { select: { sku: true, color: true, size: true } },
    },
    orderBy: { quantity: "asc" },
    take: 500,
  });
  let items = 0;
  let value = dec(0);
  let lowCount = 0;
  const lowItems: Array<{ name: string; sku: string; quantity: number; minStock: number }> = [];
  for (const level of levels) {
    if (!level.product.active) continue;
    items += 1;
    value = value.plus(dec(level.quantity).times(level.product.cost));
    if (dec(level.quantity).lessThanOrEqualTo(level.product.minStock)) {
      lowCount += 1;
      if (lowItems.length < 5) {
        lowItems.push({
          name: level.product.name,
          sku: level.variant?.sku ?? level.product.sku,
          quantity: toNumber(level.quantity),
          minStock: toNumber(level.product.minStock),
        });
      }
    }
  }
  return { items, value: toNumber(value), lowCount, lowItems };
}

export function dashboardDefaultPeriod(): DashboardPeriod {
  return { from: `${currentMonthISO()}-01`, to: todayISO() };
}
