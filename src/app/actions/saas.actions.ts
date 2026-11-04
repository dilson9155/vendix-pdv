"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  cancelCharge,
  createCharge,
  createTenant,
  deleteTenant,
  saveNotice,
  savePlan,
  setTenantStatus,
  settleCharge,
  updateCharge,
  updateSubscription,
  updateTenant,
} from "@/services/saas.service";
import { runBillingEnforcement, saveBillingConfig } from "@/services/billing.service";

function revalidateAdmin(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/planos");
  revalidatePath("/admin/cobrancas");
  revalidatePath("/admin/financeiro");
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

export async function updateTenantAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await updateTenant(ctx, raw);
    revalidateAdmin();
    revalidatePath(`/admin/empresas/${result.id}`);
    return result;
  });
}

export async function deleteTenantAction(raw: {
  tenantId: string;
  confirmName: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await deleteTenant(ctx, raw);
    revalidateAdmin();
    return undefined;
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

export async function updateChargeAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await updateCharge(ctx, raw);
    revalidateAdmin();
    revalidatePath(`/admin/cobrancas/${result.id}`);
    return result;
  });
}

export async function saveBillingConfigAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveBillingConfig(ctx, raw);
    revalidateAdmin();
    return undefined;
  });
}

export async function runBillingEnforcementAction(): Promise<
  ActionResult<{ overdue: number; suspended: number }>
> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await runBillingEnforcement(ctx);
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
