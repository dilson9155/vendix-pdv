import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// O banco fica em outra região (Neon), então cada consulta dentro de uma
// transação custa ida e volta. Transações maiores (provisionamento de loja,
// exclusão de dados) passam { maxWait, timeout } explicitamente na chamada.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
