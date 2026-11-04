import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { platformConfigSchema } from "@/lib/validation";
import { buildPixPayload, detectPixKeyType, type PixKeyType } from "@/lib/pix";
import { formatDateBR, startOfBusinessDay } from "@/lib/date";

function assertPlatform(ctx: AuthContext): void {
  if (!ctx.isPlatformAdmin) throw new Error("Acesso restrito ao administrador da plataforma.");
}

export type BillingConfig = {
  id: string;
  pixKey: string | null;
  pixKeyType: string | null;
  pixBeneficiary: string | null;
  pixCity: string | null;
  boletoInstructions: string | null;
  supportWhatsapp: string | null;
  billingDueDay: number;
  graceDays: number;
  autoSuspend: boolean;
  updatedAt: Date;
  updatedById: string | null;
};

/**
 * Configuração única de recebimento da plataforma. Quando ainda não foi
 * salva, devolve os padrões para que as telas funcionem sem seed manual.
 */
export async function getBillingConfig(): Promise<BillingConfig> {
  const config = await prisma.platformConfig.findUnique({ where: { id: "default" } });
  if (config) return config;

  return {
    id: "default",
    pixKey: null,
    pixKeyType: null,
    pixBeneficiary: null,
    pixCity: null,
    boletoInstructions: null,
    supportWhatsapp: null,
    billingDueDay: 10,
    graceDays: 5,
    autoSuspend: false,
    updatedAt: new Date(),
    updatedById: null,
  };
}

export async function saveBillingConfig(ctx: AuthContext, raw: unknown): Promise<void> {
  assertPlatform(ctx);
  const input = platformConfigSchema.parse(raw);
  const pixKey = input.pixKey?.trim() || null;

  await prisma.platformConfig.upsert({
    where: { id: "default" },
    update: {
      pixKey,
      pixKeyType: pixKey ? (input.pixKeyType ?? detectPixKeyType(pixKey)) : null,
      pixBeneficiary: input.pixBeneficiary?.trim() || null,
      pixCity: input.pixCity?.trim() || null,
      boletoInstructions: input.boletoInstructions?.trim() || null,
      supportWhatsapp: input.supportWhatsapp?.trim() || null,
      billingDueDay: input.billingDueDay,
      graceDays: input.graceDays,
      autoSuspend: input.autoSuspend,
      updatedById: ctx.userId,
    },
    create: {
      id: "default",
      pixKey,
      pixKeyType: pixKey ? (input.pixKeyType ?? detectPixKeyType(pixKey)) : null,
      pixBeneficiary: input.pixBeneficiary?.trim() || null,
      pixCity: input.pixCity?.trim() || null,
      boletoInstructions: input.boletoInstructions?.trim() || null,
      supportWhatsapp: input.supportWhatsapp?.trim() || null,
      billingDueDay: input.billingDueDay,
      graceDays: input.graceDays,
      autoSuspend: input.autoSuspend,
      updatedById: ctx.userId,
    },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "UPDATE",
    module: "plataforma",
    entity: "PlatformConfig",
    entityId: "default",
    description: "Configuração de recebimento da plataforma atualizada",
    newValues: {
      pixKeyType: pixKey ? (input.pixKeyType ?? detectPixKeyType(pixKey)) : null,
      billingDueDay: input.billingDueDay,
      graceDays: input.graceDays,
      autoSuspend: input.autoSuspend,
    },
  });
}

export type PixChargeSource = {
  amount: { toString(): string } | string | number;
  publicToken: string;
  description?: string | null;
  pixKey?: string | null;
  pixBeneficiary?: string | null;
  pixCity?: string | null;
};

export type PixChargeData = {
  key: string;
  keyType: PixKeyType;
  beneficiary: string;
  city: string;
  payload: string;
};

/**
 * Monta o PIX de uma cobrança. A chave gravada na cobrança tem prioridade
 * (snapshot da emissão); cobranças antigas usam a configuração atual.
 */
export function pixForCharge(charge: PixChargeSource, config: BillingConfig): PixChargeData | null {
  const key = charge.pixKey?.trim() || config.pixKey?.trim();
  if (!key) return null;

  const beneficiary = charge.pixBeneficiary?.trim() || config.pixBeneficiary?.trim() || "VENDIX";
  const city = charge.pixCity?.trim() || config.pixCity?.trim() || "SAO PAULO";
  const amount = Number(charge.amount.toString());
  const txid = `VX${charge.publicToken.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)}`;

  return {
    key,
    keyType: detectPixKeyType(key),
    beneficiary,
    city,
    payload: buildPixPayload({
      key,
      amount,
      merchantName: beneficiary,
      merchantCity: city,
      txid,
    }),
  };
}

export async function getPublicCharge(token: string) {
  const charge = await prisma.tenantCharge.findUnique({
    where: { publicToken: token },
    include: {
      tenant: { select: { name: true, email: true, phone: true } },
      plan: { select: { name: true } },
    },
  });
  if (!charge) return null;

  const config = await getBillingConfig();
  return {
    charge,
    config,
    pix: charge.method === "PIX" ? pixForCharge(charge, config) : null,
  };
}

/** Cobranças da própria loja (área autenticada do tenant). */
export async function listTenantCharges(tenantId: string) {
  return prisma.tenantCharge.findMany({
    where: { tenantId },
    orderBy: [{ dueDate: "desc" }],
    take: 36,
  });
}

/** Marca como VENCIDA toda cobrança pendente com vencimento anterior a hoje. */
export async function markOverdueCharges(): Promise<number> {
  const result = await prisma.tenantCharge.updateMany({
    where: {
      status: "PENDENTE",
      dueDate: { lt: startOfBusinessDay() },
    },
    data: { status: "VENCIDA" },
  });
  return result.count;
}

/**
 * Rotina diária de cobrança:
 *  1. atualiza cobranças vencidas;
 *  2. se `autoSuspend` estiver ligado, suspende lojas com mensalidade vencida
 *     além dos dias de carência configurados.
 * É idempotente e pode ser chamada pelo cron da Vercel ou pelo painel.
 */
export async function runBillingEnforcement(
  ctx?: Pick<AuthContext, "userId">
): Promise<{ overdue: number; suspended: number }> {
  const overdue = await markOverdueCharges();
  const config = await getBillingConfig();
  let suspended = 0;

  if (config.autoSuspend) {
    const cutoff = new Date(startOfBusinessDay());
    cutoff.setDate(cutoff.getDate() - config.graceDays);

    const overdueCharges = await prisma.tenantCharge.findMany({
      where: {
        status: "VENCIDA",
        dueDate: { lt: cutoff },
        tenant: { status: "ATIVO" },
      },
      select: { tenantId: true },
      distinct: ["tenantId"],
    });

    for (const item of overdueCharges) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: item.tenantId },
        select: { id: true, name: true, status: true },
      });
      if (!tenant || tenant.status !== "ATIVO") continue;

      await prisma.$transaction(async (tx) => {
        await tx.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENSO" } });
        await tx.subscription.updateMany({
          where: { tenantId: tenant.id },
          data: { status: "SUSPENSA" },
        });
      });
      suspended += 1;

      await auditLog({
        userId: ctx?.userId ?? null,
        tenantId: null,
        action: "CANCEL",
        module: "plataforma",
        entity: "Tenant",
        entityId: tenant.id,
        description: `Loja "${tenant.name}" suspensa automaticamente por inadimplência (carência de ${config.graceDays} dia(s))`,
        oldValues: { status: "ATIVO" },
        newValues: { status: "SUSPENSO" },
      });
    }
  }

  return { overdue, suspended };
}

/** Texto pronto para o lembrete de cobrança enviado por WhatsApp. */
export function chargeReminderMessage(input: {
  tenantName: string;
  description: string;
  amount: string;
  dueDate: Date | string;
  paymentUrl: string;
  pixKey?: string | null;
}): string {
  const lines = [
    `Olá, ${input.tenantName}!`,
    "",
    `Sua mensalidade "${input.description}" no valor de ${input.amount} vence em ${formatDateBR(input.dueDate)}.`,
    "",
    "Pague pelo link (PIX com QR Code ou boleto):",
    input.paymentUrl,
  ];
  if (input.pixKey) lines.push("", `Chave PIX: ${input.pixKey}`);
  return lines.join("\n");
}
