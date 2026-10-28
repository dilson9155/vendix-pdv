import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-primary/8 text-primary",
    positive: "bg-emerald-500/10 text-emerald-700",
    warning: "bg-amber-500/12 text-amber-700",
    danger: "bg-red-500/10 text-red-700",
  } as const;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  CONCLUIDA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABERTA: "bg-sky-50 text-sky-700 border-sky-200",
  CANCELADA: "bg-red-50 text-red-700 border-red-200",
  DEVOLVIDA: "bg-orange-50 text-orange-700 border-orange-200",
  DEVOLVIDA_PARCIAL: "bg-amber-50 text-amber-700 border-amber-200",
  ABERTO: "bg-sky-50 text-sky-700 border-sky-200",
  PARCIAL: "bg-amber-50 text-amber-700 border-amber-200",
  PAGO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECEBIDO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADO: "bg-gray-100 text-gray-600 border-gray-200",
  ATIVO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INATIVO: "bg-gray-100 text-gray-600 border-gray-200",
  SUSPENSO: "bg-amber-50 text-amber-700 border-amber-200",
  PENDENTE: "bg-sky-50 text-sky-700 border-sky-200",
  PAGA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  VENCIDA: "bg-red-50 text-red-700 border-red-200",
  TRIAL: "bg-violet-50 text-violet-700 border-violet-200",
  ATIVA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENSA: "bg-amber-50 text-amber-700 border-amber-200",
  VENCIDO: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  CONCLUIDA: "Concluída",
  ABERTA: "Aberta",
  CANCELADA: "Cancelada",
  DEVOLVIDA: "Devolvida",
  DEVOLVIDA_PARCIAL: "Devolvida parcial",
  ABERTO: "Aberto",
  PARCIAL: "Parcial",
  PAGO: "Pago",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  SUSPENSO: "Suspenso",
  PENDENTE: "Pendente",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  TRIAL: "Trial",
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TableShell({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <div className="vx-table-shell">
      <table className="vx-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
