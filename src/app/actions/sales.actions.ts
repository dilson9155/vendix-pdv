"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  cancelSale,
  createReceiptToken,
  createSale,
  createSaleReturn,
  getReceiptData,
} from "@/services/sales.service";
import {
  closeCashSession,
  openCashSession,
  registerCashMovement,
} from "@/services/cash.service";
import { shareReceiptOnWhatsApp } from "@/services/whatsapp.service";

function revalidateSales(): void {
  revalidatePath("/dashboard");
  revalidatePath("/vendas");
  revalidatePath("/pdv");
  revalidatePath("/financeiro");
  revalidatePath("/relatorios/vendas");
}

export async function createSaleAction(raw: unknown): Promise<ActionResult<{ id: string; documentNumber: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const sale = await createSale(ctx, raw);
    revalidateSales();
    return { id: sale.id, documentNumber: sale.documentNumber };
  });
}

export async function cancelSaleAction(raw: {
  saleId: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await cancelSale(ctx, raw.saleId, raw.reason);
    revalidateSales();
    revalidatePath(`/vendas/${raw.saleId}`);
    return undefined;
  });
}

export async function createSaleReturnAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await createSaleReturn(ctx, raw);
    revalidateSales();
    return undefined;
  });
}

export async function shareReceiptAction(raw: {
  saleId: string;
  phone: string;
}): Promise<ActionResult<{ mode: "manual" | "api"; url?: string; receiptUrl: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await shareReceiptOnWhatsApp(ctx, raw.saleId, raw.phone);
    revalidatePath(`/vendas/${raw.saleId}`);
    return {
      mode: result.mode,
      receiptUrl: result.receiptUrl,
      ...(result.mode === "manual" ? { url: result.url } : {}),
    };
  });
}

export async function createReceiptLinkAction(saleId: string): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await createReceiptToken(ctx, saleId, 7);
    return { url: result.url };
  });
}

export async function getReceiptAction(saleId: string): Promise<ActionResult<Awaited<ReturnType<typeof getReceiptData>>>> {
  return runAction(async () => {
    const ctx = await actionContext();
    return getReceiptData(ctx, saleId);
  });
}

// ---------------------------------------------------------------------------
// Caixa
// ---------------------------------------------------------------------------

export async function openCashAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const session = await openCashSession(ctx, raw);
    revalidatePath("/pdv");
    revalidatePath("/pdv/caixa");
    return { id: session.id };
  });
}

export async function cashMovementAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await registerCashMovement(ctx, raw);
    revalidatePath("/pdv/caixa");
    revalidatePath("/financeiro/fluxo-caixa");
    return undefined;
  });
}

export async function closeCashAction(raw: unknown): Promise<ActionResult<{ difference: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await closeCashSession(ctx, raw);
    revalidatePath("/pdv");
    revalidatePath("/pdv/caixa");
    revalidatePath("/dashboard");
    return { difference: Number(result.difference ?? 0) };
  });
}
