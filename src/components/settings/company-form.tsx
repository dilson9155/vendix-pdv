"use client";

import { useRef, useState } from "react";
import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { saveSettingsAction } from "@/app/actions/settings.actions";

export type CompanyFormInitial = {
  tradeName?: string | null;
  legalName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  receiptFooter?: string | null;
  receiptWidth?: "58" | "80" | string | null;
  maxDiscountPercent?: number | null;
  allowNegativeStock?: boolean;
  requireCustomerOnCredit?: boolean;
  logoUrl?: string | null;
};

export function CompanyForm({ initial }: { initial?: CompanyFormInitial | null }) {
  const [preview, setPreview] = useState<string | null>(initial?.logoUrl ?? null);
  const [logoValue, setLogoValue] = useState<string>(initial?.logoUrl ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 1_500_000) {
      alert("Imagem muito grande. Use até 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setPreview(result);
      setLogoValue(result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setPreview(null);
    setLogoValue("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <ActionForm
      action={saveSettingsAction}
      hidden={{ logoUrl: logoValue }}
      booleanFields={["allowNegativeStock", "requireCustomerOnCredit"]}
      submitLabel="Salvar configurações"
      successMessage="Configurações salvas."
    >
      {preview && (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Logo da empresa" className="h-16 w-16 rounded object-contain" />
          <div className="flex-1 text-xs text-muted-foreground">Logo atual</div>
          <button
            type="button"
            onClick={removeLogo}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Remover
          </button>
        </div>
      )}
      <Field label="Logo da empresa" htmlFor="cfg-logo" optional hint="PNG ou JPG até 1,5 MB. Aparece no cupom e relatórios.">
        <input
          id="cfg-logo"
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={inputClass}
          onChange={onFileChange}
        />
      </Field>
      <Field label="Nome fantasia" htmlFor="cfg-trade" required>
        <input id="cfg-trade" name="tradeName" className={inputClass} required maxLength={120} defaultValue={initial?.tradeName ?? ""} />
      </Field>
      <Field label="Razão social" htmlFor="cfg-legal" optional>
        <input id="cfg-legal" name="legalName" className={inputClass} maxLength={160} defaultValue={initial?.legalName ?? ""} />
      </Field>
      <Field label="CNPJ" htmlFor="cfg-document" required>
        <input id="cfg-document" name="document" className={inputClass} required maxLength={20} defaultValue={initial?.document ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Telefone" htmlFor="cfg-phone" required>
          <input id="cfg-phone" name="phone" className={inputClass} required maxLength={20} defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="cfg-email" optional>
          <input id="cfg-email" name="email" type="email" className={inputClass} maxLength={160} defaultValue={initial?.email ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Endereço" htmlFor="cfg-address" optional>
          <input id="cfg-address" name="address" className={inputClass} maxLength={300} defaultValue={initial?.address ?? ""} />
        </Field>
        <Field label="CEP" htmlFor="cfg-zip" optional>
          <input id="cfg-zip" name="zipCode" className={inputClass} maxLength={9} defaultValue={initial?.zipCode ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Cidade" htmlFor="cfg-city" optional>
          <input id="cfg-city" name="city" className={inputClass} maxLength={80} defaultValue={initial?.city ?? ""} />
        </Field>
        <Field label="UF" htmlFor="cfg-state" optional>
          <input id="cfg-state" name="state" className={inputClass} maxLength={2} defaultValue={initial?.state ?? ""} />
        </Field>
        <Field label="Rodapé do comprovante" htmlFor="cfg-footer" optional>
          <input id="cfg-footer" name="receiptFooter" className={inputClass} maxLength={300} defaultValue={initial?.receiptFooter ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Formato do comprovante" htmlFor="cfg-width" required>
          <select id="cfg-width" name="receiptWidth" className={selectClass} defaultValue={initial?.receiptWidth ?? "80"}>
            <option value="58">58 mm</option>
            <option value="80">80 mm</option>
          </select>
        </Field>
        <Field label="Desconto máximo na venda" htmlFor="cfg-discount" required hint="Percentual máximo de desconto comercial.">
          <input id="cfg-discount" name="maxDiscountPercent" inputMode="decimal" className={inputClass} defaultValue={initial?.maxDiscountPercent ?? 10} />
        </Field>
      </div>
      <label htmlFor="cfg-neg" className="flex items-center gap-2 text-sm">
        <input id="cfg-neg" type="checkbox" name="allowNegativeStock" defaultChecked={initial?.allowNegativeStock ?? false} className="size-4 accent-primary" />
        Permitir estoque negativo
      </label>
      <label htmlFor="cfg-req" className="flex items-center gap-2 text-sm">
        <input id="cfg-req" type="checkbox" name="requireCustomerOnCredit" defaultChecked={initial?.requireCustomerOnCredit ?? true} className="size-4 accent-primary" />
        Exigir cliente para vendas a prazo
      </label>
      <p className="text-[11px] text-muted-foreground">Os valores salvos entram na configuração da empresa (chave por preferência).</p>
    </ActionForm>
  );
}
