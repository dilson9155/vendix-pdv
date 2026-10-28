"use client";

import { ActionForm, Field, inputClass } from "@/components/forms/form-kit";
import { saveWhatsAppAction } from "@/app/actions/settings.actions";

export type WhatsAppStatusLike = {
  configured: boolean;
  source: "environment" | "tenant" | "none";
  phoneNumberId: string | null;
  apiVersion: string;
  enabled: boolean;
  lastCheckAt: Date | null;
};

export function WhatsAppForm({ status }: { status: WhatsAppStatusLike }) {
  return (
    <ActionForm
      action={saveWhatsAppAction}
      onSuccess={() => undefined}
      submitLabel="Salvar integração"
      successMessage="Integração salva."
      booleanFields={["enabled"]}
    >
      <Field label="Número do telefone (ID Meta)" htmlFor="wa-phone" required hint={status.configured ? `Atual: ${status.phoneNumberId ?? ""}` : "Ex.: 1234567890123456."}>
        <input id="wa-phone" name="phoneNumberId" className={inputClass} required defaultValue={status.phoneNumberId ?? ""} />
      </Field>
      <Field label="Token de acesso" htmlFor="wa-token" required>
        <input id="wa-token" name="accessToken" type="password" className={inputClass} required minLength={20} />
      </Field>
      <Field label="API version" htmlFor="wa-version" optional>
        <input id="wa-version" name="apiVersion" className={inputClass} defaultValue={status.apiVersion ?? "v21.0"} maxLength={10} />
      </Field>
      <label htmlFor="wa-enabled" className="flex items-center gap-2 text-sm">
        <input id="wa-enabled" type="checkbox" name="enabled" defaultChecked={status.enabled} className="size-4 accent-primary" />
        Habilitar envio automático
      </label>
      <p className="text-[11px] text-muted-foreground">
        Sem credenciais configuradas, o envio usa o link manual <code>wa.me</code> com o comprovante tokenizado.
      </p>
    </ActionForm>
  );
}
