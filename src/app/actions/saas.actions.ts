"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  cancelCharge,
  createCharge,
  createTenant,
  saveNotice,
  savePlan,
  setTenantStatus,
  settleCharge,
  updateSubscription,
} from "@/services/saas.service";

function revalidateAdmin(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/planos");
  revalidatePath("/admin/cobrancas");
  revalidatePath("/admin/avisos");
}

export async function createTenantAction(raw: unknown): Promise<ActionResult<{ tenantId: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await createTenant(ctx, raw);
    revalidateAdmin();
    return { tenantId: result.tenantId };
  });
}

export async function setTenantStatusAction(raw: {
  tenantId: string;
  status: "ATIVO" | "SUSPENSO" | "CANCELADO";
  reason?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setTenantStatus(ctx, raw.tenantId, raw.status, raw.reason);
    revalidateAdmin();
    return undefined;
  });
}

export async function savePlanAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await savePlan(ctx, raw);
    revalidateAdmin();
    return result;
  });
}

export async function updateSubscriptionAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await updateSubscription(ctx, raw);
    revalidateAdmin();
    return undefined;
  });
}

export async function createChargeAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await createCharge(ctx, raw);
    revalidateAdmin();
    return result;
  });
}

export async function settleChargeAction(chargeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await settleCharge(ctx, chargeId);
    revalidateAdmin();
    return undefined;
  });
}

export async function cancelChargeAction(chargeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await cancelCharge(ctx, chargeId);
    revalidateAdmin();
    return undefined;
  });
}

export async function saveNoticeAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveNotice(ctx, raw);
    revalidateAdmin();
    return result;
  });
}
