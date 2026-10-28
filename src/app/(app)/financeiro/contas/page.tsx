import type { Metadata } from "next";
import { requirePermission } from "@/lib/tenant";
import { accountsWithBalance, listChartAccounts, listCostCenters } from "@/services/finance-core.service";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";

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

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Plano de contas</h2>
        {chartAccounts.length === 0 ? (
          <EmptyState title="Plano de contas vazio" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Plano de contas">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Natureza</th>
                  <th>Nível</th>
                  <th>Analítica</th>
                  <th>Ativa</th>
                </tr>
              </thead>
              <tbody>
                {chartAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-medium">{account.code}</td>
                    <td>{account.name}</td>
                    <td>{account.nature}</td>
                    <td>{account.level}</td>
                    <td>{account.isAnalytic ? "Sim" : "Não"}</td>
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

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Centros de custo</h2>
        {costCenters.length === 0 ? (
          <EmptyState title="Nenhum centro de custo" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Centros de custo">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Ativo</th>
                </tr>
              </thead>
              <tbody>
                {costCenters.map((center) => (
                  <tr key={center.id}>
                    <td className="font-medium">{center.code}</td>
                    <td>{center.name}</td>
                    <td>{center.description ?? "—"}</td>
                    <td>
                      <StatusBadge status={center.active ? "ATIVO" : "INATIVO"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>
    </div>
  );
}
