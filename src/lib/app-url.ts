import "server-only";

/**
 * URL pública da aplicação, usada nos links de pagamento enviados às lojas.
 * Prioriza a variável explícita; na Vercel cai para `VERCEL_URL`; em
 * desenvolvimento usa localhost.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function publicChargeUrl(token: string): string {
  return `${getAppUrl()}/pagamento/${token}`;
}
