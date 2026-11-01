"use client";

/**
 * Compartilhamento de imagem no navegador.
 *
 * O caminho ideal é `navigator.share({ files })`, que abre a folha de
 * compartilhamento nativa (WhatsApp, Telegram, e-mail...). Em navegadores de
 * desktop sem suporte a arquivos, o cupom é baixado como JPG e o WhatsApp Web
 * é aberto com a legenda pronta — o operador anexa a imagem já baixada.
 */

export type ShareImageResult =
  | { mode: "shared" }
  | { mode: "downloaded"; opened: boolean }
  | { mode: "cancelled" }
  | { mode: "error"; error: string };

function absolute(url: string): string {
  return new URL(url, window.location.origin).toString();
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Safari precisa do objeto vivo até o download começar.
  setTimeout(() => URL.revokeObjectURL(href), 20_000);
}

async function fetchImage(url: string): Promise<Blob> {
  const response = await fetch(absolute(url), { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a imagem (HTTP ${response.status}).`);
  }
  return response.blob();
}

export async function downloadImageUrl(imageUrl: string, fileName: string): Promise<ShareImageResult> {
  try {
    triggerDownload(await fetchImage(imageUrl), fileName);
    return { mode: "downloaded", opened: false };
  } catch (error) {
    return { mode: "error", error: error instanceof Error ? error.message : "Falha ao baixar a imagem." };
  }
}

/**
 * Compartilha o cupom. Retorna `downloaded` quando o navegador não consegue
 * compartilhar arquivos: nesse caso a imagem já foi baixada e o WhatsApp foi
 * aberto em outra aba.
 */
export async function shareImageUrl(input: {
  imageUrl: string;
  fileName: string;
  caption: string;
  phone?: string | null;
}): Promise<ShareImageResult> {
  let blob: Blob;
  try {
    blob = await fetchImage(input.imageUrl);
  } catch (error) {
    return { mode: "error", error: error instanceof Error ? error.message : "Falha ao carregar a imagem." };
  }

  const file = new File([blob], input.fileName, { type: "image/jpeg" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: input.caption });
      return { mode: "shared" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { mode: "cancelled" };
      }
      // Falha no compartilhamento nativo: cai para o download + WhatsApp Web.
    }
  }

  triggerDownload(blob, input.fileName);
  const opened = window.open(buildWhatsAppUrl(input.phone, input.caption), "_blank", "noopener,noreferrer");
  return { mode: "downloaded", opened: opened !== null };
}
