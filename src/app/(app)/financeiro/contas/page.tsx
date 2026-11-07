import type { Metadata } from "next";
import { requirePermission } from "@/lib/tenant";
import { accountsWithBalance, listChartAccounts, listCostCenters } from "@/services/finance-core.service";
import { formatBRL } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { StructureManager } from "@/components/finance/structure-manager";

export const metadata: Metadata = { title: "Contas e plano" };
export const dynamic = "force-dynamic";

export default async function FinanceAccountsPage() {
  const ctx = await requirePermission("finance.structure");

  const [accounts, chartAccounts, costCenters] = await Promise.all([
    accountsWithBalance(ctx),
    listChartAccounts(ctx, true),
    listCostCenters(ctx, true),
  ]);

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Contas e plano de contas"
        description="Contas financeiras com saldo acumulado, plano de contas analítico e centros de custo."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo em contas" value={formatBRL(totalBalance)} />
        <StatCard label="Contas financeiras" value={String(accounts.length)} />
        <StatCard label="Contas no plano" value={String(chartAccounts.length)} />
        <StatCard label="Centros de custo" value={String(costCenters.length)} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Contas financeiras e saldos</h2>
        {accounts.length === 0 ? (
          <EmptyState title="Nenhuma conta financeira" description="Cadastre contas para o caixa e bancos." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Contas financeiras">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Tipo</th>
                  <th>Saldo inicial</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Saldo atual</th>
                  <th>Ativa</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-medium">{account.name}</td>
                    <td>{account.type}</td>
                    <td className="num">{formatBRL(Number(account.initialBalance))}</td>
                    <td className="num text-emerald-700">{formatBRL(Number(account.totalIn))}</td>
                    <td className="num text-red-700">{formatBRL(Number(account.totalOut))}</td>
                    <td className="num font-semibold">{formatBRL(Number(account.balance))}</td>
                    <td>
                      <StatusBadge status={account.active ? "ATIVO" : "INATIVO"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <StructureManager
        chartAccounts={chartAccounts.map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          nature: account.nature,
          level: account.level,
          isAnalytic: account.isAnalytic,
          active: account.active,
          parentId: account.parentId,
        }))}
        costCenters={costCenters.map((center) => ({
          id: center.id,
          code: center.code,
          name: center.name,
          description: center.description,
          active: center.active,
        }))}
      />
    </div>
  );
}
