import "server-only";
import { prisma } from "@/lib/prisma";
import { assertPermission, type AuthContext } from "@/lib/tenant";
import { decryptConfig, encryptConfig } from "@/lib/crypto";
import { auditLog } from "@/services/audit.service";
import { createReceiptToken, getReceiptData } from "@/services/sales.service";
import { formatBRL } from "@/lib/money";
import { formatDateTimeBR, onlyDigits } from "@/lib/date";

export type WhatsAppTenantConfig = {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
  enabled?: boolean;
};

export type WhatsAppStatus = {
  configured: boolean;
  source: "environment" | "tenant" | "none";
  phoneNumberId: string | null;
  apiVersion: string;
  enabled: boolean;
  lastCheckAt: Date | null;
};

function envConfig(): WhatsAppTenantConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return {
    phoneNumberId,
    accessToken,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    enabled: true,
  };
}

function normalizePhone(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  throw new Error("Informe um WhatsApp válido com DDD.");
}

function mask(value: string): string {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}

export async function getWhatsAppStatus(ctx: AuthContext): Promise<WhatsAppStatus> {
  if (!ctx.isPlatformAdmin) assertPermission(ctx, "whatsapp.send");
  const integration = await prisma.integration.findUnique({
    where: { tenantId_provider: { tenantId: ctx.tenantId, provider: "WHATSAPP" } },
  });
  const fromEnv = envConfig();
  const tenantConfig = decryptConfig<WhatsAppTenantConfig>(integration?.config);
  if (fromEnv) {
    return {
      configured: true,
      source: "environment",
      phoneNumberId: fromEnv.phoneNumberId,
      apiVersion: fromEnv.apiVersion ?? "v21.0",
      enabled: true,
      lastCheckAt: integration?.lastCheckAt ?? null,
    };
  }
  if (tenantConfig?.phoneNumberId && tenantConfig.accessToken) {
    return {
      configured: true,
      source: "tenant",
      phoneNumberId: mask(tenantConfig.phoneNumberId),
      apiVersion: tenantConfig.apiVersion ?? "v21.0",
      enabled: integration?.enabled === true,
      lastCheckAt: integration?.lastCheckAt ?? null,
    };
  }
  return {
    configured: false,
    source: "none",
    phoneNumberId: null,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    enabled: false,
    lastCheckAt: integration?.lastCheckAt ?? null,
  };
}

export async function saveWhatsAppIntegration(
  ctx: AuthContext,
  raw: { phoneNumberId: string; accessToken: string; apiVersion?: string; enabled: boolean }
) {
  assertPermission(ctx, "settings.manage");
  const phoneNumberId = raw.phoneNumberId.trim();
  const accessToken = raw.accessToken.trim();
  if (!/^\d{5,30}$/.test(phoneNumberId)) {
    throw new Error("O ID do número de telefone da Meta deve conter apenas números.");
  }
  if (accessToken.length < 20) throw new Error("Token de acesso inválido.");
  const apiVersion = (raw.apiVersion?.trim() || "v21.0").replace(/^v?/, "v");

  await prisma.integration.upsert({
    where: { tenantId_provider: { tenantId: ctx.tenantId, provider: "WHATSAPP" } },
    update: {
      enabled: raw.enabled,
      config: encryptConfig({ phoneNumberId, accessToken, apiVersion }),
      status: raw.enabled ? "CONFIGURADO" : "DESATIVADO",
      lastCheckAt: new Date(),
    },
    create: {
      tenantId: ctx.tenantId,
      provider: "WHATSAPP",
      enabled: raw.enabled,
      config: encryptConfig({ phoneNumberId, accessToken, apiVersion }),
      status: raw.enabled ? "CONFIGURADO" : "DESATIVADO",
      lastCheckAt: new Date(),
    },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "integracoes",
    entity: "Integration",
    entityId: "WHATSAPP",
    description: "Configuração do WhatsApp Cloud API atualizada",
    newValues: { phoneNumberId: mask(phoneNumberId), enabled: raw.enabled },
  });
}

export async function disableWhatsApp(ctx: AuthContext) {
  assertPermission(ctx, "settings.manage");
  await prisma.integration.updateMany({
    where: { tenantId: ctx.tenantId, provider: "WHATSAPP" },
    data: { enabled: false, status: "DESATIVADO" },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "integracoes",
    entity: "Integration",
    entityId: "WHATSAPP",
    description: "Integração WhatsApp desativada",
  });
}

function receiptMessage(input: {
  companyName: string;
  documentNumber: string;
  createdAt: Date;
  total: number;
  isDemo: boolean;
  url: string;
}): string {
  return [
    `${input.companyName} — comprovante ${input.documentNumber}`,
    `Data: ${formatDateTimeBR(input.createdAt)}`,
    `Total: ${formatBRL(input.total)}`,
    input.isDemo ? "Documento de demonstração — não é documento fiscal." : "",
    `Comprovante: ${input.url}`,
    "Link pessoal e temporário. Não compartilhe com terceiros.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type ShareResult =
  | {
      mode: "manual";
      url: string;
      receiptUrl: string;
      phone: string;
      message: string;
      logId: string;
    }
  | {
      mode: "api";
      messageId: string;
      receiptUrl: string;
      phone: string;
      logId: string;
    };

/**
 * Compartilha o comprovante. Sem credenciais configuradas, NUNCA finge envio:
 * devolve um link wa.me para o operador enviar manualmente e registra o fato.
 */
export async function shareReceiptOnWhatsApp(
  ctx: AuthContext,
  saleId: string,
  rawPhone: string
): Promise<ShareResult> {
  assertPermission(ctx, "whatsapp.send");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: ctx.tenantId },
    select: { id: true, branchId: true, status: true, documentNumber: true },
  });
  if (!sale) throw new Error("Venda não encontrada.");
  if (sale.status === "CANCELADA") throw new Error("Não é possível compartilhar uma venda cancelada.");

  const receipt = await getReceiptData(ctx, saleId);
  if (!receipt) throw new Error("Comprovante indisponível.");
  const phone = normalizePhone(rawPhone);
  const { url: receiptUrl } = await createReceiptToken(ctx, saleId, 7);
  const message = receiptMessage({
    companyName: receipt.company.name,
    documentNumber: receipt.documentNumber,
    createdAt: receipt.createdAt,
    total: receipt.total,
    isDemo: receipt.isDemo,
    url: receiptUrl,
  });

  const integration = await prisma.integration.findUnique({
    where: { tenantId_provider: { tenantId: ctx.tenantId, provider: "WHATSAPP" } },
  });
  const config = envConfig() ?? decryptConfig<WhatsAppTenantConfig>(integration?.config);
  const canUseApi =
    config?.phoneNumberId &&
    config.accessToken &&
    (envConfig() !== null || integration?.enabled === true);

  if (!canUseApi) {
    const manualUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const log = await prisma.whatsAppLog.create({
      data: {
        tenantId: ctx.tenantId,
        saleId,
        phone,
        status: "MANUAL",
        provider: "wa.me",
        error: null,
        createdById: ctx.userId,
      },
    });
    await auditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: "CREATE",
      module: "whatsapp",
      entity: "WhatsAppLog",
      entityId: log.id,
      description: `Link manual de comprovante gerado para a venda ${sale.documentNumber}`,
    });
    return { mode: "manual", url: manualUrl, receiptUrl, phone, message, logId: log.id };
  }

  const apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || "v21.0";
  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { preview_url: true, body: message },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha de rede";
    const log = await prisma.whatsAppLog.create({
      data: {
        tenantId: ctx.tenantId,
        saleId,
        phone,
        status: "ERRO",
        provider: "cloud_api",
        error: detail.slice(0, 1000),
        createdById: ctx.userId,
      },
    });
    throw new Error(`Não foi possível enviar pelo WhatsApp (${detail}). Log ${log.id}.`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { messages?: Array<{ id?: string }>; error?: { message?: string } }
    | null;

  if (!response.ok) {
    const detail = payload?.error?.message ?? `HTTP ${response.status}`;
    const log = await prisma.whatsAppLog.create({
      data: {
        tenantId: ctx.tenantId,
        saleId,
        phone,
        status: "ERRO",
        provider: "cloud_api",
        error: detail.slice(0, 1000),
        createdById: ctx.userId,
      },
    });
    throw new Error(`O WhatsApp recusou o envio: ${detail}. Log ${log.id}.`);
  }

  const messageId = payload?.messages?.[0]?.id ?? "";
  const log = await prisma.whatsAppLog.create({
    data: {
      tenantId: ctx.tenantId,
      saleId,
      phone,
      status: "ENVIADO",
      provider: "cloud_api",
      messageId,
      createdById: ctx.userId,
    },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CONFIRM",
    module: "whatsapp",
    entity: "WhatsAppLog",
    entityId: log.id,
    description: `Comprovante da venda ${sale.documentNumber} enviado pelo WhatsApp Cloud API`,
  });

  return { mode: "api", messageId, receiptUrl, phone, logId: log.id };
}

export async function listWhatsAppLogs(ctx: AuthContext, limit = 50) {
  assertPermission(ctx, "whatsapp.send");
  return prisma.whatsAppLog.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, limit)),
    include: { sale: { select: { documentNumber: true } } },
  });
}
