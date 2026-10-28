import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Executa uma transação com isolamento Serializable e nova tentativa em caso
 * de conflito de serialização (P2034) — protege saldos de estoque/financeiro
 * contra condições de corrida entre terminais.
 */
export async function withSerializableTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 20_000,
      });
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      const retryable = code === "P2034" || code === "40001";
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
  throw lastError;
}
