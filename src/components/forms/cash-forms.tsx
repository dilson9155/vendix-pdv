"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, Field, inputClass, selectClass, textareaClass } from "@/components/forms/form-kit";
import { formatBRL } from "@/lib/money";
import {
  cashMovementAction,
  closeCashAction,
  openCashAction,
} from "@/app/actions/sales.actions";

export function OpenCashForm({
  branches,
  defaultBranchId,
}: {
  branches: Array<{ id: string; name: string }>;
  defaultBranchId: string | null;
}) {
  const router = useRouter();
  return (
    <ActionForm
      action={openCashAction}
      submitLabel="Abrir caixa"
      successMessage="Caixa aberto."
      onSuccess={() => router.refresh()}
    >
      {branches.length > 1 && (
        <Field label="Unidade" htmlFor="open-branch">
          <select
            id="open-branch"
            name="branchId"
            defaultValue={defaultBranchId ?? branches[0]?.id}
            className={selectClass}
            required
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {branches.length <= 1 && (
        <input type="hidden" name="branchId" value={defaultBranchId ?? branches[0]?.id ?? ""} />
      )}
      <Field label="Terminal" htmlFor="open-terminal">
        <input id="open-terminal" name="terminalName" defaultValue="Caixa 1" className={inputClass} required maxLength={60} />
      </Field>
      <Field label="Fundo de troco" htmlFor="open-amount" hint="Dinheiro disponível no início do turno.">
        <input id="open-amount" name="openingAmount" inputMode="decimal" placeholder="0,00" defaultValue="0,00" className={inputClass} required />
      </Field>
      <Field label="Observações" htmlFor="open-notes" optional>
        <textarea id="open-notes" name="notes" className={textareaClass} maxLength={300} />
      </Field>
    </ActionForm>
  );
}

export function CashMovementForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  return (
    <ActionForm
      action={cashMovementAction}
      hidden={{ sessionId }}
      submitLabel="Registrar movimento"
      successMessage="Movimento registrado."
      onSuccess={() => router.refresh()}
    >
      <Field label="Tipo" htmlFor="movement-type">
        <select id="movement-type" name="type" className={selectClass} defaultValue="SUPRIMENTO">
          <option value="SUPRIMENTO">Suprimento (entrada de dinheiro)</option>
          <option value="SANGRIA">Sangria (retirada de dinheiro)</option>
        </select>
      </Field>
      <Field label="Valor" htmlFor="movement-amount">
        <input id="movement-amount" name="amount" inputMode="decimal" placeholder="0,00" className={inputClass} required />
      </Field>
      <Field label="Motivo" htmlFor="movement-reason">
        <input id="movement-reason" name="reason" className={inputClass} maxLength={200} required placeholder="Ex.: troco adicional, depósito" />
      </Field>
    </ActionForm>
  );
}

export function CloseCashForm({
  sessionId,
  expectedCash,
}: {
  sessionId: string;
  expectedCash: number;
}) {
  const router = useRouter();
  const [difference, setDifference] = useState<number | null>(null);
  return (
    <ActionForm
      action={closeCashAction}
      hidden={{ sessionId }}
      submitLabel="Fechar caixa"
      pendingLabel="Fechando..."
      onSuccess={(data) => {
        const value = (data as { difference?: number } | undefined)?.difference;
        setDifference(typeof value === "number" ? value : null);
        router.refresh();
      }}
    >
      <div className="rounded-lg bg-muted/70 px-3 py-2 text-xs">
        <span className="text-muted-foreground">Saldo esperado</span>
        <p className="text-base font-semibold tabular-nums">{formatBRL(expectedCash)}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Abertura + vendas em dinheiro + suprimentos − sangrias − estornos. O troco não é somado
          porque os pagamentos são registrados pelo valor aplicado.
        </p>
      </div>
      <Field label="Dinheiro contado" htmlFor="counted-cash" hint="Conte notas, moedas e o fundo de troco.">
        <input id="counted-cash" name="countedCash" inputMode="decimal" placeholder="0,00" className={inputClass} required />
      </Field>
      <Field label="Observações" htmlFor="close-notes" optional>
        <textarea id="close-notes" name="notes" className={textareaClass} maxLength={300} />
      </Field>
      {difference !== null && (
        <p className="rounded-lg border bg-muted/60 px-3 py-2 text-xs">
          Caixa fechado. Diferença apurada:{" "}
          <strong className={difference === 0 ? "text-emerald-700" : "text-red-700"}>
            {formatBRL(difference)}
          </strong>
        </p>
      )}
    </ActionForm>
  );
}
