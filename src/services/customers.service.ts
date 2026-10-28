import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, type AuthContext } from "@/lib/tenant";
import { auditLog } from "@/services/audit.service";
import { customerSchema, supplierSchema } from "@/lib/validation";
import { onlyDigits } from "@/lib/date";

export type CustomerListFilters = {
  q?: string;
  status?: "ATIVO" | "INATIVO" | "TODOS";
  page?: number;
  pageSize?: number;
};

export type CustomerRow = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  consent: boolean;
  active: boolean;
  totalPurchased: number;
  purchases: number;
  lastPurchaseAt: Date | null;
  openBalance: number;
};

export async function listCustomers(
  ctx: AuthContext,
  filters: CustomerListFilters = {}
): Promise<{ rows: CustomerRow[]; total: number; page: number; pageSize: number }> {
  assertPermission(ctx, "customers.view");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const where: Prisma.CustomerWhereInput = { tenantId: ctx.tenantId };

  if (filters.status && filters.status !== "TODOS") where.active = filters.status === "ATIVO";
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { document: { contains: onlyDigits(q) || q } },
      { phone: { contains: onlyDigits(q) || q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sales: {
          where: { status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL"] } },
          select: { total: true, createdAt: true },
        },
        receivables: {
          where: { status: { in: ["ABERTO", "PARCIAL"] } },
          select: { value: true, payments: { where: { reversedAt: null }, select: { amount: true } } },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const rows: CustomerRow[] = customers.map((customer) => {
    const totalPurchased = customer.sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const lastPurchase = customer.sales.reduce<Date | null>((latest, sale) => {
      return !latest || sale.createdAt > latest ? sale.createdAt : latest;
    }, null);
    const openBalance = customer.receivables.reduce((sum, receivable) => {
      const paid = receivable.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + (Number(receivable.value) - paid);
    }, 0);

    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      birthDate: customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : null,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      notes: customer.notes,
      consent: Boolean(customer.consentAt),
      active: customer.active,
      totalPurchased,
      purchases: customer.sales.length,
      lastPurchaseAt: lastPurchase,
      openBalance,
    };
  });

  return { rows, total, page, pageSize };
}

export async function getCustomer(ctx: AuthContext, id: string) {
  assertPermission(ctx, "customers.view");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          documentNumber: true,
          total: true,
          status: true,
          createdAt: true,
          branch: { select: { name: true } },
        },
      },
      receivables: {
        orderBy: { dueDate: "asc" },
        take: 30,
        include: { payments: { where: { reversedAt: null }, select: { amount: true } } },
      },
    },
  });
  if (!customer) return null;
  return customer;
}

export async function saveCustomer(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "customers.manage");
  const input = customerSchema.parse(raw);

  const existing = input.id
    ? await prisma.customer.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Cliente não encontrado.");

  if (input.document) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        tenantId: ctx.tenantId,
        document: input.document,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true, name: true },
    });
    if (duplicate) {
      throw new Error(`Já existe um cliente com este CPF/CNPJ: ${duplicate.name}.`);
    }
  }

  const data = {
    tenantId: ctx.tenantId,
    name: input.name,
    document: input.document ?? null,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    birthDate: input.birthDate ? new Date(`${input.birthDate}T12:00:00-03:00`) : null,
    address: input.address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    zipCode: input.zipCode ?? null,
    notes: input.notes ?? null,
    active: input.active,
    consentAt: input.consent ? (existing?.consentAt ?? new Date()) : existing?.consentAt ?? null,
  };

  const saved = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data })
    : await prisma.customer.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "clientes",
    entity: "Customer",
    entityId: saved.id,
    description: `Cliente "${saved.name}" ${existing ? "atualizado" : "criado"}`,
  });

  return { id: saved.id };
}

export async function setCustomerActive(
  ctx: AuthContext,
  id: string,
  active: boolean
): Promise<void> {
  assertPermission(ctx, "customers.manage");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!customer) throw new Error("Cliente não encontrado.");
  await prisma.customer.update({ where: { id }, data: { active } });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "clientes",
    entity: "Customer",
    entityId: id,
    description: `Cliente "${customer.name}" ${active ? "ativado" : "inativado"}`,
  });
}

export async function searchCustomers(ctx: AuthContext, term: string, limit = 15) {
  assertPermission(ctx, "customers.view");
  const q = term.trim();
  if (!q) return [];
  return prisma.customer.findMany({
    where: {
      tenantId: ctx.tenantId,
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { document: { contains: onlyDigits(q) || q } },
        { phone: { contains: onlyDigits(q) || q } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true, name: true, phone: true, whatsapp: true, document: true },
  });
}

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------

export type SupplierFilters = { q?: string; status?: "ATIVO" | "INATIVO" | "TODOS" };

export async function listSuppliers(ctx: AuthContext, filters: SupplierFilters = {}) {
  assertPermission(ctx, "products.view");
  const where: Prisma.SupplierWhereInput = { tenantId: ctx.tenantId };
  if (filters.status && filters.status !== "TODOS") where.active = filters.status === "ATIVO";
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { document: { contains: onlyDigits(q) || q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  return prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      payables: {
        where: { status: { in: ["ABERTO", "PARCIAL"] } },
        select: { value: true },
      },
    },
  });
}

export async function saveSupplier(ctx: AuthContext, raw: unknown): Promise<{ id: string }> {
  assertPermission(ctx, "products.manage");
  const input = supplierSchema.parse(raw);
  const existing = input.id
    ? await prisma.supplier.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } })
    : null;
  if (input.id && !existing) throw new Error("Fornecedor não encontrado.");

  if (input.document) {
    const duplicate = await prisma.supplier.findFirst({
      where: {
        tenantId: ctx.tenantId,
        document: input.document,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { name: true },
    });
    if (duplicate) throw new Error(`Já existe um fornecedor com este documento: ${duplicate.name}.`);
  }

  const data = {
    tenantId: ctx.tenantId,
    name: input.name,
    document: input.document ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    active: input.active,
  };

  const saved = existing
    ? await prisma.supplier.update({ where: { id: existing.id }, data })
    : await prisma.supplier.create({ data });

  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existing ? "UPDATE" : "CREATE",
    module: "fornecedores",
    entity: "Supplier",
    entityId: saved.id,
    description: `Fornecedor "${saved.name}" ${existing ? "atualizado" : "criado"}`,
  });
  return { id: saved.id };
}

export async function setSupplierActive(
  ctx: AuthContext,
  id: string,
  active: boolean
): Promise<void> {
  assertPermission(ctx, "products.manage");
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!supplier) throw new Error("Fornecedor não encontrado.");
  await prisma.supplier.update({ where: { id }, data: { active } });
  await auditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    module: "fornecedores",
    entity: "Supplier",
    entityId: id,
    description: `Fornecedor "${supplier.name}" ${active ? "ativado" : "inativado"}`,
  });
}
