import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthContext = {
  userId: string;
  name: string;
  email: string;
  tenantId: string;
  tenantName: string;
  tenantStatus: "ATIVO" | "SUSPENSO" | "CANCELADO";
  subscriptionStatus: string | null;
  planId: string | null;
  planName: string | null;
  branchId: string | null;
  branchName: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  isPlatformAdmin: boolean;
};

/** Carrega a sessão + usuário + empresa + perfil a cada requisição (cached). */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tenant: { include: { subscription: true, plan: true } },
      branch: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, permissions: true, active: true } },
    },
  });

  if (!user || !user.active) return null;

  const context: AuthContext = {
    userId: user.id,
    name: user.name,
    email: user.email,
    tenantId: user.tenantId ?? "",
    tenantName: user.tenant?.name ?? "",
    tenantStatus: user.tenant?.status ?? "ATIVO",
    subscriptionStatus: user.tenant?.subscription?.status ?? null,
    planId: user.tenant?.planId ?? null,
    planName: user.tenant?.plan?.name ?? null,
    branchId: user.branchId ?? null,
    branchName: user.branch?.name ?? null,
    roleId: user.roleId ?? null,
    roleName: user.role?.active === false ? null : (user.role?.name ?? null),
    permissions:
      user.isPlatformAdmin
        ? ["*"]
        : user.role?.active === false
          ? []
          : (user.role?.permissions ?? []),
    isPlatformAdmin: user.isPlatformAdmin,
  };

  return context;
});

export function hasPermission(ctx: AuthContext, permission: string): boolean {
  return ctx.permissions.includes("*") || ctx.permissions.includes(permission);
}

export function hasAnyPermission(ctx: AuthContext, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

const BLOCKED_SUBSCRIPTIONS = new Set(["SUSPENSA", "CANCELADA", "VENCIDA"]);

/** Verdadeiro quando a empresa pode operar (ativa e sem bloqueio de assinatura). */
export function tenantCanOperate(ctx: AuthContext): boolean {
  if (ctx.isPlatformAdmin) return true;
  if (ctx.tenantStatus !== "ATIVO") return false;
  if (ctx.subscriptionStatus && BLOCKED_SUBSCRIPTIONS.has(ctx.subscriptionStatus)) {
    return false;
  }
  return true;
}

/** Guard principal da área da empresa. */
export async function requireTenant(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.isPlatformAdmin && !ctx.tenantId) redirect("/admin");
  if (!ctx.tenantId) redirect("/forbidden");
  if (!tenantCanOperate(ctx)) redirect("/assinatura");
  return ctx;
}

export async function requirePermission(permission: string): Promise<AuthContext> {
  const ctx = await requireTenant();
  if (!hasPermission(ctx, permission)) redirect("/forbidden");
  return ctx;
}

export async function requireAnyPermission(permissions: string[]): Promise<AuthContext> {
  const ctx = await requireTenant();
  if (!hasAnyPermission(ctx, permissions)) redirect("/forbidden");
  return ctx;
}

/** Guard do painel da plataforma (SaaS). */
export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isPlatformAdmin) redirect("/forbidden");
  return ctx;
}

/**
 * Autorização para operações em lote/relatórios: falha fechado.
 * Não redireciona — devolve erro para ser tratado pela camada chamadora.
 */
export function assertPermission(ctx: AuthContext, permission: string): void {
  if (!hasPermission(ctx, permission)) {
    throw new Error("Você não tem permissão para executar esta operação.");
  }
}

/** Escopo de filial: usuário restrito nunca acessa outra filial. */
export function assertBranchAccess(ctx: AuthContext, branchId: string | null | undefined): void {
  if (!branchId) return;
  if (ctx.branchId && ctx.branchId !== branchId) {
    throw new Error("Você não tem acesso a esta unidade.");
  }
}

/** Filtro Prisma por filial, validando a filial solicitada. */
export function branchFilter(
  ctx: AuthContext,
  requested?: string | null
): { branchId?: string | { in: string[] } } {
  if (requested) {
    if (ctx.branchId && ctx.branchId !== requested) {
      return { branchId: "__none__" };
    }
    return { branchId: requested };
  }
  if (ctx.branchId) return { branchId: ctx.branchId };
  return {};
}

export function requestIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}
