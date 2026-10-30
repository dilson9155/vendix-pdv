import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLES } from "@/lib/permissions";

const CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  nature: "RECEITA" | "DESPESA" | "CUSTO" | "ATIVO" | "PASSIVO" | "PATRIMONIO";
  analytic: boolean;
  parent?: string;
}> = [
  { code: "1", name: "Receitas", nature: "RECEITA", analytic: false },
  { code: "1.1", name: "Receita de vendas", nature: "RECEITA", analytic: true, parent: "1" },
  { code: "1.2", name: "Outras receitas", nature: "RECEITA", analytic: true, parent: "1" },
  { code: "2", name: "Deduções", nature: "RECEITA", analytic: false },
  { code: "2.1", name: "Devoluções e cancelamentos", nature: "RECEITA", analytic: true, parent: "2" },
  { code: "2.2", name: "Descontos concedidos", nature: "RECEITA", analytic: true, parent: "2" },
  { code: "3", name: "Custos", nature: "CUSTO", analytic: false },
  { code: "3.1", name: "Custo das mercadorias vendidas", nature: "CUSTO", analytic: true, parent: "3" },
  { code: "4", name: "Despesas", nature: "DESPESA", analytic: false },
  { code: "4.1", name: "Despesas administrativas", nature: "DESPESA", analytic: false, parent: "4" },
  { code: "4.1.1", name: "Salários e encargos", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.1.2", name: "Aluguel", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.1.3", name: "Energia e água", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.1.4", name: "Internet e telefone", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.1.5", name: "Materiais e limpeza", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.1.6", name: "Marketing e publicidade", nature: "DESPESA", analytic: true, parent: "4.1" },
  { code: "4.2", name: "Despesas comerciais", nature: "DESPESA", analytic: false, parent: "4" },
  { code: "4.2.1", name: "Taxas de meios de pagamento", nature: "DESPESA", analytic: true, parent: "4.2" },
  { code: "4.2.2", name: "Fretes e entregas", nature: "DESPESA", analytic: true, parent: "4.2" },
  { code: "4.9", name: "Outras despesas", nature: "DESPESA", analytic: true, parent: "4" },
];

const PAYMENT_METHODS: Array<{ name: string; kind: "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CREDITO_LOJA" | "OUTROS" }> = [
  { name: "Dinheiro", kind: "DINHEIRO" },
  { name: "Pix", kind: "PIX" },
  { name: "Cartão de débito", kind: "DEBITO" },
  { name: "Cartão de crédito", kind: "CREDITO" },
  { name: "Transferência", kind: "TRANSFERENCIA" },
  { name: "Crediário", kind: "CREDITO_LOJA" },
];

export type TenantDefaultsInput = {
  tenantId: string;
  branchId: string;
  demo?: boolean;
};

/**
 * Cria os padrões financeiros/operacionais de uma empresa: plano de contas,
 * conta de caixa, formas de pagamento, centro de custo e preferências.
 * Idempotente por empresa (não duplica registros existentes).
 */
export async function createTenantFinancialDefaults(
  tx: Prisma.TransactionClient,
  input: TenantDefaultsInput
) {
  const { tenantId, branchId } = input;

  // Plano de contas gerencial
  const codeToId = new Map<string, string>();
  const existingAccounts = await tx.chartAccount.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });

  if (existingAccounts.length === 0) {
    for (const account of [...CHART_OF_ACCOUNTS].sort((a, b) => a.code.localeCompare(b.code, "pt-BR"))) {
      const parentId = account.parent ? codeToId.get(account.parent) ?? null : null;
      const created = await tx.chartAccount.create({
        data: {
          tenantId,
          code: account.code,
          name: account.name,
          nature: account.nature,
          isAnalytic: account.analytic,
          parentId,
          level: account.code.split(".").length,
        },
      });
      codeToId.set(account.code, created.id);
    }
  } else {
    for (const account of existingAccounts) {
      codeToId.set(account.code, account.id);
    }
  }

  const cashAccount =
    (await tx.financialAccount.findFirst({
      where: { tenantId, type: "CAIXA" },
      select: { id: true },
    })) ??
    (await tx.financialAccount.create({
      data: {
        tenantId,
        branchId,
        name: "Caixa principal",
        type: "CAIXA",
        initialBalance: 0,
      },
      select: { id: true },
    }));

  const receivablesParent = codeToId.get("1.1") ?? null;
  const expenseParent = codeToId.get("4.9") ?? null;

  const paymentMethods = await tx.paymentMethod.count({ where: { tenantId } });
  if (paymentMethods === 0) {
    for (const [index, method] of PAYMENT_METHODS.entries()) {
      await tx.paymentMethod.create({
        data: {
          tenantId,
          name: method.name,
          kind: method.kind,
          financialAccountId: cashAccount.id,
          requiresCustomer: method.kind === "CREDITO_LOJA",
          sortOrder: index,
        },
      });
    }
  }

  const costCenter = await tx.costCenter.findFirst({ where: { tenantId, code: "GERAL" }, select: { id: true } });
  if (!costCenter) {
    await tx.costCenter.create({ data: { tenantId, code: "GERAL", name: "Geral" } });
  }

  const settingsCount = await tx.tenantSetting.count({ where: { tenantId } });
  if (settingsCount === 0) {
    const defaultSettings: Array<{ key: string; value: unknown; category: string }> = [
      { key: "receipt.width", value: "80", category: "pdv" },
      { key: "receipt.footer", value: "Obrigado pela preferência!", category: "pdv" },
      { key: "stock.allowNegative", value: false, category: "estoque" },
      { key: "sales.maxDiscountPercent", value: 10, category: "pdv" },
      { key: "sales.requireCustomerOnCredit", value: true, category: "pdv" },
      { key: "sales.defaultRevenueAccountId", value: receivablesParent, category: "financeiro" },
      { key: "sales.defaultExpenseAccountId", value: expenseParent, category: "financeiro" },
      { key: "company.demo", value: Boolean(input.demo), category: "sistema" },
    ];

    for (const setting of defaultSettings) {
      await tx.tenantSetting.create({
        data: {
          tenantId,
          key: setting.key,
          value: setting.value as Prisma.InputJsonValue,
          category: setting.category,
        },
      });
    }
  }

  return { cashAccountId: cashAccount.id, receivablesParent, expenseParent };
}

export type ProvisionInput = {
  name: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  planId?: string | null;
  trialDays?: number;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
  demo?: boolean;
  notes?: string | null;
};

/**
 * Cria uma empresa completa (filial matriz, perfis, admin, plano de contas,
 * conta financeira, formas de pagamento e preferências) em uma transação.
 */
export async function provisionTenant(input: ProvisionInput): Promise<{ tenantId: string; branchId: string; userId: string }> {
  const trialDays = input.trialDays ?? 14;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        legalName: input.legalName ?? null,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        planId: input.planId ?? null,
        notes: input.notes ?? null,
        trialEndsAt:
          trialDays > 0 ? new Date(Date.now() + trialDays * 86_400_000) : null,
      },
    });

    const branch = await tx.branch.create({
      data: {
        tenantId: tenant.id,
        code: "MATRIZ",
        name: "Matriz",
        isHeadquarters: true,
        status: "ATIVO",
      },
    });

    let adminRoleId: string | null = null;
    for (const def of DEFAULT_ROLES) {
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: def.name,
          description: def.description,
          permissions: def.permissions,
          system: true,
        },
      });
      if (def.name === "Administrador") adminRoleId = role.id;
    }

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        roleId: adminRoleId,
        name: input.adminName,
        email: input.adminEmail,
        passwordHash: input.adminPasswordHash,
        active: true,
      },
    });

    // Plano de contas, conta de caixa, formas de pagamento, centro de custo e preferências
    await createTenantFinancialDefaults(tx, { tenantId: tenant.id, branchId: branch.id, demo: input.demo });

    if (input.planId) {
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: input.planId,
          status: "TRIAL",
          trialEndsAt: trialDays > 0 ? new Date(Date.now() + trialDays * 86_400_000) : null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
    }

    return { tenantId: tenant.id, branchId: branch.id, userId: user.id };
  });

  return result;
}

export async function createTenantWithoutTransaction(input: ProvisionInput) {
  return provisionTenant(input);
}
