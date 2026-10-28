import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken, newToken } from "@/lib/crypto";
import { auditLog } from "@/services/audit.service";
import { emailSchema } from "@/lib/validation";
import { z } from "zod";

const RESET_TTL_MINUTES = 30;

export type RequestResetResult = {
  /** Sempre a mesma mensagem para não revelar se o e-mail existe. */
  message: string;
  /** Apenas em desenvolvimento quando PASSWORD_RESET_DEV_LINK=true. */
  devLink?: string;
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Vendix <nao-responda@vendix.local>",
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch (error) {
    console.error("[email] falha no provedor", error);
    return false;
  }
}

export async function requestPasswordReset(raw: unknown): Promise<RequestResetResult> {
  const email = emailSchema.parse(
    typeof raw === "object" && raw !== null && "email" in raw
      ? (raw as { email: unknown }).email
      : raw
  );
  const generic = {
    message:
      "Se houver uma conta com este e-mail, enviaremos as instruções de redefinição em alguns minutos.",
  };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!user || !user.active) return generic;

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
  });
  if (recent >= 3) return generic;

  const token = newToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });

  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${base}/redefinir-senha/${token}`;
  const sent = await sendEmail(
    user.email,
    "Redefinição de senha — Vendix",
    `<p>Olá, ${user.name}.</p>
     <p>Recebemos um pedido para redefinir sua senha no Vendix.</p>
     <p><a href="${link}">Redefinir minha senha</a> (válido por ${RESET_TTL_MINUTES} minutos).</p>
     <p>Se você não solicitou, ignore este e-mail. Sua senha permanece a mesma.</p>`
  );

  await auditLog({
    userId: user.id,
    action: "UPDATE",
    module: "auth",
    entity: "PasswordResetToken",
    entityId: user.id,
    description: sent
      ? "Solicitação de redefinição de senha enviada por e-mail"
      : "Solicitação de redefinição de senha gerada (provedor de e-mail não configurado)",
  });

  const devLink =
    process.env.NODE_ENV !== "production" && process.env.PASSWORD_RESET_DEV_LINK === "true"
      ? link
      : undefined;

  return { ...generic, ...(devLink ? { devLink } : {}) };
}

export async function validateResetToken(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, usedAt: true, user: { select: { active: true } } },
  });
  return Boolean(
    record && !record.usedAt && record.expiresAt.getTime() > Date.now() && record.user.active
  );
}

const resetSchema = z.object({
  token: z.string().min(20, "Token inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

export async function resetPassword(raw: unknown): Promise<void> {
  const input = resetSchema.parse(raw);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: { select: { id: true, name: true, active: true } } },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new Error("Este link de redefinição é inválido ou expirou. Solicite outro.");
  }
  if (!record.user.active) throw new Error("Usuário inativo. Fale com o administrador.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  await auditLog({
    userId: record.userId,
    action: "UPDATE",
    module: "auth",
    entity: "User",
    entityId: record.userId,
    description: `Senha redefinida via link de recuperação por ${record.user.name}`,
  });
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) throw new Error("A nova senha deve ter ao menos 8 caracteres.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new Error("Usuário não encontrado.");
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error("A senha atual está incorreta.");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  await auditLog({
    userId: user.id,
    tenantId: user.tenantId,
    action: "UPDATE",
    module: "auth",
    entity: "User",
    entityId: user.id,
    description: "Senha alterada pelo próprio usuário",
  });
}
