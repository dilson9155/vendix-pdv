import { AppShell, type NavGroup } from "@/components/app-shell";
import { hasPermission, requireTenant } from "@/lib/tenant";
import { listActiveNotices } from "@/services/saas.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const notices = await listActiveNotices();

  const groups: NavGroup[] = [];
  const push = (title: string, items: NavGroup["items"]) => {
    if (items.length) groups.push({ title, items });
  };

  push("Visão geral", [
    ...(hasPermission(ctx, "dashboard.view")
      ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }]
      : []),
  ]);

  push("Operação", [
    ...(hasPermission(ctx, "pdv.operate")
      ? [
          { href: "/pdv", label: "PDV", icon: "pdv" as const },
          { href: "/pdv/caixa", label: "Caixa", icon: "cash" as const },
        ]
      : []),
    ...(hasPermission(ctx, "sales.view")
      ? [{ href: "/vendas", label: "Vendas", icon: "sales" as const }]
      : []),
  ]);

  push("Cadastros", [
    ...(hasPermission(ctx, "customers.view")
      ? [{ href: "/clientes", label: "Clientes", icon: "customers" as const }]
      : []),
    ...(hasPermission(ctx, "products.view")
      ? [
          { href: "/produtos", label: "Produtos", icon: "products" as const },
          { href: "/estoque", label: "Estoque", icon: "stock" as const },
          { href: "/fornecedores", label: "Fornecedores", icon: "suppliers" as const },
        ]
      : []),
  ]);

  push("Financeiro", [
    ...(hasPermission(ctx, "finance.view")
      ? [
          { href: "/financeiro", label: "Visão financeira", icon: "finance" as const },
          { href: "/financeiro/contas-a-pagar", label: "Contas a pagar", icon: "payables" as const },
          { href: "/financeiro/contas-a-receber", label: "Contas a receber", icon: "receivables" as const },
          { href: "/financeiro/fluxo-caixa", label: "Fluxo de caixa", icon: "cashflow" as const },
          { href: "/financeiro/livro-caixa", label: "Livro caixa", icon: "ledger" as const },
        ]
      : []),
    ...(hasPermission(ctx, "finance.structure")
      ? [
          { href: "/financeiro/contas", label: "Contas e plano", icon: "accounts" as const },
          { href: "/financeiro/transferencias", label: "Transferências", icon: "transfers" as const },
        ]
      : []),
  ]);

  push("Relatórios", [
    ...(hasPermission(ctx, "reports.view")
      ? [
          { href: "/relatorios/vendas", label: "Vendas", icon: "salesreport" as const },
          { href: "/relatorios/estoque", label: "Estoque", icon: "stockreport" as const },
        ]
      : []),
    ...(hasPermission(ctx, "finance.reports")
      ? [
          { href: "/relatorios/financeiro", label: "Financeiro", icon: "reports" as const },
          { href: "/relatorios/dre", label: "DRE gerencial", icon: "dre" as const },
        ]
      : []),
  ]);

  push("Gestão", [
    ...(hasPermission(ctx, "users.view")
      ? [{ href: "/usuarios", label: "Usuários e perfis", icon: "users" as const }]
      : []),
    ...(hasPermission(ctx, "settings.view")
      ? [{ href: "/configuracoes", label: "Configurações", icon: "settings" as const }]
      : []),
    ...(hasPermission(ctx, "subscription.view")
      ? [{ href: "/assinatura", label: "Assinatura", icon: "subscription" as const }]
      : []),
    ...(ctx.isPlatformAdmin
      ? [{ href: "/admin", label: "Plataforma SaaS", icon: "admin" as const }]
      : []),
  ]);

  return (
    <AppShell
      userName={ctx.name}
      userEmail={ctx.email}
      tenantName={ctx.tenantName || "Vendix"}
      branchName={ctx.branchName}
      planName={ctx.planName}
      navGroups={groups}
      notices={notices.map((notice) => ({
        id: notice.id,
        title: notice.title,
        message: notice.message,
        level: notice.level,
      }))}
    >
      {children}
    </AppShell>
  );
}
