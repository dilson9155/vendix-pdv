import type { Metadata } from "next";
import { requirePermission } from "@/lib/tenant";
import { listUserOptions, listUsers, listRoles } from "@/services/users.service";
import { UsersManager } from "@/components/users/users-manager";
import type { ManagedUser } from "@/components/users/users-manager";

export const metadata: Metadata = { title: "Usuários e perfis" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const ctx = await requirePermission("users.view");
  const [users, roles, options] = await Promise.all([listUsers(ctx), listRoles(ctx), listUserOptions(ctx)]);

  const managed: ManagedUser[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    role: user.role,
    branch: user.branch,
  }));

  return <UsersManager users={managed} roles={roles} branches={options.branches} />;
}
