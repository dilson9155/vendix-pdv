import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertBranchAccess, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { withSerializableTransaction } from "@/lib/transaction";
import { postLedgerEntry, reverseLedgerEntry } from "@/services/finance-core.service";
import { dec, money, round2, splitInstallments, sumValues } from "@/lib/money";
import {
  addMonths,
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
  todayISO,
} from "@/lib/date";
import { receivableSchema } from "@/lib/validation";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const EPSILON = 0.005;

export type ReceivableFilters = {
  q?: string;
  status?: "TODOS" | "ABERTOS" | "VENCIDOS" | "ABERTO" | "PARCIAL" | "RECEBIDO" | "CANCELADO";
  customerId?: string;
  branchId?: string;
  costCenterId?: string;
  chartAccountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type ReceivableRow = {
  id: string;
  branchId: string;
  branchName: string;
  customerName: string | null;
  customerId: string | null;
  description: string;
  document: string | null;
  saleId: string | null;
  chartAccount: string | null;
  chartAccountId: string | null;
  costCenterName: string | null;
  issueDate: string;
  competenceDate: string;
  dueDate: string;
  value: number;
  received: number;
  balance: number;
  status: string;
  isOverdue: boolean;
  daysOverdue: number;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentGroupId: string | null;
  notes: string | null;
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    accountName: string;
    method: string | null;
    reversedAt: string | null;
    reversalReason: string | null;
  }>;
};

export async function listReceivables(
  ctx: AuthContext,
  filters: ReceivableFilters = {}
): Promise<{
  rows: ReceivableRow[];
  totals: { open: number; overdue: number; receivedPeriod: number; count: number };
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPermission(ctx, "finance.view");
  const branchId = filters.branchId ?? ctx.branchId ?? null;
  if (branchId) assertBranchAccess(ctx, branchId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const today = startOfBusinessDay(todayISO());

  const where: Prisma.ReceivableWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
    ...(filters.chartAccountId ? { chartAccountId: filters.chartAccountId } : {}),
  };

  if (filters.q?.trim()) {
    where.OR = [
      { description: { contains: filters.q.trim(), mode: "insensitive" } },
      { document: { contains: filters.q.trim(), mode: "insensitive" } },
      { customer: { name: { contains: filters.q.trim(), mode: "insensitive" } } },
    ];
  }

  if (filters.status === "VENCIDOS") {
    where.status = { in: ["ABERTO", "PARCIAL"] };
    where.dueDate = { lt: today };
  } else if (filters.status === "ABERTOS") {
    where.status = { in: ["ABERTO", "PARCIAL"] };
  } else if (filters.status && filters.status !== "TODOS") {
    where.status = filters.status;
  }

  if (filters.from || filters.to) {
    where.dueDate = {
      ...(filters.from ? { gte: startOfBusinessDay(filters.from) } : {}),
      ...(filters.to ? { lte: endOfBusinessDay(filters.to) } : {}),
    };
  }

  const [receivables, total, openCount, receivedAgg] = await Promise.all([
    prisma.receivable.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true } },
        branch: { select: { name: true } },
        chartAccount: { select: { id: true, code: true, name: true } },
        costCenter: { select: { name: true } },
        payments: {
          orderBy: { date: "asc" },
          include: { financialAccount: { select: { name: true } } },
        },
      },
    }),
    prisma.receivable.count({ where }),
    prisma.receivable.count({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["ABERTO", "PARCIAL"] },
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.receivablePayment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        reversedAt: null,
        ...(branchId ? { receivable: { branchId } } : {}),
        date: {
          gte: startOfBusinessDay(`${todayISO().slice(0, 7)}-01`),
          lte: endOfBusinessDay(todayISO()),
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const rows: ReceivableRow[] = receivables.map((receivable) => {
    const activePayments = receivable.payments.filter((p) => !p.reversedAt);
    const received = round2(sumValues(activePayments.map((p) => p.amount)));
    const value = round2(receivable.value);
    const balance =
      receivable.status === "CANCELADO"
        ? round2(0)
        : round2(value.minus(received).lessThan(0) ? dec(0) : value.minus(received));
    const isOverdue =
      (receivable.status === "ABERTO" || receivable.status === "PARCIAL") &&
      receivable.dueDate.getTime() < today.getTime();
    const daysOverdue = isOverdue
      ? Math.floor((today.getTime() - receivable.dueDate.getTime()) / 86_400_000)
      : 0;

    return {
      id: receivable.id,
      branchId: receivable.branchId,
      branchName: receivable.branch.name,
      customerName: receivable.customer?.name ?? null,
      customerId: receivable.customerId,
      description: receivable.description,
      document: receivable.document,
      saleId: receivable.saleId,
      chartAccount: receivable.chartAccount
        ? `${receivable.chartAccount.code} — ${receivable.chartAccount.name}`
        : null,
      chartAccountId: receivable.chartAccountId,
      costCenterName: receivable.costCenter?.name ?? null,
      issueDate: receivable.issueDate.toISOString().slice(0, 10),
      competenceDate: receivable.competenceDate.toISOString().slice(0, 10),
      dueDate: receivable.dueDate.toISOString().slice(0, 10),
      value: value.toNumber(),
      received: received.toNumber(),
      balance: balance.toNumber(),
      status: receivable.status,
      isOverdue,
      daysOverdue,
      installmentNumber: receivable.installmentNumber,
      installmentTotal: receivable.installmentTotal,
      installmentGroupId: receivable.installmentGroupId,
      notes: receivable.notes,
      payments: receivable.payments.map((payment) => ({
        id: payment.id,
        date: payment.date.toISOString().slice(0, 10),
        amount: Number(payment.amount),
        accountName: payment.financialAccount.name,
        method: payment.method,
        reversedAt: payment.reversedAt ? payment.reversedAt.toISOString() : null,
        reversalReason: payment.reversalReason,
      })),
    };
  });

  const openRows = await prisma.receivable.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ["ABERTO", "PARCIAL"] },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      dueDate: true,
      value: true,
      payments: { where: { reversedAt: null }, select: { amount: true } },
    },
  });

  let open = dec(0);
  let overdue = dec(0);
  for (const row of openRows) {
    const paid = sumValues(row.payments.map((p) => p.amount));
    const balance = round2(row.value).minus(paid);
    if (balance.lessThanOrEqualTo(0)) continue;
    open = open.plus(balance);
    if (row.dueDate.getTime() < today.getTime()) overdue = overdue.plus(balance);
  }

  return {
    rows,
    total,
    page,
    pageSize,
    totals: {
      open: open.toNumber(),
      overdue: overdue.toNumber(),
      receivedPeriod: Number(receivedAgg._sum.amount ?? 0),
      count: openCount,
    },
  };
}

export async function getReceivable(ctx: AuthContext, id: string) {
  assertPermission(ctx, "finance.view");
  const receivable = await prisma.receivable.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      customer: true,
      branch: { select: { name: true } },
      chartAccount: true,
      costCenter: true,
      sale: { select: { id: true, documentNumber: true } },
      payments: {
        orderBy: { date: "desc" },
        include: { financialAccount: { select: { name: true } }, user: { select: { name: true } } },
      },
    },
  });
  if (!receivable) return null;
  assertBranchAccess(ctx, receivable.branchId);
  return receivable;
}

export async function saveReceivable(ctx: AuthContext, raw: unknown): Promise<{ ids: string[] }> {
  assertPermission(ctx, "finance.manage");
  const input = receivableSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!branch) throw new Error("Unidade inválida.");

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!customer) throw new Error("Cliente inválido.");
  }

  const chartAccount = await resolveRevenueAccount(ctx.tenantId, input.chartAccountId);
  const costCenter = await resolveCostCenter(ctx.tenantId, input.costCenterId);

  if (input.id) {
    const existing = await prisma.receivable.findFirst({
      where: { id: input.id, tenantId: ctx.tenantId },
      include: { payments: { where: { reversedAt: null }, select: { id: true } } },
    });
    if (!existing) throw new Error("Conta a receber não encontrada.");
    if (existing.status === "CANCELADO") throw new Error("Conta cancelada não pode ser editada.");
    if (existing.saleId) {
      throw new Error("Contas geradas pelo PDV não podem ser editadas manualmente.");
    }
    if (existing.payments.length > 0) {
      throw new Error("Estorne os recebimentos antes de alterar esta conta.");
    }
    await prisma.receivable.update({
      where: { id: existing.id },
      data: {
        branchId: input.branchId,
        customerId: input.customerId || null,
        description: input.description,
        document: input.document || null,
        chartAccountId: chartAccount.id,
        costCenterId: costCenter?.id ?? null,
        issueDate: parseBusinessDate(input.issueDate) ?? new Date(),
        competenceDate: parseBusinessDate(input.competenceDate) ?? new Date(),
        dueDate: parseBusinessDate(input.dueDate) ?? new Date(),
        value: money(input.value),
        notes: input.notes ?? null,
      },
    });
    await auditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: "UPDATE",
      module: "financeiro",
      entity: "Receivable",
      entityId: existing.id,
      description: `Conta a receber "${input.description}" atualizada`,
    });
    return { ids: [existing.id] };
  }

  const installments = Math.max(1, Math.min(36, input.installments ?? 1));
  const parts = splitInstallments(input.value, installments);
  const groupId = installments > 1 ? randomUUID() : null;
  const firstDue = parseBusinessDate(input.dueDate) ?? new Date();
  const issueDate = parseBusinessDate(input.issueDate) ?? new Date();
  const competenceDate = parseBusinessDate(input.competenceDate) ?? issueDate;

  const ids = await withSerializableTransaction(async (tx) => {
    const created: string[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const receivable = await tx.receivable.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: input.branchId,
          customerId: input.customerId || null,
          description:
            installments > 1 ? `${input.description} (${index + 1}/${installments})` : input.description,
          document: input.document || null,
          chartAccountId: chartAccount.id,
          costCenterId: costCenter?.id ?? null,
          issueDate,
          competenceDate,
          dueDate: index === 0 ? firstDue : addMonths(firstDue, index),
          value: money(parts[index]),
          notes: input.notes ?? null,
          createdById: ctx.userId,
          installmentGroupId: groupId,
          installmentNumber: installments > 1 ? index + 1 : null,
          installmentTotal: installments > 1 ? installments : null,
        },
      });
      created.push(receivable.id);
    }
    return created;
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "financeiro",
    entity: "Receivable",
    entityId: ids[0],
    description: `Conta a receber "${input.description}" criada (${installments}x)`,
    newValues: { value: money(input.value), installments },
  });

  return { ids };
}

async function resolveRevenueAccount(tenantId: string, id?: string | null) {
  if (!id) {
    const account = await prisma.chartAccount.findFirst({
      where: { tenantId, active: true, nature: "RECEITA", isAnalytic: true },
      orderBy: { code: "asc" },
      select: { id: true },
    });
    if (!account) throw new Error("Cadastre uma conta contábil de receita.");
    return account;
  }
  const account = await prisma.chartAccount.findFirst({
    where: { id, tenantId, active: true },
    select: { id: true, isAnalytic: true },
  });
  if (!account) throw new Error("Conta contábil inválida.");
  if (!account.isAnalytic) throw new Error("Lançamentos só podem ser feitos em contas analíticas.");
  return account;
}

async function resolveCostCenter(tenantId: string, id?: string | null) {
  if (!id) return null;
  const center = await prisma.costCenter.findFirst({
    where: { id, tenantId, active: true },
    select: { id: true },
  });
  if (!center) throw new Error("Centro de custo inválido.");
  return center;
}

export async function cancelReceivable(
  ctx: AuthContext,
  id: string,
  reason: string
): Promise<void> {
  assertPermission(ctx, "finance.manage");
  const receivable = await prisma.receivable.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { payments: { where: { reversedAt: null }, select: { id: true } } },
  });
  if (!receivable) throw new Error("Conta a receber não encontrada.");
  assertBranchAccess(ctx, receivable.branchId);
  if (receivable.status === "CANCELADO") throw new Error("Esta conta já está cancelada.");
  if (receivable.payments.length > 0) {
    throw new Error("Estorne os recebimentos antes de cancelar esta conta.");
  }
  await prisma.receivable.update({
    where: { id },
    data: {
      status: "CANCELADO",
      canceledAt: new Date(),
      canceledReason: reason.trim() || "Cancelamento solicitado",
    },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CANCEL",
    module: "financeiro",
    entity: "Receivable",
    entityId: id,
    description: `Conta a receber cancelada: ${reason}`,
  });
}

const receiveSchema = z.object({
  id: z.string().min(1),
  financialAccountId: z.string().min(1, "Informe a conta financeira."),
  date: z.string().min(10),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  interest: z.coerce.number().min(0).default(0),
  penalty: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  method: z.string().trim().max(40).optional(),
  document: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});

export async function receiveReceivable(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.pay");
  const input = receiveSchema.parse(raw);

  const receivable = await prisma.receivable.findFirst({
    where: { id: input.id, tenantId: ctx.tenantId },
    include: { payments: { where: { reversedAt: null }, select: { amount: true } } },
  });
  if (!receivable) throw new Error("Conta a receber não encontrada.");
  assertBranchAccess(ctx, receivable.branchId);
  if (receivable.status === "CANCELADO") throw new Error("Conta cancelada não recebe baixa.");
  if (receivable.status === "RECEBIDO") throw new Error("Esta conta já está quitada.");

  const account = await prisma.financialAccount.findFirst({
    where: { id: input.financialAccountId, tenantId: ctx.tenantId, active: true },
    select: { id: true, branchId: true },
  });
  if (!account) throw new Error("Conta financeira inválida.");
  assertBranchAccess(ctx, account.branchId);

  const total = round2(receivable.value);
  const received = round2(sumValues(receivable.payments.map((p) => p.amount)));
  const remaining = round2(total.minus(received));
  const amount = round2(input.amount);
  if (amount.greaterThan(remaining.plus(EPSILON))) {
    throw new Error(`O valor ultrapassa o saldo de ${remaining.toFixed(2)}.`);
  }
  const net = round2(amount.plus(input.interest).plus(input.penalty).minus(input.discount));
  if (net.lessThanOrEqualTo(0)) throw new Error("O valor líquido deve ser maior que zero.");

  const date = parseBusinessDate(input.date) ?? new Date();

  const result = await withSerializableTransaction(async (tx) => {
    const payment = await tx.receivablePayment.create({
      data: {
        tenantId: ctx.tenantId,
        receivableId: receivable.id,
        financialAccountId: account.id,
        date,
        amount: money(amount),
        interest: money(input.interest),
        penalty: money(input.penalty),
        discount: money(input.discount),
        method: input.method ?? null,
        document: input.document ?? null,
        notes: input.notes ?? null,
        userId: ctx.userId,
      },
    });

    const entry = await postLedgerEntry(tx, {
      tenantId: ctx.tenantId,
      branchId: receivable.branchId,
      financialAccountId: account.id,
      chartAccountId: receivable.chartAccountId,
      costCenterId: receivable.costCenterId,
      date,
      competenceDate: receivable.competenceDate,
      type: "ENTRADA",
      amount: net.toNumber(),
      description: `Recebimento: ${receivable.description}`,
      document: input.document ?? receivable.document,
      sourceType: "RECEBIMENTO",
      sourceId: payment.id,
      createdById: ctx.userId,
    });

    await tx.receivablePayment.update({
      where: { id: payment.id },
      data: { ledgerEntryId: entry.id },
    });

    const newReceived = round2(received.plus(amount));
    const status = newReceived.plus(EPSILON).greaterThanOrEqualTo(total) ? "RECEBIDO" : "PARCIAL";
    await tx.receivable.update({ where: { id: receivable.id }, data: { status } });

    return { paymentId: payment.id, status, balance: round2(total.minus(newReceived)).toNumber() };
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CONFIRM",
    module: "financeiro",
    entity: "Receivable",
    entityId: receivable.id,
    description: `Recebimento de ${money(amount)} em "${receivable.description}" (${result.status})`,
    newValues: { paymentId: result.paymentId, amount: money(amount), net: money(net) },
  });

  return result;
}

export async function reverseReceivablePayment(ctx: AuthContext, paymentId: string, reason: string) {
  assertPermission(ctx, "finance.reverse");
  const payment = await prisma.receivablePayment.findFirst({
    where: { id: paymentId, tenantId: ctx.tenantId },
    include: { receivable: true },
  });
  if (!payment) throw new Error("Recebimento não encontrado.");
  assertBranchAccess(ctx, payment.receivable.branchId);
  if (payment.reversedAt) throw new Error("Este recebimento já foi estornado.");
  if (!reason.trim()) throw new Error("Informe o motivo do estorno.");

  const result = await withSerializableTransaction(async (tx) => {
    if (payment.ledgerEntryId) {
      await reverseLedgerEntry(tx, payment.ledgerEntryId, reason, ctx.userId);
    }
    await tx.receivablePayment.update({
      where: { id: payment.id },
      data: {
        reversedAt: new Date(),
        reversedById: ctx.userId,
        reversalReason: reason,
      },
    });
    const remaining = await tx.receivablePayment.findMany({
      where: { receivableId: payment.receivableId, reversedAt: null },
      select: { amount: true },
    });
    const received = round2(sumValues(remaining.map((p) => p.amount)));
    const total = round2(payment.receivable.value);
    const status =
      received.lessThanOrEqualTo(EPSILON)
        ? "ABERTO"
        : received.plus(EPSILON).greaterThanOrEqualTo(total)
          ? "RECEBIDO"
          : "PARCIAL";
    await tx.receivable.update({ where: { id: payment.receivableId }, data: { status } });
    return { status, balance: round2(total.minus(received)).toNumber() };
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "REVERT",
    module: "financeiro",
    entity: "ReceivablePayment",
    entityId: paymentId,
    description: `Estorno de recebimento em "${payment.receivable.description}": ${reason}`,
    newValues: { amount: payment.amount.toString() },
  });

  return result;
}

export async function listReceivableOptions(ctx: AuthContext) {
  assertPermission(ctx, "finance.view");
  const [accounts, chartAccounts, costCenters, customers, branches] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.chartAccount.findMany({
      where: { tenantId: ctx.tenantId, active: true, isAnalytic: true, nature: "RECEITA" },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.costCenter.findMany({
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
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, status: "ATIVO" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { accounts, chartAccounts, costCenters, customers, branches };
}
