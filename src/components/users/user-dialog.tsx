"use client";

import { ActionForm, Field, inputClass, selectClass } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveUserAction } from "@/app/actions/settings.actions";

export type UserDialogOption = { id: string; name: string; system: boolean };

export function UserDialog({
  open,
  onOpenChange,
  user,
  roles,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { id: string; name: string; email: string; phone: string | null; active: boolean; roleId: string | null };
  roles: UserDialogOption[];
  branches: Array<{ id: string; name: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {user ? `Atualize os dados de ${user.name}.` : "Crie um acesso para a empresa."}
          </DialogDescription>
        </DialogHeader>
        <UserFormBody key={user?.id ?? "new"} user={user} roles={roles} branches={branches} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UserFormBody({
  user,
  roles,
  branches,
  onDone,
}: {
  user?: { id: string; name: string; email: string; phone: string | null; active: boolean; roleId: string | null };
  roles: UserDialogOption[];
  branches: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const isEdit = Boolean(user);
  return (
    <ActionForm
      action={saveUserAction}
      onSuccess={onDone}
      submitLabel={isEdit ? "Salvar alterações" : "Criar usuário"}
      successMessage={isEdit ? "Usuário atualizado." : "Usuário criado."}
      booleanFields={["active"]}
    >
      {user && <input type="hidden" name="id" value={user.id} />}
      <Field label="Nome" htmlFor="user-name" required>
        <input id="user-name" name="name" className={inputClass} required maxLength={120} defaultValue={user?.name} />
      </Field>
      <Field label="E-mail" htmlFor="user-email" required>
        <input id="user-email" name="email" type="email" className={inputClass} required maxLength={160} defaultValue={user?.email} />
      </Field>
      <Field label="Telefone" htmlFor="user-phone" optional>
        <input id="user-phone" name="phone" className={inputClass} maxLength={20} defaultValue={user?.phone ?? ""} />
      </Field>
      <Field label="Perfil" htmlFor="user-role" required>
        <select id="user-role" name="roleId" className={selectClass} required defaultValue={user?.roleId ?? ""}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Unidade" htmlFor="user-branch" optional>
        <select id="user-branch" name="branchId" className={selectClass} defaultValue="">
          <option value="">Matriz / todas</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </Field>
      {!isEdit && (
        <Field label="Senha inicial" htmlFor="user-password" required hint="Mínimo de 8 caracteres.">
          <input id="user-password" name="password" type="password" className={inputClass} required minLength={8} />
        </Field>
      )}
      <Field label="Ativar acesso" htmlFor="user-active" optional>
        <label htmlFor="user-active" className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2 text-sm">
          <input id="user-active" type="checkbox" name="active" defaultChecked={user?.active ?? false} className="size-4 accent-primary" />
          Ativo
        </label>
      </Field>
    </ActionForm>
  );
}
