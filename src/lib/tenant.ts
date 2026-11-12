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

type AuthRow = {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  branchId: string | null;
  roleId: string | null;
  isPlatformAdmin: boolean;
  active: boolean;
  tenant_name: string | null;
  tenant_status: "ATIVO" | "SUSPENSO" | "CANCELADO" | null;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  branch_name: string | null;
  role_name: string | null;
  role_permissions: string[] | null;
  role_active: boolean | null;
};

/**
 * Carrega a sessão + usuário + empresa + perfil a cada requisição (cached).
 *
 * Usa uma única consulta com JOINs. O Prisma carrega cada relação em uma
 * consulta separada (~5 idas ao banco por requisição), e como o banco fica em
 * outra região cada ida custa dezenas de milissegundos. A logo da empresa
 * (`logoUrl`, que pode ter vários MB em data URL) também não é carregada aqui:
 * só os PDFs precisam dela e a buscam sob demanda.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const rows = await prisma.$queryRaw<AuthRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u."tenantId" AS "tenantId",
      u."branchId" AS "branchId",
      u."roleId" AS "roleId",
      u."isPlatformAdmin" AS "isPlatformAdmin",
      u.active,
      t.name AS tenant_name,
      t.status AS tenant_status,
      t."planId" AS plan_id,
      p.name AS plan_name,
      s.status AS subscription_status,
      b.name AS branch_name,
      r.name AS role_name,
      r.permissions AS role_permissions,
      r.active AS role_active
    FROM users u
    LEFT JOIN tenants t ON t.id = u."tenantId"
    LEFT JOIN plans p ON p.id = t."planId"
    LEFT JOIN subscriptions s ON s."tenantId" = t.id
    LEFT JOIN branches b ON b.id = u."branchId"
    LEFT JOIN roles r ON r.id = u."roleId"
    WHERE u.id = ${id}
    LIMIT 1
  `;

  const user = rows[0];
  if (!user || !user.active) return null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    tenantId: user.tenantId ?? "",
    tenantName: user.tenant_name ?? "",
    tenantStatus: user.tenant_status ?? "ATIVO",
    subscriptionStatus: user.subscription_status ?? null,
    planId: user.plan_id ?? null,
    planName: user.plan_name ?? null,
    branchId: user.branchId ?? null,
    branchName: user.branch_name ?? null,
    roleId: user.roleId ?? null,
    roleName: user.role_active === false ? null : (user.role_name ?? null),
    permissions: user.isPlatformAdmin
      ? ["*"]
      : user.role_active === false
        ? []
        : (user.role_permissions ?? []),
    isPlatformAdmin: user.isPlatformAdmin,
  };
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

/**
 * Guard do shell autenticado (layout de `(app)`).
 *
 * Difere de `requireTenant` em dois pontos, ambos necessários para evitar
 * redirecionamento em círculo:
 *  - libera o administrador da plataforma sem empresa, pois o painel `/admin`
 *    vive dentro do mesmo grupo de rotas;
 *  - não força `/assinatura`, pois essa página também usa este layout. Quem
 *    decide bloquear a operação é cada página, via `requireTenant`.
 */
export async function requireAppArea(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.isPlatformAdmin && !ctx.tenantId) return ctx;
  if (!ctx.tenantId) redirect("/forbidden");
  if (!tenantCanOperate(ctx)) redirect("/assinatura");
  return ctx;
}

/** Empresa autenticada, mesmo com assinatura bloqueada (usado em `/assinatura`). */
export async function requireTenantAccess(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.isPlatformAdmin && !ctx.tenantId) redirect("/admin");
  if (!ctx.tenantId) redirect("/forbidden");
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
