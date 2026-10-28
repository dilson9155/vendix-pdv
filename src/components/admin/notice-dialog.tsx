"use client";

import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveNoticeAction } from "@/app/actions/saas.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type NoticeRow = {
  id: string;
  title: string;
  message: string;
  level: string;
  active: boolean;
  expiresAt: Date | null;
};

export function NoticeDialog({
  open,
  onOpenChange,
  notice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: NoticeRow | null;
}) {
  const editing = Boolean(notice);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          <DialogDescription>Publicações exibidas no app e no dashboard da empresa atendida.</DialogDescription>
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
          <Field label="Expira em" htmlFor="notice-expires" optional>
            <input id="notice-expires" name="expiresAt" type="date" className={inputClass} defaultValue={notice?.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 10) : ""} />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
