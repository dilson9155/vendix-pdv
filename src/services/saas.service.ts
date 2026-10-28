import "server-only";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { provisionTenant } from "@/services/provisioning.service";
import { dec, money, toNumber } from "@/lib/money";
import { endOfBusinessDay, startOfBusinessDay, todayISO } from "@/lib/date";
import {
  planSchema,
  platformChargeSchema,
  tenantSchema,
} from "@/lib/validation";
import { z } from "zod";

function assertPlatform(ctx: AuthContext): void {
  if (!ctx.isPlatformAdmin) throw new Error("Acesso restrito ao administrador da plataforma.");
}

export async function listPlans(includeInactive = false) {
  return prisma.plan.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { price: "asc" }],
    include: { _count: { select: { tenants: true, subscriptions: true } } },
  });
}

export async function savePlan(ctx: AuthContext, raw: unknown) {
  assertPlatform(ctx);
  const input = planSchema.parse(raw);
  const data = {
    code: input.code.toUpperCase(),
    name: input.name,
    description: input.description ?? null,
    price: money(input.price),
    trialDays: input.trialDays,
    maxUsers: input.maxUsers ?? null,
    maxBranches: input.maxBranches ?? null,
    maxProducts: input.maxProducts ?? null,
  };
  const existing = input.id
    ? await prisma.plan.findUnique({ where: { id: input.id } })
    : null;
  if (input.id && !existing) throw new Error("Plano não encontrado.");

  const saved = existing
    ? await prisma.plan.update({ where: { id: existing.id }, data })
    : await prisma.plan.create({ data });
  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: existing ? "UPDATE" : "CREATE",
    module: "plataforma",
    entity: "Plan",
    entityId: saved.id,
    description: `Plano "${saved.name}" ${existing ? "atualizado" : "criado"}`,
  });
  return { id: saved.id };
}

export type TenantFilters = {
  q?: string;
  status?: "ATIVO" | "SUSPENSO" | "CANCELADO";
  page?: number;
};

export async function listTenants(ctx: AuthContext, filters: TenantFilters = {}) {
  assertPlatform(ctx);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const where: Prisma.TenantWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { document: { contains: filters.q } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan: true,
        subscription: { include: { plan: true } },
        _count: { select: { users: true, branches: true, products: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);
  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getTenant(ctx: AuthContext, tenantId: string) {
  assertPlatform(ctx);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      subscription: { include: { plan: true } },
      branches: { orderBy: { name: "asc" } },
      charges: { orderBy: { dueDate: "desc" }, take: 12 },
      _count: { select: { users: true, products: true, sales: true } },
    },
  });
  if (!tenant) throw new Error("Empresa não encontrada.");
  return tenant;
}

export async function getPlatformOverview(ctx: AuthContext) {
  assertPlatform(ctx);
  const today = new Date();
  const [tenants, activeTenants, trialTenants, plans, charges, recent] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ATIVO" } }),
    prisma.tenant.count({ where: { subscription: { status: "TRIAL" } } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    prisma.tenantCharge.findMany({
      where: { status: { in: ["PENDENTE", "VENCIDA"] } },
      select: { amount: true, dueDate: true, status: true },
    }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        plan: { select: { name: true } },
        subscription: { select: { status: true } },
      },
    }),
  ]);

  let mrr = dec(0);
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: "ATIVA" },
    select: { plan: { select: { price: true } } },
  });
  for (const sub of activeSubscriptions) mrr = mrr.plus(sub.plan.price);

  let overdue = dec(0);
  let pending = dec(0);
  for (const charge of charges) {
    if (charge.status === "VENCIDA" || charge.dueDate < today) overdue = overdue.plus(charge.amount);
    else pending = pending.plus(charge.amount);
  }

  return {
    tenants,
    activeTenants,
    trialTenants,
    mrr: toNumber(mrr),
    overdueCharges: toNumber(overdue),
    pendingCharges: toNumber(pending),
    activePlans: plans.length,
    recent,
  };
}

export async function createTenant(ctx: AuthContext, raw: unknown) {
  assertPlatform(ctx);
  const input = tenantSchema.parse(raw);
  const plan = await prisma.plan.findFirst({ where: { id: input.planId, active: true } });
  if (!plan) throw new Error("Plano inválido ou inativo.");
  const duplicate = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (duplicate) throw new Error("Já existe um usuário com o e-mail do responsável.");

  const result = await provisionTenant({
    name: input.name,
    legalName: input.legalName,
    document: input.document,
    email: input.email,
    phone: input.phone,
    planId: plan.id,
    trialDays: input.trialDays,
    adminName: input.adminName,
    adminEmail: input.adminEmail,
    adminPasswordHash: await bcrypt.hash(input.adminPassword, 12),
    notes: "Empresa criada pelo painel da plataforma.",
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "CREATE",
    module: "plataforma",
    entity: "Tenant",
    entityId: result.tenantId,
    description: `Empresa "${input.name}" provisionada no plano ${plan.name}`,
  });
  return result;
}

export async function setTenantStatus(
  ctx: AuthContext,
  tenantId: string,
  status: "ATIVO" | "SUSPENSO" | "CANCELADO",
  reason?: string
) {
  assertPlatform(ctx);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Empresa não encontrada.");

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { status } });
    if (status === "ATIVO") {
      await tx.subscription.updateMany({
        where: { tenantId, status: { in: ["SUSPENSA", "VENCIDA"] } },
        data: { status: "ATIVA" },
      });
    } else if (status === "SUSPENSO") {
      await tx.subscription.updateMany({ where: { tenantId }, data: { status: "SUSPENSA" } });
    } else {
      await tx.subscription.updateMany({
        where: { tenantId },
        data: { status: "CANCELADA", canceledAt: new Date(), canceledReason: reason ?? null },
      });
    }
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: status === "ATIVO" ? "UPDATE" : "CANCEL",
    module: "plataforma",
    entity: "Tenant",
    entityId: tenantId,
    description: `Status da empresa "${tenant.name}" alterado para ${status}${reason ? ` — ${reason}` : ""}`,
    oldValues: { status: tenant.status },
    newValues: { status },
  });
}

export async function updateSubscription(ctx: AuthContext, raw: unknown) {
  assertPlatform(ctx);
  const input = z
    .object({
      tenantId: z.string().min(1),
      planId: z.string().min(1),
      status: z.enum(["TRIAL", "ATIVA", "VENCIDA", "SUSPENSA", "CANCELADA"]),
      trialEndsAt: z.string().optional(),
      currentPeriodEnd: z.string().optional(),
    })
    .parse(raw);
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: input.tenantId }, include: { subscription: true } }),
    prisma.plan.findUnique({ where: { id: input.planId } }),
  ]);
  if (!tenant) throw new Error("Empresa não encontrada.");
  if (!plan || !plan.active) throw new Error("Plano inválido.");

  const data = {
    planId: plan.id,
    status: input.status,
    trialEndsAt: input.trialEndsAt ? new Date(`${input.trialEndsAt}T12:00:00-03:00`) : null,
    currentPeriodEnd: input.currentPeriodEnd
      ? new Date(`${input.currentPeriodEnd}T12:00:00-03:00`)
      : null,
  };

  await prisma.$transaction(async (tx) => {
    if (tenant.subscription) {
      await tx.subscription.update({ where: { tenantId: tenant.id }, data });
    } else {
      await tx.subscription.create({
        data: { tenantId: tenant.id, ...data, startedAt: new Date() },
      });
    }
    await tx.tenant.update({ where: { id: tenant.id }, data: { planId: plan.id } });
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "UPDATE",
    module: "plataforma",
    entity: "Subscription",
    entityId: tenant.subscription?.id ?? tenant.id,
    description: `Assinatura de "${tenant.name}" alterada para ${plan.name} / ${input.status}`,
  });
}

export async function listCharges(ctx: AuthContext, filters: { status?: string } = {}) {
  assertPlatform(ctx);
  return prisma.tenantCharge.findMany({
    where: filters.status ? { status: filters.status as never } : {},
    orderBy: [{ dueDate: "desc" }],
    take: 100,
    include: { tenant: { select: { id: true, name: true } }, plan: { select: { name: true } } },
  });
}

export async function createCharge(ctx: AuthContext, raw: unknown) {
  assertPlatform(ctx);
  const input = platformChargeSchema.parse(raw);
  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
  if (!tenant) throw new Error("Empresa não encontrada.");
  const charge = await prisma.tenantCharge.create({
    data: {
      tenantId: tenant.id,
      description: input.description,
      referenceMonth: input.referenceMonth,
      amount: money(input.amount),
      dueDate: new Date(`${input.dueDate}T12:00:00-03:00`),
      notes: input.notes ?? null,
    },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "CREATE",
    module: "plataforma",
    entity: "TenantCharge",
    entityId: charge.id,
    description: `Cobrança "${charge.description}" criada para ${tenant.name}`,
  });
  return { id: charge.id };
}

export async function settleCharge(ctx: AuthContext, chargeId: string) {
  assertPlatform(ctx);
  const charge = await prisma.tenantCharge.findUnique({ where: { id: chargeId } });
  if (!charge) throw new Error("Cobrança não encontrada.");
  if (charge.status === "PAGA") throw new Error("Cobrança já está paga.");
  await prisma.tenantCharge.update({
    where: { id: charge.id },
    data: { status: "PAGA", paidAt: new Date() },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "CONFIRM",
    module: "plataforma",
    entity: "TenantCharge",
    entityId: charge.id,
    description: `Cobrança "${charge.description}" marcada como paga`,
  });
}

export async function cancelCharge(ctx: AuthContext, chargeId: string) {
  assertPlatform(ctx);
  const charge = await prisma.tenantCharge.findUnique({ where: { id: chargeId } });
  if (!charge) throw new Error("Cobrança não encontrada.");
  if (charge.status === "PAGA") throw new Error("Cobrança paga não pode ser cancelada.");
  await prisma.tenantCharge.update({ where: { id: charge.id }, data: { status: "CANCELADA" } });
  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "CANCEL",
    module: "plataforma",
    entity: "TenantCharge",
    entityId: charge.id,
    description: `Cobrança "${charge.description}" cancelada`,
  });
}

export async function listNotices(ctx: AuthContext) {
  assertPlatform(ctx);
  return prisma.platformNotice.findMany({ orderBy: [{ active: "desc" }, { publishedAt: "desc" }] });
}

export const noticeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Informe o título.").max(120),
  message: z.string().trim().min(1, "Informe a mensagem.").max(4000),
  level: z.enum(["INFO", "ALERTA", "URGENTE"]).default("INFO"),
  active: z.boolean().default(true),
  expiresAt: z.string().optional(),
});

export async function saveNotice(ctx: AuthContext, raw: unknown) {
  assertPlatform(ctx);
  const input = noticeSchema.parse(raw);
  const data = {
    title: input.title,
    message: input.message,
    level: input.level,
    active: input.active,
    expiresAt: input.expiresAt
      ? new Date(`${input.expiresAt}T23:59:59-03:00`)
      : null,
  };
  const saved = input.id
    ? await prisma.platformNotice.update({ where: { id: input.id }, data })
    : await prisma.platformNotice.create({ data });
  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: input.id ? "UPDATE" : "CREATE",
    module: "plataforma",
    entity: "PlatformNotice",
    entityId: saved.id,
    description: `Aviso "${saved.title}" ${input.id ? "atualizado" : "criado"}`,
  });
  return { id: saved.id };
}

export async function listPlatformAudit(ctx: AuthContext, limit = 100) {
  assertPlatform(ctx);
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: {
      tenant: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

export async function listActiveNotices() {
  const now = new Date();
  return prisma.platformNotice.findMany({
    where: {
      active: true,
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: [{ level: "desc" }, { publishedAt: "desc" }],
    take: 5,
  });
}

export async function platformChargeDefaults() {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ATIVO" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, plan: { select: { id: true, price: true } } },
  });
  const plans = await listPlans(false);
  return {
    tenants,
    plans,
    today: todayISO(),
    monthStart: `${todayISO().slice(0, 7)}-01`,
    periodStart: startOfBusinessDay(),
    periodEnd: endOfBusinessDay(),
  };
}
