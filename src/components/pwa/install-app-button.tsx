"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  MonitorDown,
  Share,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VendixMark } from "@/components/brand/vendix-mark";
import { cn } from "@/lib/utils";
import {
  getInstallState,
  getServerInstallState,
  initInstallPromptCapture,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa-install";

type Props = {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  label?: string;
  iconOnly?: boolean;
  fullWidth?: boolean;
};

/**
 * Instalação real do PWA: usa o prompt nativo do navegador
 * (`beforeinstallprompt`) e, quando o navegador não oferece o prompt (iOS ou
 * desktop sem suporte), mostra o passo a passo da plataforma.
 */
export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Instalar aplicativo",
  iconOnly = false,
  fullWidth = false,
}: Props) {
  const state = useSyncExternalStore(
    subscribeInstallState,
    getInstallState,
    getServerInstallState
  );
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<"accepted" | "dismissed" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    initInstallPromptCapture();
  }, []);

  async function handleClick() {
    setFeedback(null);
    setPending(true);
    // Abre o instalador nativo imediatamente. Só mostramos o passo a passo
    // quando o navegador realmente não oferece o prompt (iOS, por exemplo).
    const outcome = await promptInstall();
    setPending(false);
    if (outcome === "unsupported") {
      setFeedback(null);
      setHelpOpen(true);
      return;
    }
    setFeedback(outcome);
  }

  if (state.installed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
          fullWidth && "w-full justify-center",
          className
        )}
      >
        <CheckCircle2 className="size-3.5" /> App instalado
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(fullWidth && "w-full", className)}
        onClick={() => void handleClick()}
        disabled={pending}
        title="Instalar o Vendix como aplicativo"
        aria-label={iconOnly ? "Instalar o Vendix como aplicativo" : undefined}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {!iconOnly && (pending ? "Abrindo instalador..." : label)}
      </Button>

      {feedback === "accepted" && (
        <span
          aria-live="polite"
          className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"
        >
          <CheckCircle2 className="size-3.5" /> Instalado
        </span>
      )}
      {feedback === "dismissed" && (
        <span aria-live="polite" className="ml-2 text-[11px] text-muted-foreground">
          Instalação cancelada
        </span>
      )}

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <VendixMark className="size-10 shadow-lg shadow-slate-900/15" />
              <div>
                <DialogTitle>Instalar o aplicativo</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {state.ios
                    ? "No iPhone/iPad a instalação é feita pelo Safari, em dois toques."
                    : "Seu navegador não abriu o instalador automático. Use o caminho abaixo."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {state.ios ? (
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  1
                </span>
                <span>
                  Toque no botão <Share className="mx-0.5 inline size-3.5" /> <strong>Compartilhar</strong>{" "}
                  na barra do Safari.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  2
                </span>
                <span>
                  Escolha <strong>Adicionar à Tela de Início</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  3
                </span>
                <span>
                  Confirme em <strong>Adicionar</strong>. O Vendix abre em tela cheia, como um app.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2">
                <MonitorDown className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong>Computador (Chrome/Edge):</strong> clique no ícone de instalação na barra
                  de endereço ou no menu <strong>⋮ → Instalar Vendix</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong>Android (Chrome):</strong> menu <strong>⋮ → Instalar aplicativo</strong> (ou
                  “Adicionar à tela inicial”).
                </span>
              </li>
              <li className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                A instalação exige HTTPS e o Vendix precisa estar aberto uma vez no navegador.
              </li>
            </ol>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Depois de instalado, o Vendix abre em tela cheia, com o PDV e os relatórios à mão,
            inclusive em rede móvel.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
