import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

type AuditInput = {
  userId?: string | null;
  tenantId?: string | null;
  action: AuditAction;
  module: string;
  entity?: string | null;
  entityId?: string | null;
  description?: string | null;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

/** Registra auditoria. Nunca lança erro para não derrubar a operação de negócio. */
export async function auditLog(input: AuditInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        action: input.action,
        module: input.module,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        oldValues: input.oldValues ?? undefined,
        newValues: input.newValues ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] falha ao registrar log", error);
    return null;
  }
}
