import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getOpenCashSession, getSessionSummary, listCashSessions } from "@/services/cash.service";
import { listBranches } from "@/services/settings.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR, formatDateTimeBR } from "@/lib/date";
import { EmptyState, PageHeader, StatCard, StatusBadge, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { CloseCashForm, CashMovementForm, OpenCashForm } from "@/components/forms/cash-forms";

export const metadata: Metadata = { title: "Caixa" };
export const dynamic = "force-dynamic";

export default async function CashPage() {
  const ctx = await requirePermission("pdv.operate");
  const [branches, sessions] = await Promise.all([
    listBranches(ctx.tenantId),
    listCashSessions(ctx),
  ]);
  const activeBranches = branches
    .filter((branch) => branch.status === "ATIVO" && (!ctx.branchId || branch.id === ctx.branchId))
    .map((branch) => ({ id: branch.id, name: branch.name }));
  const open = await getOpenCashSession(ctx, ctx.branchId ?? undefined);
  const summary = open ? await getSessionSummary(ctx, open.id) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Caixa"
        description="Abertura, suprimentos, sangrias e fechamento. Todo movimento é auditado e o fechamento registra a diferença entre o esperado e o contado."
        actions={
          <Button asChild size="sm">
            <Link href="/pdv">Ir para o PDV</Link>
          </Button>
        }
      />

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Saldo esperado em dinheiro"
              value={formatBRL(summary.expectedCash)}
              hint={`${summary.terminalName} · ${summary.branchName}`}
              tone="positive"
              icon={<Banknote className="size-4" />}
            />
            <StatCard
              label="Vendas no caixa"
              value={formatBRL(summary.salesTotal)}
              hint={`${summary.salesCount} venda(s) · ${formatBRL(summary.cashSales)} em dinheiro`}
            />
            <StatCard
              label="Suprimentos"
              value={formatBRL(summary.supplies)}
              hint={`Abertura de ${formatBRL(summary.openingAmount)}`}
              icon={<ArrowUpCircle className="size-4" />}
            />
            <StatCard
              label="Sangrias e estornos"
              value={formatBRL(summary.withdrawals + summary.refunds)}
              hint={`Sangrias ${formatBRL(summary.withdrawals)} · estornos ${formatBRL(summary.refunds)}`}
              icon={<ArrowDownCircle className="size-4" />}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Caixa aberto</h2>
                  <p className="text-xs text-muted-foreground">
                    {summary.terminalName} · {summary.branchName} · operador {summary.operatorName}
                  </p>
                </div>
                <StatusBadge status={summary.status} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Aberto em {formatDateTimeBR(summary.openedAt)}.
              </p>

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recebimentos por forma
              </h3>
              {summary.byMethod.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum recebimento ainda.</p>
              ) : (
                <ul className="mt-2 divide-y rounded-lg border">
                  {summary.byMethod.map((method) => (
                    <li key={method.name} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{method.name}</span>
                      <span className="font-medium tabular-nums">{formatBRL(method.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Movimentos manuais
              </h3>
              {summary.movements.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum suprimento ou sangria.</p>
              ) : (
                <ul className="mt-2 divide-y rounded-lg border">
                  {summary.movements.map((movement) => (
                    <li key={movement.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">
                          {movement.type === "SUPRIMENTO"
                            ? "Suprimento"
                            : movement.type === "SANGRIA"
                              ? "Sangria"
                              : movement.type}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {movement.reason} · {movement.userName} · {formatDateTimeBR(movement.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatBRL(movement.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendas do turno
              </h3>
              {summary.sales.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma venda registrada.</p>
              ) : (
                <ul className="mt-2 divide-y rounded-lg border">
                  {summary.sales.map((sale) => (
                    <li key={sale.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <Link href={`/vendas/${sale.id}`} className="font-medium text-primary hover:underline">
                        {sale.documentNumber}
                      </Link>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={sale.status} />
                        <span className="tabular-nums">{formatBRL(sale.total)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-4">
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Movimentar dinheiro</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Suprimento entra no caixa; sangria retira. Ambos exigem motivo.
                </p>
                <CashMovementForm sessionId={summary.id} />
              </section>
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Fechar caixa</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Confira o valor contado antes de fechar. Um caixa fechado não aceita novas vendas.
                </p>
                <CloseCashForm sessionId={summary.id} expectedCash={summary.expectedCash} />
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Abrir caixa</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Informe o terminal e o fundo de troco. Só é permitido um caixa aberto por terminal.
            </p>
            {activeBranches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma unidade ativa disponível. Cadastre uma unidade em Configurações.
              </p>
            ) : (
              <OpenCashForm branches={activeBranches} defaultBranchId={ctx.branchId} />
            )}
          </section>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Como o caixa é calculado</h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• O saldo esperado é a abertura + vendas em dinheiro + suprimentos − sangrias − estornos.</li>
              <li>• O troco não é somado: cada pagamento é registrado pelo valor efetivamente aplicado.</li>
              <li>• Cartão, Pix e crediário aparecem separados e não entram no dinheiro esperado.</li>
              <li>• O fechamento grava esperado, contado e diferença, com registro de auditoria.</li>
              <li>• Vendas canceladas deixam de compor o caixa, mas permanecem no histórico.</li>
            </ul>
          </section>
        </div>
      )}

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Histórico de caixas</h2>
        <p className="text-xs text-muted-foreground">Últimos 100 turnos da empresa no escopo da sua unidade.</p>
        <div className="mt-3">
          {sessions.length === 0 ? (
            <EmptyState title="Nenhum caixa registrado" description="Abra o primeiro caixa para começar a operar o PDV." />
          ) : (
            <TableShell caption="Histórico de caixas">
              <thead>
                <tr>
                  <th>Terminal</th>
                  <th>Unidade</th>
                  <th>Operador</th>
                  <th>Aberto em</th>
                  <th>Fechado em</th>
                  <th className="num">Abertura</th>
                  <th className="num">Esperado</th>
                  <th className="num">Contado</th>
                  <th className="num">Diferença</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="font-medium">{session.terminalName}</td>
                    <td>{session.branch.name}</td>
                    <td>{session.operator.name}</td>
                    <td>{formatDateBR(session.openedAt)}</td>
                    <td>{session.closedAt ? formatDateBR(session.closedAt) : "—"}</td>
                    <td className="num">{formatBRL(Number(session.openingAmount))}</td>
                    <td className="num">{session.expectedCash ? formatBRL(Number(session.expectedCash)) : "—"}</td>
                    <td className="num">{session.countedCash ? formatBRL(Number(session.countedCash)) : "—"}</td>
                    <td className="num">
                      {session.difference !== null ? (
                        <span className={Number(session.difference) === 0 ? "text-emerald-700" : "text-red-700"}>
                          {formatBRL(Number(session.difference))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <StatusBadge status={session.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      </section>
    </div>
  );
}
