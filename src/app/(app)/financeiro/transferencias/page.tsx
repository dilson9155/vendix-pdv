import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/tenant";
import { listTransfers } from "@/services/finance-core.service";
import { listFinancialAccounts } from "@/services/finance-core.service";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { TransferForm } from "@/components/finance/transfer-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Transferências" };
export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const ctx = await requirePermission("finance.structure");
  const [transfers, accounts] = await Promise.all([
    listTransfers(ctx),
    listFinancialAccounts(ctx, true),
  ]);

  const totalOut = transfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Transferências entre contas"
        description="Movimentações entre caixas/bancos sem alterar o resultado financeiro do período."
        actions={
          <TransferForm accounts={accounts.map((account) => ({ id: account.id, name: account.name }))} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Transferências" value={String(transfers.length)} hint="Registros no período atual" />
        <StatCard label="Volume movimentado" value={formatBRL(totalOut)} />
        <StatCard label="Saldo contas" value={formatBRL(accounts.reduce((sum, account) => sum + Number(account.initialBalance), 0))} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        {transfers.length === 0 ? (
          <EmptyState title="Nenhuma transferência registrada" description="Registre transferências entre contas financeiras." />
        ) : (
          <TableShell caption="Transferências">
            <thead>
              <tr>
                <th>Data</th>
                <th>De</th>
                <th>Para</th>
                <th>Descrição</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td>{new Date(transfer.date).toISOString().slice(0, 10)}</td>
                  <td>{transfer.fromAccount.name}</td>
                  <td>{transfer.toAccount.name}</td>
                  <td>{transfer.description}</td>
                  <td className="num font-semibold">{formatBRL(Number(transfer.amount))}</td>
                  <td>
                    <StatusBadge status="ATIVO" />
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Contas financeiras</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="vx-table">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Tipo</th>
                <th>Saldo inicial</th>
                <th>Ativa</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="font-medium">{account.name}</td>
                  <td>{account.type}</td>
                  <td className="num">{formatBRL(Number(account.initialBalance))}</td>
                  <td>
                    <StatusBadge status={account.active ? "ATIVO" : "INATIVO"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
