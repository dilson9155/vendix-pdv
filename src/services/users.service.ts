import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertPermission, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { roleSchema, userSchema } from "@/lib/validation";

export async function listUsers(ctx: AuthContext) {
  assertPermission(ctx, "users.view");
  return prisma.user.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function listRoles(ctx: AuthContext) {
  assertPermission(ctx, "users.view");
  return prisma.role.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ system: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });
}

export async function listUserOptions(ctx: AuthContext) {
  assertPermission(ctx, "users.view");
  const [roles, branches] = await Promise.all([
    prisma.role.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, system: true },
    }),
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, status: "ATIVO", ...(ctx.branchId ? { id: ctx.branchId } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { roles, branches };
}

async function assertNotLastAdmin(userId: string, tenantId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { role: { select: { permissions: true } } },
  });
  if (!user) throw new Error("Usuário não encontrado.");
  const isAdmin = user.role?.permissions.includes("users.manage") ?? false;
  if (!isAdmin) return;
  const admins = await prisma.user.count({
    where: {
      tenantId,
      active: true,
      role: { permissions: { has: "users.manage" } },
    },
  });
  if (admins <= 1) {
    throw new Error(
      "Este é o último usuário com permissão de gerenciar usuários. Atribua a permissão a outro usuário antes."
    );
  }
}

export async function saveUser(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "users.manage");
  const input = userSchema.parse(raw);

  const role = await prisma.role.findFirst({
    where: { id: input.roleId, tenantId: ctx.tenantId, active: true },
  });
  if (!role) throw new Error("Perfil inválido para esta empresa.");

  if (input.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, tenantId: ctx.tenantId, status: "ATIVO" },
    });
    if (!branch) throw new Error("Unidade inválida para esta empresa.");
    if (ctx.branchId && ctx.branchId !== input.branchId) {
      throw new Error("Você só pode cadastrar usuários na sua unidade.");
    }
  }

  const email = input.email.toLowerCase().trim();
  const duplicate = await prisma.user.findFirst({
    where: { email, ...(input.id ? { id: { not: input.id } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new Error("Já existe um usuário com este e-mail.");

  if (input.id) {
    const existing = await prisma.user.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } });
    if (!existing) throw new Error("Usuário não encontrado.");
    if (existing.id === ctx.userId && !input.active) {
      throw new Error("Você não pode desativar o seu próprio acesso.");
    }
    if (!input.active && existing.active) await assertNotLastAdmin(existing.id, ctx.tenantId);

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        email,
        phone: input.phone ?? null,
        roleId: input.roleId,
        branchId: input.branchId || null,
        active: input.active,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
      },
    });

    if (input.password) {
      await prisma.passwordResetToken.updateMany({
        where: { userId: updated.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    }

    await auditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: "UPDATE",
      module: "usuarios",
      entity: "User",
      entityId: updated.id,
      description: `Usuário "${updated.name}" atualizado`,
      oldValues: { name: existing.name, active: existing.active, roleId: existing.roleId },
      newValues: { name: updated.name, active: updated.active, roleId: updated.roleId },
    });
    return { id: updated.id };
  }

  if (!input.password || input.password.length < 8) {
    throw new Error("Informe uma senha com ao menos 8 caracteres para o novo usuário.");
  }

  const [count, tenant] = await Promise.all([
    prisma.user.count({ where: { tenantId: ctx.tenantId, active: true } }),
    prisma.tenant.findUnique({ where: { id: ctx.tenantId }, include: { plan: true } }),
  ]);
  const max = tenant?.plan?.maxUsers ?? null;
  if (max !== null && count >= max) {
    throw new Error(`Seu plano permite até ${max} usuário(s). Fale com o suporte para ampliar.`);
  }

  const created = await prisma.user.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: input.branchId || null,
      roleId: input.roleId,
      name: input.name,
      email,
      phone: input.phone ?? null,
      passwordHash: await bcrypt.hash(input.password, 12),
      active: input.active,
    },
  });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "usuarios",
    entity: "User",
    entityId: created.id,
    description: `Usuário "${created.name}" criado`,
    newValues: { name: created.name, email: created.email, roleId: created.roleId },
  });
  return { id: created.id };
}

export async function setUserActive(
  ctx: AuthContext,
  userId: string,
  active: boolean
): Promise<void> {
  assertPermission(ctx, "users.manage");
  if (userId === ctx.userId) throw new Error("Você não pode alterar o seu próprio acesso.");
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId: ctx.tenantId } });
  if (!user) throw new Error("Usuário não encontrado.");
  if (!active) await assertNotLastAdmin(user.id, ctx.tenantId);

  await prisma.user.update({ where: { id: user.id }, data: { active } });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "usuarios",
    entity: "User",
    entityId: user.id,
    description: `Usuário "${user.name}" ${active ? "reativado" : "desativado"}`,
  });
}

export async function resetUserPassword(
  ctx: AuthContext,
  userId: string,
  password: string
): Promise<void> {
  assertPermission(ctx, "users.manage");
  if (password.length < 8) throw new Error("A senha deve ter ao menos 8 caracteres.");
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId: ctx.tenantId } });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "usuarios",
    entity: "User",
    entityId: user.id,
    description: `Senha de "${user.name}" redefinida pelo administrador`,
  });
}

export async function saveRole(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "users.manage");
  const input = roleSchema.parse(raw);
  const invalid = input.permissions.filter((p) => !ALL_PERMISSIONS.includes(p as never));
  if (invalid.length) throw new Error("Permissão inválida informada.");

  if (input.id) {
    const existing = await prisma.role.findFirst({
      where: { id: input.id, tenantId: ctx.tenantId },
    });
    if (!existing) throw new Error("Perfil não encontrado.");
    if (existing.system) {
      throw new Error("Perfis padrão não podem ser alterados. Crie um perfil personalizado.");
    }
    const updated = await prisma.role.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissions,
      },
    });
    await auditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: "UPDATE",
      module: "usuarios",
      entity: "Role",
      entityId: updated.id,
      description: `Perfil "${updated.name}" atualizado`,
      oldValues: { permissions: existing.permissions },
      newValues: { permissions: updated.permissions },
    });
    return { id: updated.id };
  }

  const created = await prisma.role.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      description: input.description ?? null,
      permissions: input.permissions,
      system: false,
    },
  });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    module: "usuarios",
    entity: "Role",
    entityId: created.id,
    description: `Perfil "${created.name}" criado`,
  });
  return { id: created.id };
}

export async function deleteRole(ctx: AuthContext, roleId: string): Promise<void> {
  assertPermission(ctx, "users.manage");
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId: ctx.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new Error("Perfil não encontrado.");
  if (role.system) throw new Error("Perfis padrão não podem ser excluídos.");
  if (role._count.users > 0) {
    throw new Error("Este perfil possui usuários vinculados. Mova-os para outro perfil antes.");
  }
  await prisma.role.delete({ where: { id: role.id } });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "DELETE",
    module: "usuarios",
    entity: "Role",
    entityId: role.id,
    description: `Perfil "${role.name}" excluído`,
  });
}
