"use client";

import { ChartAccountDialog, CostCenterDialog, DeleteChartAccountButton, DeleteCostCenterButton } from "@/components/finance/structure-dialogs";
import { EmptyState, StatusBadge, TableShell } from "@/components/page-blocks";

export function StructureManager({
  chartAccounts,
  costCenters,
}: {
  chartAccounts: Array<{
    id: string;
    code: string;
    name: string;
    nature: string;
    level: number;
    isAnalytic: boolean;
    active: boolean;
    parentId: string | null;
  }>;
  costCenters: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    active: boolean;
  }>;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Plano de contas</h2>
          <ChartAccountDialog mode="create" accounts={chartAccounts} />
        </div>
        {chartAccounts.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Plano de contas vazio" />
          </div>
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
                  <th />
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
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <ChartAccountDialog
                          mode="edit"
                          account={account}
                          accounts={chartAccounts}
                          triggerLabel="Editar"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                        <DeleteChartAccountButton
                          id={account.id}
                          label={`${account.code} ${account.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Centros de custo</h2>
          <CostCenterDialog mode="create" />
        </div>
        {costCenters.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhum centro de custo" />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <TableShell caption="Centros de custo">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Ativo</th>
                  <th />
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
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <CostCenterDialog
                          mode="edit"
                          center={center}
                          triggerLabel="Editar"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                        <DeleteCostCenterButton id={center.id} label={center.name} />
                      </div>
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
