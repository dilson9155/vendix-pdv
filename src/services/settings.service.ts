import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { settingsSchema, type SettingsInput } from "@/lib/validation";
import { z } from "zod";

export type TenantPreferences = {
  receiptWidth: "58" | "80";
  receiptFooter: string;
  allowNegativeStock: boolean;
  maxDiscountPercent: number;
  requireCustomerOnCredit: boolean;
  defaultRevenueAccountId: string | null;
  defaultExpenseAccountId: string | null;
  isDemo: boolean;
};

const DEFAULTS: TenantPreferences = {
  receiptWidth: "80",
  receiptFooter: "Obrigado pela preferência!",
  allowNegativeStock: false,
  maxDiscountPercent: 10,
  requireCustomerOnCredit: true,
  defaultRevenueAccountId: null,
  defaultExpenseAccountId: null,
  isDemo: false,
};

export async function getTenantPreferences(tenantId: string): Promise<TenantPreferences> {
  const rows = await prisma.tenantSetting.findMany({ where: { tenantId } });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const bool = (key: string, fallback: boolean) =>
    typeof map.get(key) === "boolean" ? (map.get(key) as boolean) : fallback;
  const str = (key: string, fallback: string) =>
    typeof map.get(key) === "string" ? (map.get(key) as string) : fallback;
  const num = (key: string, fallback: number) =>
    typeof map.get(key) === "number" ? (map.get(key) as number) : fallback;

  return {
    receiptWidth: str("receipt.width", DEFAULTS.receiptWidth) === "58" ? "58" : "80",
    receiptFooter: str("receipt.footer", DEFAULTS.receiptFooter),
    allowNegativeStock: bool("stock.allowNegative", DEFAULTS.allowNegativeStock),
    maxDiscountPercent: num("sales.maxDiscountPercent", DEFAULTS.maxDiscountPercent),
    requireCustomerOnCredit: bool(
      "sales.requireCustomerOnCredit",
      DEFAULTS.requireCustomerOnCredit
    ),
    defaultRevenueAccountId:
      typeof map.get("sales.defaultRevenueAccountId") === "string"
        ? (map.get("sales.defaultRevenueAccountId") as string)
        : null,
    defaultExpenseAccountId:
      typeof map.get("sales.defaultExpenseAccountId") === "string"
        ? (map.get("sales.defaultExpenseAccountId") as string)
        : null,
    isDemo: bool("company.demo", DEFAULTS.isDemo),
  };
}

async function setSetting(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string,
  value: Prisma.InputJsonValue,
  category: string
) {
  await tx.tenantSetting.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { value, category },
    create: { tenantId, key, value, category },
  });
}

export async function getCompany(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: { orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }] },
      plan: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!tenant) throw new Error("Empresa não encontrada.");
  return tenant;
}

export async function updateCompanySettings(ctx: AuthContext, raw: unknown): Promise<void> {
  assertPermission(ctx, "settings.manage");
  const input: SettingsInput = settingsSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        name: input.tradeName,
        legalName: input.legalName ?? null,
        document: input.document ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        zipCode: input.zipCode ?? null,
      },
    });
    await setSetting(tx, ctx.tenantId, "receipt.width", input.receiptWidth, "pdv");
    await setSetting(
      tx,
      ctx.tenantId,
      "receipt.footer",
      input.receiptFooter ?? DEFAULTS.receiptFooter,
      "pdv"
    );
    await setSetting(tx, ctx.tenantId, "stock.allowNegative", input.allowNegativeStock, "estoque");
    await setSetting(
      tx,
      ctx.tenantId,
      "sales.maxDiscountPercent",
      input.maxDiscountPercent,
      "pdv"
    );
    await setSetting(
      tx,
      ctx.tenantId,
      "sales.requireCustomerOnCredit",
      input.requireCustomerOnCredit,
      "pdv"
    );
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "configuracoes",
    entity: "Tenant",
    entityId: ctx.tenantId,
    description: "Configurações da empresa atualizadas",
  });
}

// ---------------------------------------------------------------------------
// Filiais / unidades
// ---------------------------------------------------------------------------

export const branchInputSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Informe o código.").max(20),
  name: z.string().trim().min(1, "Informe o nome.").max(80),
  document: z.string().trim().max(20).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  zipCode: z.string().trim().max(9).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().max(160).optional(),
  active: z.boolean().default(true),
});

export type BranchInput = z.infer<typeof branchInputSchema>;

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }],
  });
}

export async function saveBranch(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "settings.manage");
  const input = branchInputSchema.parse(raw);

  if (!input.id) {
    const [count, tenant] = await Promise.all([
      prisma.branch.count({ where: { tenantId: ctx.tenantId } }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        include: { plan: true },
      }),
    ]);
    const max = tenant?.plan?.maxBranches ?? null;
    if (max !== null && count >= max) {
      throw new Error(
        `Seu plano permite até ${max} unidade(s). Fale com o suporte para ampliar.`
      );
    }
  }

  const existing = input.id
    ? await prisma.branch.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Unidade não encontrada.");

  const data = {
    tenantId: ctx.tenantId,
    code: input.code.toUpperCase(),
    name: input.name,
    document: input.document?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zipCode: input.zipCode?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    status: input.active ? ("ATIVO" as const) : ("INATIVO" as const),
  };

  const saved = existing
    ? await prisma.branch.update({ where: { id: existing.id }, data })
    : await prisma.branch.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "configuracoes",
    entity: "Branch",
    entityId: saved.id,
    description: `Unidade "${saved.name}" ${existing ? "atualizada" : "criada"}`,
  });

  return { id: saved.id };
}
