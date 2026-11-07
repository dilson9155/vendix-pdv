"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Flashlight,
  Keyboard,
  RefreshCw,
  ScanLine,
  SwitchCamera,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Resultado do processamento de um código lido (decidido pelo componente pai). */
export type ScanOutcome = {
  ok: boolean;
  message?: string;
  /** Fecha o leitor após exibir o feedback (padrão: fecha apenas em leituras ok). */
  close?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onDetect: (code: string) => Promise<ScanOutcome>;
  title?: string;
  /** Modo de leitura (controlado pelo pai para alternar entre único e contínuo). */
  continuous?: boolean;
  onContinuousChange?: (value: boolean) => void;
  /** Esconde o botão de modo contínuo (ex.: cadastro de produto). */
  hideModeToggle?: boolean;
};

/** Evita leituras duplicadas involuntárias do mesmo código. */
const DUPLICATE_COOLDOWN_MS = 1200;
const FEEDBACK_SUCCESS_MS = 450;
const FEEDBACK_ERROR_MS = 1400;

type Feedback = { kind: "success" | "error"; message: string } | null;
type Status = "starting" | "scanning" | "error";

type TorchTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
};

function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Permissão de câmera negada. Libere o acesso nas configurações do navegador e tente novamente.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Nenhuma câmera disponível neste dispositivo.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "A câmera está em uso por outro aplicativo. Feche-o e tente novamente.";
  }
  if (name === "SecurityError") {
    return "O navegador bloqueou a câmera. Use HTTPS (ou localhost) e tente novamente.";
  }
  return "Não foi possível abrir a câmera. Você pode digitar o código manualmente.";
}

export function BarcodeScanner({
  open,
  onClose,
  onDetect,
  title = "Ler código de barras",
  continuous = false,
  onContinuousChange,
  hideModeToggle = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onDetectRef = useRef<Props["onDetect"] | null>(null);
  const processCodeRef = useRef<((raw: string) => Promise<void>) | null>(null);
  const onCloseRef = useRef<(() => void) | null>(null);
  const startLockRef = useRef(false);
  const deviceIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const stopScanner = useCallback(() => {
    try {
      // Para o scan e encerra os tracks da câmera.
      controlsRef.current?.stop();
    } catch {
      // já parado
    }
    controlsRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (startLockRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    startLockRef.current = true;
    setStatus("starting");
    setErrorMessage(null);

    try {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw Object.assign(new Error("insecure"), { name: "SecurityError" });
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "Unsupported" });
      }

      // Importação sob demanda: a biblioteca só é carregada ao abrir o leitor.
      const [{ BrowserMultiFormatReader }, zxing] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);

      const hints = new Map();
      hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
        zxing.BarcodeFormat.EAN_13,
        zxing.BarcodeFormat.EAN_8,
        zxing.BarcodeFormat.UPC_A,
        zxing.BarcodeFormat.UPC_E,
        zxing.BarcodeFormat.CODE_128,
        zxing.BarcodeFormat.CODE_39,
        zxing.BarcodeFormat.CODE_93,
        zxing.BarcodeFormat.ITF,
        zxing.BarcodeFormat.QR_CODE,
      ]);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 500,
      });

      const constraints: MediaStreamConstraints = deviceIdRef.current
        ? {
            video: {
              deviceId: { exact: deviceIdRef.current },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }
        : {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          };

      const controls = await reader.decodeFromConstraints(
        constraints,
        video,
        (result) => {
          if (result) void processCodeRef.current?.(result.getText());
        }
      );
      controlsRef.current = controls;

      const stream = video.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(Boolean(capabilities?.torch));

      try {
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);
      } catch {
        // Lista de câmeras é opcional.
      }

      setStatus("scanning");
    } catch (error) {
      stopScanner();
      setStatus("error");
      setErrorMessage(cameraErrorMessage(error));
    } finally {
      startLockRef.current = false;
    }
  }, [stopScanner]);

  const processCode = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current) return;

    const now = Date.now();
    if (code === lastCodeRef.current.code && now - lastCodeRef.current.at < DUPLICATE_COOLDOWN_MS) {
      return;
    }
    lastCodeRef.current = { code, at: now };

    busyRef.current = true;
    setFeedback({ kind: "success", message: "Código lido" });
    try {
      navigator.vibrate?.(80);
    } catch {
      // vibração é opcional
    }

    try {
      const detect = onDetectRef.current;
      const outcome = detect ? await detect(code) : { ok: false as const, close: true };
      const message =
        outcome.message ?? (outcome.ok ? "Código lido" : "Não foi possível usar o código lido.");
      setFeedback({ kind: outcome.ok ? "success" : "error", message });
      if (outcome.close) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          onCloseRef.current?.();
        }, outcome.ok ? FEEDBACK_SUCCESS_MS : FEEDBACK_ERROR_MS);
      }
    } catch {
      setFeedback({ kind: "error", message: "Falha ao processar o código lido." });
    } finally {
      busyRef.current = false;
    }
  }, []);

  // Mantém os callbacks mais recentes acessíveis para o loop de leitura.
  useEffect(() => {
    onDetectRef.current = onDetect;
    processCodeRef.current = processCode;
    onCloseRef.current = onClose;
  }, [onDetect, processCode, onClose]);

  // Abre/fecha a câmera junto com o diálogo (uma única instância por vez).
  useEffect(() => {
    if (!open) return;
    void startScanner();
    return () => {
      stopScanner();
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pausa a câmera quando o app vai para segundo plano e retoma ao voltar.
  useEffect(() => {
    if (!open) return;
    const onVisibility = () => {
      if (document.hidden) stopScanner();
      else if (status !== "error") void startScanner();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

  // ESC fecha o leitor (fase de captura: impede que um diálogo por cima feche junto).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  // Descarta o feedback depois do tempo de exibição.
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.kind === "success" ? FEEDBACK_SUCCESS_MS : FEEDBACK_ERROR_MS
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  async function switchCamera() {
    if (devices.length < 2 || startLockRef.current) return;
    const index = devices.findIndex((device) => device.deviceId === deviceIdRef.current);
    const next = devices[(index + 1) % devices.length];
    stopScanner();
    deviceIdRef.current = next.deviceId;
    await startScanner();
  }

  async function toggleTorch() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0] as TorchTrack | undefined;
    if (!track) return;
    try {
      const next = !torchOn;
      const constraints = { advanced: [{ torch: next }] } as unknown as MediaTrackConstraints;
      await track.applyConstraints(constraints);
      setTorchOn(next);
    } catch {
      setTorchOn(false);
      setTorchSupported(false);
    }
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const code = manualValue.trim();
    if (!code) return;
    setManualValue("");
    void processCode(code);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <ScanLine className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-[11px] text-white/55">
              {continuous ? "Leitura contínua ativa" : "Leitura única"}
              {devices.length > 1 ? ` · ${devices.length} câmeras` : ""}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar leitor"
          onClick={onClose}
          className="shrink-0 text-white hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Enquadramento do código */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="relative aspect-[2.4/1] w-full max-w-md">
            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30" />
            <span className="absolute -left-0.5 -top-0.5 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-cyan-400" />
            <span className="absolute -right-0.5 -top-0.5 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-cyan-400" />
            <span className="absolute -bottom-0.5 -left-0.5 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-cyan-400" />
            <span className="absolute -bottom-0.5 -right-0.5 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-cyan-400" />
            <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-cyan-400/80" />
          </div>
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-5 px-6 text-center text-sm font-medium text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          Posicione o código de barras dentro da área indicada
        </p>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "absolute inset-x-0 top-0 px-4 py-3 text-center text-sm font-semibold shadow-lg",
              feedback.kind === "success"
                ? "bg-emerald-500/95 text-white"
                : "bg-red-500/95 text-white"
            )}
          >
            {feedback.message}
          </div>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <RefreshCw className="size-7 animate-spin text-cyan-400" />
            <p className="text-sm text-white/80">Abrindo a câmera…</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
            <Camera className="size-9 text-white/50" />
            <p className="max-w-sm text-sm leading-relaxed text-white/85">
              {errorMessage ?? "Não foi possível abrir a câmera."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                onClick={() => void startScanner()}
                className="bg-cyan-600 text-white hover:bg-cyan-500"
              >
                Tentar novamente
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualOpen(true)}
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Keyboard className="size-4" /> Digitar código
              </Button>
            </div>
          </div>
        )}
      </div>

      {manualOpen && (
        <form
          onSubmit={submitManual}
          className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/80 px-3 py-3"
        >
          <Input
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="Digite o código de barras"
            aria-label="Digite o código de barras"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-11 flex-1 border-white/20 bg-white/10 text-base text-white placeholder:text-white/45"
          />
          <Button
            type="submit"
            className="h-11 bg-cyan-600 text-white hover:bg-cyan-500"
            disabled={!manualValue.trim()}
          >
            Usar
          </Button>
        </form>
      )}

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/80 px-3 py-3 sm:px-4">
        {!hideModeToggle && onContinuousChange && (
          <Button
            type="button"
            variant="outline"
            aria-pressed={continuous}
            onClick={() => onContinuousChange(!continuous)}
            className={cn(
              "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white",
              continuous && "border-cyan-400 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-cyan-100"
            )}
          >
            <RefreshCw className="size-4" /> Contínuo
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => void switchCamera()}
          disabled={devices.length < 2}
          aria-label="Trocar câmera"
          className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <SwitchCamera className="size-4" /> Câmera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void toggleTorch()}
          disabled={!torchSupported}
          aria-pressed={torchOn}
          aria-label="Lanterna"
          className={cn(
            "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:opacity-40",
            torchOn && "border-amber-400 bg-amber-500/20 text-amber-200"
          )}
        >
          <Flashlight className="size-4" /> Lanterna
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setManualOpen((value) => !value)}
          aria-expanded={manualOpen}
          className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Keyboard className="size-4" /> Manual
        </Button>
      </footer>
    </div>
  );
}
