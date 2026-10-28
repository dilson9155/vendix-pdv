"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { InlineAction } from "@/components/forms/form-kit";
import { UserDialog, type UserDialogOption } from "@/components/users/user-dialog";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/date";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { toggleUserAction } from "@/app/actions/settings.actions";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  role?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
};

export function UsersManager({
  users,
  roles,
  branches,
}: {
  users: ManagedUser[];
  roles: UserDialogOption[];
  branches: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    active: boolean;
    roleId: string | null;
  } | undefined>(undefined);

  const activeCount = users.filter((user) => user.active).length;

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Usuários e perfis"
        description="Acessos da empresa, perfis com permissões e unidades responsáveis."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo usuário
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários" value={String(users.length)} hint={`${activeCount} ativo(s)`} />
        <StatCard label="Perfis" value={String(roles.length)} />
        <StatCard label="Unidades" value={String(branches.length)} />
        <StatCard label="Bloqueados" value={String(users.length - activeCount)} tone={users.length - activeCount > 0 ? "warning" : "default"} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        {users.length === 0 ? (
          <EmptyState title="Nenhum usuário" description="Cadastre o primeiro acesso da empresa." />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Usuários">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Último acesso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role?.name ?? "—"}</td>
                    <td>{user.branch?.name ?? "—"}</td>
                    <td>
                      <StatusBadge status={user.active ? "ATIVO" : "INATIVO"} />
                    </td>
                    <td>{formatDateBR(user.lastLoginAt)}</td>
                    <td>
                      <InlineAction
                        action={() => toggleUserAction(user.id, !user.active)}
                        label={user.active ? "Desativar" : "Ativar"}
                        variant={user.active ? "outline" : "secondary"}
                        confirmMessage="Alterar o acesso deste usuário?"
                        onDone={() => router.refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        roles={roles}
        branches={branches}
      />
    </div>
  );
}
