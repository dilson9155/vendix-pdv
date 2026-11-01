"use client";

// Captura do evento `beforeinstallprompt`.
// O navegador dispara esse evento uma única vez, geralmente antes de o React
// montar os botões. Guardamos o evento em um singleton para que qualquer botão
// "Instalar app" consiga abrir o prompt nativo de instalação mais tarde.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallState = {
  available: boolean;
  installed: boolean;
  ios: boolean;
  android: boolean;
};

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<() => void>();

const SERVER_SNAPSHOT: InstallState = {
  available: false,
  installed: false,
  ios: false,
  android: false,
};

function detectPlatform() {
  if (typeof window === "undefined") return { ios: false, android: false };
  const ua = window.navigator.userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && "ontouchend" in document);
  return { ios, android: /android/.test(ua) };
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

// O snapshot precisa ser estável entre renders (exigência do useSyncExternalStore).
let snapshot: InstallState = SERVER_SNAPSHOT;

function rebuildSnapshot() {
  const { ios, android } = detectPlatform();
  const isInstalled = installed || isStandaloneDisplay();
  snapshot = {
    available: deferredPrompt !== null || isInstalled,
    installed: isInstalled,
    ios,
    android,
  };
}

function notify() {
  rebuildSnapshot();
  for (const listener of listeners) listener();
}

/** Registra os listeners globais. Idempotente e seguro para SSR. */
export function initInstallPromptCapture(): void {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  installed = isStandaloneDisplay();
  rebuildSnapshot();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });

  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener?.("change", () => {
    installed = isStandaloneDisplay();
    notify();
  });
}

export function subscribeInstallState(listener: () => void): () => void {
  initInstallPromptCapture();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallState(): InstallState {
  return snapshot;
}

export function getServerInstallState(): InstallState {
  return SERVER_SNAPSHOT;
}

/**
 * Abre o prompt nativo de instalação.
 * `unsupported` significa que o navegador não oferece o prompt (iOS ou desktop
 * já instalado/sem suporte) — a interface mostra instruções manuais.
 */
export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unsupported"
> {
  if (!deferredPrompt) return "unsupported";
  const prompt = deferredPrompt;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === "accepted") {
      installed = true;
    }
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return "dismissed";
  }
}
