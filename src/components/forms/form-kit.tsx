"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export function Field({
  label,
  htmlFor,
  hint,
  optional,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1 text-xs">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
        {required && <span className="font-normal text-muted-foreground">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60";

export const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export const textareaClass =
  "min-h-20 w-full rounded-lg border bg-background px-2.5 py-2 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  if (error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs leading-relaxed text-red-700"
      >
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        {error}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs leading-relaxed text-emerald-700">
      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
      {success}
    </p>
  );
}

export function parseFormData(form: FormData, booleanFields: string[] = []) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") continue;
    if (value.trim() === "") continue;
    raw[key] = value;
  }
  for (const field of booleanFields) raw[field] = form.has(field);
  return raw;
}

/**
 * Formulário reutilizável para as server actions.
 * Campos numéricos podem ser enviados como texto: os schemas do servidor fazem
 * a coerção. Campos booleanos precisam ser listados em `booleanFields` para que
 * o valor `false` seja enviado quando o checkbox estiver desmarcado.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  booleanFields = [],
  hidden = {},
  onSuccess,
  successMessage,
  resetOnSuccess = true,
  className,
  footerClassName,
  submitVariant,
  renderFooter,
}: {
  action: (raw: unknown) => Promise<ActionResult<unknown>>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  booleanFields?: string[];
  hidden?: Record<string, string | number | undefined>;
  onSuccess?: (data: unknown) => void;
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
  footerClassName?: string;
  submitVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  renderFooter?: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setError(null);
        setSuccess(null);
        const raw = {
          ...Object.fromEntries(
            Object.entries(hidden).filter(([, value]) => value !== undefined && value !== "")
          ),
          ...parseFormData(new FormData(form), booleanFields),
        };
        startTransition(async () => {
          const result = await action(raw);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSuccess(successMessage ?? "Operação concluída.");
          if (resetOnSuccess) form.reset();
          onSuccess?.(result.data);
        });
      }}
    >
      {Object.entries(hidden).map(([key, value]) =>
        value === undefined || value === "" ? null : (
          <input key={key} type="hidden" name={key} value={String(value)} />
        )
      )}
      <div className="space-y-3">
        {children}
        <FormMessage error={error} success={success} />
      </div>
      {renderFooter ?? (
        <div className={cn("mt-4 flex justify-end gap-2", footerClassName)}>
          <Button type="submit" disabled={pending} variant={submitVariant}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? (pendingLabel ?? "Salvando...") : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

export function InlineAction({
  action,
  label,
  pendingLabel,
  confirmMessage,
  variant = "outline",
  size = "sm",
  icon,
  className,
  onDone,
}: {
  action: () => Promise<ActionResult<unknown>>;
  label: string;
  pendingLabel?: string;
  confirmMessage?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon" | "icon-sm" | "lg";
  icon?: ReactNode;
  className?: string;
  onDone?: (data: unknown) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.error);
            else onDone?.(result.data);
          });
        }}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : icon}
        {pending ? (pendingLabel ?? "Aguarde...") : label}
      </Button>
      {error && <span className="max-w-56 text-[10px] leading-tight text-red-600">{error}</span>}
    </span>
  );
}
