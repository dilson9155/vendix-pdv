import { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Executa uma ação de servidor convertendo erros em resposta segura. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Dados inválidos.",
        fieldErrors,
      };
    }
    const message =
      error instanceof Error ? error.message : "Não foi possível concluir a operação.";
    // Em desenvolvimento exibe a causa; em produção mantém mensagem de negócio.
    if (process.env.NODE_ENV === "development") {
      console.error("[action]", error);
    }
    return { ok: false, error: message };
  }
}

/** Mensagem curta e segura para telas de erro. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erro inesperado.";
}
