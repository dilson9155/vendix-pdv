import "server-only";
import { prisma } from "@/lib/prisma";
import { assertBranchAccess, assertPermission, type AuthContext } from "@/lib/tenant";
import { dec, toNumber } from "@/lib/money";
import { currentMonthISO, endOfBusinessDay, startOfBusinessDay, todayISO } from "@/lib/date";
import { getCashFlow } from "@/services/finance-core.service";

// ---------------------------------------------------------------------------
// Exportação CSV (compatível com Excel pt-BR: separador ";" e BOM UTF-8)
// ---------------------------------------------------------------------------

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "number") {
    text = Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "";
  }
  if (/[";\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(csvEscape).join(";")];
  for (const row of rows) lines.push(row.map(csvEscape).join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

export function csvFileName(prefix: string, from: string, to: string): string {
  return `${prefix}-${from}-a-${to}.csv`;
}

// ---------------------------------------------------------------------------
// Vendas
// ---------------------------------------------------------------------------

export type SalesReportFilters = {
  from?: string;
  to?: string;
  branchId?: string;
  status?: string;
  operatorId?: string;
};

export async function getSalesReport(ctx: AuthContext, filters: SalesReportFilters = {}) {
  assertPermission(ctx, "reports.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);
  const from = filters.from ?? `${currentMonthISO()}-01`;
  const to = filters.to ?? todayISO();

  const where = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.operatorId ? { operatorId: filters.operatorId } : {}),
    createdAt: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
  };

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 5000,
    select: {
      id: true,
      documentNumber: true,
      createdAt: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
      customer: { select: { name: true } },
      operator: { select: { name: true } },
      branch: { select: { name: true } },
      _count: { select: { items: true } },
      payments: { where: { status: "CONFIRMADO" }, select: { methodName: true, methodKind: true, amount: true } },
    },
  });

  const completed = sales.filter((s) => s.status === "CONCLUIDA" || s.status === "DEVOLVIDA_PARCIAL");
  const revenue = completed.reduce((acc, s) => acc.plus(s.total), dec(0));
  const discounts = completed.reduce((acc, s) => acc.plus(s.discount), dec(0));
  const ticket = completed.length ? revenue.dividedBy(completed.length) : dec(0);

  const byPayment = new Map<string, { method: string; amount: number; count: number }>();
  for (const sale of completed) {
    if (sale.status === "CANCELADA") continue;
    for (const payment of sale.payments) {
      const key = payment.methodName;
      const current = byPayment.get(key) ?? { method: key, amount: 0, count: 0 };
      current.amount = toNumber(dec(current.amount).plus(payment.amount));
      current.count += 1;
      byPayment.set(key, current);
    }
  }

  const byOperator = new Map<string, { operator: string; revenue: number; count: number }>();
  for (const sale of completed) {
    const key = sale.operator.name;
    const current = byOperator.get(key) ?? { operator: key, revenue: 0, count: 0 };
    current.revenue = toNumber(dec(current.revenue).plus(sale.total));
    current.count += 1;
    byOperator.set(key, current);
  }

  const daily = new Map<string, { date: string; revenue: number; count: number }>();
  for (const sale of completed) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    const current = daily.get(key) ?? { date: key, revenue: 0, count: 0 };
    current.revenue = toNumber(dec(current.revenue).plus(sale.total));
    current.count += 1;
    daily.set(key, current);
  }

  return {
    period: { from, to },
    rows: sales.map((sale) => ({
      id: sale.id,
      date: sale.createdAt,
      documentNumber: sale.documentNumber,
      customer: sale.customer?.name ?? "Consumidor final",
      operator: sale.operator.name,
      branch: sale.branch.name,
      status: sale.status,
      items: sale._count.items,
      subtotal: toNumber(sale.subtotal),
      discount: toNumber(sale.discount),
      total: toNumber(sale.total),
      payments: sale.payments.map((p) => p.methodName).join(", "),
    })),
    totals: {
      count: completed.length,
      revenue: toNumber(revenue),
      discounts: toNumber(discounts),
      averageTicket: toNumber(ticket),
      canceled: sales.filter((s) => s.status === "CANCELADA").length,
    },
    byPayment: [...byPayment.values()].sort((a, b) => b.amount - a.amount),
    byOperator: [...byOperator.values()].sort((a, b) => b.revenue - a.revenue),
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    truncated: sales.length === 5000,
  };
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export type StockReportFilters = {
  branchId?: string;
  q?: string;
  categoryId?: string;
  onlyLow?: boolean;
};

export async function getStockReport(ctx: AuthContext, filters: StockReportFilters = {}) {
  assertPermission(ctx, "reports.view");
  assertPermission(ctx, "stock.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const levels = await prisma.stockLevel.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(branchId ? { branchId } : {}),
      product: {
        active: true,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: "insensitive" as const } },
                { sku: { contains: filters.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ product: { name: "asc" } }],
    take: 5000,
    select: {
      quantity: true,
      branch: { select: { name: true } },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          cost: true,
          price: true,
          minStock: true,
          category: { select: { name: true } },
        },
      },
      variant: { select: { sku: true, color: true, size: true } },
    },
  });

  const rows = levels.map((level) => {
    const quantity = Number(level.quantity);
    const cost = Number(level.product.cost);
    const price = Number(level.product.price);
    const minStock = Number(level.product.minStock);
    return {
      productId: level.product.id,
      name: level.product.name,
      sku: level.variant?.sku ?? level.product.sku,
      variant: level.variant
        ? [level.variant.color, level.variant.size].filter(Boolean).join(" / ")
        : "",
      category: level.product.category?.name ?? "Sem categoria",
      branch: level.branch.name,
      quantity,
      minStock,
      cost,
      price,
      costValue: toNumber(dec(quantity).times(cost)),
      priceValue: toNumber(dec(quantity).times(price)),
      belowMin: quantity <= minStock,
    };
  });

  const filtered = filters.onlyLow ? rows.filter((row) => row.belowMin) : rows;
  return {
    rows: filtered,
    totals: {
      items: filtered.length,
      quantity: filtered.reduce((sum, row) => sum + row.quantity, 0),
      costValue: toNumber(filtered.reduce((sum, row) => sum.plus(row.costValue), dec(0))),
      priceValue: toNumber(filtered.reduce((sum, row) => sum.plus(row.priceValue), dec(0))),
      belowMin: filtered.filter((row) => row.belowMin).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export type FinanceReportFilters = { from?: string; to?: string; branchId?: string };

export async function getFinanceReport(ctx: AuthContext, filters: FinanceReportFilters = {}) {
  assertPermission(ctx, "finance.reports");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);
  const from = filters.from ?? `${currentMonthISO()}-01`;
  const to = filters.to ?? todayISO();
  const range = { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) };

  const [cashFlow, payables, receivables, settledPayables, settledReceivables] = await Promise.all([
    getCashFlow(ctx, { from, to, branchId: branchId ?? undefined }),
    prisma.payable.findMany({
      where: { tenantId: ctx.tenantId, ...(branchId ? { branchId } : {}), status: { in: ["ABERTO", "PARCIAL"] } },
      select: { value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
    }),
    prisma.receivable.findMany({
      where: { tenantId: ctx.tenantId, ...(branchId ? { branchId } : {}), status: { in: ["ABERTO", "PARCIAL"] } },
      select: { value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
    }),
    prisma.payablePayment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { payable: { branchId } } : {}),
        reversedAt: null,
        date: range,
      },
      _sum: { amount: true, interest: true, penalty: true, discount: true },
      _count: true,
    }),
    prisma.receivablePayment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { receivable: { branchId } } : {}),
        reversedAt: null,
        date: range,
      },
      _sum: { amount: true, interest: true, penalty: true, discount: true },
      _count: true,
    }),
  ]);

  const open = (
    rows: Array<{ value: unknown; dueDate: Date; payments: Array<{ amount: unknown }> }>
  ) => {
    let total = dec(0);
    let overdue = dec(0);
    for (const row of rows) {
      const paid = row.payments.reduce((acc, p) => acc.plus(p.amount as never), dec(0));
      const remaining = dec(row.value as never).minus(paid);
      if (remaining.lessThanOrEqualTo(0)) continue;
      total = total.plus(remaining);
      if (row.dueDate.getTime() < startOfBusinessDay().getTime()) overdue = overdue.plus(remaining);
    }
    return { open: toNumber(total), overdue: toNumber(overdue) };
  };

  return {
    period: { from, to },
    cashFlow,
    payables: {
      ...open(payables),
      settled: toNumber(settledPayables._sum.amount),
      settledCount: settledPayables._count,
      interest: toNumber(settledPayables._sum.interest),
      penalty: toNumber(settledPayables._sum.penalty),
      discount: toNumber(settledPayables._sum.discount),
    },
    receivables: {
      ...open(receivables),
      settled: toNumber(settledReceivables._sum.amount),
      settledCount: settledReceivables._count,
      interest: toNumber(settledReceivables._sum.interest),
      penalty: toNumber(settledReceivables._sum.penalty),
      discount: toNumber(settledReceivables._sum.discount),
    },
  };
}

export async function listReportOptions(ctx: AuthContext) {
  assertPermission(ctx, "reports.view");
  const [branches, categories, operators] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, ...(ctx.branchId ? { id: ctx.branchId } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productCategory.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { branches, categories, operators };
}
