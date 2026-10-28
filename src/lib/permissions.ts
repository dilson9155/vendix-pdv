// Catálogo de permissões do Vendix.
// As chaves são verificadas SEMPRE no servidor. O menu apenas reflete o que o
// servidor já autoriza — esconder um botão não é controle de acesso.

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  PDV_OPERATE: "pdv.operate",

  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_CANCEL: "sales.cancel",
  SALES_DISCOUNT: "sales.discount",
  SALES_RETURN: "sales.return",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  CATALOG_MANAGE: "catalog.manage",

  STOCK_VIEW: "stock.view",
  STOCK_MANAGE: "stock.manage",

  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  FINANCE_PAY: "finance.pay",
  FINANCE_REVERSE: "finance.reverse",
  FINANCE_STRUCTURE: "finance.structure",
  FINANCE_REPORTS: "finance.reports",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  AUDIT_VIEW: "audit.view",

  SUBSCRIPTION_VIEW: "subscription.view",
  SUBSCRIPTION_MANAGE: "subscription.manage",

  WHATSAPP_SEND: "whatsapp.send",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<string, string> = {
  "dashboard.view": "Ver dashboard",
  "pdv.operate": "Operar PDV/caixa",
  "sales.view": "Consultar vendas",
  "sales.create": "Registrar vendas",
  "sales.cancel": "Cancelar vendas",
  "sales.discount": "Conceder descontos",
  "sales.return": "Registrar devoluções",
  "customers.view": "Consultar clientes",
  "customers.manage": "Gerenciar clientes",
  "products.view": "Consultar produtos",
  "products.manage": "Gerenciar produtos",
  "catalog.manage": "Gerenciar categorias e marcas",
  "stock.view": "Consultar estoque",
  "stock.manage": "Movimentar estoque",
  "finance.view": "Consultar financeiro",
  "finance.manage": "Gerenciar lançamentos financeiros",
  "finance.pay": "Baixar contas (pagar/receber)",
  "finance.reverse": "Estornar baixas",
  "finance.structure": "Gerenciar contas, plano e centros de custo",
  "finance.reports": "Relatórios financeiros e DRE",
  "reports.view": "Consultar relatórios",
  "reports.export": "Exportar relatórios",
  "users.view": "Consultar usuários",
  "users.manage": "Gerenciar usuários e perfis",
  "settings.view": "Consultar configurações",
  "settings.manage": "Alterar configurações",
  "audit.view": "Consultar auditoria",
  "subscription.view": "Consultar assinatura",
  "subscription.manage": "Gerenciar assinatura",
  "whatsapp.send": "Compartilhar comprovantes",
};

export const PERMISSION_GROUPS: Array<{ group: string; permissions: string[] }> = [
  { group: "Dashboard", permissions: ["dashboard.view"] },
  { group: "PDV e vendas", permissions: ["pdv.operate", "sales.view", "sales.create", "sales.cancel", "sales.discount", "sales.return"] },
  { group: "Clientes", permissions: ["customers.view", "customers.manage"] },
  { group: "Catálogo", permissions: ["products.view", "products.manage", "catalog.manage"] },
  { group: "Estoque", permissions: ["stock.view", "stock.manage"] },
  {
    group: "Financeiro",
    permissions: ["finance.view", "finance.manage", "finance.pay", "finance.reverse", "finance.structure", "finance.reports"],
  },
  { group: "Relatórios", permissions: ["reports.view", "reports.export"] },
  { group: "Usuários", permissions: ["users.view", "users.manage"] },
  { group: "Configurações", permissions: ["settings.view", "settings.manage", "audit.view"] },
  { group: "Assinatura", permissions: ["subscription.view", "subscription.manage"] },
  { group: "WhatsApp", permissions: ["whatsapp.send"] },
];

/** Perfis padrão criados para cada nova empresa. */
export const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: "Administrador",
    description: "Acesso total à empresa, incluindo usuários e configurações.",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "Gerente",
    description: "Operação completa, sem exclusão de usuários administrativos.",
    permissions: ALL_PERMISSIONS.filter(
      (p) => !["users.manage", "settings.manage", "subscription.manage"].includes(p)
    ),
  },
  {
    name: "Operador de caixa",
    description: "PDV, vendas e consultas básicas.",
    permissions: [
      "dashboard.view",
      "pdv.operate",
      "sales.view",
      "sales.create",
      "customers.view",
      "customers.manage",
      "products.view",
      "stock.view",
      "reports.view",
      "whatsapp.send",
    ],
  },
  {
    name: "Financeiro",
    description: "Financeiro, contas, fluxo de caixa e relatórios.",
    permissions: [
      "dashboard.view",
      "sales.view",
      "customers.view",
      "products.view",
      "finance.view",
      "finance.manage",
      "finance.pay",
      "finance.reverse",
      "finance.structure",
      "finance.reports",
      "reports.view",
      "reports.export",
      "audit.view",
    ],
  },
  {
    name: "Estoquista",
    description: "Produtos, catálogo, entradas e inventário.",
    permissions: [
      "dashboard.view",
      "products.view",
      "products.manage",
      "catalog.manage",
      "stock.view",
      "stock.manage",
      "reports.view",
    ],
  },
  {
    name: "Consulta",
    description: "Somente leitura.",
    permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(".view")),
  },
];

export function rolePermissions(role: string | null | undefined): string[] {
  return DEFAULT_ROLES.find((r) => r.name === role)?.permissions ?? [];
}
