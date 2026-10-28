"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  applyInventoryCount,
  registerStockMovement,
  transferStock,
} from "@/services/inventory.service";

function revalidateStock(): void {
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios/estoque");
}

export async function stockMovementAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await registerStockMovement(ctx, raw);
    revalidateStock();
    return undefined;
  });
}

export async function transferStockAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await transferStock(ctx, raw);
    revalidateStock();
    return undefined;
  });
}

export async function inventoryCountAction(raw: unknown): Promise<ActionResult<{ adjusted: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await applyInventoryCount(ctx, raw);
    revalidateStock();
    return result;
  });
}
