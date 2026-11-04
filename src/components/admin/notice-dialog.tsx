"use client";

import { useState } from "react";
import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveNoticeAction } from "@/app/actions/saas.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type NoticeTargetOption = {
  id: string;
  name: string;
  status: string;
};

export type NoticeRow = {
  id: string;
  title: string;
  message: string;
  level: string;
  active: boolean;
  expiresAt: Date | null;
  tenantIds: string[];
  tenantNames: string[];
};

export function NoticeDialog({
  open,
  onOpenChange,
  notice,
  tenants,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: NoticeRow | null;
  tenants: NoticeTargetOption[];
}) {
  const editing = Boolean(notice);
  const [allTenants, setAllTenants] = useState(!notice?.tenantIds.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          <DialogDescription>Publicações exibidas no app e no dashboard das lojas selecionadas.</DialogDescription>
        </DialogHeader>
        <ActionForm
          action={saveNoticeAction}
          onSuccess={() => onOpenChange(false)}
          submitLabel={editing ? "Salvar aviso" : "Publicar aviso"}
          successMessage={editing ? "Aviso atualizado." : "Aviso publicado."}
          booleanFields={["active"]}
        >
          {notice && <input type="hidden" name="id" value={notice.id} />}
          <Field label="Título" htmlFor="notice-title" required>
            <input id="notice-title" name="title" className={inputClass} required maxLength={120} defaultValue={notice?.title ?? ""} />
          </Field>
          <Field label="Mensagem" htmlFor="notice-message" required>
            <textarea id="notice-message" name="message" className={textareaClass} required maxLength={4000} defaultValue={notice?.message ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nível" htmlFor="notice-level" required>
              <select id="notice-level" name="level" className={selectClass} defaultValue={notice?.level ?? "INFO"}>
                <option value="INFO">Info</option>
                <option value="ALERTA">Alerta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </Field>
            <Field label="Publicar" htmlFor="notice-active" optional>
              <label htmlFor="notice-active" className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2 text-sm">
                <input id="notice-active" type="checkbox" name="active" defaultChecked={notice?.active ?? true} className="size-4 accent-primary" />
                Publicar imediatamente
              </label>
            </Field>
          </div>
          <Field
            label="Destinatários"
            hint={
              allTenants
                ? "O aviso será exibido para todas as lojas da plataforma."
                : "O aviso será exibido somente para as lojas marcadas."
            }
          >
            <div className="space-y-2 rounded-lg border bg-background p-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={allTenants}
                  onChange={(event) => setAllTenants(event.target.checked)}
                  className="size-4 accent-primary"
                />
                Todas as lojas
              </label>
              <div className="max-h-44 space-y-1 overflow-y-auto border-t pt-2">
                {tenants.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">Nenhuma loja cadastrada.</p>
                ) : (
                  tenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className={cn(
                        "flex items-center gap-2 rounded px-1 py-0.5 text-sm",
                        allTenants && "opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        name="tenantIds"
                        value={tenant.id}
                        disabled={allTenants}
                        defaultChecked={notice?.tenantIds.includes(tenant.id) ?? false}
                        className="size-4 accent-primary"
                      />
                      <span className="truncate">{tenant.name}</span>
                      <span className="ml-auto text-[10px] font-medium uppercase text-muted-foreground">
                        {tenant.status}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </Field>
          <Field label="Expira em" htmlFor="notice-expires" optional>
            <input id="notice-expires" name="expiresAt" type="date" className={inputClass} defaultValue={notice?.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 10) : ""} />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
