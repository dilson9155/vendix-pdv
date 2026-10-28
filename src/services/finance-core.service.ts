import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { withSerializableTransaction } from "@/lib/transaction";
import { dec, money, round2, sumValues } from "@/lib/money";
import {
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
  todayISO,
} from "@/lib/date";
import {
  chartAccountSchema,
  costCenterSchema,
  financialAccountSchema,
  transferSchema,
} from "@/lib/validation";
import { z } from "zod";

export type LedgerSource =
  | "VENDA"
  | "RECEBIMENTO"
  | "PAGAMENTO"
  | "SUPRIMENTO"
  | "SANGRIA"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "DESPESA"
  | "RECEITA"
  | "ESTORNO";

export type LedgerInput = {
  tenantId: string;
  branchId?: string | null;
  financialAccountId: string;
  chartAccountId?: string | null;
  costCenterId?: string | null;
  date: Date;
  competenceDate?: Date;
  type: "ENTRADA" | "SAIDA";
  amount: number | string;
  description: string;
  document?: string | null;
  sourceType: LedgerSource;
  sourceId?: string | null;
  saleId?: string | null;
  transferId?: string | null;
  createdById?: string | null;
};

/** Cria um lançamento no livro caixa (sempre dentro de uma transação). */
export async function postLedgerEntry(tx: Prisma.TransactionClient, input: LedgerInput) {
  const amount = round2(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new Error("O valor do lançamento deve ser maior que zero.");
  }
  return tx.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId ?? null,
      financialAccountId: input.financialAccountId,
      chartAccountId: input.chartAccountId ?? null,
      costCenterId: input.costCenterId ?? null,
      date: input.date,
      competenceDate: input.competenceDate ?? input.date,
      type: input.type,
      amount: money(amount),
      description: input.description,
      document: input.document ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      saleId: input.saleId ?? null,
      transferId: input.transferId ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

/** Estorna um lançamento criando a perna inversa vinculada (nunca apaga). */
export async function reverseLedgerEntry(
  tx: Prisma.TransactionClient,
  entryId: string,
  reason: string,
  userId: string
) {
  const original = await tx.ledgerEntry.findUnique({ where: { id: entryId } });
  if (!original) throw new Error("Lançamento não encontrado.");
  if (original.reversalOfId) throw new Error("Este lançamento já é um estorno.");
  const already = await tx.ledgerEntry.findFirst({ where: { reversalOfId: entryId } });
  if (already) throw new Error("Este lançamento já foi estornado.");

  return tx.ledgerEntry.create({
    data: {
      tenantId: original.tenantId,
      branchId: original.branchId,
      financialAccountId: original.financialAccountId,
      chartAccountId: original.chartAccountId,
      costCenterId: original.costCenterId,
      date: new Date(),
      competenceDate: original.competenceDate,
      type: original.type === "ENTRADA" ? "SAIDA" : "ENTRADA",
      amount: original.amount,
      description: `Estorno: ${original.description} — ${reason}`,
      document: original.document,
      sourceType: "ESTORNO",
      sourceId: original.id,
      reversalOfId: original.id,
      createdById: userId,
    },
  });
}

/** Conta financeira padrão para recebimentos em dinheiro. */
export async function getDefaultCashAccount(tenantId: string, branchId?: string | null) {
  const account = await prisma.financialAccount.findFirst({
    where: {
      tenantId,
      active: true,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, type: true },
  });
  if (!account) {
    throw new Error("Cadastre uma conta financeira antes de registrar movimentações.");
  }
  return account;
}

export async function getDefaultRevenueChartAccount(tenantId: string) {
  return prisma.chartAccount.findFirst({
    where: { tenantId, active: true, nature: "RECEITA", isAnalytic: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
}

export async function getDefaultExpenseChartAccount(tenantId: string) {
  return prisma.chartAccount.findFirst({
    where: { tenantId, active: true, nature: "DESPESA", isAnalytic: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
}

// ---------------------------------------------------------------------------
// Contas financeiras
// ---------------------------------------------------------------------------

export async function listFinancialAccounts(ctx: AuthContext, includeInactive = false) {
  assertPermission(ctx, "finance.view");
  return prisma.financialAccount.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(includeInactive ? {} : { active: true }),
      ...(ctx.branchId ? { OR: [{ branchId: ctx.branchId }, { branchId: null }] } : {}),
    },
    orderBy: { name: "asc" },
    include: { branch: { select: { name: true } } },
  });
}

export async function accountsWithBalance(ctx: AuthContext) {
  assertPermission(ctx, "finance.view");
  const accounts = await listFinancialAccounts(ctx, true);
  const ids = accounts.map((a) => a.id);
  const sums = await prisma.ledgerEntry.groupBy({
    by: ["financialAccountId", "type"],
    where: { tenantId: ctx.tenantId, financialAccountId: { in: ids } },
    _sum: { amount: true },
  });
  const map = new Map<string, { in: number; out: number }>();
  for (const row of sums) {
    const item = map.get(row.financialAccountId) ?? { in: 0, out: 0 };
    if (row.type === "ENTRADA") item.in += Number(row._sum.amount ?? 0);
    else item.out += Number(row._sum.amount ?? 0);
    map.set(row.financialAccountId, item);
  }
  return accounts.map((account) => {
    const totals = map.get(account.id) ?? { in: 0, out: 0 };
    const balance = Number(account.initialBalance) + totals.in - totals.out;
    return {
      ...account,
      totalIn: totals.in,
      totalOut: totals.out,
      balance,
    };
  });
}

export async function saveFinancialAccount(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.structure");
  const input = financialAccountSchema.parse(raw);
  const existing = input.id
    ? await prisma.financialAccount.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Conta financeira não encontrada.");

  const branchId = input.branchId || null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const data = {
    tenantId: ctx.tenantId,
    name: input.name,
    type: input.type,
    branchId,
    bankName: input.bankName ?? null,
    agency: input.agency ?? null,
    accountNumber: input.accountNumber ?? null,
    initialBalance: money(input.initialBalance),
    initialBalanceDate: parseBusinessDate(input.initialBalanceDate) ?? new Date(),
    active: input.active,
  };

  const saved = existing
    ? await prisma.financialAccount.update({ where: { id: existing.id }, data })
    : await prisma.financialAccount.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "financeiro",
    entity: "FinancialAccount",
    entityId: saved.id,
    description: `Conta financeira "${saved.name}" ${existing ? "atualizada" : "criada"}`,
  });
  return { id: saved.id };
}

// ---------------------------------------------------------------------------
// Plano de contas
// ---------------------------------------------------------------------------

export async function listChartAccounts(ctx: AuthContext, includeInactive = false) {
  assertPermission(ctx, "finance.view");
  return prisma.chartAccount.findMany({
    where: { tenantId: ctx.tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { code: "asc" },
  });
}

export async function saveChartAccount(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.structure");
  const input = chartAccountSchema.parse(raw);
  const existing = input.id
    ? await prisma.chartAccount.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Conta contábil não encontrada.");
  if (input.id && input.parentId === input.id) {
    throw new Error("A conta não pode ser pai dela mesma.");
  }
  if (input.parentId) {
    const parent = await prisma.chartAccount.findFirst({
      where: { id: input.parentId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!parent) throw new Error("Conta superior inválida.");
  }

  const data = {
    tenantId: ctx.tenantId,
    code: input.code,
    name: input.name,
    nature: input.nature,
    parentId: input.parentId || null,
    isAnalytic: input.isAnalytic,
    active: input.active,
    level: input.code.split(".").length,
  };

  const saved = existing
    ? await prisma.chartAccount.update({ where: { id: existing.id }, data })
    : await prisma.chartAccount.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "financeiro",
    entity: "ChartAccount",
    entityId: saved.id,
    description: `Conta contábil "${saved.code} ${saved.name}" ${existing ? "atualizada" : "criada"}`,
  });
  return { id: saved.id };
}

// ---------------------------------------------------------------------------
// Centros de custo
// ---------------------------------------------------------------------------

export async function listCostCenters(ctx: AuthContext, includeInactive = false) {
  assertPermission(ctx, "finance.view");
  return prisma.costCenter.findMany({
    where: { tenantId: ctx.tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { code: "asc" },
  });
}

export async function saveCostCenter(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.structure");
  const input = costCenterSchema.parse(raw);
  const existing = input.id
    ? await prisma.costCenter.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Centro de custo não encontrado.");
  const data = {
    tenantId: ctx.tenantId,
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    active: input.active,
  };
  const saved = existing
    ? await prisma.costCenter.update({ where: { id: existing.id }, data })
    : await prisma.costCenter.create({ data });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "financeiro",
    entity: "CostCenter",
    entityId: saved.id,
    description: `Centro de custo "${saved.name}" ${existing ? "atualizado" : "criado"}`,
  });
  return { id: saved.id };
}

// ---------------------------------------------------------------------------
// Livro caixa
// ---------------------------------------------------------------------------

export type LedgerFilters = {
  from?: string;
  to?: string;
  accountId?: string;
  type?: "ENTRADA" | "SAIDA" | "TODOS";
  sourceType?: string;
  costCenterId?: string;
  branchId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listLedger(ctx: AuthContext, filters: LedgerFilters = {}) {
  assertPermission(ctx, "finance.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, filters.pageSize ?? 50));
  const where: Prisma.LedgerEntryWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.accountId ? { financialAccountId: filters.accountId } : {}),
    ...(filters.type && filters.type !== "TODOS" ? { type: filters.type } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType as never } : {}),
    ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
  };
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: startOfBusinessDay(filters.from) } : {}),
      ...(filters.to ? { lte: endOfBusinessDay(filters.to) } : {}),
    };
  }
  if (filters.q?.trim()) {
    where.OR = [
      { description: { contains: filters.q.trim(), mode: "insensitive" } },
      { document: { contains: filters.q.trim(), mode: "insensitive" } },
    ];
  }

  const [rows, total, aggregate] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        financialAccount: { select: { name: true } },
        chartAccount: { select: { code: true, name: true } },
        costCenter: { select: { name: true } },
        branch: { select: { name: true } },
      },
    }),
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
  ]);

  const totals = { in: 0, out: 0, balance: 0 };
  for (const row of aggregate) {
    if (row.type === "ENTRADA") totals.in = Number(row._sum.amount ?? 0);
    else totals.out = Number(row._sum.amount ?? 0);
  }
  totals.balance = totals.in - totals.out;

  // Saldo anterior ao período (para livro caixa).
  let openingBalance = 0;
  if (filters.from || filters.accountId) {
    const priorWhere: Prisma.LedgerEntryWhereInput = {
      tenantId: ctx.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(filters.accountId ? { financialAccountId: filters.accountId } : {}),
      ...(filters.from ? { date: { lt: startOfBusinessDay(filters.from) } } : {}),
    };
    const prior = await prisma.ledgerEntry.groupBy({
      by: ["type"],
      where: priorWhere,
      _sum: { amount: true },
    });
    for (const row of prior) {
      openingBalance += row.type === "ENTRADA" ? Number(row._sum.amount ?? 0) : -Number(row._sum.amount ?? 0);
    }
    if (filters.accountId) {
      const account = await prisma.financialAccount.findFirst({
        where: { id: filters.accountId, tenantId: ctx.tenantId },
        select: { initialBalance: true },
      });
      openingBalance += Number(account?.initialBalance ?? 0);
    }
  }

  return { rows, total, totals, openingBalance, page, pageSize };
}

export async function createManualLedgerEntry(
  ctx: AuthContext,
  raw: unknown
): Promise<{ id: string }> {
  assertPermission(ctx, "finance.manage");
  const input = ledgerManualSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId ?? null);

  const account = await prisma.financialAccount.findFirst({
    where: { id: input.financialAccountId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!account) throw new Error("Conta financeira inválida.");

  if (input.chartAccountId) {
    const chart = await prisma.chartAccount.findFirst({
      where: { id: input.chartAccountId, tenantId: ctx.tenantId, isAnalytic: true },
      select: { id: true },
    });
    if (!chart) throw new Error("Conta contábil inválida ou sintética.");
  }
  if (input.costCenterId) {
    const center = await prisma.costCenter.findFirst({
      where: { id: input.costCenterId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!center) throw new Error("Centro de custo inválido.");
  }

  const date = parseBusinessDate(input.date) ?? new Date();
  const created = await withSerializableTransaction(async (tx) =>
    postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: input.branchId || ctx.branchId,
      financialAccountId: input.financialAccountId,
      chartAccountId: input.chartAccountId ?? null,
      costCenterId: input.costCenterId ?? null,
      date,
      competenceDate: parseBusinessDate(input.competenceDate) ?? date,
      type: input.type,
      amount: input.amount,
      description: input.description,
      document: input.document ?? null,
      sourceType: input.type === "ENTRADA" ? "RECEITA" : "DESPESA",
      createdById: ctx.userId,
    })
  );

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "financeiro",
    entity: "LedgerEntry",
    entityId: created.id,
    description: `Lançamento manual: ${input.description}`,
    newValues: { type: input.type, amount: money(input.amount) },
  });

  return { id: created.id };
}

const ledgerManualSchema = z.object({
  branchId: z.string().optional(),
  financialAccountId: z.string().min(1, "Informe a conta financeira."),
  chartAccountId: z.string().optional(),
  costCenterId: z.string().optional(),
  date: z.string().min(10),
  competenceDate: z.string().optional(),
  type: z.enum(["ENTRADA", "SAIDA"]),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  description: z.string().trim().min(1, "Informe a descrição.").max(200),
  document: z.string().trim().max(60).optional(),
});

// ---------------------------------------------------------------------------
// Transferências entre contas
// ---------------------------------------------------------------------------

export async function createAccountTransfer(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.manage");
  const input = transferSchema.parse(raw);
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("As contas de origem e destino devem ser diferentes.");
  }

  const accounts = await prisma.financialAccount.findMany({
    where: {
      tenantId: ctx.tenantId,
      id: { in: [input.fromAccountId, input.toAccountId] },
      active: true,
    },
    select: { id: true, name: true, branchId: true },
  });
  if (accounts.length !== 2) throw new Error("Conta de origem ou destino inválida.");
  for (const account of accounts) assertBranchAccess(ctx, account.branchId);

  const date = parseBusinessDate(input.date) ?? new Date();

  const result = await withSerializableTransaction(async (tx) => {
    const transfer = await tx.accountTransfer.create({
      data: {
        tenantId: ctx.tenantId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: money(input.amount),
        date,
        description: input.description,
        createdById: ctx.userId,
      },
    });

    const from = accounts.find((a) => a.id === input.fromAccountId)!;
    const to = accounts.find((a) => a.id === input.toAccountId)!;

    await postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: from.branchId,
      financialAccountId: from.id,
      date,
      type: "SAIDA",
      amount: input.amount,
      description: `Transferência para ${to.name}: ${input.description}`,
      sourceType: "TRANSFERENCIA",
      sourceId: transfer.id,
      transferId: transfer.id,
      createdById: ctx.userId,
    });

    await postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: to.branchId,
      financialAccountId: to.id,
      date,
      type: "ENTRADA",
      amount: input.amount,
      description: `Transferência de ${from.name}: ${input.description}`,
      sourceType: "TRANSFERENCIA",
      sourceId: transfer.id,
      transferId: transfer.id,
      createdById: ctx.userId,
    });

    return transfer;
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "financeiro",
    entity: "AccountTransfer",
    entityId: result.id,
    description: `Transferência de ${money(input.amount)} entre contas`,
  });

  return { id: result.id };
}

export async function listTransfers(ctx: AuthContext, from?: string, to?: string) {
  assertPermission(ctx, "finance.view");
  return prisma.accountTransfer.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: startOfBusinessDay(from) } : {}),
              ...(to ? { lte: endOfBusinessDay(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 100,
    include: {
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Conciliação
// ---------------------------------------------------------------------------

export async function setReconciled(
  ctx: AuthContext,
  entryId: string,
  reconciled: boolean
): Promise<void> {
  assertPermission(ctx, "finance.manage");
  const entry = await prisma.ledgerEntry.findFirst({
    where: { id: entryId, tenantId: ctx.tenantId },
    include: { financialAccount: { select: { branchId: true } } },
  });
  if (!entry) throw new Error("Lançamento não encontrado.");
  assertBranchAccess(ctx, entry.financialAccount.branchId);
  await prisma.ledgerEntry.update({
    where: { id: entryId },
    data: { reconciledAt: reconciled ? new Date() : null },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "financeiro",
    entity: "LedgerEntry",
    entityId: entryId,
    description: reconciled ? "Lançamento conciliado" : "Conciliação desfeita",
  });
}

// ---------------------------------------------------------------------------
// Fluxo de caixa
// ---------------------------------------------------------------------------

export type CashFlowFilters = {
  from?: string;
  to?: string;
  accountId?: string;
  branchId?: string;
  groupBy?: "day" | "month";
};

export async function getCashFlow(ctx: AuthContext, filters: CashFlowFilters = {}) {
  assertPermission(ctx, "finance.reports");
  const from = filters.from ?? todayISO().slice(0, 8) + "01";
  const to = filters.to ?? todayISO();
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(filters.accountId ? { financialAccountId: filters.accountId } : {}),
      date: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      type: true,
      amount: true,
      description: true,
      financialAccount: { select: { name: true } },
    },
  });

  let opening = 0;
  if (filters.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: filters.accountId, tenantId: ctx.tenantId },
      select: { initialBalance: true },
    });
    opening += Number(account?.initialBalance ?? 0);
    const prior = await prisma.ledgerEntry.groupBy({
      by: ["type"],
      where: {
        tenantId: ctx.tenantId,
        financialAccountId: filters.accountId,
        date: { lt: startOfBusinessDay(from) },
      },
      _sum: { amount: true },
    });
    for (const row of prior) {
      opening += row.type === "ENTRADA" ? Number(row._sum.amount ?? 0) : -Number(row._sum.amount ?? 0);
    }
  } else {
    const accounts = await prisma.financialAccount.findMany({
      where: { tenantId: ctx.tenantId, ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}) },
      select: { initialBalance: true },
    });
    opening += accounts.reduce((sum, a) => sum + Number(a.initialBalance), 0);
    const prior = await prisma.ledgerEntry.groupBy({
      by: ["type"],
      where: { tenantId: ctx.tenantId, date: { lt: startOfBusinessDay(from) }, ...(branchId ? { branchId } : {}) },
      _sum: { amount: true },
    });
    for (const row of prior) {
      opening += row.type === "ENTRADA" ? Number(row._sum.amount ?? 0) : -Number(row._sum.amount ?? 0);
    }
  }

  const buckets = new Map<string, { key: string; in: number; out: number }>();
  for (const entry of entries) {
    const iso = entry.date.toISOString();
    const key = filters.groupBy === "month" ? iso.slice(0, 7) : iso.slice(0, 10);
    const bucket = buckets.get(key) ?? { key, in: 0, out: 0 };
    if (entry.type === "ENTRADA") bucket.in += Number(entry.amount);
    else bucket.out += Number(entry.amount);
    buckets.set(key, bucket);
  }

  let running = opening;
  const series = [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((bucket) => {
      running += bucket.in - bucket.out;
      return { ...bucket, balance: running };
    });

  const totalIn = entries.filter((e) => e.type === "ENTRADA").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = entries.filter((e) => e.type === "SAIDA").reduce((s, e) => s + Number(e.amount), 0);

  const projected = await getProjectedFlow(ctx, from, to, branchId);

  return {
    from,
    to,
    openingBalance: opening,
    totalIn,
    totalOut,
    closingBalance: opening + totalIn - totalOut,
    series,
    entries: entries.slice(-200).map((e) => ({
      date: e.date,
      type: e.type,
      amount: Number(e.amount),
      description: e.description,
      account: e.financialAccount.name,
    })),
    projected,
  };
}

async function getProjectedFlow(ctx: AuthContext, from: string, to: string, branchId: string | null) {
  const [payables, receivables] = await Promise.all([
    prisma.payable.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["ABERTO", "PARCIAL"] },
        dueDate: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
    }),
    prisma.receivable.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["ABERTO", "PARCIAL"] },
        dueDate: { gte: startOfBusinessDay(from), lte: endOfBusinessDay(to) },
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, value: true, dueDate: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
    }),
  ]);

  const bucket = new Map<string, { key: string; inflow: number; outflow: number }>();
  for (const item of receivables) {
    const key = item.dueDate.toISOString().slice(0, 10);
    const paid = sumValues(item.payments.map((p) => p.amount));
    const open = round2(dec(item.value).minus(paid));
    const row = bucket.get(key) ?? { key, inflow: 0, outflow: 0 };
    row.inflow += open.toNumber();
    bucket.set(key, row);
  }
  for (const item of payables) {
    const key = item.dueDate.toISOString().slice(0, 10);
    const paid = sumValues(item.payments.map((p) => p.amount));
    const open = round2(dec(item.value).minus(paid));
    const row = bucket.get(key) ?? { key, inflow: 0, outflow: 0 };
    row.outflow += open.toNumber();
    bucket.set(key, row);
  }

  return [...bucket.values()].sort((a, b) => a.key.localeCompare(b.key));
}
