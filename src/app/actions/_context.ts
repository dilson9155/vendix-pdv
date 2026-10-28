import "server-only";
import { getAuthContext, type AuthContext } from "@/lib/tenant";

/** Contexto para server actions: falha sem redirecionar (o runAction converte). */
export async function actionContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão expirada. Entre novamente.");
  return ctx;
}
