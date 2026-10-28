"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  deleteRole,
  resetUserPassword,
  saveRole,
  saveUser,
  setUserActive,
} from "@/services/users.service";
import { saveBranch, updateCompanySettings } from "@/services/settings.service";
import {
  disableWhatsApp,
  saveWhatsAppIntegration,
} from "@/services/whatsapp.service";

export async function saveUserAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveUser(ctx, raw);
    revalidatePath("/usuarios");
    return result;
  });
}

export async function toggleUserAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setUserActive(ctx, id, active);
    revalidatePath("/usuarios");
    return undefined;
  });
}

export async function resetUserPasswordAction(raw: {
  userId: string;
  password: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await resetUserPassword(ctx, raw.userId, raw.password);
    revalidatePath("/usuarios");
    return undefined;
  });
}

export async function saveRoleAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveRole(ctx, raw);
    revalidatePath("/usuarios");
    revalidatePath("/usuarios/perfis");
    return result;
  });
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await deleteRole(ctx, roleId);
    revalidatePath("/usuarios/perfis");
    return undefined;
  });
}

export async function saveSettingsAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await updateCompanySettings(ctx, raw);
    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");
    return undefined;
  });
}

export async function saveBranchAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveBranch(ctx, raw);
    revalidatePath("/configuracoes");
    return result;
  });
}

export async function saveWhatsAppAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveWhatsAppIntegration(ctx, raw as {
      phoneNumberId: string;
      accessToken: string;
      apiVersion?: string;
      enabled: boolean;
    });
    revalidatePath("/configuracoes");
    return undefined;
  });
}

export async function disableWhatsAppAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await disableWhatsApp(ctx);
    revalidatePath("/configuracoes");
    return undefined;
  });
}
