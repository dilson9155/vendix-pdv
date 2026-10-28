import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight, BookOpen, Wallet } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { accountsWithBalance, getCashFlow } from "@/services/finance-core.service";
import { listPayables } from "@/services/payables.service";
import { listReceivables } from "@/services/receivables.service";
import { currentMonthISO, todayISO } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Financeiro" };
export const dynamic = "force-dynamic";

type AccountBalanceRow = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  balance: number;
};

export default async function FinanceOverviewPage() {
  const ctx = await requirePermission("finance.view");

  const [accounts, payables, receivables, cashFlow] = await Promise.all([
    accountsWithBalance(ctx).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        initialBalance: Number(row.initialBalance),
        balance: Number(row.balance),
      }))
    ),
    listPayables(ctx, {}),
    listReceivables(ctx, {}),
    getCashFlow(ctx, { from: `${currentMonthISO()}-01`, to: todayISO() }),
  ]);

  const saldos: AccountBalanceRow[] = accounts;
  const totalBalance = saldos.reduce((sum, account) => sum + account.balance, 0);

  const quickLinks = [
    { href: "/financeiro/contas-a-pagar", title: "Contas a pagar", description: "Fornecedores, parcelas e obrigações por pagar." },
    { href: "/financeiro/contas-a-receber", title: "Contas a receber", description: "Clientes, vendas a prazo e recebimentos." },
    { href: "/financeiro/fluxo-caixa", title: "Fluxo de caixa", description: "Entradas, saídas e projeções do período." },
    { href: "/financeiro/livro-caixa", title: "Livro caixa", description: "Lançamentos, conciliação e transferências." },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Visão financeira"
        description="Saldos das contas, obrigações em aberto e movimento de caixa do período atual."
        actions={
          <Button asChild size="sm">
            <Link href="/financeiro/contas-a-pagar">Contas a pagar</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo em contas" value={formatBRL(totalBalance)} hint={`${saldos.length} conta(s) financeira(s) ativa(s)`} />
        <StatCard
          label="Contas a pagar"
          value={formatBRL(payables.totals.open)}
          hint={
            payables.totals.overdue > 0
              ? `${formatBRL(payables.totals.overdue)} vencida(s) · ${payables.totals.count} em aberto`
              : `${payables.totals.count} em aberto`
          }
          tone={payables.totals.overdue > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Contas a receber"
          value={formatBRL(receivables.totals.open)}
          hint={
            receivables.totals.overdue > 0
              ? `${formatBRL(receivables.totals.overdue)} vencida(s) · ${receivables.totals.count} em aberto`
              : `${receivables.totals.count} em aberto`
          }
          tone={receivables.totals.overdue > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Fluxo de caixa"
          value={formatBRL(cashFlow.totalIn - cashFlow.totalOut)}
          hint={`Entradas ${formatBRL(cashFlow.totalIn)} · saídas ${formatBRL(cashFlow.totalOut)}`}
        />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="size-4 text-primary" /> Contas financeiras
          </h2>
          {saldos.length === 0 ? (
            <EmptyState title="Nenhuma conta cadastrada" description="Cadastre contas financeiras para acompanhar saldos." />
          ) : (
            <div className="mt-3 space-y-2">
              {saldos.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{account.type}</p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{formatBRL(account.balance)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-primary" /> Resumo do período ({cashFlow.from} a {cashFlow.to})
          </h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Saldo inicial</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(cashFlow.openingBalance)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Entradas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700">{formatBRL(cashFlow.totalIn)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Saídas</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-red-700">{formatBRL(cashFlow.totalOut)}</dd>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Saldo final</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(cashFlow.closingBalance)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Atalhos</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{link.title}</h3>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight className="size-4 text-primary" /> Transferências e lançamentos
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/financeiro/livro-caixa">Abrir livro caixa</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/financeiro/transferencias">Nova transferência</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
