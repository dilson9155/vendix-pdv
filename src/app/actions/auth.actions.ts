"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/lib/auth";
import { runAction, type ActionResult } from "@/lib/action-result";
import { loginSchema } from "@/lib/validation";
import { actionContext } from "@/app/actions/_context";
import {
  changeOwnPassword,
  requestPasswordReset,
  resetPassword,
} from "@/services/password.service";

export async function loginAction(raw: unknown): Promise<ActionResult> {
  const input = loginSchema.parse(raw);
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "E-mail ou senha inválidos, ou acesso bloqueado." };
    }
    throw error;
  }
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(raw: unknown): Promise<ActionResult<{ message: string; devLink?: string }>> {
  return runAction(async () => requestPasswordReset(raw));
}

export async function resetPasswordAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await resetPassword(raw);
    return undefined;
  });
}

export async function changePasswordAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const input = raw as { currentPassword?: string; newPassword?: string };
    await changeOwnPassword(ctx.userId, input.currentPassword ?? "", input.newPassword ?? "");
    revalidatePath("/configuracoes");
    return undefined;
  });
}

export async function goToDashboard(): Promise<void> {
  const ctx = await actionContext();
  redirect(ctx.isPlatformAdmin && !ctx.tenantId ? "/admin" : "/dashboard");
}
