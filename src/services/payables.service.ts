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
import { payableSchema } from "@/lib/validation";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const EPSILON = 0.005;

export type PayableFilters = {
  q?: string;
  status?: "TODOS" | "ABERTOS" | "VENCIDOS" | "ABERTO" | "PARCIAL" | "PAGO" | "CANCELADO";
  supplierId?: string;
  branchId?: string;
  costCenterId?: string;
  chartAccountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type PayableRow = {
  id: string;
  branchId: string;
  branchName: string;
  supplierName: string | null;
  description: string;
  document: string | null;
  chartAccount: string | null;
  chartAccountId: string | null;
  costCenterName: string | null;
  issueDate: string;
  competenceDate: string;
  dueDate: string;
  value: number;
  paid: number;
  balance: number;
  status: string;
  isOverdue: boolean;
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

export async function listPayables(
  ctx: AuthContext,
  filters: PayableFilters = {}
): Promise<{
  rows: PayableRow[];
  totals: { open: number; overdue: number; paidPeriod: number; count: number };
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

  const where: Prisma.PayableWhereInput = {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
    ...(filters.chartAccountId ? { chartAccountId: filters.chartAccountId } : {}),
  };

  if (filters.q?.trim()) {
    where.OR = [
      { description: { contains: filters.q.trim(), mode: "insensitive" } },
      { document: { contains: filters.q.trim(), mode: "insensitive" } },
      { supplier: { name: { contains: filters.q.trim(), mode: "insensitive" } } },
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

  const [payables, total, openCount, paidAgg] = await Promise.all([
    prisma.payable.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { name: true } },
        branch: { select: { name: true } },
        chartAccount: { select: { id: true, code: true, name: true } },
        costCenter: { select: { name: true } },
        payments: {
          orderBy: { date: "asc" },
          include: { financialAccount: { select: { name: true } } },
        },
      },
    }),
    prisma.payable.count({ where }),
    prisma.payable.count({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["ABERTO", "PARCIAL"] },
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.payablePayment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        reversedAt: null,
        ...(branchId ? { payable: { branchId } } : {}),
        date: {
          gte: startOfBusinessDay(`${todayISO().slice(0, 7)}-01`),
          lte: endOfBusinessDay(todayISO()),
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const rows: PayableRow[] = payables.map((payable) => {
    const activePayments = payable.payments.filter((p) => !p.reversedAt);
    const paid = round2(sumValues(activePayments.map((p) => p.amount)));
    const value = round2(payable.value);
    const balance = payable.status === "CANCELADO" ? round2(0) : round2(DecimalMaxZero(value.minus(paid)));
    const isOverdue =
      (payable.status === "ABERTO" || payable.status === "PARCIAL") &&
      payable.dueDate.getTime() < today.getTime();

    return {
      id: payable.id,
      branchId: payable.branchId,
      branchName: payable.branch.name,
      supplierName: payable.supplier?.name ?? null,
      description: payable.description,
      document: payable.document,
      chartAccount: payable.chartAccount
        ? `${payable.chartAccount.code} — ${payable.chartAccount.name}`
        : null,
      chartAccountId: payable.chartAccountId,
      costCenterName: payable.costCenter?.name ?? null,
      issueDate: payable.issueDate.toISOString().slice(0, 10),
      competenceDate: payable.competenceDate.toISOString().slice(0, 10),
      dueDate: payable.dueDate.toISOString().slice(0, 10),
      value: value.toNumber(),
      paid: paid.toNumber(),
      balance: balance.toNumber(),
      status: payable.status,
      isOverdue,
      installmentNumber: payable.installmentNumber,
      installmentTotal: payable.installmentTotal,
      installmentGroupId: payable.installmentGroupId,
      notes: payable.notes,
      payments: payable.payments.map((payment) => ({
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

  const overdueWhere: Prisma.PayableWhereInput = {
    tenantId: ctx.tenantId,
    status: { in: ["ABERTO", "PARCIAL"] },
    dueDate: { lt: today },
    ...(branchId ? { branchId } : {}),
  };
  const overdueRows = await prisma.payable.findMany({
    where: overdueWhere,
    select: { value: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
  });
  const overdue = overdueRows.reduce((sum, item) => {
    const paid = sumValues(item.payments.map((p) => p.amount));
    return sum.plus(DecimalMaxZero(round2(item.value).minus(paid)));
  }, dec(0));

  // Saldo aberto total (não apenas a página atual).
  const allOpen = await prisma.payable.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ["ABERTO", "PARCIAL"] },
      ...(branchId ? { branchId } : {}),
    },
    select: { value: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
  });
  const open = allOpen.reduce((sum, item) => {
    const paid = sumValues(item.payments.map((p) => p.amount));
    return sum.plus(DecimalMaxZero(round2(item.value).minus(paid)));
  }, dec(0));

  return {
    rows,
    total,
    page,
    pageSize,
    totals: {
      open: open.toNumber(),
      overdue: overdue.toNumber(),
      paidPeriod: Number(paidAgg._sum.amount ?? 0),
      count: openCount,
    },
  };
}

function DecimalMaxZero(value: ReturnType<typeof dec>) {
  return value.lessThan(0) ? dec(0) : value;
}

export async function getPayable(ctx: AuthContext, id: string) {
  assertPermission(ctx, "finance.view");
  const payable = await prisma.payable.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      supplier: true,
      branch: { select: { name: true } },
      chartAccount: true,
      costCenter: true,
      payments: {
        orderBy: { date: "desc" },
        include: { financialAccount: { select: { name: true } }, user: { select: { name: true } } },
      },
    },
  });
  if (!payable) return null;
  assertBranchAccess(ctx, payable.branchId);
  return payable;
}

export async function savePayable(
  ctx: AuthContext,
  raw: unknown
): Promise<{ ids: string[] }> {
  assertPermission(ctx, "finance.manage");
  const input = payableSchema.parse(raw);
  assertBranchAccess(ctx, input.branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!branch) throw new Error("Unidade inválida.");

  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!supplier) throw new Error("Fornecedor inválido.");
  }
  const chartAccount = await resolveChartAccount(ctx.tenantId, input.chartAccountId);
  const costCenter = await resolveCostCenter(ctx.tenantId, input.costCenterId);

  if (input.id) {
    const existing = await prisma.payable.findFirst({
      where: { id: input.id, tenantId: ctx.tenantId },
      include: { payments: { where: { reversedAt: null }, select: { amount: true } } },
    });
    if (!existing) throw new Error("Conta a pagar não encontrada.");
    if (existing.status === "CANCELADO") throw new Error("Conta cancelada não pode ser editada.");
    if (existing.payments.length > 0) {
      throw new Error("Estorne os pagamentos antes de alterar esta conta.");
    }
    await prisma.payable.update({
      where: { id: existing.id },
      data: {
        branchId: input.branchId,
        supplierId: input.supplierId || null,
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
      entity: "Payable",
      entityId: existing.id,
      description: `Conta a pagar "${input.description}" atualizada`,
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
      const payable = await tx.payable.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: input.branchId,
          supplierId: input.supplierId || null,
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
      created.push(payable.id);
    }
    return created;
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "financeiro",
    entity: "Payable",
    entityId: ids[0],
    description: `Conta a pagar "${input.description}" criada (${installments}x)`,
    newValues: { value: money(input.value), installments },
  });

  return { ids };
}

async function resolveChartAccount(tenantId: string, id?: string | null) {
  if (!id) {
    const defaultAccount = await prisma.chartAccount.findFirst({
      where: { tenantId, active: true, nature: "DESPESA", isAnalytic: true },
      orderBy: { code: "asc" },
      select: { id: true },
    });
    if (!defaultAccount) throw new Error("Cadastre uma conta contábil de despesa.");
    return defaultAccount;
  }
  const account = await prisma.chartAccount.findFirst({
    where: { id, tenantId, active: true },
    select: { id: true, isAnalytic: true, nature: true },
  });
  if (!account) throw new Error("Conta contábil inválida.");
  if (!account.isAnalytic) {
    throw new Error("Lançamentos só podem ser feitos em contas analíticas.");
  }
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

export async function cancelPayable(
  ctx: AuthContext,
  id: string,
  reason: string
): Promise<void> {
  assertPermission(ctx, "finance.manage");
  const payable = await prisma.payable.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { payments: { where: { reversedAt: null }, select: { id: true } } },
  });
  if (!payable) throw new Error("Conta a pagar não encontrada.");
  assertBranchAccess(ctx, payable.branchId);
  if (payable.status === "CANCELADO") throw new Error("Esta conta já está cancelada.");
  if (payable.payments.length > 0) {
    throw new Error("Estorne os pagamentos antes de cancelar esta conta.");
  }

  await prisma.payable.update({
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
    entity: "Payable",
    entityId: id,
    description: `Conta a pagar cancelada: ${reason}`,
  });
}

const paySchema = z.object({
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

export async function payPayable(ctx: AuthContext, raw: unknown) {
  assertPermission(ctx, "finance.pay");
  const input = paySchema.parse(raw);

  const payable = await prisma.payable.findFirst({
    where: { id: input.id, tenantId: ctx.tenantId },
    include: {
      payments: { where: { reversedAt: null }, select: { amount: true } },
    },
  });
  if (!payable) throw new Error("Conta a pagar não encontrada.");
  assertBranchAccess(ctx, payable.branchId);
  if (payable.status === "CANCELADO") throw new Error("Conta cancelada não recebe baixa.");
  if (payable.status === "PAGO") throw new Error("Esta conta já está quitada.");

  const account = await prisma.financialAccount.findFirst({
    where: { id: input.financialAccountId, tenantId: ctx.tenantId, active: true },
    select: { id: true, branchId: true, name: true },
  });
  if (!account) throw new Error("Conta financeira inválida.");
  assertBranchAccess(ctx, account.branchId);

  const total = round2(payable.value);
  const paid = round2(sumValues(payable.payments.map((p) => p.amount)));
  const remaining = round2(total.minus(paid));
  const amount = round2(input.amount);
  if (amount.greaterThan(remaining.plus(EPSILON))) {
    throw new Error(`O valor ultrapassa o saldo devedor de ${remaining.toFixed(2)}.`);
  }
  const cashOut = round2(amount.plus(input.interest).plus(input.penalty).minus(input.discount));
  if (cashOut.lessThanOrEqualTo(0)) {
    throw new Error("O valor líquido do pagamento deve ser maior que zero.");
  }

  const date = parseBusinessDate(input.date) ?? new Date();

  const result = await withSerializableTransaction(async (tx) => {
    const payment = await tx.payablePayment.create({
      data: {
        tenantId: ctx.tenantId,
        payableId: payable.id,
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
      branchId: payable.branchId,
      financialAccountId: account.id,
      chartAccountId: payable.chartAccountId,
      costCenterId: payable.costCenterId,
      date,
      competenceDate: payable.competenceDate,
      type: "SAIDA",
      amount: cashOut.toNumber(),
      description: `Pagamento: ${payable.description}`,
      document: input.document ?? payable.document,
      sourceType: "PAGAMENTO",
      sourceId: payment.id,
      createdById: ctx.userId,
    });

    await tx.payablePayment.update({
      where: { id: payment.id },
      data: { ledgerEntryId: entry.id },
    });

    const newPaid = round2(paid.plus(amount));
    const status = newPaid.plus(EPSILON).greaterThanOrEqualTo(total) ? "PAGO" : "PARCIAL";
    await tx.payable.update({ where: { id: payable.id }, data: { status } });

    return { paymentId: payment.id, status, balance: round2(total.minus(newPaid)).toNumber() };
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CONFIRM",
    module: "financeiro",
    entity: "Payable",
    entityId: payable.id,
    description: `Baixa de ${money(amount)} em "${payable.description}" (${result.status})`,
    newValues: { paymentId: result.paymentId, amount: money(amount), cashOut: money(cashOut) },
  });

  return result;
}

export async function reversePayablePayment(ctx: AuthContext, paymentId: string, reason: string) {
  assertPermission(ctx, "finance.reverse");
  const payment = await prisma.payablePayment.findFirst({
    where: { id: paymentId, tenantId: ctx.tenantId },
    include: { payable: true },
  });
  if (!payment) throw new Error("Pagamento não encontrado.");
  assertBranchAccess(ctx, payment.payable.branchId);
  if (payment.reversedAt) throw new Error("Este pagamento já foi estornado.");
  if (!reason.trim()) throw new Error("Informe o motivo do estorno.");

  const result = await withSerializableTransaction(async (tx) => {
    if (payment.ledgerEntryId) {
      await reverseLedgerEntry(tx, payment.ledgerEntryId, reason, ctx.userId);
    }
    await tx.payablePayment.update({
      where: { id: payment.id },
      data: {
        reversedAt: new Date(),
        reversedById: ctx.userId,
        reversalReason: reason,
      },
    });

    const remaining = await tx.payablePayment.findMany({
      where: { payableId: payment.payableId, reversedAt: null },
      select: { amount: true },
    });
    const paid = round2(sumValues(remaining.map((p) => p.amount)));
    const total = round2(payment.payable.value);
    const status =
      paid.lessThanOrEqualTo(EPSILON)
        ? "ABERTO"
        : paid.plus(EPSILON).greaterThanOrEqualTo(total)
          ? "PAGO"
          : "PARCIAL";
    await tx.payable.update({ where: { id: payment.payableId }, data: { status } });
    return { status, balance: round2(total.minus(paid)).toNumber() };
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "REVERT",
    module: "financeiro",
    entity: "PayablePayment",
    entityId: paymentId,
    description: `Estorno de baixa em "${payment.payable.description}": ${reason}`,
    newValues: { amount: payment.amount.toString() },
  });

  return result;
}

export async function listPayableOptions(ctx: AuthContext) {
  assertPermission(ctx, "finance.view");
  const branchFilter = ctx.branchId ? { OR: [{ id: ctx.branchId }, { isHeadquarters: true }] } : {};
  const [accounts, chartAccounts, costCenters, suppliers, branches] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.chartAccount.findMany({
      where: { tenantId: ctx.tenantId, active: true, isAnalytic: true, nature: { in: ["DESPESA", "CUSTO", "ATIVO"] } },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.costCenter.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, status: "ATIVO", ...branchFilter },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { accounts, chartAccounts, costCenters, suppliers, branches };
}
