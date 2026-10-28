"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { actionContext } from "@/app/actions/_context";
import {
  saveBrand,
  saveCategory,
  saveProduct,
  setProductActive,
} from "@/services/catalog.service";
import {
  saveCustomer,
  saveSupplier,
  setCustomerActive,
  setSupplierActive,
} from "@/services/customers.service";

export async function saveProductAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveProduct(ctx, raw);
    revalidatePath("/produtos");
    revalidatePath("/estoque");
    revalidatePath("/pdv");
    return result;
  });
}

export async function toggleProductAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setProductActive(ctx, id, active);
    revalidatePath("/produtos");
    return undefined;
  });
}

export async function saveCategoryAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveCategory(ctx, raw);
    revalidatePath("/produtos");
    revalidatePath("/produtos/categorias");
    return undefined;
  });
}

export async function saveBrandAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveBrand(ctx, raw);
    revalidatePath("/produtos");
    revalidatePath("/produtos/marcas");
    return undefined;
  });
}

export async function saveCustomerAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const result = await saveCustomer(ctx, raw);
    revalidatePath("/clientes");
    revalidatePath("/pdv");
    return result;
  });
}

export async function toggleCustomerAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setCustomerActive(ctx, id, active);
    revalidatePath("/clientes");
    return undefined;
  });
}

export async function saveSupplierAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await saveSupplier(ctx, raw);
    revalidatePath("/fornecedores");
    revalidatePath("/financeiro/contas-a-pagar");
    return undefined;
  });
}

export async function toggleSupplierAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await setSupplierActive(ctx, id, active);
    revalidatePath("/fornecedores");
    return undefined;
  });
}
