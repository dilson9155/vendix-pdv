"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  cancelPayable,
  payPayable,
  reversePayablePayment,
  savePayable,
} from "@/services/payables.service";
import {
  cancelReceivable,
  receiveReceivable,
  reverseReceivablePayment,
  saveReceivable,
} from "@/services/receivables.service";
import {
  createAccountTransfer,
  createManualLedgerEntry,
  saveChartAccount,
  saveCostCenter,
  saveFinancialAccount,
  setReconciled,
} from "@/services/finance-core.service";

function revalidateFinance(): void {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/fluxo-caixa");
  revalidatePath("/financeiro/livro-caixa");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios/dre");
  revalidatePath("/relatorios/financeiro");
}

export async function savePayableAction(raw: unknown): Promise<ActionResult<{ ids: string[] }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await savePayable(ctx, raw);
    revalidateFinance();
    return result;
  });
}

export async function payPayableAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await payPayable(ctx, raw);
    revalidateFinance();
    return undefined;
  });
}

export async function reversePayableAction(raw: {
  paymentId: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await reversePayablePayment(ctx, raw.paymentId, raw.reason);
    revalidateFinance();
    return undefined;
  });
}

export async function cancelPayableAction(raw: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await cancelPayable(ctx, raw.id, raw.reason);
    revalidateFinance();
    return undefined;
  });
}

export async function saveReceivableAction(raw: unknown): Promise<ActionResult<{ ids: string[] }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveReceivable(ctx, raw);
    revalidateFinance();
    return result;
  });
}

export async function receiveReceivableAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await receiveReceivable(ctx, raw);
    revalidateFinance();
    return undefined;
  });
}

export async function reverseReceivableAction(raw: {
  paymentId: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await reverseReceivablePayment(ctx, raw.paymentId, raw.reason);
    revalidateFinance();
    return undefined;
  });
}

export async function cancelReceivableAction(raw: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await cancelReceivable(ctx, raw.id, raw.reason);
    revalidateFinance();
    return undefined;
  });
}

export async function saveFinancialAccountAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveFinancialAccount(ctx, raw);
    revalidatePath("/financeiro/contas");
    return undefined;
  });
}

export async function saveChartAccountAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveChartAccount(ctx, raw);
    revalidatePath("/financeiro/plano-contas");
    return undefined;
  });
}

export async function saveCostCenterAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveCostCenter(ctx, raw);
    revalidatePath("/financeiro/plano-contas");
    return undefined;
  });
}

export async function transferAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await createAccountTransfer(ctx, raw);
    revalidateFinance();
    return undefined;
  });
}

export async function manualLedgerAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await createManualLedgerEntry(ctx, raw);
    revalidateFinance();
    return result;
  });
}

export async function reconcileLedgerAction(entryId: string, reconciled: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setReconciled(ctx, entryId, reconciled);
    revalidatePath("/financeiro/livro-caixa");
    return undefined;
  });
}
