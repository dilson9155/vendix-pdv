"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import { findByBarcode, searchPosProducts, type PosProduct } from "@/services/catalog.service";
import { searchCustomers } from "@/services/customers.service";

export async function searchPdvProductsAction(
  term: string,
  branchId?: string
): Promise<ActionResult<PosProduct[]>> {
  return runAction(async () => {
    const ctx = await actionContext();
    return searchPosProducts(ctx, term, branchId, 20);
  });
}

export async function barcodeLookupAction(
  code: string,
  branchId?: string
): Promise<ActionResult<PosProduct | null>> {
  return runAction(async () => {
    const ctx = await actionContext();
    return findByBarcode(ctx, code, branchId);
  });
}

export async function searchCustomersAction(term: string) {
  return runAction(async () => {
    if (term.trim().length < 2) return [];
    const ctx = await actionContext();
    return searchCustomers(ctx, term, 15);
  });
}
