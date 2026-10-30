// Seed inicial do Vendix: planos padrão, empresa demonstrativa e acessos.
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "../src/lib/permissions";

const DEFAULT_PLANS = [
  {
    code: "BASICO",
    name: "Básico",
    description: "Operação básica com PDV, vendas e estoque.",
    price: 149,
    trialDays: 7,
    maxUsers: 2,
    maxBranches: 1,
    maxProducts: 50,
  },
  {
    code: "PRO",
    name: "Pro",
    description: "Operação completa com financeiro, relatórios e multi-unidade.",
    price: 349,
    trialDays: 14,
    maxUsers: 5,
    maxBranches: 2,
    maxProducts: 200,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "Plano ilimitado para operações consolidadas.",
    price: 899,
    trialDays: 30,
    maxUsers: null,
    maxBranches: null,
    maxProducts: null,
  },
];

// Catálogo de demonstração. Serve apenas para a empresa "Vendix Demonstração":
// dados reais de operação devem ser cadastrados pela própria loja.
const DEMO_PRODUCTS = [
  { name: "Camiseta Básica Branca", sku: "CAM-001", barcode: "7891000100011", category: "Vestuário", brand: "Vendix Basics", cost: 32.0, price: 79.9, quantity: 24 },
  { name: "Calça Jeans Skinny", sku: "JEA-001", barcode: "7891000100028", category: "Vestuário", brand: "Vendix Basics", cost: 89.0, price: 189.9, quantity: 12 },
  { name: "Vestido Floral Midi", sku: "VES-001", barcode: "7891000100035", category: "Vestuário", brand: "Aurora", cost: 110.0, price: 249.9, quantity: 8 },
  { name: "Tênis Casual Branco", sku: "TEN-001", barcode: "7891000100042", category: "Calçados", brand: "Aurora", cost: 149.9, price: 299.9, quantity: 10 },
  { name: "Batom Matte Nude", sku: "BAT-001", barcode: "7891000100059", category: "Cosméticos", brand: "Bella", cost: 18.5, price: 49.9, quantity: 36 },
  { name: "Perfume Floral 100ml", sku: "PER-001", barcode: "7891000100066", category: "Cosméticos", brand: "Bella", cost: 82.0, price: 189.0, quantity: 6 },
] as const;

async function seedDemoCatalog(tenantId: string, branchId: string, userId: string | null) {
  const categoryIds = new Map<string, string>();
  for (const name of [...new Set(DEMO_PRODUCTS.map((product) => product.category))]) {
    const existing = await prisma.productCategory.findFirst({ where: { tenantId, name }, select: { id: true } });
    const category = existing ?? (await prisma.productCategory.create({ data: { tenantId, name } }));
    categoryIds.set(name, category.id);
  }

  const brandIds = new Map<string, string>();
  for (const name of [...new Set(DEMO_PRODUCTS.map((product) => product.brand))]) {
    const existing = await prisma.brand.findFirst({ where: { tenantId, name }, select: { id: true } });
    const brand = existing ?? (await prisma.brand.create({ data: { tenantId, name } }));
    brandIds.set(name, brand.id);
  }

  for (const item of DEMO_PRODUCTS) {
    const existingProduct = await prisma.product.findFirst({
      where: { tenantId, sku: item.sku },
      select: { id: true },
    });

    const product =
      existingProduct ??
      (await prisma.product.create({
        data: {
          tenantId,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          categoryId: categoryIds.get(item.category) ?? null,
          brandId: brandIds.get(item.brand) ?? null,
          unit: "UN",
          cost: item.cost,
          price: item.price,
          minStock: 2,
          trackStock: true,
        },
        select: { id: true },
      }));

    const existingLevel = await prisma.stockLevel.findFirst({
      where: { branchId, productId: product.id, variantId: null },
      select: { id: true },
    });

    if (existingLevel) {
      continue;
    }

    await prisma.stockLevel.create({
      data: { tenantId, branchId, productId: product.id, variantId: null, quantity: item.quantity },
    });

    await prisma.stockMovement.create({
      data: {
        tenantId,
        branchId,
        productId: product.id,
        type: "ENTRADA",
        quantity: item.quantity,
        unitCost: item.cost,
        balanceAfter: item.quantity,
        reason: "Carga inicial de demonstração",
        userId,
      },
    });
  }

  const existingCustomer = await prisma.customer.findFirst({ where: { tenantId } });
  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        tenantId,
        name: "Maria Souza",
        phone: "(11) 98888-1234",
        whatsapp: "5511988881234",
        email: "maria.souza@exemplo.com",
        city: "São Paulo",
        state: "SP",
        consentAt: new Date(),
      },
    });
  }
}

async function seedPlatformAdmin() {
  const email = (process.env.SEED_PLATFORM_ADMIN_EMAIL || "super@vendix.app").toLowerCase();
  const password = process.env.SEED_PLATFORM_ADMIN_PASSWORD || "Vendix@2026";

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { isPlatformAdmin: true, active: true },
    });
    return { email, password, created: false };
  }

  await prisma.user.create({
    data: {
      tenantId: null,
      branchId: null,
      roleId: null,
      name: "Super Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      isPlatformAdmin: true,
      active: true,
    },
  });

  return { email, password, created: true };
}

async function main() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        trialDays: plan.trialDays,
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
        maxProducts: plan.maxProducts,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        trialDays: plan.trialDays,
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
        maxProducts: plan.maxProducts,
      },
    });
  }

  const platformAdmin = await seedPlatformAdmin();

  const existingTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (existingTenant) {
    const existingBranch =
      (await prisma.branch.findFirst({ where: { tenantId: existingTenant.id, isHeadquarters: true } })) ??
      (await prisma.branch.findFirst({ where: { tenantId: existingTenant.id } }));
    const existingUser = await prisma.user.findFirst({ where: { tenantId: existingTenant.id } });

    if (existingBranch) {
      await seedDemoCatalog(existingTenant.id, existingBranch.id, existingUser?.id ?? null);
    }

    console.log(
      JSON.stringify({
        seed: "tenant existente",
        tenant: existingTenant.name,
        loginEmpresa: { email: "admin@demo.vendix.app", password: "Demo@2026" },
        loginSuperAdmin: { email: platformAdmin.email, password: platformAdmin.password },
      })
    );
    return;
  }

  const basicPlan = await prisma.plan.findUnique({ where: { code: "BASICO" } });
  const proPlan = await prisma.plan.findUnique({ where: { code: "PRO" } });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Vendix Demonstração",
      legalName: "Vendix Comércio LTDA",
      document: "12.345.678/0001-90",
      email: "demo@vendix.app",
      phone: "(11) 99999-0000",
      status: "ATIVO",
      planId: proPlan?.id ?? basicPlan?.id ?? null,
    },
  });

  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      code: "MAT",
      name: "Matriz",
      isHeadquarters: true,
      status: "ATIVO",
    },
  });

  const roles = [];
  for (const role of [
    { name: "Administrador", description: "Acesso total à empresa.", system: true, permissions: [...ALL_PERMISSIONS] },
    { name: "Gerente", description: "Operação completa, sem gestão de usuários.", system: true, permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("users.") && !p.startsWith("settings.") && !p.startsWith("subscription.")) },
    { name: "Operador de caixa", description: "PDV, vendas e consultas básicas.", system: true, permissions: ["dashboard.view", "pdv.operate", "sales.view", "sales.create", "customers.view", "customers.manage", "products.view", "products.manage", "stock.view", "stock.manage", "reports.view", "whatsapp.send"] },
    { name: "Financeiro", description: "Financeiro, contas e relatórios.", system: true, permissions: ["dashboard.view", "sales.view", "customers.view", "products.view", "finance.view", "finance.manage", "finance.pay", "finance.reverse", "finance.structure", "finance.reports", "reports.view", "reports.export", "audit.view"] },
    { name: "Estoquista", description: "Produtos, catálogo e estoque.", system: true, permissions: ["dashboard.view", "products.view", "products.manage", "catalog.manage", "stock.view", "stock.manage", "reports.view"] },
    { name: "Consulta", description: "Somente leitura.", system: true, permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(".view")) },
  ]) {
    roles.push(await prisma.role.create({ data: { tenantId: tenant.id, name: role.name, description: role.description, permissions: role.permissions, system: role.system } }));
  }

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      roleId: roles[0].id,
      name: "Admin Demo",
      email: "admin@demo.vendix.app",
      passwordHash: await bcrypt.hash("Demo@2026", 12),
      active: true,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: tenant.planId ?? basicPlan!.id,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
    },
  });

  const financialAccount = await prisma.financialAccount.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: "Caixa Demonstração",
      type: "CAIXA",
      initialBalance: 500,
    },
  });

  await seedDemoCatalog(tenant.id, branch.id, adminUser.id);

  console.log(
    JSON.stringify({
      tenantId: tenant.id,
      branchId: branch.id,
      userId: adminUser.id,
      subscriptionId: subscription.id,
      financialAccountId: financialAccount.id,
      login: {
        email: "admin@demo.vendix.app",
        password: "Demo@2026",
      },
      loginSuperAdmin: {
        email: platformAdmin.email,
        password: platformAdmin.password,
      },
    })
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
