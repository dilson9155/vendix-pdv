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

  const existingTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (existingTenant) {
    console.log(`Seed concluído: tenant "${existingTenant.name}" já existe.`);
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
