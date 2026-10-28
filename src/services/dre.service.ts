import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertBranchAccess, assertPermission, type AuthContext } from "@/lib/tenant";
import { dec, round2, toNumber } from "@/lib/money";
import { currentMonthISO, endOfBusinessDay, startOfBusinessDay } from "@/lib/date";
import { calculateDre, type DreResult } from "@/services/dre-calculator";

export type DreFilters = { from?: string; to?: string; branchId?: string };

export type DreReport = DreResult & {
  period: { from: string; to: string };
  branchId: string | null;
  counts: { sales: number; expensePayables: number; manualEntries: number };
  notes: string[];
};

function defaultFrom(): string {
  return `${currentMonthISO()}-01`;
}

export async function getDre(ctx: AuthContext, filters: DreFilters = {}): Promise<DreReport> {
  assertPermission(ctx, "finance.reports");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);
  const from = filters.from ?? defaultFrom();
  const to = filters.to ?? new Date().toISOString().slice(0, 10);
  if (from > to) throw new Error("A data inicial não pode ser posterior à data final.");

  const range = { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) };
  const branchWhere = branchId ? { branchId } : {};

  const [sales, returns, payables, manualExpenses, manualRevenues] = await Promise.all([
    prisma.sale.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...branchWhere,
        status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] },
        createdAt: range,
      },
      select: {
        id: true,
        total: true,
        discount: true,
        items: { select: { quantity: true, unitCost: true, total: true } },
      },
    }),
    prisma.saleReturn.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { sale: { branchId } } : {}),
        createdAt: range,
      },
      select: {
        total: true,
        items: { select: { quantity: true, saleItem: { select: { unitCost: true } } } },
      },
    }),
    prisma.payable.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...branchWhere,
        status: { not: "CANCELADO" },
        competenceDate: range,
      },
      select: {
        value: true,
        description: true,
        chartAccount: { select: { code: true, name: true, nature: true } },
      },
    }),
    prisma.ledgerEntry.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { branchId } : {}),
        sourceType: "DESPESA",
        competenceDate: range,
        reversalOfId: null,
        reversal: null,
      },
      select: {
        amount: true,
        description: true,
        chartAccount: { select: { code: true, name: true, nature: true } },
      },
    }),
    prisma.ledgerEntry.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(branchId ? { branchId } : {}),
        sourceType: "RECEITA",
        competenceDate: range,
        reversalOfId: null,
        reversal: null,
      },
      select: { amount: true },
    }),
  ]);

  let grossRevenue = dec(0);
  let discounts = dec(0);
  let cogs = dec(0);
  let soldCost = dec(0);
  for (const sale of sales) {
    grossRevenue = grossRevenue.plus(sale.total);
    discounts = discounts.plus(sale.discount);
    for (const item of sale.items) {
      soldCost = soldCost.plus(dec(item.unitCost).times(item.quantity));
    }
  }

  let returnsTotal = dec(0);
  let returnedCost = dec(0);
  for (const saleReturn of returns) {
    returnsTotal = returnsTotal.plus(saleReturn.total);
    for (const item of saleReturn.items) {
      returnedCost = returnedCost.plus(dec(item.saleItem.unitCost).times(item.quantity));
    }
  }
  cogs = soldCost.minus(returnedCost);

  const expenseMap = new Map<string, { code: string; name: string; amount: typeof grossRevenue }>();
  const addExpense = (code: string, name: string, value: Prisma.Decimal | string | number) => {
    const key = `${code}|${name}`;
    const current = expenseMap.get(key);
    if (current) current.amount = current.amount.plus(value);
    else expenseMap.set(key, { code, name, amount: dec(value) });
  };

  let expensePayables = 0;
  for (const payable of payables) {
    // Compras de mercadoria (CUSTO/ATIVO) não são despesa: o custo entra no CMV.
    if (payable.chartAccount && !["DESPESA"].includes(payable.chartAccount.nature)) continue;
    expensePayables += 1;
    addExpense(
      payable.chartAccount?.code ?? "4.9",
      payable.chartAccount?.name ?? "Despesas não classificadas",
      payable.value
    );
  }

  for (const entry of manualExpenses) {
    if (entry.chartAccount && !["DESPESA"].includes(entry.chartAccount.nature)) continue;
    addExpense(
      entry.chartAccount?.code ?? "4.9",
      entry.chartAccount?.name ?? "Despesas não classificadas",
      entry.amount
    );
  }

  const otherRevenues = manualRevenues.reduce((acc, entry) => acc.plus(entry.amount), dec(0));
  const result = calculateDre({
    grossRevenue: toNumber(grossRevenue),
    discounts: toNumber(discounts),
    returns: toNumber(returnsTotal),
    cogs: toNumber(cogs),
    expenses: [...expenseMap.values()].map((line) => ({
      code: line.code,
      name: line.name,
      amount: toNumber(line.amount),
    })),
    otherRevenues: toNumber(otherRevenues),
  });

  const notes: string[] = [];
  if (!payables.length) notes.push("Nenhuma conta a pagar por competência no período.");
  if (sales.length === 0) notes.push("Nenhuma venda concluída no período.");
  notes.push(
    "O DRE é gerencial: não substitui demonstrações contábeis e não inclui documentos fiscais."
  );

  return {
    ...result,
    period: { from, to },
    branchId,
    counts: { sales: sales.length, expensePayables, manualEntries: manualExpenses.length },
    notes,
  };
}
