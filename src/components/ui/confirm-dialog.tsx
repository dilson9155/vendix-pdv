"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "danger" | "warning" | "info";

const TONES: Record<
  ConfirmTone,
  {
    icon: typeof AlertTriangle;
    iconWrap: string;
    box: string;
    confirm: string;
  }
> = {
  danger: {
    icon: ShieldAlert,
    iconWrap: "bg-red-100 text-red-600",
    box: "border-red-200 bg-red-50 text-red-800",
    confirm:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:border-red-700 focus-visible:ring-red-600/30",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-700",
    box: "border-amber-200 bg-amber-50 text-amber-900",
    confirm:
      "bg-amber-600 text-white hover:bg-amber-700 focus-visible:border-amber-700 focus-visible:ring-amber-600/30",
  },
  info: {
    icon: Info,
    iconWrap: "bg-sky-100 text-sky-700",
    box: "border-sky-200 bg-sky-50 text-sky-900",
    confirm: "",
  },
};

/**
 * Diálogo de confirmação para ações com consequência (cancelar cobrança,
 * assinatura, inativar cadastro etc.). Substitui o `window.confirm` nativo,
 * que não segue a identidade visual e não funciona bem no mobile.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  pendingLabel = "Processando...",
  tone = "danger",
  pending = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  tone?: ConfirmTone;
  pending?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  /** Campos extras, como o motivo obrigatório de um cancelamento. */
  children?: ReactNode;
}) {
  const style = TONES[tone];
  const Icon = style.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden p-0">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                style.iconWrap
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold leading-snug">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription
                  className={cn(
                    "mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
                    style.box
                  )}
                >
                  {description}
                </DialogDescription>
              )}
              {children && <div className="mt-3">{children}</div>}
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className={style.confirm || undefined}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
